// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {TransparentUpgradeableProxy} from "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import {AgenticCommerceV7} from "../shared/AgenticCommerceV7.sol";
import {IAgenticCommerceV7} from "../interfaces/IAgenticCommerceV7.sol";

contract AgenticCommerceV7Test is Test {
    AgenticCommerceV7 public implementation;
    AgenticCommerceV7 public proxy;
    IAgenticCommerceV7 public commerce;

    address public owner = makeAddr("owner");
    address public treasury = makeAddr("treasury");

    address public client = makeAddr("client");
    address public provider = makeAddr("provider");
    address public evaluator = makeAddr("evaluator");

    uint256 public JOB_EXPIRY;
    uint256 public constant JOB_BUDGET = 10e6; // 10 USDC (MIN_BUDGET is 5e6)
    uint256 public constant ETH_VALUE = 0.01 ether; // 0.01 ETH to meet MIN_ETH_PAYMENT of 0.005

    function setUp() public {
        implementation = new AgenticCommerceV7();

        bytes memory initData = abi.encodeCall(
            AgenticCommerceV7.initialize,
            (treasury, owner)
        );

        TransparentUpgradeableProxy _proxy = new TransparentUpgradeableProxy(
            address(implementation),
            owner,
            initData
        );

        proxy = AgenticCommerceV7(payable(address(_proxy)));
        commerce = IAgenticCommerceV7(address(proxy));

        vm.deal(client, 100 ether);
        
        JOB_EXPIRY = block.timestamp + 7 days;
    }

    function testCreateJob_WithClientReview() public {
        vm.prank(client);
        uint256 jobId = commerce.createJob(
            provider,
            evaluator,
            JOB_EXPIRY,
            "Build a website",
            address(0),
            true,  // evaluatorFee
            true   // clientReview required
        );

        assertEq(jobId, 1);
        assertTrue(commerce.isClientReviewRequired(jobId));
        assertFalse(commerce.hasClientApproved(jobId));

        IAgenticCommerceV7.Job memory job = commerce.getJob(jobId);
        assertEq(job.client, client);
        assertEq(job.provider, provider);
        assertEq(job.evaluator, evaluator);
        assertEq(uint256(job.status), 0); // Open
    }

    function testCreateJob_WithoutClientReview() public {
        vm.prank(client);
        uint256 jobId = commerce.createJob(
            provider,
            evaluator,
            JOB_EXPIRY,
            "Build a website",
            address(0),
            true,  // evaluatorFee
            false  // clientReview NOT required
        );

        assertFalse(commerce.isClientReviewRequired(jobId));
    }

    function testFullWorkflow_WithClientReview() public {
        // 1. Create job with client review
        vm.prank(client);
        uint256 jobId = commerce.createJob(
            provider,
            evaluator,
            JOB_EXPIRY,
            "Build a website",
            address(0),
            false,
            true
        );
assertEq(jobId, 1);

        // 2. Set budget
        vm.prank(client);
        commerce.setBudget(jobId, JOB_BUDGET);

        // 3. Fund with ETH
        vm.prank(client);
        commerce.fund{value: ETH_VALUE}(jobId, JOB_BUDGET);

        // 3. Submit deliverable
        vm.prank(provider);
        bytes32 deliverable = keccak256("Deliverable: Website built");
        commerce.submit(jobId, deliverable);

        IAgenticCommerceV7.Job memory job = commerce.getJob(jobId);
        assertEq(uint256(job.status), 5); // PendingClientApproval

        // 4. Client approves
        vm.prank(client);
        commerce.approveByClient(jobId);

        assertTrue(commerce.hasClientApproved(jobId));
        job = commerce.getJob(jobId);
        assertEq(uint256(job.status), 2); // Submitted

        // 5. Evaluator finalizes
        vm.prank(evaluator);
        commerce.finalizeByEvaluator(jobId, "Approved - payment released");

        job = commerce.getJob(jobId);
        assertEq(uint256(job.status), 3); // Completed
    }

    function testFullWorkflow_WithoutClientReview() public {
        // 1. Create job without client review
        vm.prank(client);
        uint256 jobId = commerce.createJob(
            provider,
            evaluator,
            JOB_EXPIRY,
            "Build a website",
            address(0),
            false,
            false
        );

        // 2. Set budget
        vm.prank(client);
        commerce.setBudget(jobId, JOB_BUDGET);

        // 3. Fund with ETH
        vm.prank(client);
        commerce.fund{value: ETH_VALUE}(jobId, JOB_BUDGET);

        // 3. Submit deliverable - goes straight to Submitted (not PendingClientApproval)
        vm.prank(provider);
        bytes32 deliverable = keccak256("Deliverable: Website built");
        commerce.submit(jobId, deliverable);

        IAgenticCommerceV7.Job memory job = commerce.getJob(jobId);
        assertEq(uint256(job.status), 2); // Submitted - NOT PendingClientApproval

        // 4. Evaluator can complete directly
        vm.prank(evaluator);
        commerce.complete(jobId, "Approved");

        job = commerce.getJob(jobId);
        assertEq(uint256(job.status), 3); // Completed
    }

    function testCannotFinalizeWithoutClientApproval() public {
        // Create job with client review required
        vm.prank(client);
        uint256 jobId = commerce.createJob(
            provider,
            evaluator,
            JOB_EXPIRY,
            "Build a website",
            address(0),
            false,
            true
        );

        // Fund and submit
        vm.prank(client);
        commerce.fund{value: ETH_VALUE}(jobId, JOB_BUDGET);

        vm.prank(provider);
        commerce.submit(jobId, keccak256("deliverable"));

        // Try to finalize WITHOUT client approval - should fail
        vm.prank(evaluator);
        vm.expectRevert(); // ClientNotApproved
        commerce.finalizeByEvaluator(jobId, "reason");
    }

    function testRejectByClient_InPendingClientApproval() public {
        // Create with client review
        vm.prank(client);
        uint256 jobId = commerce.createJob(
            provider,
            evaluator,
            JOB_EXPIRY,
            "Build a website",
            address(0),
            false,
            true
        );

        // Fund and submit
        vm.prank(client);
        commerce.fund{value: ETH_VALUE}(jobId, JOB_BUDGET);

        vm.prank(provider);
        commerce.submit(jobId, keccak256("deliverable"));

        // Client rejects in PendingClientApproval state
        vm.prank(client);
        commerce.reject(jobId, "Not satisfactory");

        IAgenticCommerceV7.Job memory job = commerce.getJob(jobId);
        assertEq(uint256(job.status), 4); // Rejected
    }

    function testCompleteAfterTimeout_WithClientApproval() public {
        // Create with client review
        vm.prank(client);
        uint256 jobId = commerce.createJob(
            provider,
            evaluator,
            JOB_EXPIRY,
            "Build a website",
            address(0),
            false,
            true
        );

        // Fund and submit
        vm.prank(client);
        commerce.fund{value: ETH_VALUE}(jobId, JOB_BUDGET);

        vm.prank(provider);
        commerce.submit(jobId, keccak256("deliverable"));

        // Client approves
        vm.prank(client);
        commerce.approveByClient(jobId);

        // Warp past dispute window
        vm.warp(block.timestamp + 8 days);

        // Provider can complete after timeout WITH client approval
        vm.prank(provider);
        commerce.completeAfterTimeout(jobId, "Timeout");

        IAgenticCommerceV7.Job memory job = commerce.getJob(jobId);
        assertEq(uint256(job.status), 3); // Completed
    }

    function testCompleteAfterTimeout_WithoutClientApproval() public {
        // Create with client review
        vm.prank(client);
        uint256 jobId = commerce.createJob(
            provider,
            evaluator,
            JOB_EXPIRY,
            "Build a website",
            address(0),
            false,
            true
        );

        // Fund and submit
        vm.prank(client);
        commerce.fund{value: ETH_VALUE}(jobId, JOB_BUDGET);

        vm.prank(provider);
        commerce.submit(jobId, keccak256("deliverable"));

        // Warp past dispute window WITHOUT client approval
        vm.warp(block.timestamp + 8 days);

        // Try to complete - should fail because client didn't approve
        vm.prank(provider);
        vm.expectRevert(); // ClientNotApproved
        commerce.completeAfterTimeout(jobId, "Timeout");
    }
}