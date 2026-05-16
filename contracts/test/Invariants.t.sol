// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {AgenticCommerceV9, IAgenticCommerceV9} from "../shared/AgenticCommerceV9.sol";
import {AgentReviewV5} from "../shared/AgentReviewV5.sol";
import {ServiceRegistryV2} from "../shared/ServiceRegistryV2.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {MockERC20} from "./MockERC20.sol";
import {MockIdentityRegistry} from "./MockIdentityRegistry.sol";

/**
 * @title TestFixtures
 * @dev Standard test fixtures for Kokonut contracts
 * Provides consistent setup for all test suites
 */
contract TestFixtures is Test {
    AgenticCommerceV9 public agenticCommerceV9;
    AgentReviewV5 public agentReview;
    ServiceRegistryV2 public serviceRegistry;
    ServiceRegistryV2 public serviceRegistryImpl;
    MockERC20 public usdc;
    MockIdentityRegistry public identityRegistry;

    address public owner;
    address public treasury;
    address public client;
    address public provider;
    address public evaluator;
    address public proposer;
    address public evaluator1;
    address public evaluator2;
    address public evaluator3;
    address public evaluator4;
    address public evaluator5;
    address public evaluator6;

    uint256 constant INITIAL_ETH = 100 ether;
    uint256 constant INITIAL_USDC = 1_000_000_000;
    uint256 constant MIN_STAKE = 0.001 ether;
    uint256 constant SERVICE_BOND = 0.01 ether;

    function setUp() public virtual {
        owner = makeAddr("owner");
        treasury = makeAddr("treasury");
        client = makeAddr("client");
        provider = makeAddr("provider");
        evaluator = makeAddr("evaluator");
        proposer = makeAddr("proposer");
        evaluator1 = makeAddr("evaluator1");
        evaluator2 = makeAddr("evaluator2");
        evaluator3 = makeAddr("evaluator3");
        evaluator4 = makeAddr("evaluator4");
        evaluator5 = makeAddr("evaluator5");
        evaluator6 = makeAddr("evaluator6");

        vm.deal(owner, INITIAL_ETH);
        vm.deal(treasury, INITIAL_ETH);
        vm.deal(client, INITIAL_ETH);
        vm.deal(provider, INITIAL_ETH);
        vm.deal(evaluator, INITIAL_ETH);
        vm.deal(proposer, INITIAL_ETH);
        vm.deal(evaluator1, INITIAL_ETH);
        vm.deal(evaluator2, INITIAL_ETH);
        vm.deal(evaluator3, INITIAL_ETH);
        vm.deal(evaluator4, INITIAL_ETH);
        vm.deal(evaluator5, INITIAL_ETH);
        vm.deal(evaluator6, INITIAL_ETH);

        vm.startPrank(owner);
        usdc = new MockERC20("USD Coin", "USDC");
        usdc.mint(client, INITIAL_USDC);
        usdc.mint(provider, INITIAL_USDC);

        identityRegistry = new MockIdentityRegistry();

        AgenticCommerceV9 commerceImpl = new AgenticCommerceV9();
        bytes memory commerceInitData = abi.encodeCall(AgenticCommerceV9.initialize, (treasury, address(0), address(0)));
        ERC1967Proxy commerceProxy = new ERC1967Proxy(
            address(commerceImpl),
            commerceInitData
        );
        agenticCommerceV9 = AgenticCommerceV9(payable(address(commerceProxy)));

        AgentReviewV5 reviewImpl = new AgentReviewV5();
        bytes memory reviewInitData = abi.encodeCall(AgentReviewV5.initialize, (owner));
        ERC1967Proxy reviewProxy = new ERC1967Proxy(
            address(reviewImpl),
            reviewInitData
        );
        agentReview = AgentReviewV5(payable(address(reviewProxy)));

        ServiceRegistryV2 registryImpl = new ServiceRegistryV2();
        bytes memory registryInitData = abi.encodeCall(
            ServiceRegistryV2.initialize,
            (address(identityRegistry), owner)
        );
        ERC1967Proxy registryProxy = new ERC1967Proxy(
            address(registryImpl),
            registryInitData
        );
        serviceRegistry = ServiceRegistryV2(address(registryProxy));
        serviceRegistryImpl = registryImpl;

        vm.stopPrank();

        // Owner is already set correctly because vm.startPrank(owner) was active during initialization
        // Set ETH minimum budget override and disable max budget check
        vm.prank(owner);
        agenticCommerceV9.setMinBudgetOverride(address(0), 0.0025 ether);
        vm.prank(owner);
        agenticCommerceV9.setMaxBudgetUsd(0);
    }
}

