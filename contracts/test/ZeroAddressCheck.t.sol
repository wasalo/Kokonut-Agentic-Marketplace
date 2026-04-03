// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../shared/AgenticCommerce.sol";
import "../shared/ServiceRegistryV2.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title ZeroAddressCheckTest
 * @dev Tests for Critical Fix: Add zero address checks to createJob functions
 */
contract ZeroAddressCheckTest is Test {
    AgenticCommerce public agenticCommerce;
    ServiceRegistryV2 public serviceRegistry;
    
    address public owner;
    address public client;
    address public provider;
    address public evaluator;
    address public treasury;
    
    uint256 public constant INITIAL_BALANCE = 10 ether;
    
    function setUp() public {
        owner = makeAddr("owner");
        client = makeAddr("client");
        provider = makeAddr("provider");
        evaluator = makeAddr("evaluator");
        treasury = makeAddr("treasury");
        
        // Deploy contracts as owner
        vm.startPrank(owner);
        
        // Deploy ServiceRegistryV2 with proxy
        ServiceRegistryV2 serviceRegistryImpl = new ServiceRegistryV2();
        bytes memory initData = abi.encodeWithSelector(
            ServiceRegistryV2.initialize.selector,
            address(0x8004A818BFB912233c491871b3d84c89A494BD9e)
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
        
        vm.stopPrank();
        
        // Fund accounts
        vm.deal(client, INITIAL_BALANCE);
        vm.deal(provider, INITIAL_BALANCE);
        vm.deal(evaluator, INITIAL_BALANCE);
    }
    
    // ==================== CREATEJOB ZERO ADDRESS TESTS ====================
    
    /**
     * @dev Test that createJob rejects zero provider address
     */
    function test_CreateJob_RejectsZeroProvider() public {
        vm.startPrank(client);
        
        vm.expectRevert("Zero provider");
        agenticCommerce.createJob(
            address(0),  // Zero provider
            evaluator,
            block.timestamp + 7 days,
            "Test job",
            address(0)
        );
        
        vm.stopPrank();
    }
    
    /**
     * @dev Test that createJob rejects zero evaluator address
     */
    function test_CreateJob_RejectsZeroEvaluator() public {
        vm.startPrank(client);
        
        vm.expectRevert("Zero evaluator");
        agenticCommerce.createJob(
            provider,
            address(0),  // Zero evaluator
            block.timestamp + 7 days,
            "Test job",
            address(0)
        );
        
        vm.stopPrank();
    }
    
    /**
     * @dev Test that createJob succeeds with valid addresses
     */
    function test_CreateJob_SucceedsWithValidAddresses() public {
        vm.startPrank(client);
        
        uint256 jobId = agenticCommerce.createJob(
            provider,
            evaluator,
            block.timestamp + 7 days,
            "Test job",
            address(0)
        );
        
        vm.stopPrank();
        
        // Verify job was created
        assertGt(jobId, 0, "Job ID should be greater than 0");
        
        AgenticCommerce.Job memory job = agenticCommerce.getJob(jobId);
        assertEq(job.provider, provider, "Provider should be set correctly");
        assertEq(job.evaluator, evaluator, "Evaluator should be set correctly");
        assertEq(job.client, client, "Client should be msg.sender");
    }
    
    /**
     * @dev Test that createJob still works when both provider and evaluator are valid
     */
    function test_CreateJob_ValidFlow() public {
        vm.startPrank(client);
        
        uint256 jobId = agenticCommerce.createJob(
            provider,
            evaluator,
            block.timestamp + 7 days,
            "Valid job creation",
            address(0)
        );
        
        vm.stopPrank();
        
        AgenticCommerce.Job memory job = agenticCommerce.getJob(jobId);
        assertEq(uint256(job.status), 0, "Status should be Open (0)"); // 0 = Open
        assertEq(job.budget, 0, "Budget should be 0 initially");
    }
    
    /**
     * @dev Test multiple job creations to ensure counter works correctly
     */
    function test_MultipleJobCreations() public {
        vm.startPrank(client);
        
        // Create first job
        uint256 jobId1 = agenticCommerce.createJob(
            provider,
            evaluator,
            block.timestamp + 7 days,
            "First job",
            address(0)
        );
        
        // Create second job with different provider
        address provider2 = makeAddr("provider2");
        uint256 jobId2 = agenticCommerce.createJob(
            provider2,
            evaluator,
            block.timestamp + 7 days,
            "Second job",
            address(0)
        );
        
        vm.stopPrank();
        
        // Verify both jobs exist and have different IDs
        assertEq(jobId2, jobId1 + 1, "Job IDs should be sequential");
        
        AgenticCommerce.Job memory job1 = agenticCommerce.getJob(jobId1);
        AgenticCommerce.Job memory job2 = agenticCommerce.getJob(jobId2);
        
        assertEq(job1.provider, provider, "First job provider should be correct");
        assertEq(job2.provider, provider2, "Second job provider should be correct");
    }
    
    // ==================== EDGE CASES ====================
    
    /**
     * @dev Test that zero address check is enforced before other validations
     */
    function test_ZeroAddressCheck_Order() public {
        vm.startPrank(client);
        
        // This should fail on provider check first (before expiry check)
        vm.expectRevert("Zero provider");
        agenticCommerce.createJob(
            address(0),  // Zero provider - should fail here
            evaluator,
            block.timestamp - 1,  // Expired (would fail next, but provider check comes first)
            "Test",
            address(0)
        );
        
        vm.stopPrank();
    }
    
    /**
     * @dev Test that all parameters must be valid
     */
    function test_AllParametersValidated() public {
        vm.startPrank(client);
        
        // Valid provider and evaluator
        uint256 jobId = agenticCommerce.createJob(
            provider,
            evaluator,
            block.timestamp + 7 days,
            "Valid job",
            address(0)
        );
        
        AgenticCommerce.Job memory job = agenticCommerce.getJob(jobId);
        assertTrue(job.provider != address(0), "Provider should not be zero");
        assertTrue(job.evaluator != address(0), "Evaluator should not be zero");
        
        vm.stopPrank();
    }
}
