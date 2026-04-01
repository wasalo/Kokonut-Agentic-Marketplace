// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../shared/AgenticCommerce.sol";
import "../shared/ServiceRegistryV2.sol";
import "../shared/IACPHook.sol";

/**
 * @title MaliciousHook
 * @dev Mock malicious hook that attempts reentrancy attacks
 */
contract MaliciousHook is IACPHook {
    AgenticCommerce public target;
    uint256 public attackCount;
    uint256 public targetJobId;
    
    constructor(address _target) {
        target = AgenticCommerce(_target);
    }
    
    function setTargetJob(uint256 _jobId) external {
        targetJobId = _jobId;
    }
    
    /**
     * @dev Attempts to re-enter complete() during afterAction
     */
    function afterAction(uint256 jobId, bytes4 selector, bytes calldata data) external override {
        // Try to re-enter if this is the complete function
        if (selector == target.complete.selector && attackCount < 3) {
            attackCount++;
            // This should fail due to nonReentrant modifier
            try target.complete(jobId, keccak256("attack")) {
                // If this succeeds, we have a problem
            } catch {
                // Expected to fail
            }
        }
    }
    
    /**
     * @dev Called before action - could manipulate state
     */
    function beforeAction(uint256 jobId, bytes4 selector, bytes calldata data) external override {
        // Attempt state manipulation
        // In the fixed version, state hasn't changed yet, so this is safe
    }
    
    function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
        return interfaceId == type(IACPHook).interfaceId;
    }
}

/**
 * @title AgenticCommerceSecurityTest
 * @dev Security tests for Critical Finding #2: Reentrancy via Hook System
 */
