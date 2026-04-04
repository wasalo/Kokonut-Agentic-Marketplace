// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import {AgenticCommerceV6} from "../shared/AgenticCommerceV6.sol";
import {IAgenticCommerceV6} from "../interfaces/IAgenticCommerceV6.sol";
import {MockERC20} from "./TestFixtures.sol";
import {MockServiceRegistry} from "./TestFixtures.sol";

/**
 * @title AgenticCommerceV6Test
 * @dev Comprehensive tests for AgenticCommerceV6 new features:
 * - createJobFromService()
 * - Evaluator fees (1%, optional)
 * - withdrawStake() for bidding protection
 * - New function signatures with evaluatorFee param
 */
contract AgenticCommerceV6Test is Test {
    AgenticCommerceV6 public agentic;
    MockERC20 public usdc;
    MockERC20 public weth;
    MockServiceRegistry public mockServiceRegistry;
    
    address public owner = makeAddr("owner");
    address public treasury = makeAddr("treasury");
    
    address public client = makeAddr("client");
    address public provider = makeAddr("provider");
    address public evaluator = makeAddr("evaluator");
    address public bidder1 = makeAddr("bidder1");
    address public bidder2 = makeAddr("bidder2");
    
    uint256 public constant PLATFORM_FEE_BP = 100; // 1%
    uint256 public constant EVALUATOR_FEE_BP = 100; // 1%
    uint256 public constant REVEAL_WINDOW = 1 hours;
    uint256 public constant MIN_STAKE_BP = 100; // 1%
    
    function setUp() public {
        usdc = new MockERC20("USDC", "USDC", 6);
        weth = new MockERC20("WETH", "WETH", 18);
        
        mockServiceRegistry = new MockServiceRegistry();
        
        AgenticCommerceV6 implementation = new AgenticCommerceV6();
        
        bytes memory initData = abi.encodeCall(
            AgenticCommerceV6.initialize,
            (treasury)
        );
        
        TransparentUpgradeableProxy proxy = new TransparentUpgradeableProxy(
            address(implementation),
            owner,
            initData
        );
        
        agentic = AgenticCommerceV6(payable(address(proxy)));
        
        deal(address(usdc), client, 1000e6);
        deal(address(usdc), provider, 1000e6);
        deal(address(usdc), bidder1, 1000e6);
        deal(address(usdc), bidder2, 1000e6);
        
        deal(client, 100 ether);
        deal(provider, 100 ether);
        deal(bidder1, 100 ether);
        deal(bidder2, 100 ether);
    }
    
    /***********************************/
    /* createJob with evaluatorFee */
    /***********************************/
    
    function testCreateJobWithEvaluatorFee() public {
        vm.prank(client);
        uint256 jobId = agentic.createJob(
            provider,
            evaluator,
            block.timestamp + 7 days,
            "Test job with evaluator fee",
            address(0),
            true
        );
        
        assertTrue(agentic.isEvaluatorFeeEnabled(jobId), "Evaluator fee should be enabled");
    }
    
    function testCreateJobWithoutEvaluatorFee() public {
        vm.prank(client);
        uint256 jobId = agentic.createJob(
            provider,
            evaluator,
            block.timestamp + 7 days,
            "Test job without evaluator fee",
            address(0),
            false
        );
        
        assertFalse(agentic.isEvaluatorFeeEnabled(jobId), "Evaluator fee should be disabled");
    }
    
    /***********************************/
    /* createOpenJob with evaluatorFee */
    /***********************************/
    
    function testCreateOpenJobWithEvaluatorFee() public {
        vm.prank(client);
        uint256 jobId = agentic.createOpenJob(
            100e6,
            evaluator,
            block.timestamp + 7 days,
            "Open job with evaluator fee",
            IERC20(address(usdc)),
            true
        );
        
        assertTrue(agentic.isEvaluatorFeeEnabled(jobId), "Evaluator fee should be enabled for open job");
    }
    
    /***********************************/
    /* Evaluator Fee Distribution Tests */
    /***********************************/
    
    function testCompleteWithEvaluatorFee() public {
        // For native ETH, budget is in wei. Use 0.1 ETH = 100000000000000000 wei
        uint256 jobBudget = 0.1 ether;
        
        vm.prank(client);
        uint256 jobId = agentic.createJob(
            provider,
            evaluator,
            block.timestamp + 7 days,
            "Job with evaluator fee",
            address(0), // Native ETH
            true
        );
        
        vm.prank(client);
        agentic.setBudget(jobId, jobBudget);
        
        vm.prank(client);
        agentic.fund{value: jobBudget}(jobId);
        
        vm.prank(provider);
        agentic.submit(jobId, keccak256("deliverable"));
        
        uint256 treasuryBefore = treasury.balance;
        uint256 evaluatorBefore = evaluator.balance;
        uint256 providerBefore = provider.balance;
        
        vm.prank(evaluator);
        agentic.complete(jobId, keccak256("approved"));
        
        uint256 platformFee = jobBudget * PLATFORM_FEE_BP / 10000;
        uint256 evaluatorFee = jobBudget * EVALUATOR_FEE_BP / 10000;
        uint256 providerPayment = jobBudget - platformFee - evaluatorFee;
        
        assertEq(treasury.balance, treasuryBefore + platformFee, "Treasury should receive platform fee");
        assertEq(evaluator.balance, evaluatorBefore + evaluatorFee, "Evaluator should receive evaluator fee");
        assertEq(provider.balance, providerBefore + providerPayment, "Provider should receive remaining");
    }
    
    function testCompleteWithoutEvaluatorFee() public {
        // For native ETH, budget is in wei. Use 0.1 ETH
        uint256 jobBudget = 0.1 ether;
        
        vm.prank(client);
        uint256 jobId = agentic.createJob(
            provider,
            evaluator,
            block.timestamp + 7 days,
            "Job without evaluator fee",
            address(0), // Native ETH
            false
        );
        
        vm.prank(client);
        agentic.setBudget(jobId, jobBudget);
        
        vm.prank(client);
        agentic.fund{value: jobBudget}(jobId);
        
        vm.prank(provider);
        agentic.submit(jobId, keccak256("deliverable"));
        
        uint256 evaluatorBefore = evaluator.balance;
        uint256 providerBefore = provider.balance;
        
        vm.prank(evaluator);
        agentic.complete(jobId, keccak256("approved"));
        
        uint256 platformFee = jobBudget * PLATFORM_FEE_BP / 10000;
        uint256 providerPayment = jobBudget - platformFee;
        
        assertEq(evaluator.balance, evaluatorBefore, "Evaluator should NOT receive fee when disabled");
        assertEq(provider.balance, providerBefore + providerPayment, "Provider should receive remaining");
    }
    
    /***********************************/
    /* withdrawStake Tests */
    /***********************************/
    
    function testWithdrawStakeAfterRevealWindow() public {
        vm.prank(client);
        uint256 jobId = agentic.createOpenJob(
            100e6,
            evaluator,
            block.timestamp + 1 days,
            "Open job for stake withdrawal test",
            IERC20(address(usdc)),
            false
        );
        
        uint256 stakeAmount = agentic.calculateStake(100e6);
        
        vm.prank(bidder1);
        usdc.approve(address(agentic), stakeAmount);
        
        vm.prank(bidder1);
        agentic.commitBid(jobId, keccak256(abi.encode(50e6, "bid message", bytes32(0))));
        
        uint256 bidderBefore = usdc.balanceOf(bidder1);
        
        skip(1 days + REVEAL_WINDOW + 1);
        
        vm.prank(bidder1);
        agentic.withdrawStake(jobId);
        
        assertEq(usdc.balanceOf(bidder1), bidderBefore + stakeAmount, "Bidder should receive stake back");
    }
    
    function testCannotWithdrawStakeBeforeRevealWindow() public {
        vm.prank(client);
        uint256 jobId = agentic.createOpenJob(
            100e6,
            evaluator,
            block.timestamp + 1 days,
            "Open job",
            IERC20(address(usdc)),
            false
        );
        
        uint256 stakeAmount = agentic.calculateStake(100e6);
        
        vm.prank(bidder1);
        usdc.approve(address(agentic), stakeAmount);
        
        vm.prank(bidder1);
        agentic.commitBid(jobId, keccak256(abi.encode(50e6, "bid", bytes32(0))));
        
        skip(1 days);
        
        vm.prank(bidder1);
        vm.expectRevert("Reveal window still open");
        agentic.withdrawStake(jobId);
    }
    
    function testCannotWithdrawAcceptedBid() public {
        vm.prank(client);
        uint256 jobId = agentic.createOpenJob(
            100e6,
            evaluator,
            block.timestamp + 1 days,
            "Open job",
            IERC20(address(usdc)),
            false
        );
        
        uint256 stakeAmount = agentic.calculateStake(100e6);
        bytes32 salt = bytes32(uint256(0x1234));
        
        vm.prank(bidder1);
        usdc.approve(address(agentic), stakeAmount);
        
        bytes32 commitHash = keccak256(abi.encode(50e6, "bid message", salt));
        
        vm.prank(bidder1);
        agentic.commitBid(jobId, commitHash);
        
        // Skip past deadline
        skip(1 days + 1);
        
        vm.prank(bidder1);
        agentic.revealBid(jobId, 50e6, "bid message", salt);
        
        vm.prank(client);
        agentic.acceptBid(jobId, 1);
        
        // Skip past reveal window to allow withdraw attempt
        skip(REVEAL_WINDOW + 1);
        
        // After accept, try to withdraw - should fail because bid was accepted
        vm.prank(bidder1);
        vm.expectRevert("Cannot withdraw accepted bid");
        agentic.withdrawStake(jobId);
    }
    
    function testCannotWithdrawTwice() public {
        vm.prank(client);
        uint256 jobId = agentic.createOpenJob(
            100e6,
            evaluator,
            block.timestamp + 1 days,
            "Open job",
            IERC20(address(usdc)),
            false
        );
        
        uint256 stakeAmount = agentic.calculateStake(100e6);
        
        vm.prank(bidder1);
        usdc.approve(address(agentic), stakeAmount);
        
        vm.prank(bidder1);
        agentic.commitBid(jobId, keccak256(abi.encode(50e6, "bid", bytes32(uint256(0x1234)))));
        
        skip(1 days + REVEAL_WINDOW + 1);
        
        vm.prank(bidder1);
        agentic.withdrawStake(jobId);
        
        vm.prank(bidder1);
        vm.expectRevert("Stake already withdrawn");
        agentic.withdrawStake(jobId);
    }
    
    function testWithdrawStakeAfterJobCompleted() public {
        vm.prank(client);
        uint256 jobId = agentic.createOpenJob(
            100e6,
            evaluator,
            block.timestamp + 1 days,
            "Open job",
            IERC20(address(usdc)),
            false
        );
        
        uint256 stakeAmount = agentic.calculateStake(100e6);
        
        vm.prank(bidder1);
        usdc.approve(address(agentic), stakeAmount);
        vm.prank(bidder2);
        usdc.approve(address(agentic), stakeAmount);
        
        bytes32 salt1 = bytes32(uint256(0x1));
        bytes32 salt2 = bytes32(uint256(0x2));
        
        vm.prank(bidder1);
        agentic.commitBid(jobId, keccak256(abi.encode(50e6, "bid1", salt1)));
        
        vm.prank(bidder2);
        agentic.commitBid(jobId, keccak256(abi.encode(40e6, "bid2", salt2)));
        
        // Skip past deadline
        skip(1 days + 1);
        
        // Reveal bidder1's bid
        vm.prank(bidder1);
        agentic.revealBid(jobId, 50e6, "bid1", salt1);
        
        // Accept the bid
        vm.prank(client);
        agentic.acceptBid(jobId, 1);
        
        // Now skip past reveal window to allow stake withdrawal
        skip(REVEAL_WINDOW + 1);
        
        uint256 bidder2Before = usdc.balanceOf(bidder2);
        
        vm.prank(bidder2);
        agentic.withdrawStake(jobId);
        
        assertEq(usdc.balanceOf(bidder2), bidder2Before + stakeAmount, "Loser bidder should receive stake back");
    }
    
    /***********************************/
    /* createJobFromService Tests - DISABLED in V6 */
    /***********************************/
    
    // NOTE: createJobFromService is disabled in V6 due to contract size constraints
    // These tests are skipped - uncomment when re-enabled
    
    // function testCreateJobFromService() public { ... }
    // function testCreateJobFromServiceWithEvaluatorFee() public { ... }
    // function testCreateJobFromServiceFundsCorrectly() public { ... }
    // function testCannotCreateJobFromInactiveService() public { ... }
    
    /***********************************/
    /* Reject Tests with Evaluator Fee */
    /***********************************/
    
    function testRejectWithEvaluatorFeeNoRefund() public {
        // For native ETH, budget is in wei. Use 0.1 ETH
        uint256 jobBudget = 0.1 ether;
        
        vm.prank(client);
        uint256 jobId = agentic.createJob(
            provider,
            evaluator,
            block.timestamp + 7 days,
            "Job with evaluator fee",
            address(0), // Native ETH
            true
        );
        
        vm.prank(client);
        agentic.setBudget(jobId, jobBudget);
        
        vm.prank(client);
        agentic.fund{value: jobBudget}(jobId);
        
        vm.prank(provider);
        agentic.submit(jobId, keccak256("deliverable"));
        
        uint256 clientBefore = client.balance;
        
        vm.prank(evaluator);
        agentic.reject(jobId, keccak256("not satisfied"));
        
        assertEq(client.balance, clientBefore + jobBudget, "Client should receive full refund on reject");
    }
}
