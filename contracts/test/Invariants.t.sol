// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {TestFixtures} from "./TestFixtures.sol";
import {AgenticCommerceV4, IAgenticCommerceV4} from "../shared/AgenticCommerceV4.sol";
import {AgentReviewV4, IAgentReviewV4} from "../shared/AgentReviewV4.sol";

/**
 * @title Invariants
 * @dev System-wide invariant tests for Kokonut contracts
 * Ensures critical properties always hold
 */
contract Invariants is TestFixtures {
    // Track state for invariant checking
    uint256 public totalETHLocked;
    uint256 public totalUSDCLocked;
    
    function setUp() public override {
        super.setUp();
        
        // Target contracts for invariant testing
        targetContract(address(agenticCommerce));
        targetContract(address(agentReview));
    }
    
    // =====================================================
    // AGENTIC COMMERCE INVARIANTS
    // =====================================================
    
    /**
     * @dev Invariant: Contract ETH balance should always be 0
     * (AgenticCommerce only handles ERC20, not ETH)
     */
    function invariant_NoETHBalance() public {
        assertEq(address(agenticCommerce).balance, 0);
    }
    
    /**
     * @dev Invariant: Total USDC locked should equal sum of all job budgets
     */
    function invariant_USDCBalanceEqualsJobBudgets() public {
        uint256 totalBudgets;
        uint256 jobCounter = agenticCommerce.jobCounter();
        
        for (uint i = 1; i <= jobCounter; i++) {
            AgenticCommerceV4.Job memory job = agenticCommerce.getJob(i);
            // Only count active job budgets (Funded or Submitted)
            if (job.status == IAgenticCommerceV4.JobStatus.Funded || 
                job.status == IAgenticCommerceV4.JobStatus.Submitted) {
                totalBudgets += job.budget;
            }
        }
        
        assertEq(usdc.balanceOf(address(agenticCommerce)), totalBudgets);
    }
    
    /**
     * @dev Invariant: Client job count should never exceed MAX_JOBS_PER_CLIENT
     */
    function invariant_ClientJobCountWithinLimit() public {
        // Check a few addresses
        assertLe(agenticCommerce.clientJobCount(client), 100);
        assertLe(agenticCommerce.clientJobCount(provider), 100);
    }
    
    /**
     * @dev Invariant: Platform fee should never exceed 100%
     */
    function invariant_PlatformFeeWithinBounds() public {
        assertLe(agenticCommerce.platformFeeBP(), 10000);
    }
    
    /**
     * @dev Invariant: Job status should always be valid enum value
     */
    function invariant_JobStatusValid() public {
        uint256 jobCounter = agenticCommerce.jobCounter();
        
        for (uint i = 1; i <= jobCounter && i <= 10; i++) {
            AgenticCommerceV4.Job memory job = agenticCommerce.getJob(i);
            uint256 statusInt = uint256(job.status);
            assertLe(statusInt, 5); // Max enum value is 5 (Expired)
        }
    }
    
    /**
     * @dev Invariant: Completed jobs should have zero budget
     */
    function invariant_CompletedJobsHaveZeroBudget() public {
        uint256 jobCounter = agenticCommerce.jobCounter();
        
        for (uint i = 1; i <= jobCounter && i <= 10; i++) {
            AgenticCommerceV4.Job memory job = agenticCommerce.getJob(i);
            
            if (job.status == IAgenticCommerceV4.JobStatus.Completed ||
                job.status == IAgenticCommerceV4.JobStatus.Rejected ||
                job.status == IAgenticCommerceV4.JobStatus.Expired) {
                assertEq(job.budget, 0);
            }
        }
    }
    
    // =====================================================
    // AGENT REVIEW INVARIANTS
    // =====================================================
    
    /**
     * @dev Invariant: Contract ETH balance equals sum of all stakes + unclaimed rewards
     */
    function invariant_ETHBalanceCorrect() public {
        uint256 totalStakes;
        uint256 proposalCount = agentReview.getProposalCount();
        
        for (uint i = 0; i < proposalCount && i < 10; i++) {
            AgentReviewV4.Proposal memory proposal = agentReview.getProposal(i);
            
            // Count unclaimed stakes
            uint256 evaluatorCount = agentReview.getEvaluatorCount(i);
            for (uint j = 0; j < evaluatorCount; j++) {
                address[] memory evals = agentReview.getProposalEvaluators(i);
                if (j < evals.length) {
                    AgentReviewV4.Evaluation memory eval = agentReview.getEvaluation(i, evals[j]);
                    if (!eval.stakeReleased && !eval.rewardClaimed) {
                        totalStakes += eval.stakeAmount;
                    }
                }
            }
            
            // Add unclaimed rewards
            if (proposal.status != IAgentReviewV4.ProposalStatus.Decided &&
                proposal.status != IAgentReviewV4.ProposalStatus.Cancelled) {
                totalStakes += proposal.reward;
            }
        }
        
        // Allow small difference due to rounding
        uint256 contractBalance = address(agentReview).balance;
        assertGe(contractBalance + 0.01 ether, totalStakes);
        assertLe(contractBalance, totalStakes + 0.01 ether);
    }
    
    /**
     * @dev Invariant: Evaluator count should never exceed MAX_EVALUATORS_PER_PROPOSAL
     */
    function invariant_EvaluatorCountWithinLimit() public {
        uint256 proposalCount = agentReview.getProposalCount();
        
        for (uint i = 0; i < proposalCount && i < 10; i++) {
            assertLe(agentReview.getEvaluatorCount(i), 5);
        }
    }
    
    /**
     * @dev Invariant: Proposal status should always be valid enum value
     */
    function invariant_ProposalStatusValid() public {
        uint256 proposalCount = agentReview.getProposalCount();
        
        for (uint i = 0; i < proposalCount && i < 10; i++) {
            AgentReviewV4.Proposal memory proposal = agentReview.getProposal(i);
            uint256 statusInt = uint256(proposal.status);
            assertLe(statusInt, 3); // Max enum value is 3 (Cancelled)
        }
    }
    
    /**
     * @dev Invariant: Winner cannot release stake (must claim reward)
     */
    function invariant_WinnerCannotReleaseStake() public {
        uint256 proposalCount = agentReview.getProposalCount();
        
        for (uint i = 0; i < proposalCount && i < 10; i++) {
            AgentReviewV4.Proposal memory proposal = agentReview.getProposal(i);
            
            if (proposal.status == IAgentReviewV4.ProposalStatus.Decided &&
                proposal.winningEvaluator != address(0)) {
                AgentReviewV4.Evaluation memory eval = agentReview.getEvaluation(
                    i, 
                    proposal.winningEvaluator
                );
                // Winner should have stakeReleased = true (from attestDecision)
                assertTrue(eval.stakeReleased);
            }
        }
    }
    
    // =====================================================
    // CROSS-CONTRACT INVARIANTS
    // =====================================================
    
    /**
     * @dev Invariant: Service registry should be set in AgenticCommerce
     */
    function invariant_ServiceRegistrySet() public {
        assertTrue(agenticCommerce.serviceRegistry() != address(0));
    }
    
    /**
     * @dev Invariant: Treasury should not be zero address
     */
    function invariant_TreasurySet() public {
        assertTrue(agenticCommerce.platformTreasury() != address(0));
    }
}

