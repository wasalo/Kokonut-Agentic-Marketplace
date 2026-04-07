// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {AgentReviewV5, IAgentReviewV5} from "../shared/AgentReviewV5.sol";
import {TransparentUpgradeableProxy} from "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";

contract AgentReviewV5Test is Test {
    AgentReviewV5 public implementation;
    TransparentUpgradeableProxy public proxy;
    AgentReviewV5 public agentReview;

    address public owner = makeAddr("owner");
    address public slashManager = makeAddr("slashManager");
    address public proposer = makeAddr("proposer");
    address public evaluator1 = makeAddr("evaluator1");
    address public evaluator2 = makeAddr("evaluator2");
    address public evaluator3 = makeAddr("evaluator3");

    uint256 public constant MIN_STAKE = 0.001 ether;
    uint256 public constant SLASH_PERCENTAGE = 5000;
    uint256 public constant FEE_DENOMINATOR = 10000;

    event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string title, uint256 reward);
    event EvaluationSubmitted(uint256 indexed proposalId, address indexed evaluator, int256 confidenceScore, uint256 stakeAmount);
    event DecisionAttested(uint256 indexed proposalId, address indexed attestor, address indexed winningEvaluator);
    event SlashManagerSet(address indexed slashManager);

    function setUp() public {
        vm.prank(owner);
        implementation = new AgentReviewV5();

        bytes memory initData = abi.encodeWithSelector(AgentReviewV5.initialize.selector, owner);
        
        proxy = new TransparentUpgradeableProxy(
            address(implementation),
            owner,
            initData
        );

        agentReview = AgentReviewV5(payable(address(proxy)));
    }

    function testInitialize() public {
        assertEq(agentReview.owner(), owner);
    }

    function testCreateProposal() public {
        uint256 reward = 1 ether;
        uint256 deadline = block.timestamp + 7 days;

        vm.deal(proposer, 2 ether);
        vm.prank(proposer);
        vm.expectEmit(true, true, true, true);
        emit ProposalCreated(1, proposer, "Test Proposal", reward);
        uint256 proposalId = agentReview.createProposal{value: reward}(
            "Test Proposal",
            "Test Description",
            "ipfs://criteria",
            reward,
            deadline
        );

        assertEq(proposalId, 1);

        IAgentReviewV5.Proposal memory proposal = agentReview.getProposal(1);
        assertEq(proposal.title, "Test Proposal");
        assertEq(proposal.description, "Test Description");
        assertEq(proposal.reward, reward);
    }

    function testCreateProposalRevertIfInsufficientValue() public {
        uint256 reward = 1 ether;
        uint256 deadline = block.timestamp + 7 days;

        vm.deal(proposer, 0.5 ether);
        vm.prank(proposer);
        vm.expectRevert("Exact ETH required");
        agentReview.createProposal{value: 0.5 ether}(
            "Test Proposal",
            "Test Description",
            "ipfs://criteria",
            reward,
            deadline
        );
    }

    function testCreateProposalRevertIfExcessValue() public {
        uint256 reward = 1 ether;
        uint256 deadline = block.timestamp + 7 days;

        vm.deal(proposer, 2 ether);
        vm.prank(proposer);
        vm.expectRevert("Exact ETH required");
        agentReview.createProposal{value: 2 ether}(
            "Test Proposal",
            "Test Description",
            "ipfs://criteria",
            reward,
            deadline
        );
    }

    function testCreateProposalExactValueSuccess() public {
        uint256 reward = 1 ether;
        uint256 deadline = block.timestamp + 7 days;

        vm.deal(proposer, 2 ether);
        vm.prank(proposer);
        uint256 proposalId = agentReview.createProposal{value: reward}(
            "Test Proposal",
            "Test Description",
            "ipfs://criteria",
            reward,
            deadline
        );

        assertEq(proposalId, 1);
        assertEq(address(agentReview).balance, reward);
    }

    function testCreateProposalRevertIfDeadlinePassed() public {
        uint256 reward = 1 ether;
        uint256 deadline = block.timestamp - 1;

        vm.deal(proposer, 2 ether);
        vm.prank(proposer);
        vm.expectRevert("Deadline in past");
        agentReview.createProposal{value: reward}(
            "Test Proposal",
            "Test Description",
            "ipfs://criteria",
            reward,
            deadline
        );
    }

    function testSubmitEvaluation() public {
        uint256 reward = 1 ether;
        uint256 deadline = block.timestamp + 7 days;

        vm.deal(proposer, 2 ether);
        vm.prank(proposer);
        uint256 proposalId = agentReview.createProposal{value: reward}(
            "Test Proposal",
            "Test Description",
            "ipfs://criteria",
            reward,
            deadline
        );

        vm.deal(evaluator1, 1 ether);
        vm.prank(evaluator1);
        vm.expectEmit(true, true, true, true);
        emit EvaluationSubmitted(proposalId, evaluator1, 80, MIN_STAKE);
        agentReview.submitEvaluation{value: MIN_STAKE}(proposalId, 80, "ipfs://reasoning");

        address[] memory evaluators = agentReview.getProposalEvaluators(proposalId);
        assertEq(evaluators.length, 1);
        assertEq(evaluators[0], evaluator1);
    }

    function testSubmitEvaluationRevertIfDeadlinePassed() public {
        uint256 reward = 1 ether;
        uint256 deadline = block.timestamp + 7 days;

        vm.deal(proposer, 2 ether);
        vm.prank(proposer);
        uint256 proposalId = agentReview.createProposal{value: reward}(
            "Test Proposal",
            "Test Description",
            "ipfs://criteria",
            reward,
            deadline
        );

        vm.deal(evaluator1, 1 ether);
        vm.prank(evaluator1);
        agentReview.submitEvaluation{value: MIN_STAKE}(proposalId, 80, "ipfs://reasoning");

        vm.warp(deadline + 1);

        vm.deal(evaluator2, 1 ether);
        vm.prank(evaluator2);
        vm.expectRevert("Deadline passed");
        agentReview.submitEvaluation{value: MIN_STAKE}(proposalId, 90, "ipfs://reasoning");
    }

    function testSubmitEvaluationRevertIfSelfEvaluation() public {
        uint256 reward = 1 ether;
        uint256 deadline = block.timestamp + 7 days;

        vm.deal(proposer, 2 ether);
        vm.prank(proposer);
        uint256 proposalId = agentReview.createProposal{value: reward}(
            "Test Proposal",
            "Test Description",
            "ipfs://criteria",
            reward,
            deadline
        );

        vm.deal(proposer, 1 ether);
        vm.prank(proposer);
        vm.expectRevert("Cannot evaluate own proposal");
        agentReview.submitEvaluation{value: MIN_STAKE}(proposalId, 80, "ipfs://reasoning");
    }

    function testSubmitEvaluationRevertIfMaxEvaluatorsReached() public {
        uint256 reward = 1 ether;
        uint256 deadline = block.timestamp + 7 days;

        vm.deal(proposer, 10 ether);
        vm.prank(proposer);
        uint256 proposalId = agentReview.createProposal{value: reward}(
            "Test Proposal",
            "Test Description",
            "ipfs://criteria",
            reward,
            deadline
        );

        address[] memory evaluators = new address[](5);
        evaluators[0] = makeAddr("eval1");
        evaluators[1] = makeAddr("eval2");
        evaluators[2] = makeAddr("eval3");
        evaluators[3] = makeAddr("eval4");
        evaluators[4] = makeAddr("eval5");

        for (uint256 i = 0; i < 5; i++) {
            vm.deal(evaluators[i], 1 ether);
            vm.prank(evaluators[i]);
            agentReview.submitEvaluation{value: MIN_STAKE}(proposalId, 80 + int256(i), "ipfs://reasoning");
        }

        vm.deal(evaluator1, 1 ether);
        vm.prank(evaluator1);
        vm.expectRevert("Max evaluators reached");
        agentReview.submitEvaluation{value: MIN_STAKE}(proposalId, 90, "ipfs://reasoning");
    }

    function testAttestDecision() public {
        uint256 reward = 1 ether;
        uint256 deadline = block.timestamp + 7 days;
        uint256 stakeAmount = MIN_STAKE;

        vm.deal(proposer, 3 ether);
        vm.prank(proposer);
        uint256 proposalId = agentReview.createProposal{value: reward}(
            "Test Proposal",
            "Test Description",
            "ipfs://criteria",
            reward,
            deadline
        );

        vm.deal(evaluator1, 1 ether);
        vm.prank(evaluator1);
        agentReview.submitEvaluation{value: stakeAmount}(proposalId, 80, "ipfs://reasoning1");

        vm.deal(evaluator2, 1 ether);
        vm.prank(evaluator2);
        agentReview.submitEvaluation{value: stakeAmount}(proposalId, 95, "ipfs://reasoning2");

        vm.prank(proposer);
        agentReview.setUnderReview(proposalId);

        vm.warp(deadline + 1);

        vm.prank(proposer);
        vm.expectEmit(true, true, true, true);
        emit DecisionAttested(proposalId, proposer, evaluator2);
        agentReview.attestDecision(proposalId, evaluator2);

        IAgentReviewV5.Proposal memory proposal = agentReview.getProposal(proposalId);
        assertEq(proposal.winningEvaluator, evaluator2);
    }

    function testAttestDecisionRevertIfNotProposer() public {
        uint256 reward = 1 ether;
        uint256 deadline = block.timestamp + 7 days;

        vm.deal(proposer, 2 ether);
        vm.prank(proposer);
        uint256 proposalId = agentReview.createProposal{value: reward}(
            "Test Proposal",
            "Test Description",
            "ipfs://criteria",
            reward,
            deadline
        );

        vm.deal(evaluator1, 1 ether);
        vm.prank(evaluator1);
        agentReview.submitEvaluation{value: MIN_STAKE}(proposalId, 80, "ipfs://reasoning");

        vm.prank(proposer);
        agentReview.setUnderReview(proposalId);

        vm.warp(deadline + 1);

        vm.prank(evaluator1);
        vm.expectRevert("Not proposer");
        agentReview.attestDecision(proposalId, evaluator1);
    }

    function testAttestDecisionRevertIfDeadlineNotPassed() public {
        uint256 reward = 1 ether;
        uint256 deadline = block.timestamp + 7 days;

        vm.deal(proposer, 2 ether);
        vm.prank(proposer);
        uint256 proposalId = agentReview.createProposal{value: reward}(
            "Test Proposal",
            "Test Description",
            "ipfs://criteria",
            reward,
            deadline
        );

        vm.deal(evaluator1, 1 ether);
        vm.prank(evaluator1);
        agentReview.submitEvaluation{value: MIN_STAKE}(proposalId, 80, "ipfs://reasoning");

        vm.prank(proposer);
        agentReview.setUnderReview(proposalId);

        vm.prank(proposer);
        vm.expectRevert("Deadline not passed");
        agentReview.attestDecision(proposalId, evaluator1);
    }

    function testClaimReward() public {
        uint256 reward = 1 ether;
        uint256 deadline = block.timestamp + 7 days;
        uint256 stakeAmount = MIN_STAKE;

        vm.deal(proposer, 3 ether);
        vm.prank(proposer);
        uint256 proposalId = agentReview.createProposal{value: reward}(
            "Test Proposal",
            "Test Description",
            "ipfs://criteria",
            reward,
            deadline
        );

        vm.deal(evaluator1, 1 ether);
        vm.prank(evaluator1);
        agentReview.submitEvaluation{value: stakeAmount}(proposalId, 80, "ipfs://reasoning1");

        vm.deal(evaluator2, 2 ether);
        vm.prank(evaluator2);
        agentReview.submitEvaluation{value: stakeAmount}(proposalId, 95, "ipfs://reasoning2");

        vm.prank(proposer);
        agentReview.setUnderReview(proposalId);

        vm.warp(deadline + 1);

        vm.prank(proposer);
        agentReview.attestDecision(proposalId, evaluator2);

        uint256 evaluator2BalanceBeforeClaim = evaluator2.balance;
        uint256 rewardAmount = stakeAmount + reward;
        
        vm.prank(evaluator2);
        agentReview.claimReward(proposalId);
        
        assertEq(evaluator2.balance, evaluator2BalanceBeforeClaim + rewardAmount);
    }

    function testClaimRewardRevertIfNotWinner() public {
        uint256 reward = 1 ether;
        uint256 deadline = block.timestamp + 7 days;
        uint256 stakeAmount = MIN_STAKE;

        vm.deal(proposer, 3 ether);
        vm.prank(proposer);
        uint256 proposalId = agentReview.createProposal{value: reward}(
            "Test Proposal",
            "Test Description",
            "ipfs://criteria",
            reward,
            deadline
        );

        vm.deal(evaluator1, 1 ether);
        vm.prank(evaluator1);
        agentReview.submitEvaluation{value: stakeAmount}(proposalId, 80, "ipfs://reasoning1");

        vm.deal(evaluator2, 1 ether);
        vm.prank(evaluator2);
        agentReview.submitEvaluation{value: stakeAmount}(proposalId, 95, "ipfs://reasoning2");

        vm.prank(proposer);
        agentReview.setUnderReview(proposalId);

        vm.warp(deadline + 1);

        vm.prank(proposer);
        agentReview.attestDecision(proposalId, evaluator2);

        vm.prank(evaluator1);
        vm.expectRevert("Not winner");
        agentReview.claimReward(proposalId);
    }

    function testClaimRewardRevertIfAlreadyClaimed() public {
        uint256 reward = 1 ether;
        uint256 deadline = block.timestamp + 7 days;
        uint256 stakeAmount = MIN_STAKE;

        vm.deal(proposer, 3 ether);
        vm.prank(proposer);
        uint256 proposalId = agentReview.createProposal{value: reward}(
            "Test Proposal",
            "Test Description",
            "ipfs://criteria",
            reward,
            deadline
        );

        vm.deal(evaluator1, 1 ether);
        vm.prank(evaluator1);
        agentReview.submitEvaluation{value: stakeAmount}(proposalId, 80, "ipfs://reasoning1");

        vm.deal(evaluator2, 1 ether);
        vm.prank(evaluator2);
        agentReview.submitEvaluation{value: stakeAmount}(proposalId, 95, "ipfs://reasoning2");

        vm.prank(proposer);
        agentReview.setUnderReview(proposalId);

        vm.warp(deadline + 1);

        vm.prank(proposer);
        agentReview.attestDecision(proposalId, evaluator2);

        vm.prank(evaluator2);
        agentReview.claimReward(proposalId);

        vm.prank(evaluator2);
        vm.expectRevert("Already claimed");
        agentReview.claimReward(proposalId);
    }

    function testReleaseStake() public {
        uint256 reward = 1 ether;
        uint256 deadline = block.timestamp + 7 days;
        uint256 stakeAmount = MIN_STAKE;

        vm.deal(proposer, 3 ether);
        vm.prank(proposer);
        uint256 proposalId = agentReview.createProposal{value: reward}(
            "Test Proposal",
            "Test Description",
            "ipfs://criteria",
            reward,
            deadline
        );

        vm.deal(evaluator1, 1 ether);
        vm.prank(evaluator1);
        agentReview.submitEvaluation{value: stakeAmount}(proposalId, 80, "ipfs://reasoning1");

        vm.deal(evaluator2, 1 ether);
        vm.prank(evaluator2);
        agentReview.submitEvaluation{value: stakeAmount}(proposalId, 95, "ipfs://reasoning2");

        vm.prank(proposer);
        agentReview.setUnderReview(proposalId);

        vm.warp(deadline + 1);

        vm.prank(proposer);
        agentReview.attestDecision(proposalId, evaluator2);

        uint256 evaluator1BalanceBefore = evaluator1.balance;
        
        vm.prank(evaluator1);
        agentReview.releaseStake(proposalId);
        
        assertEq(evaluator1.balance, evaluator1BalanceBefore + stakeAmount);
    }

    function testReleaseStakeRevertIfAlreadyReleased() public {
        uint256 reward = 1 ether;
        uint256 deadline = block.timestamp + 7 days;
        uint256 stakeAmount = MIN_STAKE;

        vm.deal(proposer, 3 ether);
        vm.prank(proposer);
        uint256 proposalId = agentReview.createProposal{value: reward}(
            "Test Proposal",
            "Test Description",
            "ipfs://criteria",
            reward,
            deadline
        );

        vm.deal(evaluator1, 1 ether);
        vm.prank(evaluator1);
        agentReview.submitEvaluation{value: stakeAmount}(proposalId, 80, "ipfs://reasoning1");

        vm.deal(evaluator2, 1 ether);
        vm.prank(evaluator2);
        agentReview.submitEvaluation{value: stakeAmount}(proposalId, 95, "ipfs://reasoning2");

        vm.prank(proposer);
        agentReview.setUnderReview(proposalId);

        vm.warp(deadline + 1);

        vm.prank(proposer);
        agentReview.attestDecision(proposalId, evaluator2);

        vm.prank(evaluator1);
        agentReview.releaseStake(proposalId);

        vm.prank(evaluator1);
        vm.expectRevert("Already released");
        agentReview.releaseStake(proposalId);
    }

    function testSetSlashManager() public {
        vm.prank(owner);
        vm.expectEmit(true, false, false, true);
        emit SlashManagerSet(slashManager);
        agentReview.setSlashManager(slashManager);

        assertEq(agentReview.slashManager(), slashManager);
    }

    function testSetSlashManagerRevertIfNotOwner() public {
        vm.prank(proposer);
        vm.expectRevert();
        agentReview.setSlashManager(slashManager);
    }

    function testSetSlashManagerRevertIfZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert();
        agentReview.setSlashManager(address(0));
    }

    function testSlashEvaluator() public {
        uint256 reward = 1 ether;
        uint256 deadline = block.timestamp + 7 days;
        uint256 stakeAmount = 1 ether;

        vm.deal(proposer, 2 ether);
        vm.prank(proposer);
        uint256 proposalId = agentReview.createProposal{value: reward}(
            "Test Proposal",
            "Test Description",
            "ipfs://criteria",
            reward,
            deadline
        );

        vm.deal(evaluator1, 2 ether);
        vm.prank(evaluator1);
        agentReview.submitEvaluation{value: stakeAmount}(proposalId, 80, "ipfs://reasoning1");

        vm.prank(owner);
        agentReview.setSlashManager(slashManager);

        vm.prank(proposer);
        agentReview.setUnderReview(proposalId);

        vm.prank(slashManager);
        agentReview.slashEvaluator(evaluator1, proposalId, "Bad evaluation");

        uint256 slashAmount = (stakeAmount * SLASH_PERCENTAGE) / FEE_DENOMINATOR;
        assertEq(owner.balance, slashAmount);
    }

    function testSlashEvaluatorRevertIfNotSlashManager() public {
        uint256 reward = 1 ether;
        uint256 deadline = block.timestamp + 7 days;
        uint256 stakeAmount = 1 ether;

        vm.deal(proposer, 2 ether);
        vm.prank(proposer);
        uint256 proposalId = agentReview.createProposal{value: reward}(
            "Test Proposal",
            "Test Description",
            "ipfs://criteria",
            reward,
            deadline
        );

        vm.deal(evaluator1, 2 ether);
        vm.prank(evaluator1);
        agentReview.submitEvaluation{value: stakeAmount}(proposalId, 80, "ipfs://reasoning1");

        vm.prank(owner);
        agentReview.setSlashManager(slashManager);

        vm.prank(proposer);
        vm.expectRevert("Not slashManager");
        agentReview.slashEvaluator(evaluator1, proposalId, "Bad evaluation");
    }

    function testGetTotalLockedETH() public {
        uint256 reward1 = 1 ether;
        uint256 reward2 = 2 ether;
        uint256 deadline = block.timestamp + 7 days;
        uint256 stakeAmount = MIN_STAKE;

        vm.deal(proposer, 5 ether);
        vm.prank(proposer);
        agentReview.createProposal{value: reward1}(
            "Proposal 1",
            "Description",
            "ipfs://criteria",
            reward1,
            deadline
        );
        agentReview.createProposal{value: reward2}(
            "Proposal 2",
            "Description",
            "ipfs://criteria",
            reward2,
            deadline
        );

        vm.deal(evaluator1, 2 ether);
        vm.prank(evaluator1);
        agentReview.submitEvaluation{value: stakeAmount}(1, 80, "ipfs://reasoning");

        uint256 totalLocked = agentReview.getTotalLockedETH();
        assertEq(totalLocked, reward1 + stakeAmount);
    }

    function testWithdrawETH() public {
        uint256 reward = 10 ether;
        uint256 deadline = block.timestamp + 7 days;

        vm.deal(proposer, 20 ether);
        vm.prank(proposer);
        agentReview.createProposal{value: reward}(
            "Test Proposal",
            "Test Description",
            "ipfs://criteria",
            reward,
            deadline
        );

        uint256 initialBalance = owner.balance;
        uint256 withdrawAmount = 5 ether;

        vm.prank(owner);
        agentReview.withdrawETH(payable(owner), withdrawAmount);

        assertEq(owner.balance, initialBalance + withdrawAmount);
    }

    function testWithdrawETHRevertIfExceedsAvailable() public {
        uint256 reward = 10 ether;
        uint256 deadline = block.timestamp + 7 days;

        vm.deal(proposer, 20 ether);
        vm.prank(proposer);
        agentReview.createProposal{value: reward}(
            "Test Proposal",
            "Test Description",
            "ipfs://criteria",
            reward,
            deadline
        );

        uint256 locked = agentReview.getTotalLockedETH();
        uint256 balance = address(agentReview).balance;
        uint256 available = balance - locked;

        vm.prank(owner);
        vm.expectRevert("Exceeds available balance");
        agentReview.withdrawETH(payable(owner), available + 1);
    }

    function testWithdrawETHRevertIfNotOwner() public {
        vm.prank(proposer);
        vm.expectRevert();
        agentReview.withdrawETH(payable(proposer), 1 ether);
    }

    function testCancelProposal() public {
        uint256 reward = 1 ether;
        uint256 deadline = block.timestamp + 7 days;

        vm.deal(proposer, 2 ether);
        vm.prank(proposer);
        uint256 proposalId = agentReview.createProposal{value: reward}(
            "Test Proposal",
            "Test Description",
            "ipfs://criteria",
            reward,
            deadline
        );

        uint256 proposerBalanceBefore = proposer.balance;

        vm.prank(proposer);
        agentReview.cancelProposal(proposalId);

        assertEq(proposer.balance, proposerBalanceBefore + reward);
        
        IAgentReviewV5.Proposal memory proposal = agentReview.getProposal(proposalId);
        assertEq(uint8(proposal.status), 3);
    }

    function testCancelProposalRevertIfNotProposer() public {
        uint256 reward = 1 ether;
        uint256 deadline = block.timestamp + 7 days;

        vm.deal(proposer, 2 ether);
        vm.prank(proposer);
        uint256 proposalId = agentReview.createProposal{value: reward}(
            "Test Proposal",
            "Test Description",
            "ipfs://criteria",
            reward,
            deadline
        );

        vm.deal(evaluator1, 1 ether);
        vm.prank(evaluator1);
        vm.expectRevert("Not proposer");
        agentReview.cancelProposal(proposalId);
    }

    function testCancelProposalRevertIfNotOpen() public {
        uint256 reward = 1 ether;
        uint256 deadline = block.timestamp + 7 days;

        vm.deal(proposer, 2 ether);
        vm.prank(proposer);
        uint256 proposalId = agentReview.createProposal{value: reward}(
            "Test Proposal",
            "Test Description",
            "ipfs://criteria",
            reward,
            deadline
        );

        vm.deal(evaluator1, 1 ether);
        vm.prank(evaluator1);
        agentReview.submitEvaluation{value: MIN_STAKE}(proposalId, 80, "ipfs://reasoning");

        vm.prank(proposer);
        agentReview.setUnderReview(proposalId);

        vm.warp(deadline + 1);

        vm.prank(proposer);
        agentReview.attestDecision(proposalId, evaluator1);

        vm.prank(proposer);
        vm.expectRevert("Not open");
        agentReview.cancelProposal(proposalId);
    }

    function testGetEvaluation() public {
        uint256 reward = 1 ether;
        uint256 deadline = block.timestamp + 7 days;

        vm.deal(proposer, 2 ether);
        vm.prank(proposer);
        uint256 proposalId = agentReview.createProposal{value: reward}(
            "Test Proposal",
            "Test Description",
            "ipfs://criteria",
            reward,
            deadline
        );

        vm.deal(evaluator1, 1 ether);
        vm.prank(evaluator1);
        agentReview.submitEvaluation{value: MIN_STAKE}(proposalId, 80, "ipfs://reasoning");

        IAgentReviewV5.Evaluation memory evaluation = agentReview.getEvaluation(proposalId, evaluator1);

        assertEq(evaluation.proposalId, proposalId);
        assertEq(evaluation.evaluator, evaluator1);
        assertEq(evaluation.confidenceScore, 80);
        assertEq(evaluation.stakeAmount, MIN_STAKE);
        assertFalse(evaluation.isFinal);
        assertFalse(evaluation.rewardClaimed);
        assertFalse(evaluation.stakeReleased);
    }

    function testUpgrade() public {
        AgentReviewV5 newImpl = new AgentReviewV5();
        
        vm.prank(owner);
        agentReview.upgradeToAndCall(address(newImpl), "");
        
        assertTrue(true);
    }

    function testUpgradeRevertIfNotOwner() public {
        AgentReviewV5 newImpl = new AgentReviewV5();
        
        vm.prank(proposer);
        vm.expectRevert();
        agentReview.upgradeToAndCall(address(newImpl), "");
    }
}