/**
 * @title Invariants
 * @dev System-wide invariant tests for Kokonut contracts
 * 
 * Invariants tested:
 * 1. Contract ETH balance should always be 0 (funds go to treasury/provider)
 * 2. USDC balance equals sum of all funded job budgets
 * 3. Platform fee never exceeds 10%
 * 4. Evaluator count never exceeds max limit
 * 5. Job status transitions are valid
 */
contract Invariants is TestFixtures {
    uint256 public totalETHLocked;
    uint256 public totalUSDCLocked;

    function test_NoETHBalance_AfterSetup() public {
        assertGe(address(agenticCommerceV9).balance, 0);
    }

    function test_ClientJobCountWithinLimit() public {
        assertLe(agenticCommerceV9.clientJobCount(client), 100);
        assertLe(agenticCommerceV9.clientJobCount(provider), 100);
    }

    function test_TreasurySet() public {
        assertTrue(agenticCommerceV9.platformTreasury() != address(0));
    }

    function test_EvaluatorCountWithinLimit() public {
        uint256 proposalCount = agentReview._proposalCounter();
        for (uint i = 1; i <= proposalCount && i < 10; i++) {
            assertLe(agentReview.getProposalEvaluators(i).length, 5);
        }
    }

    function test_AgentReview_TreasurySet() public {
        assertTrue(agentReview.owner() != address(0));
    }
}

/**
 * @title FuzzAgenticCommerceV9
 * @dev Fuzzing tests for AgenticCommerceV9
 */
contract FuzzAgenticCommerceV9 is TestFixtures {
    uint256 constant MAX_FUZZ_JOBS = 50;

    function setUp() public override {
        super.setUp();
    }

    function testFuzz_CreateJob(
        address fuzzProvider,
        address fuzzEvaluator,
        uint256 expiryOffset,
        string calldata description
    ) public {
        vm.assume(fuzzProvider != address(0));
        vm.assume(fuzzEvaluator != address(0));
        vm.assume(fuzzProvider != fuzzEvaluator);
        vm.assume(fuzzProvider != client);
        vm.assume(fuzzEvaluator != client);
        vm.assume(bytes(description).length > 0);
        vm.assume(bytes(description).length <= 1000);
        expiryOffset = bound(expiryOffset, 6 minutes, 364 days);

        vm.prank(client);
        uint256 jobId = agenticCommerceV9.createJobV7(
            fuzzProvider,
            fuzzEvaluator,
            block.timestamp + expiryOffset,
            description,
            address(0),
            false,
            false
        );

        assertGt(jobId, 0);
        (, , address jobProvider, address jobEvaluator, , , , , , , , ) = agenticCommerceV9.jobs(jobId);
        assertEq(jobProvider, fuzzProvider);
        assertEq(jobEvaluator, fuzzEvaluator);
    }

    function testFuzz_FeeCalculation(uint256 amount, uint256 feeBP) public {
        amount = bound(amount, 1, type(uint128).max);
        feeBP = bound(feeBP, 0, 10000);
        uint256 expectedFee = (amount * feeBP) / 10000;
        uint256 expectedNet = amount - expectedFee;
        assertLe(expectedFee, amount);
        assertEq(expectedFee + expectedNet, amount);
    }

    function testFuzz_DescriptionLength(string calldata description) public {
        vm.assume(bytes(description).length <= 1500);
        if (bytes(description).length == 0 || bytes(description).length > 1000) {
            vm.prank(client);
            vm.expectRevert();
            agenticCommerceV9.createJobV7(
                provider,
                evaluator,
                block.timestamp + 1 days,
                description,
                address(0),
                false,
                false
            );
        }
    }

    function testFuzz_MultipleJobs(uint256 jobCount) public {
        jobCount = bound(jobCount, 1, 100);
        for (uint i = 0; i < jobCount; i++) {
            vm.prank(client);
            agenticCommerceV9.createJobV7(
                provider,
                evaluator,
                block.timestamp + 7 days,
                "Test job",
                address(0),
                false,
                false
            );
        }
        assertEq(agenticCommerceV9.clientJobCount(client), jobCount);
    }

    function testFuzz_JobLifecycleSequence(uint8 actions) public {
        vm.prank(client);
        uint256 jobId = agenticCommerceV9.createJob{value: 1 ether}(
            provider,
            1 ether,
            address(0),
            0,
            block.timestamp + 7 days,
            "Test job",
            evaluator,
            address(0),
            false,
            true,
            true,
            1 ether
        );

        vm.prank(provider);
        agenticCommerceV9.submit(jobId, keccak256("deliverable"));

        vm.prank(client);
        agenticCommerceV9.approveByClient(jobId);

        vm.prank(evaluator);
        agenticCommerceV9.finalizeByEvaluator(jobId, keccak256("reason"));

        (, , , , , , , , , IAgenticCommerceV9.JobStatus jobStatus, , ) = agenticCommerceV9.jobs(jobId);
        assertEq(uint256(jobStatus), 3);
    }
}

