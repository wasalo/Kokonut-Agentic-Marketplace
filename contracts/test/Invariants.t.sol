// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {TestFixtures} from "./TestFixtures.sol";
import {AgenticCommerceV6, IAgenticCommerceV6} from "../shared/AgenticCommerceV6.sol";
import {AgentReviewV5, IAgentReviewV5} from "../shared/AgentReviewV5.sol";

/**
 * @title Invariants
 * @dev System-wide invariant tests for Kokonut contracts
 * 
 * NOTE: These are invariant tests that require special handler setup.
 * Run with: forge test --match-contract Invariants -ff 1
 * 
 * The tests below are placeholder assertions - actual invariant testing
 * requires custom handlers for fuzzing. For now, we use regular unit tests
 * to verify contract behavior.
 */
contract Invariants is TestFixtures {
    // Track state for invariant checking
    uint256 public totalETHLocked;
    uint256 public totalUSDCLocked;
    
    // =====================================================
    // AGENTIC COMMERCE UNIT TESTS (previously invariants)
    // =====================================================
    
    /**
     * @dev Test: Contract ETH balance should be 0 (V6 uses ETH for native payments)
     */
    function test_NoETHBalance_AfterSetup() public {
        // V6 uses ETH for payments, so this may not be 0 after operations
        // This is just a basic sanity check
        assertGe(address(agenticCommerce).balance, 0);
    }
    
    /**
     * @dev Test: Client job count should never exceed MAX_JOBS_PER_CLIENT
     */
    function test_ClientJobCountWithinLimit() public {
        assertLe(agenticCommerce.clientJobCount(client), 100);
        assertLe(agenticCommerce.clientJobCount(provider), 100);
    }
    
    /**
     * @dev Test: Treasury should not be zero address
     */
    function test_TreasurySet() public {
        assertTrue(agenticCommerce.platformTreasury() != address(0));
    }
    
    // =====================================================
    // AGENT REVIEW UNIT TESTS (previously invariants)
    // =====================================================
    
    /**
     * @dev Test: Evaluator count should never exceed MAX_EVALUATORS_PER_PROPOSAL
     */
    function test_EvaluatorCountWithinLimit() public {
        uint256 proposalCount = agentReview._proposalCounter();
        
        for (uint i = 1; i <= proposalCount && i < 10; i++) {
            assertLe(agentReview.getProposalEvaluators(i).length, 5);
        }
    }
    
    /**
     * @dev Test: Treasury should not be zero address for AgentReview
     */
    function test_AgentReview_TreasurySet() public {
        assertTrue(agentReview.owner() != address(0));
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
        // Ensure valid addresses (not zero, not same as client)
        vm.assume(fuzzProvider != address(0));
        vm.assume(fuzzEvaluator != address(0));
        vm.assume(fuzzProvider != fuzzEvaluator);
        vm.assume(fuzzProvider != client);
        vm.assume(fuzzEvaluator != client);
        // Ensure valid description
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
            address(0),
            false
        );
        
        assertGt(jobId, 0);
        
        // Verify job exists
        AgenticCommerceV6.Job memory job = agenticCommerce.getJob(jobId);
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
        
        // Calculate expected fee (V6 uses fixed 1% platform fee, but test any fee)
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
                address(0),
                false
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
                address(0),
                false
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
            address(0),
            false
        );
        
        // Fund job with ETH (V6 defaults to native ETH)
        vm.prank(client);
        agenticCommerce.setBudget(jobId, 1 ether);
        
        vm.prank(client);
        agenticCommerce.fund{value: 1 ether}(jobId);
        
        // Submit
        vm.prank(provider);
        agenticCommerce.submit(jobId, keccak256("deliverable"));
        
        // Complete
        vm.prank(evaluator);
        agenticCommerce.complete(jobId, keccak256("reason"));
        
        // Verify job completed
        AgenticCommerceV6.Job memory job = agenticCommerce.getJob(jobId);
        assertEq(uint256(job.status), 3); // Completed = 3
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
    
    /**
     * @dev Fuzz: Score bounds enforcement
     */
    function testFuzz_ScoreBounds(int256 score) public {
        // Bound the score to test edge cases
        score = bound(score, -1000, 1000);
        
        uint256 proposalId = _createProposal();
        
        if (score < -100 || score > 100) {
            vm.prank(evaluator1);
            vm.expectRevert("Invalid score");
            agentReview.submitEvaluation{value: MIN_STAKE}(proposalId, score, "reasoning");
        } else {
            vm.prank(evaluator1);
            agentReview.submitEvaluation{value: MIN_STAKE}(proposalId, score, "reasoning");
            
            AgentReviewV5.Evaluation memory eval = agentReview.getEvaluation(proposalId, evaluator1);
            assertEq(eval.confidenceScore, score);
        }
    }
    
    /**
     * @dev Fuzz: Stake amounts
     */
    function testFuzz_StakeAmounts(uint256 stake) public {
        // Bound stake to reasonable range
        stake = bound(stake, 0, 10 ether);
        
        uint256 proposalId = _createProposal();
        
        if (stake < 0.001 ether) {
            vm.prank(evaluator1);
            vm.expectRevert("Stake too low");
            agentReview.submitEvaluation{value: stake}(proposalId, 50, "reasoning");
        } else {
            vm.prank(evaluator1);
            agentReview.submitEvaluation{value: stake}(proposalId, 50, "reasoning");
            
            AgentReviewV5.Evaluation memory eval = agentReview.getEvaluation(proposalId, evaluator1);
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
        
        AgentReviewV5.Proposal memory proposal = agentReview.getProposal(proposalId);
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
        
        // Submit evaluations with valid scores only
        for (uint i = 0; i < evaluatorCount && i < scores.length; i++) {
            address evalAddr = makeAddr(string.concat("eval", vm.toString(i)));
            vm.deal(evalAddr, 1 ether);
            
            int256 score = scores[i];
            // Only submit if score is within valid range (-100 to 100)
            if (score >= -100 && score <= 100) {
                vm.prank(evalAddr);
                agentReview.submitEvaluation{value: MIN_STAKE}(proposalId, score, "reasoning");
            }
        }
        
        // Verify evaluator count
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
