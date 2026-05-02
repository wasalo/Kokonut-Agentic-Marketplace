// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "forge-std/Test.sol";
import {MilestoneEscrow} from "../shared/MilestoneEscrow.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title MockERC20
 * @dev Simple mock ERC20 for testing
 */
contract MockERC20 is Test {
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
        totalSupply += amount;
        balanceOf[to] += amount;
    }
    
    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount);
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }
    
    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }
    
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount);
        require(allowance[from][msg.sender] >= amount);
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        return true;
    }
}

/**
 * @title MilestoneEscrowSecurityTest
 * @dev Security tests for MilestoneEscrow contract
 */
contract MilestoneEscrowSecurityTest is Test {
    MilestoneEscrow public escrow;
    MockERC20 public usdc;
    
    address public owner = address(0x1);
    address public agenticCommerce = address(0x2);
    address public client = address(0x3);
    address public provider = address(0x4);
    address public arbiter = address(0x5);
    
    uint256 constant ARBITER_STAKE = 0.01 ether;
    uint256 constant ARBITER_FEE = 0.001 ether;
    
    function setUp() public {
        vm.deal(owner, 100 ether);
        vm.deal(client, 100 ether);
        vm.deal(provider, 100 ether);
        vm.deal(arbiter, 100 ether);
        
        usdc = new MockERC20("USDC", "USDC", 6);
        usdc.mint(client, 1000e6);
        
        vm.prank(owner);
        MilestoneEscrow impl = new MilestoneEscrow();
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(impl),
            abi.encodeWithSelector(MilestoneEscrow.initialize.selector, owner, agenticCommerce)
        );
        escrow = MilestoneEscrow(address(proxy));
    }
    
    // ==========================================
    // Initialization Tests
    // ==========================================
    
    function test_Initialization_SetsOwner() public {
        assertEq(escrow.owner(), owner);
    }
    
    function test_Initialization_SetsAgenticCommerce() public {
        assertEq(escrow.agenticCommerce(), agenticCommerce);
    }
    
    // ==========================================
    // Arbiter Registration Tests
    // ==========================================
    
    function testArbiterRegistration() public {
        vm.deal(arbiter, ARBITER_STAKE);
        
        vm.prank(arbiter);
        escrow.registerAsArbiter{value: ARBITER_STAKE}();
        
        assertTrue(escrow.isRegisteredArbiter(arbiter));
        assertEq(escrow.arbiterStakes(arbiter), ARBITER_STAKE);
    }
    
    function testArbiterRegistrationInsufficientStake() public {
        vm.deal(arbiter, 0.005 ether);
        
        vm.prank(arbiter);
        vm.expectRevert(MilestoneEscrow.InsufficientArbiterStake.selector);
        escrow.registerAsArbiter{value: 0.005 ether}();
    }
    
    function testArbiterRegistrationExactStake() public {
        vm.deal(arbiter, ARBITER_STAKE);
        
        vm.prank(arbiter);
        escrow.registerAsArbiter{value: ARBITER_STAKE}();
        
        assertTrue(escrow.isRegisteredArbiter(arbiter));
    }
    
    function testArbiterRegistrationExcessStake() public {
        vm.deal(arbiter, 0.02 ether);
        
        vm.prank(arbiter);
        escrow.registerAsArbiter{value: 0.02 ether}();
        
        assertTrue(escrow.isRegisteredArbiter(arbiter));
        assertEq(escrow.arbiterStakes(arbiter), 0.02 ether);
    }
    
    function testArbiterCannotRegisterTwice() public {
        vm.deal(arbiter, ARBITER_STAKE * 2);
        
        vm.prank(arbiter);
        escrow.registerAsArbiter{value: ARBITER_STAKE}();
        
        vm.prank(arbiter);
        vm.expectRevert(MilestoneEscrow.ArbiterAlreadyRegistered.selector);
        escrow.registerAsArbiter{value: ARBITER_STAKE}();
    }
    
    function testArbiterUnregister() public {
        vm.deal(arbiter, ARBITER_STAKE);
        
        vm.prank(arbiter);
        escrow.registerAsArbiter{value: ARBITER_STAKE}();
        
        vm.prank(arbiter);
        escrow.unregisterAsArbiter();
        
        assertFalse(escrow.isRegisteredArbiter(arbiter));
        assertEq(escrow.arbiterStakes(arbiter), 0);
    }
    
    function testArbiterUnregisterNotRegistered() public {
        vm.prank(arbiter);
        vm.expectRevert(MilestoneEscrow.NotRegisteredArbiter.selector);
        escrow.unregisterAsArbiter();
    }
    
    // ==========================================
    // Enable Milestones Tests
    // ==========================================
    
    function testEnableMilestonesAnyAddress() public {
        vm.prank(client);
        escrow.enableMilestones(1, client, provider, address(usdc), 100e6);
        
        (address c, address p, address pt, uint256 budget, bool uses) = escrow.jobMilestones(1);
        assertEq(c, client);
        assertEq(p, provider);
        assertEq(pt, address(usdc));
        assertEq(budget, 100e6);
        assertTrue(uses);
    }
    
    function testEnableMilestonesFromAgenticCommerce() public {
        vm.prank(agenticCommerce);
        escrow.enableMilestones(1, client, provider, address(usdc), 100e6);
        
        (address c, address p, address pt, uint256 budget, bool uses) = escrow.jobMilestones(1);
        assertEq(c, client);
        assertEq(p, provider);
        assertEq(pt, address(usdc));
        assertEq(budget, 100e6);
        assertTrue(uses);
    }
    
    // ==========================================
    // Add Milestone Tests
    // ==========================================
    
    function testAddMilestoneOnlyClient() public {
        vm.prank(agenticCommerce);
        escrow.enableMilestones(1, client, provider, address(usdc), 100e6);
        
        vm.prank(provider);
        vm.expectRevert(MilestoneEscrow.Unauthorized.selector);
        escrow.addMilestone(1, "First milestone", 50e6, block.timestamp + 7 days);
    }
    
    function testAddMilestoneInvalidJob() public {
        vm.prank(client);
        vm.expectRevert(MilestoneEscrow.InvalidJob.selector);
        escrow.addMilestone(999, "First milestone", 50e6, block.timestamp + 7 days);
    }
    
    function testAddMilestoneSuccess() public {
        vm.prank(agenticCommerce);
        escrow.enableMilestones(1, client, provider, address(usdc), 100e6);
        
        vm.prank(client);
        escrow.addMilestone(1, "First milestone", 50e6, block.timestamp + 7 days);
        
        MilestoneEscrow.Milestone[] memory milestones = escrow.getJobMilestones(1);
        assertEq(milestones.length, 1);
        assertEq(milestones[0].amount, 50e6);
    }
    
    function testMaxMilestonesPerJob() public {
        vm.prank(agenticCommerce);
        escrow.enableMilestones(1, client, provider, address(usdc), 300e6);
        
        vm.prank(client);
        escrow.addMilestone(1, "First", 50e6, block.timestamp + 7 days);
        vm.prank(client);
        escrow.addMilestone(1, "Second", 50e6, block.timestamp + 7 days);
        vm.prank(client);
        escrow.addMilestone(1, "Third", 50e6, block.timestamp + 7 days);
        vm.prank(client);
        escrow.addMilestone(1, "Fourth", 50e6, block.timestamp + 7 days);
        vm.prank(client);
        escrow.addMilestone(1, "Fifth", 50e6, block.timestamp + 7 days);
        
        MilestoneEscrow.Milestone[] memory milestones = escrow.getJobMilestones(1);
        assertEq(milestones.length, 5);
    }
    
    function testMilestoneAmountExceedsBudget() public {
        vm.prank(agenticCommerce);
        escrow.enableMilestones(1, client, provider, address(usdc), 100e6);
        
        vm.prank(client);
        vm.expectRevert(MilestoneEscrow.MilestoneAmountExceedsBudget.selector);
        escrow.addMilestone(1, "First milestone", 150e6, block.timestamp + 7 days);
    }
    
    // ==========================================
    // Complete Milestone Tests
    // ==========================================
    
    function testCompleteMilestoneOnlyProvider() public {
        vm.prank(agenticCommerce);
        escrow.enableMilestones(1, client, provider, address(usdc), 100e6);
        
        vm.prank(client);
        escrow.addMilestone(1, "First milestone", 50e6, block.timestamp + 7 days);
        
        vm.prank(client);
        vm.expectRevert(MilestoneEscrow.Unauthorized.selector);
        escrow.completeMilestone(1, 0, keccak256("proof"));
    }
    
    function testCompleteMilestoneSuccess() public {
        vm.prank(agenticCommerce);
        escrow.enableMilestones(1, client, provider, address(usdc), 100e6);
        
        vm.prank(client);
        escrow.addMilestone(1, "First milestone", 50e6, block.timestamp + 7 days);
        
        vm.prank(provider);
        escrow.completeMilestone(1, 0, keccak256("proof"));
        
        MilestoneEscrow.Milestone[] memory milestones = escrow.getJobMilestones(1);
        assertTrue(milestones[0].completed);
        assertEq(milestones[0].proofHash, keccak256("proof"));
    }
    
    function testCompleteMilestoneAlreadyCompleted() public {
        vm.prank(agenticCommerce);
        escrow.enableMilestones(1, client, provider, address(usdc), 100e6);
        
        vm.prank(client);
        escrow.addMilestone(1, "First milestone", 50e6, block.timestamp + 7 days);
        
        vm.prank(provider);
        escrow.completeMilestone(1, 0, keccak256("proof"));
        
        vm.prank(provider);
        vm.expectRevert(MilestoneEscrow.MilestoneAlreadyCompleted.selector);
        escrow.completeMilestone(1, 0, keccak256("proof2"));
    }
    
    // ==========================================
    // Release Milestone Tests
    // ==========================================
    
    function testReleaseMilestoneInvalidJob() public {
        vm.prank(client);
        vm.expectRevert(MilestoneEscrow.InvalidJob.selector);
        escrow.releaseMilestone(999, 0);
    }
    
    function testReleaseMilestoneNotCompleted() public {
        vm.prank(agenticCommerce);
        escrow.enableMilestones(1, client, provider, address(usdc), 100e6);
        
        vm.prank(client);
        escrow.addMilestone(1, "First milestone", 50e6, block.timestamp + 7 days);
        
        vm.prank(client);
        vm.expectRevert(MilestoneEscrow.MilestoneNotCompleted.selector);
        escrow.releaseMilestone(1, 0);
    }
    
    function testReleaseMilestoneAlreadyReleased() public {
        vm.prank(agenticCommerce);
        escrow.enableMilestones(1, client, provider, address(usdc), 100e6);
        
        vm.prank(client);
        escrow.addMilestone(1, "First milestone", 50e6, block.timestamp + 7 days);
        
        vm.prank(provider);
        escrow.completeMilestone(1, 0, keccak256("proof"));
        
        usdc.mint(address(escrow), 50e6);
        
        vm.prank(client);
        escrow.releaseMilestone(1, 0);
        
        MilestoneEscrow.Milestone[] memory milestones = escrow.getJobMilestones(1);
        assertTrue(milestones[0].released);
    }
    
    function testReentrancyProtection() public {
        vm.prank(agenticCommerce);
        escrow.enableMilestones(1, client, provider, address(usdc), 100e6);
        
        vm.prank(client);
        escrow.addMilestone(1, "First milestone", 50e6, block.timestamp + 7 days);
        
        vm.prank(provider);
        escrow.completeMilestone(1, 0, keccak256("proof"));
        
        usdc.mint(address(escrow), 50e6);
        
        vm.prank(client);
        escrow.releaseMilestone(1, 0);
        
        vm.prank(client);
        vm.expectRevert(MilestoneEscrow.MilestoneAlreadyReleased.selector);
        escrow.releaseMilestone(1, 0);
    }
    
    // ==========================================
    // Dispute Tests
    // ==========================================
    
    function testDisputeFlagRequiresFee() public {
        vm.prank(agenticCommerce);
        escrow.enableMilestones(1, client, provider, address(usdc), 100e6);
        
        vm.prank(client);
        vm.expectRevert(MilestoneEscrow.InsufficientArbiterStake.selector);
        escrow.flagDispute{value: 0.0005 ether}(1);
    }
    
    function testDisputeFlagOnlyParties() public {
        vm.prank(agenticCommerce);
        escrow.enableMilestones(1, client, provider, address(usdc), 100e6);
        
        address stranger = address(0x6);
        vm.deal(stranger, 1 ether);
        vm.prank(stranger);
        vm.expectRevert(MilestoneEscrow.Unauthorized.selector);
        escrow.flagDispute{value: ARBITER_FEE}(1);
    }
    