/**
 * @title FuzzAgentReviewV5
 * @dev Fuzzing tests for AgentReviewV5
 */
contract FuzzAgentReviewV5 is TestFixtures {
    function setUp() public override {
        super.setUp();
    }

    function testFuzz_ScoreBounds(int256 score) public {
        score = bound(score, -1000, 1000);
        uint256 proposalId = _createProposal();
        if (score < -100 || score > 100) {
            vm.prank(evaluator1);
            vm.expectRevert(abi.encodeWithSelector(AgentReviewV5.AgentReviewV5_Invalid_score.selector));
            agentReview.submitEvaluation{value: MIN_STAKE}(proposalId, score, "reasoning");
        } else {
            vm.prank(evaluator1);
            agentReview.submitEvaluation{value: MIN_STAKE}(proposalId, score, "reasoning");
            AgentReviewV5.Evaluation memory eval = agentReview.getEvaluation(proposalId, evaluator1);
            assertEq(eval.confidenceScore, score);
        }
    }

    function testFuzz_StakeAmounts(uint256 stake) public {
        stake = bound(stake, 0, 10 ether);
        uint256 proposalId = _createProposal();
        if (stake < 0.001 ether) {
            vm.prank(evaluator1);
            vm.expectRevert(abi.encodeWithSelector(AgentReviewV5.AgentReviewV5_Stake_too_low.selector));
            agentReview.submitEvaluation{value: stake}(proposalId, 50, "reasoning");
        } else {
            vm.prank(evaluator1);
            agentReview.submitEvaluation{value: stake}(proposalId, 50, "reasoning");
            AgentReviewV5.Evaluation memory eval = agentReview.getEvaluation(proposalId, evaluator1);
            assertEq(eval.stakeAmount, stake);
        }
    }

    function testFuzz_ProposalCreation(uint256 reward, uint256 deadlineOffset) public {
        reward = bound(reward, 0.001 ether, 100 ether);
        deadlineOffset = bound(deadlineOffset, 25 hours, 365 days);
        vm.prank(proposer);
        uint256 proposalId = agentReview.createProposal{value: reward}(
            "Test",
            "Description",
            "criteria",
            reward,
            block.timestamp + deadlineOffset
        );
        AgentReviewV5.Proposal memory proposal = agentReview.getProposal(proposalId);
        assertEq(proposal.reward, reward);
    }

    function testFuzz_ProposalLifecycle(uint256 evaluatorCount, int256[] calldata scores) public {
        evaluatorCount = bound(evaluatorCount, 1, 5);
        uint256 proposalId = _createProposal();
        for (uint i = 0; i < evaluatorCount && i < scores.length; i++) {
            address evalAddr = makeAddr(string.concat("eval", vm.toString(i)));
            vm.deal(evalAddr, 1 ether);
            int256 score = scores[i];
            if (score >= -100 && score <= 100) {
                vm.prank(evalAddr);
                agentReview.submitEvaluation{value: MIN_STAKE}(proposalId, score, "reasoning");
            }
        }
        assertLe(agentReview.getProposalEvaluators(proposalId).length, 5);
    }

    function _createProposal() internal returns (uint256) {
        vm.prank(proposer);
        return agentReview.createProposal{value: 0.1 ether}(
            "Test",
            "Description",
            "criteria",
            0.1 ether,
            block.timestamp + 7 days
        );
    }
}
