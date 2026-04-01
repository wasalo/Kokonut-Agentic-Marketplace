// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../shared/AgentReview.sol";

/**
 * @title AgentReviewSecurityTest
 * @dev Security tests for Critical Finding #1: Double Payment Vulnerability
 */
contract AgentReviewSecurityTest is Test {
    AgentReview public agentReview;
    
    address public proposer;
    address public evaluator1;
    address public evaluator2;
    address public winner;
    
    uint256 public constant INITIAL_BALANCE = 10 ether;
    uint256 public constant MIN_STAKE = 0.001 ether;
    uint256 public constant REWARD = 0.1 ether;
    
    function setUp() public {
        agentReview = new AgentReview();
        
        proposer = makeAddr("proposer");
        evaluator1 = makeAddr("evaluator1");
        evaluator2 = makeAddr("evaluator2");
        winner = makeAddr("winner");
        
        // Fund accounts
        vm.deal(proposer, INITIAL_BALANCE);
        vm.deal(evaluator1, INITIAL_BALANCE);
        vm.deal(evaluator2, INITIAL_BALANCE);
        vm.deal(winner, INITIAL_BALANCE);
    }
    
    // ==================== DOUBLE PAYMENT VULNERABILITY TESTS ====================
    
    /**
     * @dev Test that attestDecision properly prevents double payment
     * Critical Finding #1: Double Payment Vulnerability
     */
    function test_DoublePayment_Blocked_AfterAttestDecision() public {
        // Setup: Create proposal
        vm.startPrank(proposer);
        uint256 proposalId = agentReview.createProposal{value: REWARD}(
            "Test Proposal",
            "Description",
            "criteria://test",
            REWARD,
            block.timestamp + 2 days
        );
        vm.stopPrank();
        
        // Setup: Submit evaluation as winner
        vm.startPrank(winner);
        agentReview.submitEvaluation{value: MIN_STAKE}(proposalId, 500, "reasoning://test");
        vm.stopPrank();
        
        // Fast forward past deadline
        vm.warp(block.timestamp + 3 days);
        
        // Attest decision
        vm.startPrank(proposer);
        agentReview.attestDecision(proposalId, winner);
        vm.stopPrank();
        
        // Try to claim reward again - should revert
        vm.startPrank(winner);
        vm.expectRevert("Already claimed");
        agentReview.claimReward(proposalId);
        vm.stopPrank();
    }
    
    /**
     * @dev Test that claimReward cannot be called before attestDecision
     */
    function test_ClaimReward_Blocked_BeforeAttestDecision() public {
        // Setup: Create proposal
        vm.startPrank(proposer);
        uint256 proposalId = agentReview.createProposal{value: REWARD}(
            "Test Proposal",
            "Description",
            "criteria://test",
            REWARD,
            block.timestamp + 2 days
        );
        vm.stopPrank();
        
        // Setup: Submit evaluation
        vm.startPrank(winner);
        agentReview.submitEvaluation{value: MIN_STAKE}(proposalId, 500, "reasoning://test");
        vm.stopPrank();
        
        // Try to claim reward before decision - should revert
        vm.startPrank(winner);
        vm.expectRevert("Not decided");
        agentReview.claimReward(proposalId);
        vm.stopPrank();
    }
    
    /**
     * @dev Test that non-winners cannot claim reward
     */
    function test_ClaimReward_Blocked_ForNonWinners() public {
        // Setup: Create proposal
        vm.startPrank(proposer);
        uint256 proposalId = agentReview.createProposal{value: REWARD}(
            "Test Proposal",
            "Description",
            "criteria://test",
            REWARD,
            block.timestamp + 2 days
        );
        vm.stopPrank();
        
        // Setup: Submit evaluations
        vm.startPrank(evaluator1);
        agentReview.submitEvaluation{value: MIN_STAKE}(proposalId, 500, "reasoning://eval1");
        vm.stopPrank();
        
        vm.startPrank(evaluator2);
        agentReview.submitEvaluation{value: MIN_STAKE}(proposalId, 600, "reasoning://eval2");
        vm.stopPrank();
        
        // Fast forward past deadline
        vm.warp(block.timestamp + 3 days);
        
        // Attest evaluator2 as winner
        vm.startPrank(proposer);
        agentReview.attestDecision(proposalId, evaluator2);
        vm.stopPrank();
        
        // Non-winner tries to claim - should revert
        vm.startPrank(evaluator1);
        vm.expectRevert("Not winner");
        agentReview.claimReward(proposalId);
        vm.stopPrank();
    }
    
    /**
     * @dev Test that attestDecision cannot be called twice
     */
    function test_DoubleAttestDecision_Blocked() public {
        // Setup: Create proposal
        vm.startPrank(proposer);
        uint256 proposalId = agentReview.createProposal{value: REWARD}(
            "Test Proposal",
            "Description",
            "criteria://test",
            REWARD,
            block.timestamp + 2 days
        );
        vm.stopPrank();
        
        // Setup: Submit evaluations
        vm.startPrank(evaluator1);
        agentReview.submitEvaluation{value: MIN_STAKE}(proposalId, 500, "reasoning://eval1");
        vm.stopPrank();
        
        vm.startPrank(evaluator2);
        agentReview.submitEvaluation{value: MIN_STAKE}(proposalId, 600, "reasoning://eval2");
        vm.stopPrank();
        
        // Fast forward past deadline
        vm.warp(block.timestamp + 3 days);
        
        // First attest
        vm.startPrank(proposer);
        agentReview.attestDecision(proposalId, evaluator2);
        
        // Try to attest again - should revert
        vm.expectRevert("Not under review");
        agentReview.attestDecision(proposalId, evaluator1);
        vm.stopPrank();
    }
    
    /**
     * @dev Test that rewardClaimed flag is properly set
     */
    function test_RewardClaimed_Flag_SetCorrectly() public {
        // Setup: Create proposal
        vm.startPrank(proposer);
        uint256 proposalId = agentReview.createProposal{value: REWARD}(
            "Test Proposal",
            "Description",
            "criteria://test",
            REWARD,
            block.timestamp + 2 days
        );
        vm.stopPrank();
        
        // Setup: Submit evaluation
        vm.startPrank(winner);
        agentReview.submitEvaluation{value: MIN_STAKE}(proposalId, 500, "reasoning://test");
        vm.stopPrank();
        
        // Fast forward past deadline
        vm.warp(block.timestamp + 3 days);
        
        // Check initial state
        (,,,, uint256 stakeBefore, bool isFinalBefore, bool rewardClaimedBefore,) = 
            agentReview.evaluations(proposalId, winner);
        assertFalse(rewardClaimedBefore, "rewardClaimed should be false initially");
        
        // Attest decision
        vm.startPrank(proposer);
        agentReview.attestDecision(proposalId, winner);
        vm.stopPrank();
        
        // Check final state
        (,,,, uint256 stakeAfter, bool isFinalAfter, bool rewardClaimedAfter,) = 
            agentReview.evaluations(proposalId, winner);
        assertTrue(rewardClaimedAfter, "rewardClaimed should be true after attestDecision");
        assertTrue(isFinalAfter, "isFinal should be true after attestDecision");
        assertEq(stakeAfter, 0, "stakeAmount should be 0 after attestDecision");
    }
    
    /**
     * @dev Test proper reward distribution with correct amounts
     */
    function test_RewardDistribution_CorrectAmount() public {
        // Setup: Create proposal
        vm.startPrank(proposer);
        uint256 proposalId = agentReview.createProposal{value: REWARD}(
            "Test Proposal",
            "Description",
            "criteria://test",
            REWARD,
            block.timestamp + 2 days
        );
        vm.stopPrank();
        
        // Setup: Submit evaluation
        vm.startPrank(winner);
        agentReview.submitEvaluation{value: MIN_STAKE}(proposalId, 500, "reasoning://test");
        vm.stopPrank();
        
        // Fast forward past deadline
        vm.warp(block.timestamp + 3 days);
        
        // Get contract balance before attestDecision
        uint256 contractBalanceBefore = address(agentReview).balance;
        
        // Attest decision
        vm.startPrank(proposer);
        agentReview.attestDecision(proposalId, winner);
        vm.stopPrank();
        
        // Verify contract paid out correct amount
        uint256 contractBalanceAfter = address(agentReview).balance;
        uint256 expectedPayout = MIN_STAKE + REWARD;
        assertEq(
            contractBalanceBefore - contractBalanceAfter,
            expectedPayout,
            "Contract should pay out stake + reward"
        );
    }
    
    /**
     * @dev Test that multiple evaluators can't exploit the system
     */
    function test_MultipleEvaluators_NoExploit() public {
        // Setup: Create proposal
        vm.startPrank(proposer);
        uint256 proposalId = agentReview.createProposal{value: REWARD}(
            "Test Proposal",
            "Description",
            "criteria://test",
            REWARD,
            block.timestamp + 2 days
        );
        vm.stopPrank();
        
        // Multiple evaluators submit
        vm.startPrank(evaluator1);
        agentReview.submitEvaluation{value: MIN_STAKE}(proposalId, 400, "reasoning://1");
        vm.stopPrank();
        
        vm.startPrank(evaluator2);
        agentReview.submitEvaluation{value: MIN_STAKE}(proposalId, 600, "reasoning://2");
        vm.stopPrank();
        
        vm.startPrank(winner);
        agentReview.submitEvaluation{value: MIN_STAKE}(proposalId, 800, "reasoning://3");
        vm.stopPrank();
        
        // Fast forward past deadline
        vm.warp(block.timestamp + 3 days);
        
        // Attest winner
        vm.startPrank(proposer);
        agentReview.attestDecision(proposalId, winner);
        vm.stopPrank();
        
        // Winner tries to claim again
        vm.startPrank(winner);
        vm.expectRevert("Already claimed");
        agentReview.claimReward(proposalId);
        vm.stopPrank();
        
        // Other evaluators try to claim
        vm.startPrank(evaluator1);
        vm.expectRevert("Not winner");
        agentReview.claimReward(proposalId);
        vm.stopPrank();
        
        vm.startPrank(evaluator2);
        vm.expectRevert("Not winner");
        agentReview.claimReward(proposalId);
        vm.stopPrank();
    }
}