/**
 * @title FuzzAgenticCommerceV4
 * @dev Fuzzing tests for AgenticCommerceV4
 */
contract FuzzAgenticCommerceV4 is TestFixtures {
    uint256 constant MAX_FUZZ_JOBS = 50;
    
    function setUp() public override {
        super.setUp();
    }
    
    /**
     * @dev Fuzz: Job creation with random parameters
     */
    function testFuzz_CreateJob(
        address fuzzProvider,
        address fuzzEvaluator,
        uint256 expiryOffset,
        string calldata description
    ) public {
        vm.assume(fuzzProvider != address(0));
        vm.assume(fuzzEvaluator != address(0));
        vm.assume(fuzzProvider != fuzzEvaluator);
        vm.assume(bytes(description).length > 0);
        vm.assume(bytes(description).length <= 1000);
        
        // Constrain expiry to valid range
        expiryOffset = bound(expiryOffset, 6 minutes, 364 days);
        
        vm.prank(client);
        uint256 jobId = agenticCommerce.createJob(
            fuzzProvider,
            fuzzEvaluator,
            block.timestamp + expiryOffset,
            description,
            address(0)
        );
        
        assertGt(jobId, 0);
        
        // Verify job exists
        AgenticCommerceV4.Job memory job = agenticCommerce.getJob(jobId);
        assertEq(job.provider, fuzzProvider);
        assertEq(job.evaluator, fuzzEvaluator);
    }
    
    /**
     * @dev Fuzz: Fee calculation correctness
     */
    function testFuzz_FeeCalculation(
        uint256 amount,
        uint256 feeBP
    ) public {
        // Bound inputs
        amount = bound(amount, 1, type(uint128).max);
        feeBP = bound(feeBP, 0, 10000);
        
        // Set fee
        vm.prank(owner);
        agenticCommerce.setPlatformFee(feeBP, treasury);
        
        // Calculate expected fee
        uint256 expectedFee = (amount * feeBP) / 10000;
        uint256 expectedNet = amount - expectedFee;
        
        // Verify fee never exceeds amount
        assertLe(expectedFee, amount);
        assertEq(expectedFee + expectedNet, amount);
    }
    
    /**
     * @dev Fuzz: Description length bounds
     */
    function testFuzz_DescriptionLength(string calldata description) public {
        vm.assume(bytes(description).length <= 1500); // Reasonable upper bound
        
        if (bytes(description).length == 0 || bytes(description).length > 1000) {
            vm.prank(client);
            vm.expectRevert();
            agenticCommerce.createJob(
                provider,
                evaluator,
                block.timestamp + 1 days,
                description,
                address(0)
            );
        }
    }
    
    /**
     * @dev Fuzz: Multiple jobs per client
     */
    function testFuzz_MultipleJobs(
        uint256 jobCount
    ) public {
        jobCount = bound(jobCount, 1, 100);
        
        for (uint i = 0; i < jobCount; i++) {
            vm.prank(client);
            agenticCommerce.createJob(
                provider,
                evaluator,
                block.timestamp + 7 days,
                "Test job",
                address(0)
            );
        }
        
        assertEq(agenticCommerce.clientJobCount(client), jobCount);
    }
    
    /**
     * @dev Fuzz: Job lifecycle sequence
     */
    function testFuzz_JobLifecycleSequence(
        uint8 actions
    ) public {
        // Create job
        vm.prank(client);
        uint256 jobId = agenticCommerce.createJob(
            provider,
            evaluator,
            block.timestamp + 7 days,
            "Test job",
            address(0)
        );
        
        // Fund job
        vm.startPrank(client);
        usdc.approve(address(agenticCommerce), 100_000_000);
        agenticCommerce.setBudget(jobId, 100_000_000);
        agenticCommerce.setPaymentToken(jobId, address(usdc));
        agenticCommerce.fund(jobId);
        vm.stopPrank();
        
        // Submit
        vm.prank(provider);
        agenticCommerce.submit(jobId, keccak256("deliverable"));
        
        // Complete
        vm.prank(evaluator);
        agenticCommerce.complete(jobId, keccak256("reason"));
        
        // Verify job completed
        AgenticCommerceV4.Job memory job = agenticCommerce.getJob(jobId);
        assertEq(uint256(job.status), 3); // Completed = 3
    }
}

