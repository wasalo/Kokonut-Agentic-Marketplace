// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {MilestoneEscrowV2} from "../shared/MilestoneEscrowV2.sol";
import {TransparentUpgradeableProxy} from "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import {MockERC20} from "./TestFixtures.sol";

contract MockCommerceJobView {
    struct Job {
        uint256 id;
        address client;
        address provider;
        address evaluator;
        uint256 serviceId;
        address paymentToken;
        string description;
        uint256 budget;
        uint256 expiredAt;
        uint8 status;
        address hook;
        bytes32 deliverable;
    }

    mapping(uint256 => Job) public jobs;

    function setJob(uint256 jobId, address client, address provider, address paymentToken, uint256 budget) external {
        jobs[jobId] = Job({
            id: jobId,
            client: client,
            provider: provider,
            evaluator: address(0),
            serviceId: 0,
            paymentToken: paymentToken,
            description: "test job",
            budget: budget,
            expiredAt: block.timestamp + 7 days,
            status: 1,
            hook: address(0),
            deliverable: bytes32(0)
        });
    }
}

contract MilestoneEscrowV2Test is Test {
    MilestoneEscrowV2 public implementation;
    TransparentUpgradeableProxy public proxy;
    MilestoneEscrowV2 public escrow;
    MockERC20 public usdc;

    address public owner = makeAddr("owner");
    address public client = makeAddr("client");
    address public provider = makeAddr("provider");
    address public arbiter1 = makeAddr("arbiter1");
    address public arbiter2 = makeAddr("arbiter2");
    address public commerce = makeAddr("commerce");

    uint256 constant TOTAL_BUDGET = 1000e6; // 1000 USDC
    uint256 constant ARBITER_FEE = 10e6; // 10 USDC
    uint256 constant ARBITER_STAKE = 100e6; // 100 USDC

    event MilestoneEnabled(uint256 indexed jobId);
    event MilestoneAdded(uint256 indexed jobId, uint256 indexed milestoneIndex, string description, uint256 amount);
    event MilestoneCompleted(uint256 indexed jobId, uint256 indexed milestoneIndex, bytes32 proofHash);
    event MilestoneReleased(uint256 indexed jobId, uint256 indexed milestoneIndex, uint256 amount);
    event DisputeFlagged(uint256 indexed jobId, address indexed flagger, address token, uint256 fee);
    event DisputeResolved(uint256 indexed jobId, bool releasedToProvider, address indexed arbiter, address token, uint256 arbiterFee);

    function setUp() public {
        vm.prank(owner);
        implementation = new MilestoneEscrowV2();

        bytes memory initData = abi.encodeCall(MilestoneEscrowV2.initialize, (owner, address(0)));
        proxy = new TransparentUpgradeableProxy(
            address(implementation),
            owner,
            initData
        );
        escrow = MilestoneEscrowV2(address(proxy));

        usdc = new MockERC20("USD Coin", "USDC", 6);

        // Fund accounts
        usdc.mint(client, TOTAL_BUDGET * 10);
        usdc.mint(provider, ARBITER_FEE * 10);
        usdc.mint(arbiter1, ARBITER_STAKE * 2);
        usdc.mint(arbiter2, ARBITER_STAKE * 2);

        vm.deal(client, 10 ether);
        vm.deal(arbiter1, 10 ether);

        // Configure USDC support
        vm.prank(owner);
        escrow.setSupportedToken(address(usdc), true);
        vm.prank(owner);
        escrow.setArbiterFee(address(usdc), ARBITER_FEE);
        vm.prank(owner);
        escrow.setArbiterStake(address(usdc), ARBITER_STAKE);
    }

    // ── Initialization ──────────────────────────────────────────────────────

    function testInitialize() public {
        assertEq(escrow.owner(), owner);
        assertEq(escrow.agenticCommerce(), address(0));
        assertTrue(escrow.supportedTokens(address(usdc)));
    }

    function testInitializeRevertIfCalledTwice() public {
        vm.prank(owner);
        vm.expectRevert();
        escrow.initialize(owner, commerce);
    }

    // ── Enable Milestones ───────────────────────────────────────────────────

    function testEnableMilestonesByCommerce() public {
        // Since agenticCommerce is address(0) in tests, client is the authorized caller
        vm.prank(client);
        vm.expectEmit(true, false, false, false);
        emit MilestoneEnabled(1);
        escrow.enableMilestones(1, client, provider, address(usdc), TOTAL_BUDGET);

        (address jobClient, address jobProvider, address paymentToken, uint256 totalBudget, bool usesMilestones) = escrow.jobMilestones(1);
        assertEq(jobClient, client);
        assertEq(jobProvider, provider);
        assertEq(paymentToken, address(usdc));
        assertEq(totalBudget, TOTAL_BUDGET);
        assertTrue(usesMilestones);
    }

    function testEnableMilestonesByClient() public {
        vm.prank(client);
        escrow.enableMilestones(1, client, provider, address(usdc), TOTAL_BUDGET);

        (address jobClient, , , , bool usesMilestones) = escrow.jobMilestones(1);
        assertEq(jobClient, client);
        assertTrue(usesMilestones);
    }

    function testEnableMilestonesRevertIfUnauthorized() public {
        vm.prank(provider);
        vm.expectRevert(MilestoneEscrowV2.Unauthorized.selector);
        escrow.enableMilestones(1, client, provider, address(usdc), TOTAL_BUDGET);
    }

    function testEnableMilestonesRevertIfTokenNotSupported() public {
        address fakeToken = makeAddr("fakeToken");
        vm.prank(client);
        vm.expectRevert(MilestoneEscrowV2.TokenNotSupported.selector);
        escrow.enableMilestones(1, client, provider, fakeToken, TOTAL_BUDGET);
    }

    function testEnableMilestonesRevertIfClientIsProvider() public {
        vm.prank(client);
        vm.expectRevert(MilestoneEscrowV2.InvalidJob.selector);
        escrow.enableMilestones(1, client, client, address(usdc), TOTAL_BUDGET);
    }

    function testEnableMilestonesRevertIfLinkedJobMismatches() public {
        MockCommerceJobView linkedCommerce = new MockCommerceJobView();
        linkedCommerce.setJob(1, client, provider, address(usdc), TOTAL_BUDGET);

        vm.prank(owner);
        escrow.setAgenticCommerce(address(linkedCommerce));

        vm.prank(client);
        vm.expectRevert(MilestoneEscrowV2.InvalidJob.selector);
        escrow.enableMilestones(1, client, provider, address(usdc), TOTAL_BUDGET + 1);
    }

    function testEnableMilestonesWithLinkedJob() public {
        MockCommerceJobView linkedCommerce = new MockCommerceJobView();
        linkedCommerce.setJob(1, client, provider, address(usdc), TOTAL_BUDGET);

        vm.prank(owner);
        escrow.setAgenticCommerce(address(linkedCommerce));

        vm.prank(client);
        escrow.enableMilestones(1, client, provider, address(usdc), TOTAL_BUDGET);

        (address jobClient, address jobProvider, address paymentToken, uint256 totalBudget, bool usesMilestones) = escrow.jobMilestones(1);
        assertEq(jobClient, client);
        assertEq(jobProvider, provider);
        assertEq(paymentToken, address(usdc));
        assertEq(totalBudget, TOTAL_BUDGET);
        assertTrue(usesMilestones);
    }

    // ── Add Milestone ───────────────────────────────────────────────────────

    function testAddMilestone() public {
        _enableTestMilestones(1);

        vm.prank(client);
        vm.expectEmit(true, true, false, true);
        emit MilestoneAdded(1, 0, "Design phase", 300e6);
        escrow.addMilestone(1, 300e6, "Design phase", block.timestamp + 7 days);

        MilestoneEscrowV2.Milestone[] memory milestones = escrow.getJobMilestones(1);
        assertEq(milestones.length, 1);
        assertEq(milestones[0].amount, 300e6);
        assertEq(milestones[0].description, "Design phase");
    }

    function testAddMultipleMilestones() public {
        _enableTestMilestones(1);

        vm.prank(client);
        escrow.addMilestone(1, 300e6, "Design", block.timestamp + 7 days);
        vm.prank(client);
        escrow.addMilestone(1, 400e6, "Development", block.timestamp + 14 days);
        vm.prank(client);
        escrow.addMilestone(1, 300e6, "Testing", block.timestamp + 21 days);

        MilestoneEscrowV2.Milestone[] memory milestones = escrow.getJobMilestones(1);
        assertEq(milestones.length, 3);
        assertEq(escrow.milestoneTotalAmount(1), 1000e6);
    }

    function testAddMilestoneRevertIfExceedsBudget() public {
        _enableTestMilestones(1);

        vm.prank(client);
        escrow.addMilestone(1, 600e6, "Phase 1", block.timestamp + 7 days);

        vm.prank(client);
        vm.expectRevert(MilestoneEscrowV2.MilestoneAmountExceedsBudget.selector);
        escrow.addMilestone(1, 500e6, "Phase 2", block.timestamp + 14 days);
    }

    function testAddMilestoneRevertIfNotClient() public {
        _enableTestMilestones(1);

        vm.prank(provider);
        vm.expectRevert(MilestoneEscrowV2.Unauthorized.selector);
        escrow.addMilestone(1, 300e6, "Design", block.timestamp + 7 days);
    }

    function testAddMilestoneRevertIfTooMany() public {
        _enableTestMilestones(1);

        for (uint256 i = 0; i < 10; i++) {
            vm.prank(client);
            escrow.addMilestone(1, 100e6, string(abi.encodePacked("Milestone ", uint256ToString(i))), block.timestamp + 7 days);
        }

        vm.prank(client);
        vm.expectRevert(MilestoneEscrowV2.TooManyMilestones.selector);
        escrow.addMilestone(1, 1e6, "Extra", block.timestamp + 7 days);
    }

    // ── Submit Milestone ────────────────────────────────────────────────────

    function testSubmitMilestone() public {
        _enableTestMilestones(1);
        _addMilestoneAsClient(1, 300e6, "Design", block.timestamp + 7 days);

        bytes32 proofHash = keccak256("design deliverable");
        vm.prank(provider);
        vm.expectEmit(true, true, false, true);
        emit MilestoneCompleted(1, 0, proofHash);
        escrow.submitMilestone(1, 0, proofHash);

        MilestoneEscrowV2.Milestone[] memory milestones = escrow.getJobMilestones(1);
        assertTrue(milestones[0].completed);
        assertEq(milestones[0].proofHash, proofHash);
    }

    function testSubmitMilestoneRevertIfNotProvider() public {
        _enableTestMilestones(1);
        _addMilestoneAsClient(1, 300e6, "Design", block.timestamp + 7 days);

        vm.prank(client);
        vm.expectRevert(MilestoneEscrowV2.Unauthorized.selector);
        escrow.submitMilestone(1, 0, keccak256("proof"));
    }

    function testSubmitMilestoneRevertIfAlreadyCompleted() public {
        _enableTestMilestones(1);
        _addMilestoneAsClient(1, 300e6, "Design", block.timestamp + 7 days);

        vm.prank(provider);
        escrow.submitMilestone(1, 0, keccak256("proof"));

        vm.prank(provider);
        vm.expectRevert(MilestoneEscrowV2.MilestoneAlreadyCompleted.selector);
        escrow.submitMilestone(1, 0, keccak256("proof2"));
    }

    function testSubmitMilestoneRevertIfIndexOutOfBounds() public {
        _enableTestMilestones(1);

        vm.prank(provider);
        vm.expectRevert(MilestoneEscrowV2.MilestoneIndexOutOfBounds.selector);
        escrow.submitMilestone(1, 0, keccak256("proof"));
    }

    // ── Release Milestone ───────────────────────────────────────────────────

    function testReleaseMilestone() public {
        _enableTestMilestones(1);
        _addMilestoneAsClient(1, 300e6, "Design", block.timestamp + 7 days);

        vm.prank(provider);
        escrow.submitMilestone(1, 0, keccak256("proof"));

        _fundMilestones(1, 300e6);

        uint256 providerBalanceBefore = usdc.balanceOf(provider);
        vm.prank(client);
        vm.expectEmit(true, true, false, true);
        emit MilestoneReleased(1, 0, 300e6);
        escrow.releaseMilestone(1, 0);

        assertEq(usdc.balanceOf(provider), providerBalanceBefore + 300e6);

        MilestoneEscrowV2.Milestone[] memory milestones = escrow.getJobMilestones(1);
        assertTrue(milestones[0].released);
    }

    function testReleaseMilestoneRevertIfNotCompleted() public {
        _enableTestMilestones(1);
        _addMilestoneAsClient(1, 300e6, "Design", block.timestamp + 7 days);

        vm.prank(client);
        vm.expectRevert(MilestoneEscrowV2.MilestoneNotCompleted.selector);
        escrow.releaseMilestone(1, 0);
    }

    function testReleaseMilestoneRevertIfAlreadyReleased() public {
        _enableTestMilestones(1);
        _addMilestoneAsClient(1, 300e6, "Design", block.timestamp + 7 days);

        vm.prank(provider);
        escrow.submitMilestone(1, 0, keccak256("proof"));
        _fundMilestones(1, 300e6);

        vm.prank(client);
        escrow.releaseMilestone(1, 0);

        vm.prank(client);
        vm.expectRevert(MilestoneEscrowV2.MilestoneAlreadyReleased.selector);
        escrow.releaseMilestone(1, 0);
    }

    function testReleaseMilestoneRevertIfJobEscrowUnfunded() public {
        _enableTestMilestones(1);
        _addMilestoneAsClient(1, 300e6, "Design", block.timestamp + 7 days);

        vm.prank(provider);
        escrow.submitMilestone(1, 0, keccak256("proof"));

        usdc.mint(address(escrow), 300e6);

        vm.prank(client);
        vm.expectRevert(MilestoneEscrowV2.InsufficientMilestoneBalance.selector);
        escrow.releaseMilestone(1, 0);
    }

    function testReleaseMilestoneUsesOnlyMatchingJobBalance() public {
        _enableTestMilestones(1);
        _addMilestoneAsClient(1, 300e6, "Design", block.timestamp + 7 days);
        _enableTestMilestones(2);
        _addMilestoneAsClient(2, 300e6, "Design", block.timestamp + 7 days);

        vm.prank(provider);
        escrow.submitMilestone(1, 0, keccak256("proof"));

        _fundMilestones(2, 300e6);

        vm.prank(client);
        vm.expectRevert(MilestoneEscrowV2.InsufficientMilestoneBalance.selector);
        escrow.releaseMilestone(1, 0);
    }

    function testReleaseNativeMilestone() public {
        vm.prank(owner);
        escrow.setSupportedToken(address(0), true);

        vm.prank(client);
        escrow.enableMilestones(1, client, provider, address(0), 1 ether);

        vm.prank(client);
        escrow.addMilestone(1, 0.3 ether, "Native", block.timestamp + 7 days);

        vm.prank(provider);
        escrow.submitMilestone(1, 0, keccak256("proof"));

        vm.prank(client);
        escrow.fundMilestones{value: 0.3 ether}(1, 0.3 ether);

        uint256 providerBalanceBefore = provider.balance;
        vm.prank(client);
        escrow.releaseMilestone(1, 0);

        assertEq(provider.balance, providerBalanceBefore + 0.3 ether);
        assertEq(escrow.milestoneEscrowBalance(1), 0);
    }

    // ── Arbiter Registration ────────────────────────────────────────────────

    function testRegisterArbiter() public {
        vm.prank(arbiter1);
        usdc.approve(address(escrow), ARBITER_STAKE);
        vm.prank(arbiter1);
        escrow.registerAsArbiter(address(usdc), ARBITER_STAKE);

        assertTrue(escrow.isRegisteredArbiter(arbiter1));
        assertEq(escrow.arbiterStakes(arbiter1), ARBITER_STAKE);
        assertEq(escrow.getArbiters().length, 1);
    }

    function testRegisterArbiterRevertIfInsufficientStake() public {
        vm.prank(arbiter1);
        usdc.approve(address(escrow), ARBITER_STAKE - 1);
        vm.prank(arbiter1);
        vm.expectRevert(MilestoneEscrowV2.InsufficientArbiterStake.selector);
        escrow.registerAsArbiter(address(usdc), ARBITER_STAKE - 1);
    }

    function testUnregisterArbiter() public {
        vm.prank(arbiter1);
        usdc.approve(address(escrow), ARBITER_STAKE);
        vm.prank(arbiter1);
        escrow.registerAsArbiter(address(usdc), ARBITER_STAKE);

        uint256 balanceBefore = usdc.balanceOf(arbiter1);
        vm.prank(arbiter1);
        escrow.unregisterAsArbiter();

        assertFalse(escrow.isRegisteredArbiter(arbiter1));
        assertEq(usdc.balanceOf(arbiter1), balanceBefore + ARBITER_STAKE);
    }

    function testNativeArbiterSlashAndWithdrawToken() public {
        vm.prank(owner);
        escrow.setSupportedToken(address(0), true);
        vm.prank(owner);
        escrow.setArbiterStake(address(0), 1 ether);

        vm.deal(arbiter1, 2 ether);
        vm.prank(arbiter1);
        escrow.registerAsArbiter{value: 1 ether}(address(0), 1 ether);

        uint256 ownerBalanceBefore = owner.balance;
        vm.prank(owner);
        escrow.slashArbiter(arbiter1, "bad decision");
        assertEq(owner.balance, ownerBalanceBefore + 0.5 ether);
        assertEq(escrow.arbiterStakes(arbiter1), 0.5 ether);

        vm.deal(address(escrow), address(escrow).balance + 0.2 ether);
        ownerBalanceBefore = owner.balance;
        vm.prank(owner);
        escrow.withdrawToken(address(0), 0.2 ether);
        assertEq(owner.balance, ownerBalanceBefore + 0.2 ether);
    }

    // ── Disputes ────────────────────────────────────────────────────────────

    function testFlagDispute() public {
        _enableTestMilestones(1);
        _addMilestoneAsClient(1, 300e6, "Design", block.timestamp + 7 days);

        // Register arbiter
        vm.prank(arbiter1);
        usdc.approve(address(escrow), ARBITER_STAKE);
        vm.prank(arbiter1);
        escrow.registerAsArbiter(address(usdc), ARBITER_STAKE);

        // Client pays dispute fee
        vm.prank(client);
        usdc.approve(address(escrow), ARBITER_FEE);
        vm.prank(client);
        vm.expectEmit(true, true, false, true);
        emit DisputeFlagged(1, client, address(usdc), ARBITER_FEE);
        escrow.flagDispute(1, 0);

        (, address flagger, , uint256 flaggedAt, , , , uint256 milestoneIndex) = escrow.disputes(1);
        assertEq(flagger, client);
        assertTrue(flaggedAt > 0);
        assertEq(milestoneIndex, 0);
    }

    function testResolveDisputeToProvider() public {
        _enableTestMilestones(1);
        _addMilestoneAsClient(1, 300e6, "Design", block.timestamp + 7 days);

        vm.prank(arbiter1);
        usdc.approve(address(escrow), ARBITER_STAKE);
        vm.prank(arbiter1);
        escrow.registerAsArbiter(address(usdc), ARBITER_STAKE);

        vm.prank(client);
        usdc.approve(address(escrow), ARBITER_FEE);
        vm.prank(client);
        escrow.flagDispute(1, 0);

        _fundMilestones(1, 300e6);
        uint256 providerBalanceBefore = usdc.balanceOf(provider);

        vm.prank(arbiter1);
        escrow.resolveDispute(1, true);

        assertEq(usdc.balanceOf(provider), providerBalanceBefore + 300e6);
    }

    function testResolveDisputeRevertIfNotArbiter() public {
        _enableTestMilestones(1);
        _addMilestoneAsClient(1, 300e6, "Design", block.timestamp + 7 days);

        vm.prank(arbiter1);
        usdc.approve(address(escrow), ARBITER_STAKE);
        vm.prank(arbiter1);
        escrow.registerAsArbiter(address(usdc), ARBITER_STAKE);

        vm.prank(client);
        usdc.approve(address(escrow), ARBITER_FEE);
        vm.prank(client);
        escrow.flagDispute(1, 0);

        vm.prank(client);
        vm.expectRevert(MilestoneEscrowV2.OnlyArbiterOrParty.selector);
        escrow.resolveDispute(1, true);
    }

    // ── Admin Functions ─────────────────────────────────────────────────────

    function testSetArbiterFee() public {
        vm.prank(owner);
        escrow.setArbiterFee(address(usdc), 20e6);
        assertEq(escrow.arbiterFeePerToken(address(usdc)), 20e6);
    }

    function testSetArbiterStake() public {
        vm.prank(owner);
        escrow.setArbiterStake(address(usdc), 200e6);
        assertEq(escrow.arbiterStakePerToken(address(usdc)), 200e6);
    }

    function testSetSupportedToken() public {
        address newToken = makeAddr("newToken");
        vm.prank(owner);
        escrow.setSupportedToken(newToken, true);
        assertTrue(escrow.supportedTokens(newToken));
    }

    function testPauseUnpause() public {
        vm.prank(owner);
        escrow.pause();

        vm.prank(client);
        vm.expectRevert();
        escrow.enableMilestones(1, client, provider, address(usdc), TOTAL_BUDGET);

        vm.prank(owner);
        escrow.unpause();

        vm.prank(client);
        escrow.enableMilestones(1, client, provider, address(usdc), TOTAL_BUDGET);
    }

    // ── Upgrade ─────────────────────────────────────────────────────────────

    function testUpgrade() public {
        MilestoneEscrowV2 newImpl = new MilestoneEscrowV2();
        vm.prank(owner);
        escrow.upgradeToAndCall(address(newImpl), "");
        assertTrue(true);
    }

    function testUpgradeRevertIfNotOwner() public {
        MilestoneEscrowV2 newImpl = new MilestoneEscrowV2();
        vm.prank(client);
        vm.expectRevert();
        escrow.upgradeToAndCall(address(newImpl), "");
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    function _enableTestMilestones(uint256 jobId) internal {
        vm.prank(client);
        escrow.enableMilestones(jobId, client, provider, address(usdc), TOTAL_BUDGET);
    }

    function _addMilestoneAsClient(uint256 jobId, uint256 amount, string memory description, uint256 dueDate) internal {
        vm.prank(client);
        escrow.addMilestone(jobId, amount, description, dueDate);
    }

    function _fundMilestones(uint256 jobId, uint256 amount) internal {
        vm.startPrank(client);
        usdc.approve(address(escrow), amount);
        escrow.fundMilestones(jobId, amount);
        vm.stopPrank();
    }

    function uint256ToString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}