function testDisputeFlagSuccess() public {
        vm.prank(agenticCommerce);
        escrow.enableMilestones(1, client, provider, address(usdc), 100e6);
        
        // Register an arbiter first
        vm.deal(arbiter, ARBITER_STAKE);
        vm.prank(arbiter);
        escrow.registerAsArbiter{value: ARBITER_STAKE}();
        
        vm.prank(client);
        escrow.flagDispute{value: ARBITER_FEE}(1);
        
        vm.prank(client);
        vm.expectRevert(MilestoneEscrow.DisputeAlreadyExists.selector);
        escrow.flagDispute{value: ARBITER_FEE}(1);
    }
    
    function testDisputeAlreadyExists() public {
        vm.prank(agenticCommerce);
        escrow.enableMilestones(1, client, provider, address(usdc), 100e6);
        
        // Register an arbiter first
        vm.deal(arbiter, ARBITER_STAKE);
        vm.prank(arbiter);
        escrow.registerAsArbiter{value: ARBITER_STAKE}();
        
        vm.prank(client);
        escrow.flagDispute{value: ARBITER_FEE}(1);
        
        vm.prank(client);
        vm.expectRevert(MilestoneEscrow.DisputeAlreadyExists.selector);
        escrow.flagDispute{value: ARBITER_FEE}(1);
    }
    
    // ==========================================
    // UUPS Upgrade Tests
    // ==========================================
    
    function test_UUPS_NonOwnerCannotUpgrade() public {
        MilestoneEscrow newImplementation = new MilestoneEscrow();
        
        vm.prank(client);
        vm.expectRevert();
        escrow.upgradeToAndCall(address(newImplementation), "");
    }
}