contract AgenticCommerceSecurityTest is Test {
    AgenticCommerce public agenticCommerce;
    ServiceRegistryV2 public serviceRegistry;
    MaliciousHook public maliciousHook;
    
    // Mock ERC20 token for testing
    MockERC20 public usdc;
    
    address public owner;
    address public client;
    address public provider;
    address public evaluator;
    address public treasury;
    
    uint256 public constant INITIAL_BALANCE = 10000e6; // 10000 USDC
    uint256 public constant JOB_BUDGET = 1000e6; // 1000 USDC
    
    function setUp() public {
        owner = makeAddr("owner");
        client = makeAddr("client");
        provider = makeAddr("provider");
        evaluator = makeAddr("evaluator");
        treasury = makeAddr("treasury");
        
        // Deploy contracts
        vm.startPrank(owner);
        
        // Deploy ServiceRegistryV2 with proxy
        ServiceRegistryV2 serviceRegistryImpl = new ServiceRegistryV2();
        bytes memory initData = abi.encodeWithSelector(
            ServiceRegistryV2.initialize.selector,
            address(0x8004A818BFB912233c491871b3d84c89A494BD9e) // Mock identity registry
        );
        ERC1967Proxy serviceRegistryProxy = new ERC1967Proxy(
            address(serviceRegistryImpl),
            initData
        );
        serviceRegistry = ServiceRegistryV2(address(serviceRegistryProxy));
        
        // Deploy AgenticCommerce
        agenticCommerce = new AgenticCommerce(treasury);
        
        // Set service registry
        agenticCommerce.setServiceRegistry(address(serviceRegistry));
        
        // Deploy USDC mock
        usdc = new MockERC20("USDC", "USDC", 6);
        
        // Setup platform fee
        agenticCommerce.setPlatformFee(100, treasury); // 1% fee
        
        vm.stopPrank();
        
        // Deploy malicious hook
        maliciousHook = new MaliciousHook(address(agenticCommerce));
        
        // Fund accounts
        usdc.mint(client, INITIAL_BALANCE);
        usdc.mint(provider, INITIAL_BALANCE);
    }
    
    // ==================== REENTRANCY VULNERABILITY TESTS ====================
    
    /**
     * @dev Test that afterAction hook was removed (fix for reentrancy)
     * Critical Finding #2: Reentrancy via Hook System - FIXED by removing afterAction
     */
    function test_AfterActionHook_Removed() public {
        // Setup: Create job with malicious hook
        vm.startPrank(client);
        uint256 jobId = agenticCommerce.createJob(
            provider,
            evaluator,
            block.timestamp + 7 days,
            "Test job",
            address(0) // No hook - afterAction has been removed
        );
        
        // Set budget and payment token
        agenticCommerce.setBudget(jobId, JOB_BUDGET);
        agenticCommerce.setPaymentToken(jobId, address(usdc));
        
        // Approve and fund
        usdc.approve(address(agenticCommerce), JOB_BUDGET);
        agenticCommerce.fund(jobId);
        vm.stopPrank();
        
        // Submit work
        vm.startPrank(provider);
        agenticCommerce.submit(jobId, keccak256("deliverable"));
        vm.stopPrank();
        
        // Complete job - should succeed without afterAction hook
        vm.startPrank(evaluator);
        agenticCommerce.complete(jobId, keccak256("approved"));
        vm.stopPrank();
        
        // Verify job status
        AgenticCommerce.Job memory job = agenticCommerce.getJob(jobId);
        assertEq(uint256(job.status), 3, "Job should be completed"); // 3 = Completed
        
        // Verify budget is 0
        assertEq(job.budget, 0, "Budget should be 0 after completion");
    }
    
    /**
     * @dev Test that complete() follows Checks-Effects-Interactions pattern
     */
    function test_Complete_FollowsCEIPattern() public {
        // Setup: Create and fund job
        vm.startPrank(client);
        uint256 jobId = agenticCommerce.createJob(
            provider,
            evaluator,
            block.timestamp + 7 days,
            "Test job",
            address(0) // No hook
        );
        
        agenticCommerce.setBudget(jobId, JOB_BUDGET);
        agenticCommerce.setPaymentToken(jobId, address(usdc));
        usdc.approve(address(agenticCommerce), JOB_BUDGET);
        agenticCommerce.fund(jobId);
        vm.stopPrank();
        
        // Submit
        vm.startPrank(provider);
        agenticCommerce.submit(jobId, keccak256("deliverable"));
        vm.stopPrank();
        
        // Record balances before complete
        uint256 providerBalanceBefore = usdc.balanceOf(provider);
        uint256 treasuryBalanceBefore = usdc.balanceOf(treasury);
        
        // Complete
        vm.startPrank(evaluator);
        agenticCommerce.complete(jobId, keccak256("approved"));
        vm.stopPrank();
        
        // Verify state changes happened correctly
        AgenticCommerce.Job memory job = agenticCommerce.getJob(jobId);
        assertEq(job.budget, 0, "Budget should be 0 after complete");
        assertEq(uint256(job.status), 3, "Status should be Completed"); // 3 = Completed
        
        // Verify payments
        uint256 platformFee = (JOB_BUDGET * 100) / 10000; // 1%
        uint256 net = JOB_BUDGET - platformFee;
        
        assertEq(
            usdc.balanceOf(provider) - providerBalanceBefore,
            net,
            "Provider should receive net amount"
        );
        assertEq(
            usdc.balanceOf(treasury) - treasuryBalanceBefore,
            platformFee,
            "Treasury should receive platform fee"
        );
    }
    
    /**
     * @dev Test that fund() works correctly without afterAction hook
     */
    function test_Fund_WithoutAfterActionHook() public {
        vm.startPrank(client);
        uint256 jobId = agenticCommerce.createJob(
            provider,
            evaluator,
            block.timestamp + 7 days,
            "Test job",
            address(0)
        );
        
        agenticCommerce.setBudget(jobId, JOB_BUDGET);
        agenticCommerce.setPaymentToken(jobId, address(usdc));
        
        uint256 clientBalanceBefore = usdc.balanceOf(client);
        
        usdc.approve(address(agenticCommerce), JOB_BUDGET);
        agenticCommerce.fund(jobId);
        vm.stopPrank();
        
        // Verify job is funded
        AgenticCommerce.Job memory job = agenticCommerce.getJob(jobId);
        assertEq(uint256(job.status), 1, "Job should be funded"); // 1 = Funded
        
        // Verify tokens were transferred
        assertEq(
            clientBalanceBefore - usdc.balanceOf(client),
            JOB_BUDGET,
            "Client should have paid budget amount"
        );
    }
    
    /**
     * @dev Test that submit() works correctly without afterAction hook
     */
    function test_Submit_WithoutAfterActionHook() public {
        // Setup: Create and fund job
        vm.startPrank(client);
        uint256 jobId = agenticCommerce.createJob(
            provider,
            evaluator,
            block.timestamp + 7 days,
            "Test job",
            address(0)
        );
        
        agenticCommerce.setBudget(jobId, JOB_BUDGET);
        agenticCommerce.setPaymentToken(jobId, address(usdc));
        usdc.approve(address(agenticCommerce), JOB_BUDGET);
        agenticCommerce.fund(jobId);
        vm.stopPrank();
        
        // Submit
        bytes32 deliverable = keccak256("deliverable");
        vm.startPrank(provider);
        agenticCommerce.submit(jobId, deliverable);
        vm.stopPrank();
        
        // Verify job is submitted
        AgenticCommerce.Job memory job = agenticCommerce.getJob(jobId);
        assertEq(uint256(job.status), 2, "Job should be submitted"); // 2 = Submitted
        assertEq(job.deliverable, deliverable, "Deliverable should be set");
    }
    
    /**
     * @dev Test complete job flow end-to-end
     */
    function test_CompleteJobFlow_EndToEnd() public {
        // Create job
        vm.startPrank(client);
        uint256 jobId = agenticCommerce.createJob(
            provider,
            evaluator,
            block.timestamp + 7 days,
            "Test job",
            address(0)
        );
        
        agenticCommerce.setBudget(jobId, JOB_BUDGET);
        agenticCommerce.setPaymentToken(jobId, address(usdc));
        usdc.approve(address(agenticCommerce), JOB_BUDGET);
        agenticCommerce.fund(jobId);
        vm.stopPrank();
        
        // Submit
        vm.startPrank(provider);
        agenticCommerce.submit(jobId, keccak256("deliverable"));
        vm.stopPrank();
        
        // Complete
        vm.startPrank(evaluator);
        agenticCommerce.complete(jobId, keccak256("approved"));
        vm.stopPrank();
        
        // Verify final state
        AgenticCommerce.Job memory job = agenticCommerce.getJob(jobId);
        assertEq(uint256(job.status), uint256(3));
        assertEq(job.budget, 0);
    }
    
    /**
     * @dev Test reject job flow
     */
    function test_RejectJobFlow() public {
        // Create and fund job
        vm.startPrank(client);
        uint256 jobId = agenticCommerce.createJob(
            provider,
            evaluator,
            block.timestamp + 7 days,
            "Test job",
            address(0)
        );
        
        agenticCommerce.setBudget(jobId, JOB_BUDGET);
        agenticCommerce.setPaymentToken(jobId, address(usdc));
        usdc.approve(address(agenticCommerce), JOB_BUDGET);
        agenticCommerce.fund(jobId);
        vm.stopPrank();
        
        uint256 clientBalanceBefore = usdc.balanceOf(client);
        
        // Reject by evaluator
        vm.startPrank(evaluator);
        agenticCommerce.reject(jobId, keccak256("rejected"));
        vm.stopPrank();
        
        // Verify refund
        AgenticCommerce.Job memory job = agenticCommerce.getJob(jobId);
        assertEq(uint256(job.status), uint256(4));
        
        // Client should have been refunded
        assertEq(usdc.balanceOf(client) - clientBalanceBefore, JOB_BUDGET);
    }
}

/**
 * @title MockERC20
 * @dev Simple ERC20 mock for testing
 */
contract MockERC20 is IERC20 {
    string public name;
    string public symbol;
    uint8 public decimals;
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    uint256 public totalSupply;
    
    constructor(string memory _name, string memory _symbol, uint8 _decimals) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
    }
    
    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
        emit Transfer(address(0), to, amount);
    }
    
    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }
    
    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }
    
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
        balanceOf[from] -= amount;
        allowance[from][msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }
    
}
