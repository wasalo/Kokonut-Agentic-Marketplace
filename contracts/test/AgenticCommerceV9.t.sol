// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {AgenticCommerceV9, IAgenticCommerceV9} from "../shared/AgenticCommerceV9.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {MockERC20} from "./TestFixtures.sol";

contract AgenticCommerceV9Test is Test {
    AgenticCommerceV9 public implementation;
    ERC1967Proxy public proxy;
    AgenticCommerceV9 public commerce;
    MockERC20 public usdc;

    address public owner = makeAddr("owner");
    address public treasury = makeAddr("treasury");
    address public client = makeAddr("client");
    address public provider = makeAddr("provider");
    address public evaluator = makeAddr("evaluator");
    address public hook = makeAddr("hook");

    uint256 constant INITIAL_ETH = 100 ether;
    uint256 constant INITIAL_USDC = 1_000_000_000; // 1000 USDC (6 decimals)

    event JobCreated(uint256 indexed jobId, address indexed client, address provider, uint256 budget, uint256 expiredAt, bool evaluatorFee, bool clientReview, bool randomEvaluator);
    event JobFunded(uint256 indexed jobId, address indexed client, uint256 amount);
    event JobSubmitted(uint256 indexed jobId, address indexed provider, bytes32 deliverable);
    event JobStatusChanged(uint256 indexed jobId, IAgenticCommerceV9.JobStatus oldStatus, IAgenticCommerceV9.JobStatus newStatus, address changedBy, uint256 timestamp);
    event PaymentReleased(uint256 indexed jobId, uint256 providerAmount, uint256 platformFee, uint256 evaluatorFee);

    function setUp() public {
        vm.prank(owner);
        implementation = new AgenticCommerceV9();

        bytes memory initData = abi.encodeCall(AgenticCommerceV9.initialize, (treasury, address(0), address(0)));
        proxy = new ERC1967Proxy(
            address(implementation),
            initData
        );
        commerce = AgenticCommerceV9(payable(address(proxy)));

        // Proxy constructor calls initialize via delegatecall; _msgSender() = address(this)
        // So the test contract is the owner. Transfer to the intended owner (2-step).
        commerce.transferOwnership(owner);
        vm.prank(owner);
        commerce.acceptOwnership();

        usdc = new MockERC20("USD Coin", "USDC", 6);
        usdc.mint(client, INITIAL_USDC);

        vm.deal(client, INITIAL_ETH);
        vm.deal(provider, INITIAL_ETH);
        vm.deal(evaluator, INITIAL_ETH);

        // Set ETH minimum budget override to bypass oracle call for address(0)
        vm.prank(owner);
        commerce.setMinBudgetOverride(address(0), 0.0025 ether);

        // Disable max budget check (avoids oracle call for ETH price)
        vm.prank(owner);
        commerce.setMaxBudgetUsd(0);
    }

    // ── Initialization ──────────────────────────────────────────────────────

    function testInitialize() public {
        assertEq(commerce.owner(), owner);
        assertEq(commerce.platformTreasury(), treasury);
        assertEq(commerce.minBudgetUsd(), 5e6);
        assertTrue(commerce.allowedTokens(address(0)));
    }

    function testInitializeRevertIfCalledTwice() public {
        vm.prank(owner);
        vm.expectRevert();
        commerce.initialize(treasury, address(0), address(0));
    }

    // ── Job Creation (V9 createJob) ─────────────────────────────────────────

    function testCreateJobWithUSDC() public {
        uint256 budget = 100e6; // 100 USDC
        uint256 expiredAt = block.timestamp + 7 days;

        // Set USDC as allowed and stablecoin
        vm.prank(owner);
        commerce.setAllowedToken(address(usdc), true);
        vm.prank(owner);
        commerce.setStablecoin(address(usdc), true);

        vm.prank(owner);
        commerce.setMinBudgetOverride(address(usdc), 5e6);

        vm.prank(client);
        usdc.approve(address(commerce), budget);

        vm.prank(client);
        vm.expectEmit(true, true, false, true);
        emit JobCreated(1, client, provider, budget, expiredAt, false, true, false);

        uint256 jobId = commerce.createJob(
            provider,
            budget,
            address(usdc),
            0,
            expiredAt,
            "Test job",
            evaluator,
            address(0),
            false,
            true,
            true,
            budget
        );

        assertEq(jobId, 1);
        (uint256 id, address jobClient, address jobProvider, address jobEvaluator, , IAgenticCommerceV9.JobStatus status) = _getJobBasic(jobId);
        assertEq(id, jobId);
        assertEq(jobClient, client);
        assertEq(jobProvider, provider);
        assertEq(jobEvaluator, evaluator);
        assertEq(uint8(status), 1); // Funded
    }

    function testCreateJobWithETH() public {
        uint256 budget = 0.1 ether;
        uint256 expiredAt = block.timestamp + 7 days;

        vm.prank(client);
        vm.expectEmit(true, true, false, true);
        emit JobCreated(1, client, provider, budget, expiredAt, false, true, false);

        uint256 jobId = commerce.createJob{value: budget}(
            provider,
            budget,
            address(0),
            0,
            expiredAt,
            "ETH job",
            evaluator,
            address(0),
            false,
            true,
            true,
            budget
        );

        assertEq(jobId, 1);
    }

    function testCreateJobOpenStatus() public {
        uint256 budget = 100e6;
        uint256 expiredAt = block.timestamp + 7 days;

        vm.prank(owner);
        commerce.setAllowedToken(address(usdc), true);
        vm.prank(owner);
        commerce.setStablecoin(address(usdc), true);
        vm.prank(owner);
        commerce.setMinBudgetOverride(address(usdc), 5e6);

        vm.prank(client);
        usdc.approve(address(commerce), budget);

        vm.prank(client);
        uint256 jobId = commerce.createJob(
            provider,
            budget,
            address(usdc),
            0,
            expiredAt,
            "Open job",
            evaluator,
            address(0),
            false,
            true,
            false, // fundNow = false
            0
        );

        (, , , , , IAgenticCommerceV9.JobStatus status) = _getJobBasic(jobId);
        assertEq(uint8(status), 0); // Open
    }

    function testCreateJobRevertIfTokenNotAllowed() public {
        uint256 expiredAt = block.timestamp + 7 days;
        vm.prank(client);
        vm.expectRevert(abi.encodeWithSelector(AgenticCommerceV9.TokenNotAllowed.selector, address(usdc)));
        commerce.createJob(
            provider, 100e6, address(usdc), 0, expiredAt, "Test", evaluator, address(0), false, true, true, 100e6
        );
    }

    function testCreateJobRevertIfBudgetTooLow() public {
        uint256 expiredAt = block.timestamp + 7 days;
        vm.prank(owner);
        commerce.setAllowedToken(address(usdc), true);
        vm.prank(owner);
        commerce.setStablecoin(address(usdc), true);

        vm.prank(client);
        usdc.approve(address(commerce), 1e6);

        vm.prank(client);
        vm.expectRevert(AgenticCommerceV9.BudgetTooLow.selector);
        commerce.createJob(
            provider, 1e6, address(usdc), 0, expiredAt, "Test", evaluator, address(0), false, true, true, 1e6
        );
    }

    function testCreateJobRevertIfProviderIsZero() public {
        uint256 expiredAt = block.timestamp + 7 days;
        vm.prank(client);
        vm.expectRevert(AgenticCommerceV9.ZeroAddress.selector);
        commerce.createJob{value: 0.1 ether}(
            address(0), 0.1 ether, address(0), 0, expiredAt, "Test", evaluator, address(0), false, true, true, 0.1 ether
        );
    }

    function testCreateJobRevertIfProviderIsClient() public {
        uint256 expiredAt = block.timestamp + 7 days;
        vm.prank(client);
        vm.expectRevert(AgenticCommerceV9.RolesMustBeDistinct.selector);
        commerce.createJob{value: 0.1 ether}(
            client, 0.1 ether, address(0), 0, expiredAt, "Test", evaluator, address(0), false, true, true, 0.1 ether
        );
    }

    function testCreateJobRevertIfExpiryTooShort() public {
        uint256 expiredAt = block.timestamp + 1 minutes;
        vm.prank(client);
        vm.expectRevert(AgenticCommerceV9.ExpiryTooShort.selector);
        commerce.createJob{value: 0.1 ether}(
            provider, 0.1 ether, address(0), 0, expiredAt, "Test", evaluator, address(0), false, true, true, 0.1 ether
        );
    }

    function testCreateJobRevertIfMaxJobsPerClient() public {
        uint256 expiredAt = block.timestamp + 7 days;
        for (uint256 i = 0; i < 100; i++) {
            vm.prank(client);
            commerce.createJob{value: 0.0025 ether}(
                provider, 0.0025 ether, address(0), 0, expiredAt, string(abi.encodePacked("Job ", uint256ToString(i))), evaluator, address(0), false, true, true, 0.0025 ether
            );
        }

        vm.prank(client);
        vm.expectRevert(abi.encodeWithSelector(AgenticCommerceV9.MaxJobsPerClient.selector, client, 100));
        commerce.createJob{value: 0.0025 ether}(
            provider, 0.0025 ether, address(0), 0, expiredAt, "Job 101", evaluator, address(0), false, true, true, 0.0025 ether
        );
    }

    // ── CreateJobV7 (backward compat) ───────────────────────────────────────

    function testCreateJobV7() public {
        uint256 expiredAt = block.timestamp + 7 days;

        vm.prank(client);
        uint256 jobId = commerce.createJobV7(
            provider, evaluator, expiredAt, "V7 job", address(0), false, true
        );

        assertEq(jobId, 1);
        (, address jobClient, address jobProvider, , , ) = _getJobBasic(jobId);
        assertEq(jobClient, client);
        assertEq(jobProvider, provider);
    }

    // ── Set Budget & Payment Token ──────────────────────────────────────────

    function testSetBudget() public {
        uint256 expiredAt = block.timestamp + 7 days;
        vm.prank(client);
        uint256 jobId = commerce.createJobV7(provider, evaluator, expiredAt, "Test", address(0), false, true);

        vm.prank(owner);
        commerce.setAllowedToken(address(usdc), true);
        vm.prank(owner);
        commerce.setStablecoin(address(usdc), true);
        vm.prank(owner);
        commerce.setMinBudgetOverride(address(usdc), 5e6);

        vm.prank(client);
        commerce.setPaymentToken(jobId, address(usdc));

        vm.prank(client);
        commerce.setBudget(jobId, 100e6);

        (uint256 id2, , , , ,) = _getJobBasic(jobId);
        assertEq(id2, jobId);
    }

    function testSetBudgetRevertIfNotClient() public {
        uint256 expiredAt = block.timestamp + 7 days;
        vm.prank(client);
        uint256 jobId = commerce.createJobV7(provider, evaluator, expiredAt, "Test", address(0), false, true);

        vm.prank(provider);
        vm.expectRevert(AgenticCommerceV9.Unauthorized.selector);
        commerce.setBudget(jobId, 100e6);
    }

    function testSetBudgetRevertIfNotOpen() public {
        uint256 expiredAt = block.timestamp + 7 days;
        vm.prank(client);
        uint256 jobId = commerce.createJob{value: 0.1 ether}(
            provider, 0.1 ether, address(0), 0, expiredAt, "Test", evaluator, address(0), false, true, true, 0.1 ether
        );

        vm.prank(client);
        vm.expectRevert(AgenticCommerceV9.WrongStatus.selector);
        commerce.setBudget(jobId, 0.2 ether);
    }

    // ── Fund ────────────────────────────────────────────────────────────────

    function testFundWithETH() public {
        uint256 budget = 0.1 ether;
        uint256 expiredAt = block.timestamp + 7 days;

        vm.prank(client);
        uint256 jobId = commerce.createJob(
            provider, budget, address(0), 0, expiredAt, "Test", evaluator, address(0), false, true, false, 0
        );

        vm.prank(client);
        commerce.fund{value: budget}(jobId, budget);

        (, , , , , IAgenticCommerceV9.JobStatus status) = _getJobBasic(jobId);
        assertEq(uint8(status), 1); // Funded
    }

    function testFundWithUSDC() public {
        uint256 budget = 100e6;
        uint256 expiredAt = block.timestamp + 7 days;

        vm.prank(client);
        uint256 jobId = commerce.createJobV7(provider, evaluator, expiredAt, "Test", address(0), false, true);

        vm.prank(owner);
        commerce.setAllowedToken(address(usdc), true);
        vm.prank(owner);
        commerce.setStablecoin(address(usdc), true);
        vm.prank(owner);
        commerce.setMinBudgetOverride(address(usdc), 5e6);

        vm.prank(client);
        commerce.setPaymentToken(jobId, address(usdc));
        vm.prank(client);
        commerce.setBudget(jobId, budget);

        vm.prank(client);
        usdc.approve(address(commerce), budget);
        vm.prank(client);
        commerce.fund(jobId, budget);

        (, , , , , IAgenticCommerceV9.JobStatus status) = _getJobBasic(jobId);
        assertEq(uint8(status), 1);
    }

    function testFundRevertIfBudgetMismatch() public {
        uint256 budget = 0.1 ether;
        uint256 expiredAt = block.timestamp + 7 days;

        vm.prank(client);
        uint256 jobId = commerce.createJob(
            provider, budget, address(0), 0, expiredAt, "Test", evaluator, address(0), false, true, false, 0
        );

        vm.prank(client);
        commerce.fund{value: budget}(jobId, budget);

        vm.prank(client);
        vm.expectRevert(abi.encodeWithSelector(AgenticCommerceV9.WrongStatus.selector));
        commerce.fund{value: budget}(jobId, budget);
    }

    // ── Submit & Approve ────────────────────────────────────────────────────

    function testSubmitWithClientReview() public {
        uint256 budget = 0.1 ether;
        uint256 expiredAt = block.timestamp + 7 days;

        vm.prank(client);
        uint256 jobId = commerce.createJob{value: budget}(
            provider, budget, address(0), 0, expiredAt, "Test", evaluator, address(0), false, true, true, budget
        );

        bytes32 deliverable = keccak256("deliverable");
        vm.prank(provider);
        vm.expectEmit(true, true, false, true);
        emit JobSubmitted(jobId, provider, deliverable);
        commerce.submit(jobId, deliverable);

        (, , , , , IAgenticCommerceV9.JobStatus status) = _getJobBasic(jobId);
        assertEq(uint8(status), 6); // PendingClientApproval
    }

    function testApproveByClient() public {
        uint256 budget = 0.1 ether;
        uint256 expiredAt = block.timestamp + 7 days;

        vm.prank(client);
        uint256 jobId = commerce.createJob{value: budget}(
            provider, budget, address(0), 0, expiredAt, "Test", evaluator, address(0), false, true, true, budget
        );

        vm.prank(provider);
        commerce.submit(jobId, keccak256("deliverable"));

        vm.prank(client);
        commerce.approveByClient(jobId);

        (, , , , , IAgenticCommerceV9.JobStatus status) = _getJobBasic(jobId);
        assertEq(uint8(status), 2); // Submitted
    }

    function testFinalizeByEvaluator() public {
        uint256 budget = 0.1 ether;
        uint256 expiredAt = block.timestamp + 7 days;

        vm.prank(client);
        uint256 jobId = commerce.createJob{value: budget}(
            provider, budget, address(0), 0, expiredAt, "Test", evaluator, address(0), false, true, true, budget
        );

        vm.prank(provider);
        commerce.submit(jobId, keccak256("deliverable"));

        vm.prank(client);
        commerce.approveByClient(jobId);

        uint256 clientBalanceBefore = client.balance;
        uint256 providerBalanceBefore = provider.balance;
        uint256 treasuryBalanceBefore = treasury.balance;
        uint256 evaluatorBalanceBefore = evaluator.balance;

        vm.prank(evaluator);
        commerce.finalizeByEvaluator(jobId, keccak256("approved"));

        (, , , , , IAgenticCommerceV9.JobStatus status) = _getJobBasic(jobId);
        assertEq(uint8(status), 3); // Completed

        uint256 platformFee = (budget * 100) / 10000;
        assertEq(provider.balance, providerBalanceBefore + budget - platformFee);
        assertEq(treasury.balance, treasuryBalanceBefore + platformFee);
    }

    // ── Reject ──────────────────────────────────────────────────────────────

    function testRejectOpenJob() public {
        uint256 budget = 100e6;
        uint256 expiredAt = block.timestamp + 7 days;

        vm.prank(owner);
        commerce.setAllowedToken(address(usdc), true);
        vm.prank(owner);
        commerce.setStablecoin(address(usdc), true);
        vm.prank(owner);
        commerce.setMinBudgetOverride(address(usdc), 5e6);

        vm.prank(client);
        usdc.approve(address(commerce), budget);

        vm.prank(client);
        uint256 jobId = commerce.createJob(
            provider, budget, address(usdc), 0, expiredAt, "Test", evaluator, address(0), false, true, false, 0
        );

        vm.prank(client);
        commerce.reject(jobId, keccak256("changed mind"));

        (, , , , , IAgenticCommerceV9.JobStatus status) = _getJobBasic(jobId);
        assertEq(uint8(status), 4); // Rejected
    }

    // ── Refund & Timeout ────────────────────────────────────────────────────

    function testClaimRefund() public {
        uint256 budget = 0.1 ether;
        uint256 expiredAt = block.timestamp + 7 days;

        vm.prank(client);
        uint256 jobId = commerce.createJob{value: budget}(
            provider, budget, address(0), 0, expiredAt, "Test", evaluator, address(0), false, true, true, budget
        );

        vm.warp(block.timestamp + 8 days);

        uint256 clientBalanceBefore = client.balance;
        vm.prank(client);
        commerce.claimRefund(jobId);

        (, , , , , IAgenticCommerceV9.JobStatus status) = _getJobBasic(jobId);
        assertEq(uint8(status), 5); // Expired
        assertEq(client.balance, clientBalanceBefore + budget);
    }

    function testRefundExpired() public {
        uint256 budget = 0.1 ether;
        uint256 expiredAt = block.timestamp + 7 days;

        vm.prank(client);
        uint256 jobId = commerce.createJob{value: budget}(
            provider, budget, address(0), 0, expiredAt, "Test", evaluator, address(0), false, true, true, budget
        );

        vm.warp(block.timestamp + 8 days);

        uint256 clientBalanceBefore = client.balance;
        address stranger = makeAddr("stranger");
        vm.prank(stranger);
        commerce.refundExpired(jobId);

        (, , , , , IAgenticCommerceV9.JobStatus status) = _getJobBasic(jobId);
        assertEq(uint8(status), 5); // Expired
        assertEq(client.balance, clientBalanceBefore + budget);
    }

    function testRejectFundedJobByEvaluator() public {
        uint256 budget = 0.1 ether;
        uint256 expiredAt = block.timestamp + 7 days;

        vm.prank(client);
        uint256 jobId = commerce.createJob{value: budget}(
            provider, budget, address(0), 0, expiredAt, "Test", evaluator, address(0), false, true, true, budget
        );

        uint256 clientBalanceBefore = client.balance;
        vm.prank(evaluator);
        commerce.reject(jobId, keccak256("bad provider"));

        (, , , , , IAgenticCommerceV9.JobStatus status) = _getJobBasic(jobId);
        assertEq(uint8(status), 4);
        assertEq(client.balance, clientBalanceBefore + budget);
    }

    function testCompleteAfterTimeout() public {
        uint256 budget = 0.1 ether;
        uint256 expiredAt = block.timestamp + 7 days;

        vm.prank(client);
        uint256 jobId = commerce.createJob{value: budget}(
            provider, budget, address(0), 0, expiredAt, "Test", evaluator, address(0), false, true, true, budget
        );

        vm.prank(provider);
        commerce.submit(jobId, keccak256("deliverable"));

        vm.warp(block.timestamp + 8 days);

        uint256 providerBalanceBefore = provider.balance;
        vm.prank(provider);
        commerce.completeAfterTimeout(jobId, keccak256("evaluator timeout"));

        (, , , , , IAgenticCommerceV9.JobStatus status) = _getJobBasic(jobId);
        assertEq(uint8(status), 3); // Completed
        assertTrue(provider.balance > providerBalanceBefore);
    }

    // ── Evaluator Pool ──────────────────────────────────────────────────────

    function testRegisterAsEvaluator() public {
        vm.prank(evaluator);
        commerce.registerAsEvaluator{value: 0.01 ether}();

        assertTrue(commerce.isRegisteredEvaluator(evaluator));
        assertEq(commerce.getEvaluatorPoolSize(), 1);
    }

    function testRegisterAsEvaluatorRevertIfInsufficientStake() public {
        vm.prank(evaluator);
        vm.expectRevert(AgenticCommerceV9.InsufficientEvaluatorStake.selector);
        commerce.registerAsEvaluator{value: 0.005 ether}();
    }

    function testUnregisterAsEvaluator() public {
        vm.prank(evaluator);
        commerce.registerAsEvaluator{value: 0.01 ether}();

        uint256 balanceBefore = evaluator.balance;
        vm.prank(evaluator);
        commerce.unregisterAsEvaluator();

        assertFalse(commerce.isRegisteredEvaluator(evaluator));
        assertEq(commerce.getEvaluatorPoolSize(), 0);
        assertTrue(evaluator.balance > balanceBefore);
    }

    function testCleanupStaleEvaluators() public {
        vm.prank(evaluator);
        commerce.registerAsEvaluator{value: 0.01 ether}();

        // slashEvaluatorStake already removes the evaluator from the pool
        vm.prank(owner);
        commerce.slashEvaluatorStake(evaluator, "bad");

        assertFalse(commerce.isRegisteredEvaluator(evaluator));
        assertEq(commerce.getEvaluatorPoolSize(), 0);

        // cleanupStaleEvaluators returns 0 since evaluator was already removed
        uint256 removed = commerce.cleanupStaleEvaluators(0);
        assertEq(removed, 0);
    }

    // ── Admin Functions ─────────────────────────────────────────────────────

    function testSetPlatformTreasury() public {
        address newTreasury = makeAddr("newTreasury");
        vm.prank(owner);
        commerce.setPlatformTreasury(newTreasury);
        assertEq(commerce.platformTreasury(), newTreasury);
    }

    function testPauseUnpause() public {
        vm.prank(owner);
        commerce.pause();

        vm.prank(client);
        vm.expectRevert();
        commerce.createJobV7(provider, evaluator, block.timestamp + 7 days, "Test", address(0), false, true);

        vm.prank(owner);
        commerce.unpause();

        vm.prank(client);
        commerce.createJobV7(provider, evaluator, block.timestamp + 7 days, "Test", address(0), false, true);
    }

    function testSetMinBudgetUsd() public {
        vm.prank(owner);
        commerce.setMinBudgetUsd(10e6);
        assertEq(commerce.minBudgetUsd(), 10e6);
    }

    function testSetMaxBudgetUsd() public {
        vm.prank(owner);
        commerce.setMaxBudgetUsd(2_000_000e6);
        assertEq(commerce.maxBudgetUsd(), 2_000_000e6);
    }

    function testSetStablecoin() public {
        vm.prank(owner);
        commerce.setStablecoin(address(usdc), true);
        assertTrue(commerce.isStablecoin(address(usdc)));
    }

    // ── Upgrade ─────────────────────────────────────────────────────────────

    function testUpgrade() public {
        AgenticCommerceV9 newImpl = new AgenticCommerceV9();
        vm.prank(owner);
        commerce.upgradeToAndCall(address(newImpl), "");
        assertTrue(true);
    }

    function testUpgradeRevertIfNotOwner() public {
        AgenticCommerceV9 newImpl = new AgenticCommerceV9();
        vm.prank(client);
        vm.expectRevert();
        commerce.upgradeToAndCall(address(newImpl), "");
    }

    // ── Helper ──────────────────────────────────────────────────────────────

    function _getJobBasic(uint256 jobId) internal view returns (
        uint256 id,
        address jobClient,
        address jobProvider,
        address jobEvaluator,
        uint256 budget,
        IAgenticCommerceV9.JobStatus status
    ) {
        (id, jobClient, jobProvider, jobEvaluator, , , , budget, , status, , ) = commerce.jobs(jobId);
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
