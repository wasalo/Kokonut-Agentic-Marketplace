// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {TestFixtures} from "./TestFixtures.sol";
import {AgentReviewV4, IAgentReviewV4} from "../shared/AgentReviewV4.sol";

/**
 * @title AgentReviewV4Test
 * @dev Comprehensive test suite for AgentReviewV4
 * Target: 95%+ coverage
 */
contract AgentReviewV4Test is TestFixtures {
    // Event definitions for testing
    event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string title, uint256 reward);
    event EvaluationSubmitted(uint256 indexed proposalId, address indexed evaluator, int256 confidenceScore, uint256 stakeAmount);
    event DecisionAttested(uint256 indexed proposalId, address indexed attestor, address indexed winningEvaluator);
    event EvaluatorSlashed(address indexed evaluator, uint256 slashAmount, string reason);
    event RewardClaimed(uint256 indexed proposalId, address indexed evaluator, uint256 amount);
    event StakeReleased(uint256 indexed proposalId, address indexed evaluator, uint256 amount);
    event ProposalStatusChanged(uint256 indexed proposalId, IAgentReviewV4.ProposalStatus indexed oldStatus, IAgentReviewV4.ProposalStatus indexed newStatus, uint256 timestamp);
    event EvaluatorLimitReached(uint256 indexed proposalId, uint256 currentCount, uint256 maxAllowed);
    event EvaluationFinalized(uint256 indexed proposalId, address indexed evaluator, bool isWinner);
    event StakeAmountChanged(uint256 indexed proposalId, address indexed evaluator, uint256 oldAmount, uint256 newAmount);
    event ProposalCancelledByProposer(uint256 indexed proposalId, address indexed proposer, uint256 refundAmount);
    event EvaluatorRegistered(uint256 indexed proposalId, address indexed evaluator, uint256 evaluatorIndex);
    
    uint256 constant PROPOSAL_REWARD = 0.1 ether;
    uint256 constant DECISION_DEADLINE = 7 days;
    
    // Helper to create a proposal
    function _createProposal() internal returns (uint256) {
        vm.prank(proposer);
        return agentReview.createProposal{value: PROPOSAL_REWARD}(
            "Test Proposal",
            "Test description",
            "criteria",
            PROPOSAL_REWARD,
            block.timestamp + DECISION_DEADLINE
        );
    }
    
    // Helper to setup proposal with evaluators
    function _setupEvaluators(uint256 proposalId) internal {
        vm.prank(evaluator1);
        agentReview.submitEvaluation{value: MIN_STAKE}(proposalId, 500, "reasoning1");
        
        vm.prank(evaluator2);
        agentReview.submitEvaluation{value: MIN_STAKE}(proposalId, 600, "reasoning2");
    }
    
    // Helper to complete proposal with winner
    function _completeProposal(uint256 proposalId) internal {
        _setupEvaluators(proposalId);
        vm.warp(block.timestamp + DECISION_DEADLINE + 1);
        vm.prank(proposer);
        agentReview.attestDecision(proposalId, evaluator1);
    }
    
    // =====================================================
    // PROPOSAL CREATION TESTS
    // =====================================================
    
    function test_CreateProposal_Success() public {
        uint256 deadline = block.timestamp + DECISION_DEADLINE;
        
        vm.prank(proposer);
        uint256 proposalId = agentReview.createProposal{value: PROPOSAL_REWARD}(
            "Test Proposal",
            "Test description",
            "criteria",
            PROPOSAL_REWARD,
            deadline
        );
        
        assertEq(proposalId, 0);
        
        AgentReviewV4.Proposal memory proposal = agentReview.getProposal(proposalId);
        assertEq(proposal.proposer, proposer);
        assertEq(proposal.reward, PROPOSAL_REWARD);
        assertEq(uint256(proposal.status), uint256(IAgentReviewV4.ProposalStatus.Open));
    }
    
    function test_CreateProposal_EmitsEvent() public {
        vm.prank(proposer);
        vm.expectEmit(true, true, false, true);
        emit ProposalCreated(0, proposer, "Test Proposal", PROPOSAL_REWARD);
        agentReview.createProposal{value: PROPOSAL_REWARD}(
            "Test Proposal",
            "Test description",
            "criteria",
            PROPOSAL_REWARD,
            block.timestamp + DECISION_DEADLINE
        );
    }
    
    function test_CreateProposal_EmptyTitle_Reverts() public {
        vm.prank(proposer);
        vm.expectRevert("Empty title");
        agentReview.createProposal{value: PROPOSAL_REWARD}(
            "",
            "Description",
            "criteria",
            PROPOSAL_REWARD,
            block.timestamp + DECISION_DEADLINE
        );
    }
    
    function test_CreateProposal_EmptyDescription_Reverts() public {
        vm.prank(proposer);
        vm.expectRevert("Empty description");
        agentReview.createProposal{value: PROPOSAL_REWARD}(
            "Title",
            "",
            "criteria",
            PROPOSAL_REWARD,
            block.timestamp + DECISION_DEADLINE
        );
    }
    
    function test_CreateProposal_DeadlineTooSoon_Reverts() public {
        vm.prank(proposer);
        vm.expectRevert("Deadline too soon");
        agentReview.createProposal{value: PROPOSAL_REWARD}(
            "Title",
            "Description",
            "criteria",
            PROPOSAL_REWARD,
            block.timestamp + 12 hours
        );
    }
    
    function test_CreateProposal_InsufficientPayment_Reverts() public {
        vm.prank(proposer);
        vm.expectRevert("Insufficient payment");
        agentReview.createProposal{value: 0.01 ether}(
            "Title",
            "Description",
            "criteria",
            PROPOSAL_REWARD,
            block.timestamp + DECISION_DEADLINE
        );
    }
    
    // =====================================================
    // EVALUATION SUBMISSION TESTS
    // =====================================================
    
    function test_SubmitEvaluation_Success() public {
        uint256 proposalId = _createProposal();
        
        vm.prank(evaluator1);
        agentReview.submitEvaluation{value: MIN_STAKE}(proposalId, 500, "reasoning");
        
        AgentReviewV4.Evaluation memory eval = agentReview.getEvaluation(proposalId, evaluator1);
        assertEq(eval.confidenceScore, 500);
        assertEq(eval.stakeAmount, MIN_STAKE);
        
        AgentReviewV4.Proposal memory proposal = agentReview.getProposal(proposalId);
        assertEq(uint256(proposal.status), uint256(IAgentReviewV4.ProposalStatus.UnderReview));
    }
    
    function test_SubmitEvaluation_EmitsEvents() public {
        uint256 proposalId = _createProposal();
        
        vm.prank(evaluator1);
        vm.expectEmit(true, true, false, true);
        emit EvaluationSubmitted(proposalId, evaluator1, 500, MIN_STAKE);
        vm.expectEmit(true, true, false, true);
        emit EvaluatorRegistered(proposalId, evaluator1, 0);
        agentReview.submitEvaluation{value: MIN_STAKE}(proposalId, 500, "reasoning");
    }
    
    function test_SubmitEvaluation_MaxEvaluatorsReached_Reverts() public {
        uint256 proposalId = _createProposal();
        
        // Add 5 evaluators (max)
        for (uint i = 0; i < 5; i++) {
            address evalAddr = makeAddr(string.concat("eval", vm.toString(i)));
            vm.deal(evalAddr, 1 ether);
            vm.prank(evalAddr);
            agentReview.submitEvaluation{value: MIN_STAKE}(proposalId, int256(i * 200), "reasoning");
        }
        
        address eval6 = makeAddr("eval6");
        vm.deal(eval6, 1 ether);
        vm.prank(eval6);
        vm.expectRevert("Max evaluators reached");
        agentReview.submitEvaluation{value: MIN_STAKE}(proposalId, 500, "reasoning");
    }
    
    function test_SubmitEvaluation_MaxEvaluatorsEmitsEvent() public {
        uint256 proposalId = _createProposal();
        
        for (uint i = 0; i < 5; i++) {
            address evalAddr = makeAddr(string.concat("eval", vm.toString(i)));
            vm.deal(evalAddr, 1 ether);
            vm.prank(evalAddr);
            agentReview.submitEvaluation{value: MIN_STAKE}(proposalId, int256(i * 200), "reasoning");
        }
        
        address eval6 = makeAddr("eval6");
        vm.deal(eval6, 1 ether);
        vm.prank(eval6);
        vm.expectEmit(true, false, false, true);
        emit EvaluatorLimitReached(proposalId, 5, 5);
        vm.expectRevert();
        agentReview.submitEvaluation{value: MIN_STAKE}(proposalId, 500, "reasoning");
    }
    
    function test_SubmitEvaluation_AlreadyEvaluated_Reverts() public {
        uint256 proposalId = _createProposal();
        
        vm.prank(evaluator1);
        agentReview.submitEvaluation{value: MIN_STAKE}(proposalId, 500, "reasoning");
        
        vm.prank(evaluator1);
        vm.expectRevert("Already evaluated");
        agentReview.submitEvaluation{value: MIN_STAKE}(proposalId, 600, "reasoning");
    }
    
    function test_SubmitEvaluation_InvalidScore_Reverts() public {
        uint256 proposalId = _createProposal();
        
        vm.prank(evaluator1);
        vm.expectRevert("Invalid score");
        agentReview.submitEvaluation{value: MIN_STAKE}(proposalId, 1001, "reasoning");
        
        vm.prank(evaluator1);
        vm.expectRevert("Invalid score");
        agentReview.submitEvaluation{value: MIN_STAKE}(proposalId, -1001, "reasoning");
    }
    
    function test_SubmitEvaluation_DeadlinePassed_Reverts() public {
        uint256 proposalId = _createProposal();
        vm.warp(block.timestamp + DECISION_DEADLINE + 1);
        
        vm.prank(evaluator1);
        vm.expectRevert("Deadline passed");
        agentReview.submitEvaluation{value: MIN_STAKE}(proposalId, 500, "reasoning");
    }
    
    function test_SubmitEvaluation_InsufficientStake_Reverts() public {
        uint256 proposalId = _createProposal();
        
        vm.prank(evaluator1);
        vm.expectRevert("Min stake");
        agentReview.submitEvaluation{value: 0.0001 ether}(proposalId, 500, "reasoning");
    }
    
    // =====================================================
    // DECISION ATTESTATION TESTS
    // =====================================================
    
    function test_AttestDecision_Success() public {
        uint256 proposalId = _createProposal();
        _setupEvaluators(proposalId);
        vm.warp(block.timestamp + DECISION_DEADLINE + 1);
        
        uint256 winnerBalanceBefore = evaluator1.balance;
        
        vm.prank(proposer);
        agentReview.attestDecision(proposalId, evaluator1);
        
        assertEq(evaluator1.balance, winnerBalanceBefore + MIN_STAKE + PROPOSAL_REWARD);
        
        AgentReviewV4.Proposal memory proposal = agentReview.getProposal(proposalId);
        assertEq(uint256(proposal.status), uint256(IAgentReviewV4.ProposalStatus.Decided));
        assertEq(proposal.winningEvaluator, evaluator1);
    }
    
    function test_AttestDecision_EmitsEvents() public {
        uint256 proposalId = _createProposal();
        _setupEvaluators(proposalId);
        vm.warp(block.timestamp + DECISION_DEADLINE + 1);
        
        vm.prank(proposer);
        vm.expectEmit(true, true, false, true);
        emit EvaluationFinalized(proposalId, evaluator1, true);
        vm.expectEmit(true, true, true, true);
        emit DecisionAttested(proposalId, proposer, evaluator1);
        vm.expectEmit(true, true, true, true);
        emit IAgentReviewV4.ProposalStatusChanged(
            proposalId,
            IAgentReviewV4.ProposalStatus.UnderReview,
            IAgentReviewV4.ProposalStatus.Decided,
            block.timestamp
        );
        agentReview.attestDecision(proposalId, evaluator1);
    }
    
    function test_AttestDecision_NotProposer_Reverts() public {
        uint256 proposalId = _createProposal();
        _setupEvaluators(proposalId);
        vm.warp(block.timestamp + DECISION_DEADLINE + 1);
        
        vm.prank(client);
        vm.expectRevert("Not proposer");
        agentReview.attestDecision(proposalId, evaluator1);
    }
    
    function test_AttestDecision_NotUnderReview_Reverts() public {
        uint256 proposalId = _createProposal();
        
        vm.prank(proposer);
        vm.expectRevert("Not under review");
        agentReview.attestDecision(proposalId, evaluator1);
    }
    
    function test_AttestDecision_InvalidWinner_Reverts() public {
        uint256 proposalId = _createProposal();
        _setupEvaluators(proposalId);
        vm.warp(block.timestamp + DECISION_DEADLINE + 1);
        
        address randomAddr = makeAddr("random");
        vm.prank(proposer);
        vm.expectRevert("Not an evaluator");
        agentReview.attestDecision(proposalId, randomAddr);
    }
    
    function test_AttestDecision_DeadlineNotPassed_Reverts() public {
        uint256 proposalId = _createProposal();
        _setupEvaluators(proposalId);
        
        vm.prank(proposer);
        vm.expectRevert("Deadline not passed");
        agentReview.attestDecision(proposalId, evaluator1);
    }
    
    // =====================================================
    // REWARD CLAIMING TESTS
    // =====================================================
    
    function test_ClaimReward_Success() public {
        uint256 proposalId = _createProposal();
        _setupEvaluators(proposalId);
        vm.warp(block.timestamp + DECISION_DEADLINE + 1);
        
        vm.prank(proposer);
        agentReview.attestDecision(proposalId, evaluator1);
        
        // This should fail since winner was already paid
        vm.prank(evaluator1);
        vm.expectRevert("Already claimed");
        agentReview.claimReward(proposalId);
    }
    
    function test_ClaimReward_NotWinner_Reverts() public {
        uint256 proposalId = _createProposal();
        _setupEvaluators(proposalId);
        vm.warp(block.timestamp + DECISION_DEADLINE + 1);
        vm.prank(proposer);
        agentReview.attestDecision(proposalId, evaluator1);
        
        vm.prank(evaluator2);
        vm.expectRevert("Not winner");
        agentReview.claimReward(proposalId);
    }
    
    // =====================================================
    // STAKE RELEASE TESTS
    // =====================================================
    
    function test_ReleaseStake_Success() public {
        uint256 proposalId = _createProposal();
        _setupEvaluators(proposalId);
        vm.warp(block.timestamp + DECISION_DEADLINE + 1);
        vm.prank(proposer);
        agentReview.attestDecision(proposalId, evaluator1);
        
        uint256 loserBalanceBefore = evaluator2.balance;
        
        vm.prank(evaluator2);
        agentReview.releaseStake(proposalId);
        
        assertEq(evaluator2.balance, loserBalanceBefore + MIN_STAKE);
        
        AgentReviewV4.Evaluation memory eval = agentReview.getEvaluation(proposalId, evaluator2);
        assertTrue(eval.stakeReleased);
    }
    
    function test_ReleaseStake_EmitsEvent() public {
        uint256 proposalId = _createProposal();
        _setupEvaluators(proposalId);
        vm.warp(block.timestamp + DECISION_DEADLINE + 1);
        vm.prank(proposer);
        agentReview.attestDecision(proposalId, evaluator1);
        
        vm.prank(evaluator2);
        vm.expectEmit(true, true, false, true);
        emit StakeReleased(proposalId, evaluator2, MIN_STAKE);
        agentReview.releaseStake(proposalId);
    }
    
    function test_ReleaseStake_WinnerCannotRelease_Reverts() public {
        uint256 proposalId = _createProposal();
        _setupEvaluators(proposalId);
        vm.warp(block.timestamp + DECISION_DEADLINE + 1);
        vm.prank(proposer);
        agentReview.attestDecision(proposalId, evaluator1);
        
        // Winner's stake amount is set to 0 after winning (claimed via attestDecision)
        vm.prank(evaluator1);
        vm.expectRevert("No stake to release");
        agentReview.releaseStake(proposalId);
    }
    
    function test_ReleaseStake_AlreadyReleased_Reverts() public {
        uint256 proposalId = _createProposal();
        _setupEvaluators(proposalId);
        vm.warp(block.timestamp + DECISION_DEADLINE + 1);
        vm.prank(proposer);
        agentReview.attestDecision(proposalId, evaluator1);
        
        vm.prank(evaluator2);
        agentReview.releaseStake(proposalId);
        
        // After releasing stake, stakeAmount becomes 0
        vm.prank(evaluator2);
        vm.expectRevert("No stake to release");
        agentReview.releaseStake(proposalId);
    }
    
    function test_ReleaseStake_NotFinalized_Reverts() public {
        uint256 proposalId = _createProposal();
        _setupEvaluators(proposalId);
        // Don't finalize
        
        vm.prank(evaluator2);
        vm.expectRevert("Proposal not finalized");
        agentReview.releaseStake(proposalId);
    }
    
    // =====================================================
    // SLASHING TESTS
    // =====================================================
    
    function test_SlashEvaluator_Success() public {
        uint256 proposalId = _createProposal();
        _setupEvaluators(proposalId);
        
        uint256 ownerBalanceBefore = owner.balance;
        
        vm.prank(owner);
        agentReview.slashEvaluator(evaluator1, proposalId, "Bad behavior");
        
        uint256 slashAmount = (MIN_STAKE * 5000) / 10000; // 50%
        assertEq(owner.balance, ownerBalanceBefore + slashAmount);
        
        AgentReviewV4.Evaluation memory eval = agentReview.getEvaluation(proposalId, evaluator1);
        assertEq(eval.stakeAmount, MIN_STAKE - slashAmount);
    }
    
    function test_SlashEvaluator_EmitsEvents() public {
        uint256 proposalId = _createProposal();
        _setupEvaluators(proposalId);
        
        uint256 slashAmount = (MIN_STAKE * 5000) / 10000;
        
        vm.prank(owner);
        vm.expectEmit(true, true, false, true);
        emit StakeAmountChanged(proposalId, evaluator1, MIN_STAKE, MIN_STAKE - slashAmount);
        vm.expectEmit(true, false, false, true);
        emit EvaluatorSlashed(evaluator1, slashAmount, "Bad behavior");
        agentReview.slashEvaluator(evaluator1, proposalId, "Bad behavior");
    }
    
    function test_SlashEvaluator_NotOwner_Reverts() public {
        uint256 proposalId = _createProposal();
        _setupEvaluators(proposalId);
        
        vm.prank(client);
        vm.expectRevert();
        agentReview.slashEvaluator(evaluator1, proposalId, "Bad behavior");
    }
    
    function test_SlashEvaluator_NotActive_Reverts() public {
        uint256 proposalId = _createProposal();
        _setupEvaluators(proposalId);
        vm.warp(block.timestamp + DECISION_DEADLINE + 1);
        vm.prank(proposer);
        agentReview.attestDecision(proposalId, evaluator1);
        
        vm.prank(owner);
        vm.expectRevert("Proposal not active");
        agentReview.slashEvaluator(evaluator2, proposalId, "Bad behavior");
    }
    
    function test_SlashEvaluator_AlreadyFinal_Reverts() public {
        uint256 proposalId = _createProposal();
        _setupEvaluators(proposalId);
        vm.warp(block.timestamp + DECISION_DEADLINE + 1);
        vm.prank(proposer);
        agentReview.attestDecision(proposalId, evaluator1);
        
        // After attestDecision, proposal status is Finalized, not UnderReview
        vm.prank(owner);
        vm.expectRevert("Proposal not active");
        agentReview.slashEvaluator(evaluator1, proposalId, "Bad behavior");
    }
    
    // =====================================================
    // PROPOSAL CANCELLATION TESTS
    // =====================================================
    
    function test_CancelProposal_Success() public {
        uint256 proposalId = _createProposal();
        
        uint256 proposerBalanceBefore = proposer.balance;
        
        vm.prank(proposer);
        agentReview.cancelProposal(proposalId);
        
        assertEq(proposer.balance, proposerBalanceBefore + PROPOSAL_REWARD);
        
        AgentReviewV4.Proposal memory proposal = agentReview.getProposal(proposalId);
        assertEq(uint256(proposal.status), uint256(IAgentReviewV4.ProposalStatus.Cancelled));
    }
    
    function test_CancelProposal_EmitsEvents() public {
        uint256 proposalId = _createProposal();
        
        vm.prank(proposer);
        vm.expectEmit(true, true, false, true);
        emit ProposalCancelledByProposer(proposalId, proposer, PROPOSAL_REWARD);
        vm.expectEmit(true, true, true, true);
        emit IAgentReviewV4.ProposalStatusChanged(
            proposalId,
            IAgentReviewV4.ProposalStatus.Open,
            IAgentReviewV4.ProposalStatus.Cancelled,
            block.timestamp
        );
        agentReview.cancelProposal(proposalId);
    }
    
    function test_CancelProposal_NotProposer_Reverts() public {
        uint256 proposalId = _createProposal();
        
        vm.prank(client);
        vm.expectRevert("Not proposer");
        agentReview.cancelProposal(proposalId);
    }
    
    function test_CancelProposal_NotOpen_Reverts() public {
        uint256 proposalId = _createProposal();
        _setupEvaluators(proposalId);
        
        vm.prank(proposer);
        vm.expectRevert("Not open");
        agentReview.cancelProposal(proposalId);
    }
    
    function test_CancelProposal_EvaluationsExist_Reverts() public {
        uint256 proposalId = _createProposal();
        vm.prank(evaluator1);
        agentReview.submitEvaluation{value: MIN_STAKE}(proposalId, 500, "reasoning");
        
        // When evaluations exist, status becomes UnderReview, not Open
        vm.prank(proposer);
        vm.expectRevert("Not open");
        agentReview.cancelProposal(proposalId);
    }
    
    // =====================================================
    // VIEW FUNCTION TESTS
    // =====================================================
    
    function test_GetProposal_Success() public {
        uint256 proposalId = _createProposal();
        
        AgentReviewV4.Proposal memory proposal = agentReview.getProposal(proposalId);
        assertEq(proposal.id, proposalId);
        assertEq(proposal.proposer, proposer);
        assertEq(proposal.reward, PROPOSAL_REWARD);
    }
    
    function test_GetProposal_Invalid_Reverts() public {
        vm.expectRevert("Invalid proposal");
        agentReview.getProposal(999);
    }
    
    function test_GetEvaluation_Success() public {
        uint256 proposalId = _createProposal();
        vm.prank(evaluator1);
        agentReview.submitEvaluation{value: MIN_STAKE}(proposalId, 500, "reasoning");
        
        AgentReviewV4.Evaluation memory eval = agentReview.getEvaluation(proposalId, evaluator1);
        assertEq(eval.proposalId, proposalId);
        assertEq(eval.evaluator, evaluator1);
        assertEq(eval.confidenceScore, 500);
    }
    
    function test_GetProposalEvaluators_Success() public {
        uint256 proposalId = _createProposal();
        vm.prank(evaluator1);
        agentReview.submitEvaluation{value: MIN_STAKE}(proposalId, 500, "reasoning");
        
        address[] memory evals = agentReview.getProposalEvaluators(proposalId);
        assertEq(evals.length, 1);
        assertEq(evals[0], evaluator1);
    }
    
    function test_GetProposalCount_Success() public {
        assertEq(agentReview.getProposalCount(), 0);
        _createProposal();
        assertEq(agentReview.getProposalCount(), 1);
        _createProposal();
        assertEq(agentReview.getProposalCount(), 2);
    }
    
    function test_GetEvaluatorCount_Success() public {
        uint256 proposalId = _createProposal();
        assertEq(agentReview.getEvaluatorCount(proposalId), 0);
        
        vm.prank(evaluator1);
        agentReview.submitEvaluation{value: MIN_STAKE}(proposalId, 500, "reasoning");
        assertEq(agentReview.getEvaluatorCount(proposalId), 1);
    }
    
    // =====================================================
    // ADMIN FUNCTION TESTS
    // =====================================================
    
    function test_WithdrawETH_Success() public {
        // Fund contract
        vm.deal(address(agentReview), 1 ether);
        
        uint256 ownerBalanceBefore = owner.balance;
        
        vm.prank(owner);
        agentReview.withdrawETH(payable(owner), 1 ether);
        
        assertEq(owner.balance, ownerBalanceBefore + 1 ether);
    }
    
    function test_WithdrawETH_NotOwner_Reverts() public {
        vm.deal(address(agentReview), 1 ether);
        
        vm.prank(client);
        vm.expectRevert();
        agentReview.withdrawETH(payable(client), 1 ether);
    }
    
    function test_WithdrawETH_InsufficientBalance_Reverts() public {
        vm.prank(owner);
        vm.expectRevert("Insufficient balance");
        agentReview.withdrawETH(payable(owner), 1 ether);
    }
}