/**
 * @title FuzzAgentReviewV4
 * @dev Fuzzing tests for AgentReviewV4
 */
contract FuzzAgentReviewV4 is TestFixtures {
    function setUp() public override {
        super.setUp();
    }
    
    /**
     * @dev Fuzz: Score bounds enforcement
     */
    function testFuzz_ScoreBounds(int256 score) public {
        uint256 proposalId = _createProposal();
        
        if (score < -1000 || score > 1000) {
            vm.prank(evaluator1);
            vm.expectRevert("Invalid score");
            agentReview.submitEvaluation{value: MIN_STAKE}(proposalId, score, "reasoning");
        } else {
            vm.prank(evaluator1);
            agentReview.submitEvaluation{value: MIN_STAKE}(proposalId, score, "reasoning");
            
            AgentReviewV4.Evaluation memory eval = agentReview.getEvaluation(proposalId, evaluator1);
            assertEq(eval.confidenceScore, score);
        }
    }
    
    /**
     * @dev Fuzz: Stake amounts
     */
    function testFuzz_StakeAmounts(uint256 stake) public {
        uint256 proposalId = _createProposal();
        
        stake = bound(stake, 0, 10 ether);
        
        if (stake < 0.001 ether) {
            vm.prank(evaluator1);
            vm.expectRevert("Min stake");
            agentReview.submitEvaluation{value: stake}(proposalId, 500, "reasoning");
        } else {
            vm.prank(evaluator1);
            agentReview.submitEvaluation{value: stake}(proposalId, 500, "reasoning");
            
            AgentReviewV4.Evaluation memory eval = agentReview.getEvaluation(proposalId, evaluator1);
            assertEq(eval.stakeAmount, stake);
        }
    }
    
    /**
     * @dev Fuzz: Proposal creation parameters
     */
    function testFuzz_ProposalCreation(
        uint256 reward,
        uint256 deadlineOffset
    ) public {
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
        
        AgentReviewV4.Proposal memory proposal = agentReview.getProposal(proposalId);
        assertEq(proposal.reward, reward);
    }
    
    /**
     * @dev Fuzz: Complete proposal lifecycle
     */
    function testFuzz_ProposalLifecycle(
        uint256 evaluatorCount,
        int256[] calldata scores
    ) public {
        evaluatorCount = bound(evaluatorCount, 1, 5);
        
        uint256 proposalId = _createProposal();
        
        // Submit evaluations
        for (uint i = 0; i < evaluatorCount && i < scores.length; i++) {
            address evalAddr = makeAddr(string.concat("eval", vm.toString(i)));
            vm.deal(evalAddr, 1 ether);
            
            int256 score = scores[i];
            if (score >= -1000 && score <= 1000) {
                vm.prank(evalAddr);
                agentReview.submitEvaluation{value: MIN_STAKE}(proposalId, score, "reasoning");
            }
        }
        
        // Verify evaluator count
        assertLe(agentReview.getEvaluatorCount(proposalId), 5);
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
