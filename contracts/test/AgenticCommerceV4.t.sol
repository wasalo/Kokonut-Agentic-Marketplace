// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {TestFixtures} from "./TestFixtures.sol";
import {AgenticCommerceV4, IAgenticCommerceV4} from "../shared/AgenticCommerceV4.sol";

/**
 * @title AgenticCommerceV4Test
 * @dev Comprehensive test suite for AgenticCommerceV4
 * Covers all functions, edge cases, and security properties
 * Target: 95%+ coverage
 */
contract AgenticCommerceV4Test is TestFixtures {
    // Event definitions for testing
    event JobCreated(uint256 indexed jobId, address indexed client, address indexed provider, address evaluator, uint256 serviceId, uint256 expiredAt);
    event ProviderSet(uint256 indexed jobId, address indexed provider);
    event BudgetSet(uint256 indexed jobId, uint256 amount);
    event JobFunded(uint256 indexed jobId, address indexed client, uint256 amount);
    event JobSubmitted(uint256 indexed jobId, address indexed provider, bytes32 deliverable);
    event JobCompleted(uint256 indexed jobId, address indexed evaluator, bytes32 reason);
    event JobRejected(uint256 indexed jobId, address indexed rejector, bytes32 reason);
    event JobExpired(uint256 indexed jobId);
    event PaymentReleased(uint256 indexed jobId, address indexed provider, uint256 amount);
    event Refunded(uint256 indexed jobId, address indexed client, uint256 amount);
    event JobStatusChanged(uint256 indexed jobId, IAgenticCommerceV4.JobStatus indexed oldStatus, IAgenticCommerceV4.JobStatus indexed newStatus, uint256 timestamp);
    event JobUpdated(uint256 indexed jobId, bytes32 indexed updateType, uint256 timestamp);
    event PaymentTokenSet(uint256 indexed jobId, address indexed token);
    event PlatformFeeUpdated(uint256 oldFeeBP, uint256 newFeeBP, address indexed oldTreasury, address indexed newTreasury);
    event ServiceRegistrySet(address indexed oldRegistry, address indexed newRegistry);
    event JobLimitExceeded(address indexed client, uint256 attemptedCount, uint256 maxAllowed);
    event EmergencyRefund(uint256 indexed jobId, address indexed client, uint256 amount, string reason);
    
    // Test data
    uint256 constant JOB_BUDGET = 100_000_000; // 100 USDC
    uint256 constant PLATFORM_FEE_BP = 50; // 0.5%
    
    function setUp() public override {
        super.setUp();
        
        // Set platform fee
        vm.prank(owner);
        agenticCommerce.setPlatformFee(PLATFORM_FEE_BP, treasury);
    }
    
    // =====================================================
    // JOB CREATION TESTS
    // =====================================================
    
    function test_CreateJob_Success() public {
        uint256 deadline = block.timestamp + 7 days;
        
        vm.prank(client);
        uint256 jobId = agenticCommerce.createJob(
            provider,
            evaluator,
            deadline,
            "Test job description",
            address(0)
        );
        
        assertEq(jobId, 1);
        
        // Verify job data
        AgenticCommerceV4.Job memory job = agenticCommerce.getJob(jobId);
        assertEq(job.id, jobId);
        assertEq(job.client, client);
        assertEq(job.provider, provider);
        assertEq(job.evaluator, evaluator);
        
        // Verify client job count
        assertEq(agenticCommerce.clientJobCount(client), 1);
    }
    
    function test_CreateJob_EmitsJobCreated() public {
        uint256 deadline = block.timestamp + 7 days;
        
        vm.prank(client);
        vm.expectEmit(true, true, true, true);
        emit JobCreated(1, client, provider, evaluator, 0, deadline);
        
        agenticCommerce.createJob(
            provider,
            evaluator,
            deadline,
            "Test job description",
            address(0)
        );
    }
    
    function test_CreateJob_ZeroProvider_Reverts() public {
        vm.prank(client);
        vm.expectRevert("Zero provider");
        agenticCommerce.createJob(
            address(0),
            evaluator,
            block.timestamp + 7 days,
            "Test job",
            address(0)
        );
    }
    
    function test_CreateJob_ZeroEvaluator_Reverts() public {
        vm.prank(client);
        vm.expectRevert("Zero evaluator");
        agenticCommerce.createJob(
            provider,
            address(0),
            block.timestamp + 7 days,
            "Test job",
            address(0)
        );
    }
    
    function test_CreateJob_ExpiryTooSoon_Reverts() public {
        vm.prank(client);
        vm.expectRevert("Expiry too soon");
        agenticCommerce.createJob(
            provider,
            evaluator,
            block.timestamp + 5 minutes,
            "Test job",
            address(0)
        );
    }
    
    function test_CreateJob_ExpiryTooFar_Reverts() public {
        vm.prank(client);
        vm.expectRevert("Expiry too far");
        agenticCommerce.createJob(
            provider,
            evaluator,
            block.timestamp + 366 days,
            "Test job",
            address(0)
        );
    }
    
    function test_CreateJob_EmptyDescription_Reverts() public {
        vm.prank(client);
        vm.expectRevert("Empty description");
        agenticCommerce.createJob(
            provider,
            evaluator,
            block.timestamp + 7 days,
            "",
            address(0)
        );
    }
    
    function test_CreateJob_DescriptionTooLong_Reverts() public {
        string memory longDescription = new string(1001);
        
        vm.prank(client);
        vm.expectRevert("Description too long");
        agenticCommerce.createJob(
            provider,
            evaluator,
            block.timestamp + 7 days,
            longDescription,
            address(0)
        );
    }
    
    function test_CreateJob_MaxJobsLimit_Reverts() public {
        // Create 100 jobs (max allowed)
        for (uint i = 0; i < 100; i++) {
            vm.prank(client);
            agenticCommerce.createJob(
                provider,
                evaluator,
                block.timestamp + 7 days,
                "Test job",
                address(0)
            );
        }
        
        // 101st job should fail
        vm.prank(client);
        vm.expectRevert(
            abi.encodeWithSelector(
                AgenticCommerceV4.MaxJobsPerClient.selector,
                client,
                100
            )
        );
        agenticCommerce.createJob(
            provider,
            evaluator,
            block.timestamp + 7 days,
            "Test job",
            address(0)
        );
        
        assertEq(agenticCommerce.clientJobCount(client), 100);
    }
    
    function test_CreateJob_EmitsJobLimitExceeded() public {
        // Create 100 jobs
        for (uint i = 0; i < 100; i++) {
            vm.prank(client);
            agenticCommerce.createJob(
                provider,
                evaluator,
                block.timestamp + 7 days,
                "Test job",
                address(0)
            );
        }
        
        // 101st job should emit warning before reverting
        vm.prank(client);
        vm.expectEmit(true, false, false, true);
        emit JobLimitExceeded(client, 101, 100);
        
        vm.expectRevert();
        agenticCommerce.createJob(
            provider,
            evaluator,
            block.timestamp + 7 days,
            "Test job",
            address(0)
        );
    }
    
    // =====================================================
    // JOB FUNDING TESTS
    // =====================================================
    
    function test_FundJob_Success() public {
        uint256 jobId = createTestJob(client, provider, evaluator);
        
        vm.startPrank(client);
        usdc.approve(address(agenticCommerce), JOB_BUDGET);
        agenticCommerce.setBudget(jobId, JOB_BUDGET);
        agenticCommerce.setPaymentToken(jobId, address(usdc));
        agenticCommerce.fund(jobId);
        vm.stopPrank();
        
        // Verify job status
        AgenticCommerceV4.Job memory job = agenticCommerce.getJob(jobId);
        assertEq(uint256(job.status), uint256(IAgenticCommerceV4.JobStatus.Funded));
        assertEq(job.budget, JOB_BUDGET);
        
        // Verify USDC transfer
        assertEq(usdc.balanceOf(address(agenticCommerce)), JOB_BUDGET);
    }
    
    function test_FundJob_EmitsJobFunded() public {
        uint256 jobId = createTestJob(client, provider, evaluator);
        
        vm.startPrank(client);
        usdc.approve(address(agenticCommerce), JOB_BUDGET);
        agenticCommerce.setBudget(jobId, JOB_BUDGET);
        agenticCommerce.setPaymentToken(jobId, address(usdc));
        
        vm.expectEmit(true, true, false, true);
        emit JobFunded(jobId, client, JOB_BUDGET);
        
        agenticCommerce.fund(jobId);
        vm.stopPrank();
    }
    
    function test_FundJob_EmitsJobStatusChanged() public {
        uint256 jobId = createTestJob(client, provider, evaluator);
        
        vm.startPrank(client);
        usdc.approve(address(agenticCommerce), JOB_BUDGET);
        agenticCommerce.setBudget(jobId, JOB_BUDGET);
        agenticCommerce.setPaymentToken(jobId, address(usdc));
        
        vm.expectEmit(true, true, true, true);
        emit JobStatusChanged(
            jobId,
            IAgenticCommerceV4.JobStatus.Open,
            IAgenticCommerceV4.JobStatus.Funded,
            block.timestamp
        );
        
        agenticCommerce.fund(jobId);
        vm.stopPrank();
    }
    
    function test_FundJob_InvalidJob_Reverts() public {
        vm.prank(client);
        vm.expectRevert("Invalid job");
        agenticCommerce.fund(999);
    }
    
    function test_FundJob_WrongStatus_Reverts() public {
        uint256 jobId = createTestJob(client, provider, evaluator);
        
        // Fund once
        vm.startPrank(client);
        usdc.approve(address(agenticCommerce), JOB_BUDGET);
        agenticCommerce.setBudget(jobId, JOB_BUDGET);
        agenticCommerce.setPaymentToken(jobId, address(usdc));
        agenticCommerce.fund(jobId);
        
        // Try to fund again
        vm.expectRevert("Wrong status");
        agenticCommerce.fund(jobId);
        vm.stopPrank();
    }
    
    function test_FundJob_NotClient_Reverts() public {
        uint256 jobId = createTestJob(client, provider, evaluator);
        
        vm.prank(provider);
        vm.expectRevert("Not client");
        agenticCommerce.fund(jobId);
    }
    
    // Note: test_FundJob_NoProvider_Reverts removed because V4 contract doesn't allow
    // setting provider to address(0) - the setProvider function has "Zero address" check
    
    function test_FundJob_NoBudget_Reverts() public {
        uint256 jobId = createTestJob(client, provider, evaluator);
        
        vm.startPrank(client);
        usdc.approve(address(agenticCommerce), JOB_BUDGET);
        agenticCommerce.setPaymentToken(jobId, address(usdc));
        // Don't set budget
        
        vm.expectRevert("No budget");
        agenticCommerce.fund(jobId);
        vm.stopPrank();
    }
    
    function test_FundJob_Expired_Reverts() public {
        uint256 jobId = createTestJob(client, provider, evaluator);
        
        // Warp past deadline
        vm.warp(block.timestamp + 8 days);
        
        vm.startPrank(client);
        usdc.approve(address(agenticCommerce), JOB_BUDGET);
        agenticCommerce.setBudget(jobId, JOB_BUDGET);
        agenticCommerce.setPaymentToken(jobId, address(usdc));
        
        vm.expectRevert("Expired");
        agenticCommerce.fund(jobId);
        vm.stopPrank();
    }
    
    // =====================================================
    // JOB SUBMISSION TESTS
    // =====================================================
    
    function test_SubmitJob_Success() public {
        uint256 jobId = _createAndFundJob();
        
        vm.prank(provider);
        agenticCommerce.submit(jobId, keccak256("deliverable"));
        
        // Verify status
        AgenticCommerceV4.Job memory job = agenticCommerce.getJob(jobId);
        assertEq(uint256(job.status), uint256(IAgenticCommerceV4.JobStatus.Submitted));
        assertEq(job.deliverable, keccak256("deliverable"));
    }
    
    function test_SubmitJob_EmitsJobSubmitted() public {
        uint256 jobId = _createAndFundJob();
        
        vm.prank(provider);
        vm.expectEmit(true, true, false, true);
        emit JobSubmitted(jobId, provider, keccak256("deliverable"));
        agenticCommerce.submit(jobId, keccak256("deliverable"));
    }
    
    function test_SubmitJob_EmitsJobStatusChanged() public {
        uint256 jobId = _createAndFundJob();
        
        vm.prank(provider);
        vm.expectEmit(true, true, true, true);
        emit JobStatusChanged(
            jobId,
            IAgenticCommerceV4.JobStatus.Funded,
            IAgenticCommerceV4.JobStatus.Submitted,
            block.timestamp
        );
        agenticCommerce.submit(jobId, keccak256("deliverable"));
    }
    
    function test_SubmitJob_WrongStatus_Reverts() public {
        uint256 jobId = createTestJob(client, provider, evaluator);
        // Job is Open, not Funded
        
        vm.prank(provider);
        vm.expectRevert("Wrong status");
        agenticCommerce.submit(jobId, keccak256("deliverable"));
    }
    
    function test_SubmitJob_NotProvider_Reverts() public {
        uint256 jobId = _createAndFundJob();
        
        vm.prank(client);
        vm.expectRevert("Not provider");
        agenticCommerce.submit(jobId, keccak256("deliverable"));
    }
    
    // =====================================================
    // JOB COMPLETION TESTS
    // =====================================================
    
    function test_CompleteJob_Success() public {
        uint256 jobId = _createFundAndSubmitJob();
        
        uint256 providerBalanceBefore = usdc.balanceOf(provider);
        uint256 treasuryBalanceBefore = usdc.balanceOf(treasury);
        
        vm.prank(evaluator);
        agenticCommerce.complete(jobId, keccak256("reason"));
        
        // Calculate expected amounts
        uint256 platformFee = (JOB_BUDGET * PLATFORM_FEE_BP) / 10000;
        uint256 netPayment = JOB_BUDGET - platformFee;
        
        // Verify payment
        assertEq(usdc.balanceOf(provider), providerBalanceBefore + netPayment);
        assertEq(usdc.balanceOf(treasury), treasuryBalanceBefore + platformFee);
        
        // Verify job completed
        AgenticCommerceV4.Job memory job = agenticCommerce.getJob(jobId);
        assertEq(uint256(job.status), uint256(IAgenticCommerceV4.JobStatus.Completed));
        assertEq(job.budget, 0); // Budget should be 0 after payment
        
        // Verify client job count decreased
        assertEq(agenticCommerce.clientJobCount(client), 0);
    }
    
    function test_CompleteJob_ZeroFee() public {
        // Set fee to 0
        vm.prank(owner);
        agenticCommerce.setPlatformFee(0, treasury);
        
        uint256 jobId = _createFundAndSubmitJob();
        
        uint256 providerBalanceBefore = usdc.balanceOf(provider);
        
        vm.prank(evaluator);
        agenticCommerce.complete(jobId, keccak256("reason"));
        
        // Provider should get full amount
        assertEq(usdc.balanceOf(provider), providerBalanceBefore + JOB_BUDGET);
    }
    
    function test_CompleteJob_EmitsJobCompleted() public {
        uint256 jobId = _createFundAndSubmitJob();
        
        vm.prank(evaluator);
        vm.expectEmit(true, true, false, true);
        emit JobCompleted(jobId, evaluator, keccak256("reason"));
        agenticCommerce.complete(jobId, keccak256("reason"));
    }
    
    function test_CompleteJob_EmitsPaymentReleased() public {
        uint256 jobId = _createFundAndSubmitJob();
        
        uint256 platformFee = (JOB_BUDGET * PLATFORM_FEE_BP) / 10000;
        uint256 netPayment = JOB_BUDGET - platformFee;
        
        vm.prank(evaluator);
        vm.expectEmit(true, true, false, true);
        emit PaymentReleased(jobId, provider, netPayment);
        agenticCommerce.complete(jobId, keccak256("reason"));
    }
    
    function test_CompleteJob_EmitsJobStatusChanged() public {
        uint256 jobId = _createFundAndSubmitJob();
        
        vm.prank(evaluator);
        vm.expectEmit(true, true, true, true);
        emit JobStatusChanged(
            jobId,
            IAgenticCommerceV4.JobStatus.Submitted,
            IAgenticCommerceV4.JobStatus.Completed,
            block.timestamp
        );
        agenticCommerce.complete(jobId, keccak256("reason"));
    }
    
    function test_CompleteJob_WrongStatus_Reverts() public {
        uint256 jobId = _createAndFundJob();
        // Job is Funded, not Submitted
        
        vm.prank(evaluator);
        vm.expectRevert("Wrong status");
        agenticCommerce.complete(jobId, keccak256("reason"));
    }
    
    function test_CompleteJob_NotEvaluator_Reverts() public {
        uint256 jobId = _createFundAndSubmitJob();
        
        vm.prank(client);
        vm.expectRevert("Not evaluator");
        agenticCommerce.complete(jobId, keccak256("reason"));
    }
    
    // =====================================================
    // JOB REJECTION TESTS
    // =====================================================
    
    function test_RejectJob_Open_Success() public {
        uint256 jobId = createTestJob(client, provider, evaluator);
        
        vm.prank(client);
        agenticCommerce.reject(jobId, keccak256("reason"));
        
        AgenticCommerceV4.Job memory job = agenticCommerce.getJob(jobId);
        assertEq(uint256(job.status), uint256(IAgenticCommerceV4.JobStatus.Rejected));
    }
    
    function test_RejectJob_Funded_Success() public {
        uint256 jobId = _createAndFundJob();
        uint256 clientBalanceBefore = usdc.balanceOf(client);
        
        vm.prank(evaluator);
        agenticCommerce.reject(jobId, keccak256("reason"));
        
        // Client should get refund
        assertEq(usdc.balanceOf(client), clientBalanceBefore + JOB_BUDGET);
        
        // Job should be rejected
        AgenticCommerceV4.Job memory job = agenticCommerce.getJob(jobId);
        assertEq(uint256(job.status), uint256(IAgenticCommerceV4.JobStatus.Rejected));
        
        // Client job count should decrease
        assertEq(agenticCommerce.clientJobCount(client), 0);
    }
    
    function test_RejectJob_EmitsRefunded() public {
        uint256 jobId = _createAndFundJob();
        
        vm.prank(evaluator);
        vm.expectEmit(true, true, false, true);
        emit Refunded(jobId, client, JOB_BUDGET);
        agenticCommerce.reject(jobId, keccak256("reason"));
    }
    
    function test_RejectJob_NotAuthorized_Reverts() public {
        uint256 jobId = _createAndFundJob();
        
        vm.prank(provider);
        vm.expectRevert("Not evaluator");
        agenticCommerce.reject(jobId, keccak256("reason"));
    }
    
    // =====================================================
    // REFUND TESTS
    // =====================================================
    
    function test_ClaimRefund_Success() public {
        uint256 jobId = _createAndFundJob();
        
        // Warp past deadline
        vm.warp(block.timestamp + 8 days);
        
        uint256 clientBalanceBefore = usdc.balanceOf(client);
        
        vm.prank(client);
        agenticCommerce.claimRefund(jobId);
        
        // Client should get refund
        assertEq(usdc.balanceOf(client), clientBalanceBefore + JOB_BUDGET);
        
        // Job should be expired
        AgenticCommerceV4.Job memory job = agenticCommerce.getJob(jobId);
        assertEq(uint256(job.status), uint256(IAgenticCommerceV4.JobStatus.Expired));
    }
    
    function test_ClaimRefund_EmitsJobExpired() public {
        uint256 jobId = _createAndFundJob();
        vm.warp(block.timestamp + 8 days);
        
        vm.prank(client);
        vm.expectEmit(true, false, false, false);
        emit JobExpired(jobId);
        agenticCommerce.claimRefund(jobId);
    }
    
    function test_ClaimRefund_NotExpired_Reverts() public {
        uint256 jobId = _createAndFundJob();
        
        vm.prank(client);
        vm.expectRevert("Not expired");
        agenticCommerce.claimRefund(jobId);
    }
    
    // =====================================================
    // EMERGENCY REFUND TESTS
    // =====================================================
    
    function test_EmergencyRefund_Success() public {
        uint256 jobId = _createAndFundJob();
        
        uint256 clientBalanceBefore = usdc.balanceOf(client);
        
        vm.prank(owner);
        agenticCommerce.emergencyRefund(jobId, "Emergency situation");
        
        // Client should get refund
        assertEq(usdc.balanceOf(client), clientBalanceBefore + JOB_BUDGET);
        
        // Job should be rejected
        AgenticCommerceV4.Job memory job = agenticCommerce.getJob(jobId);
        assertEq(uint256(job.status), uint256(IAgenticCommerceV4.JobStatus.Rejected));
    }
    
    function test_EmergencyRefund_EmitsEmergencyRefund() public {
        uint256 jobId = _createAndFundJob();
        
        vm.prank(owner);
        vm.expectEmit(true, true, false, true);
        emit EmergencyRefund(jobId, client, JOB_BUDGET, "Emergency situation");
        agenticCommerce.emergencyRefund(jobId, "Emergency situation");
    }
    
    function test_EmergencyRefund_NotOwner_Reverts() public {
        uint256 jobId = _createAndFundJob();
        
        vm.prank(client);
        vm.expectRevert();
        agenticCommerce.emergencyRefund(jobId, "Emergency");
    }
    
    // =====================================================
    // SETTER FUNCTION TESTS
    // =====================================================

    function test_SetBudget_Success() public {
        uint256 jobId = createTestJob(client, provider, evaluator);
        
        vm.prank(client);
        agenticCommerce.setBudget(jobId, 500_000_000);
        
        AgenticCommerceV4.Job memory job = agenticCommerce.getJob(jobId);
        assertEq(job.budget, 500_000_000);
    }
    
    function test_SetPaymentToken_Success() public {
        uint256 jobId = createTestJob(client, provider, evaluator);
        address newToken = makeAddr("newToken");
        
        vm.prank(client);
        agenticCommerce.setPaymentToken(jobId, newToken);
        
        AgenticCommerceV4.Job memory job = agenticCommerce.getJob(jobId);
        assertEq(address(job.paymentToken), newToken);
    }

    function test_SetPlatformFee_Success() public {
        vm.prank(owner);
        agenticCommerce.setPlatformFee(100, treasury); // 1%
        
        assertEq(agenticCommerce.platformFeeBP(), 100);
    }
    
    function test_SetPlatformFee_EmitsPlatformFeeUpdated() public {
        vm.prank(owner);
        vm.expectEmit(false, false, true, true);
        emit PlatformFeeUpdated(
            PLATFORM_FEE_BP,
            100,
            treasury,
            treasury
        );
        agenticCommerce.setPlatformFee(100, treasury);
    }
    
    function test_SetPlatformFee_TooHigh_Reverts() public {
        vm.prank(owner);
        vm.expectRevert("Fee too high");
        agenticCommerce.setPlatformFee(10001, treasury); // > 100%
    }
    
    function test_SetServiceRegistry_Success() public {
        address newRegistry = makeAddr("newRegistry");
        
        vm.prank(owner);
        agenticCommerce.setServiceRegistry(newRegistry);
        
        assertEq(agenticCommerce.serviceRegistry(), newRegistry);
    }
    
    function test_SetServiceRegistry_EmitsServiceRegistrySet() public {
        address newRegistry = makeAddr("newRegistry");
        
        vm.prank(owner);
        vm.expectEmit(true, true, false, false);
        emit ServiceRegistrySet(
            address(serviceRegistry),
            newRegistry
        );
        agenticCommerce.setServiceRegistry(newRegistry);
    }
    
    // =====================================================
    // VIEW FUNCTION TESTS
    // =====================================================
    
    function test_GetJob_Success() public {
        uint256 jobId = createTestJob(client, provider, evaluator);
        
        AgenticCommerceV4.Job memory job = agenticCommerce.getJob(jobId);
        
        assertEq(job.id, jobId);
        assertEq(job.client, client);
        assertEq(job.provider, provider);
        assertEq(job.evaluator, evaluator);
    }
    
    function test_GetJob_InvalidJob_Reverts() public {
        vm.expectRevert("Invalid job");
        agenticCommerce.getJob(999);
    }
    
    function test_GetClientJobCount_Success() public {
        assertEq(agenticCommerce.getClientJobCount(client), 0);
        
        createTestJob(client, provider, evaluator);
        assertEq(agenticCommerce.getClientJobCount(client), 1);
        
        createTestJob(client, provider, evaluator);
        assertEq(agenticCommerce.getClientJobCount(client), 2);
    }
    
    // =====================================================
    // HELPER FUNCTIONS
    // =====================================================
    
    function _createAndFundJob() internal returns (uint256 jobId) {
        jobId = createTestJob(client, provider, evaluator);
        
        vm.startPrank(client);
        usdc.approve(address(agenticCommerce), JOB_BUDGET);
        agenticCommerce.setBudget(jobId, JOB_BUDGET);
        agenticCommerce.setPaymentToken(jobId, address(usdc));
        agenticCommerce.fund(jobId);
        vm.stopPrank();
    }
    
    function _createFundAndSubmitJob() internal returns (uint256 jobId) {
        jobId = _createAndFundJob();
        
        vm.prank(provider);
        agenticCommerce.submit(jobId, keccak256("deliverable"));
    }
}
