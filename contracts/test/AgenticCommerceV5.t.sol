// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import {AgenticCommerceV5} from "../shared/AgenticCommerceV5.sol";
import {IAgenticCommerceV5} from "../interfaces/IAgenticCommerceV5.sol";
import {MockERC20} from "./TestFixtures.sol";

/**
 * @title AgenticCommerceV5Test
 * @dev Comprehensive tests for AgenticCommerceV5 with bidding system
 */
contract AgenticCommerceV5Test is Test {
    AgenticCommerceV5 public agentic;
    MockERC20 public usdc;
    MockERC20 public weth;
    
    address public owner = makeAddr("owner");
    address public treasury = makeAddr("treasury");
    address public serviceRegistry = makeAddr("serviceRegistry");
    
    address public client = makeAddr("client");
    address public provider = makeAddr("provider");
    address public evaluator = makeAddr("evaluator");
    address public bidder1 = makeAddr("bidder1");
    address public bidder2 = makeAddr("bidder2");
    
    uint256 public constant PLATFORM_FEE_BP = 100; // 1%
    uint256 public constant REVEAL_WINDOW = 1 hours;
    uint256 public constant MIN_STAKE_BP = 100; // 1%
    
    function setUp() public {
        // Deploy mock tokens
        usdc = new MockERC20("USDC", "USDC", 6);
        weth = new MockERC20("WETH", "WETH", 18);
        
        // Deploy implementation
        AgenticCommerceV5 implementation = new AgenticCommerceV5();
        
        // Deploy proxy
        bytes memory initData = abi.encodeCall(
            AgenticCommerceV5.initialize,
            (treasury, serviceRegistry)
        );
        
        TransparentUpgradeableProxy proxy = new TransparentUpgradeableProxy(
            address(implementation),
            owner,
            initData
        );
        
        agentic = AgenticCommerceV5(address(proxy));
        
        // Fund test accounts
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
    /* Direct Job Tests */
    /***********************************/
    
    function testCreateDirectJob() public {
        vm.prank(client);
        uint256 jobId = agentic.createJob(
            provider,
            evaluator,
            block.timestamp + 7 days,
            "Test job",
            address(0)
        );
        
        assertEq(jobId, 1);
        
        IAgenticCommerceV5.Job memory job = agentic.getJob(jobId);
        assertEq(job.client, client);
        assertEq(job.provider, provider);
        assertEq(job.evaluator, evaluator);
        assertEq(uint8(job.status), uint8(IAgenticCommerceV5.JobStatus.Open));
        assertEq(job.budget, 0);
    }
    
    function testSetBudgetAndFund() public {
        // Create job with ETH payment (address(0))
        vm.prank(client);
        uint256 jobId = agentic.createJob(
            provider,
            evaluator,
            block.timestamp + 7 days,
            "Test job",
            address(0) // ETH payment
        );
        
        // Set budget (in wei for ETH)
        vm.prank(client);
        agentic.setBudget(jobId, 1 ether);
        
        // Fund with ETH
        vm.prank(client);
        agentic.fund{value: 1 ether}(jobId);
        
        IAgenticCommerceV5.Job memory job = agentic.getJob(jobId);
        assertEq(uint8(job.status), uint8(IAgenticCommerceV5.JobStatus.Funded));
        assertEq(job.budget, 1 ether);
    }
    
    function testFundWithMinEthAmount() public {
        // Test minimum ETH payment
        vm.prank(client);
        uint256 jobId = agentic.createJob(
            provider,
            evaluator,
            block.timestamp + 7 days,
            "Min ETH test",
            address(0)
        );
        
        vm.prank(client);
        agentic.setBudget(jobId, 0.01 ether);
        
        // Fund with exactly minimum
        vm.prank(client);
        agentic.fund{value: 0.01 ether}(jobId);
        
        IAgenticCommerceV5.Job memory job = agentic.getJob(jobId);
        assertEq(uint8(job.status), uint8(IAgenticCommerceV5.JobStatus.Funded));
    }
    
    function testCannotFundBelowMinEth() public {
        vm.prank(client);
        uint256 jobId = agentic.createJob(
            provider,
            evaluator,
            block.timestamp + 7 days,
            "Below min test",
            address(0)
        );
        
        vm.prank(client);
        agentic.setBudget(jobId, 0.001 ether);
        
        // Try to fund with less than minimum
        vm.prank(client);
        vm.expectRevert("Below minimum ETH");
        agentic.fund{value: 0.001 ether}(jobId);
    }
    
    function testCannotFundWithInsufficientEth() public {
        vm.prank(client);
        uint256 jobId = agentic.createJob(
            provider,
            evaluator,
            block.timestamp + 7 days,
            "Insufficient test",
            address(0)
        );
        
        vm.prank(client);
        agentic.setBudget(jobId, 1 ether);
        
        // Try to fund with less than budget
        vm.prank(client);
        vm.expectRevert("Insufficient payment");
        agentic.fund{value: 0.5 ether}(jobId);
    }
    
    /***********************************/
    /* Open Job Tests */
    /***********************************/
    
    function testCreateOpenJob() public {
        vm.prank(client);
        uint256 jobId = agentic.createOpenJob(
            100e6, // maxBudget
            evaluator,
            block.timestamp + 7 days,
            "Open job for bidding",
            IERC20(address(usdc))
        );
        
        assertEq(jobId, 1);
        
        IAgenticCommerceV5.Job memory job = agentic.getJob(jobId);
        assertEq(job.client, client);
        assertEq(job.provider, address(0)); // No provider yet
        assertEq(job.evaluator, evaluator);
        assertEq(uint8(job.status), uint8(IAgenticCommerceV5.JobStatus.Open));
        assertEq(job.budget, 0); // No budget until bid accepted
        // getJobType and getMaxBudget removed to save size
    }
    
    /***********************************/
    /* Bidding Tests */
    /***********************************/
    
    function testCommitBid() public {
        uint256 jobId = _createOpenJob(100e6);
        
        // Calculate stake (1% of max budget)
        uint256 stake = agentic.calculateStake(100e6);
        assertEq(stake, 1e6); // 1% of 100 USDC
        
        // Approve and commit bid
        bytes32 commitHash = keccak256(abi.encode(80e6, "My pitch", bytes32(uint256(123))));
        
        vm.prank(bidder1);
        usdc.approve(address(agentic), stake);
        
        vm.prank(bidder1);
        agentic.commitBid(jobId, commitHash);
        
        // Verify bid committed
        IAgenticCommerceV5.Bid memory bid = agentic.getUserBid(jobId, bidder1);
        assertEq(bid.bidder, bidder1);
        assertEq(bid.stake, stake);
        assertFalse(bid.revealed);
    }
    
    function testCannotCommitTwice() public {
        uint256 jobId = _createOpenJob(100e6);
        uint256 stake = agentic.calculateStake(100e6);
        bytes32 commitHash = keccak256(abi.encode(80e6, "My pitch", bytes32(uint256(123))));
        
        vm.prank(bidder1);
        usdc.approve(address(agentic), stake);
        vm.prank(bidder1);
        agentic.commitBid(jobId, commitHash);
        
        // Try to commit again
        bytes32 commitHash2 = keccak256(abi.encode(90e6, "Different pitch", bytes32(uint256(456))));
        
        vm.prank(bidder1);
        vm.expectRevert(AgenticCommerceV5.AlreadyBid.selector);
        agentic.commitBid(jobId, commitHash2);
    }
    
    function testRevealBid() public {
        uint256 jobId = _createOpenJob(100e6);
        uint256 stake = agentic.calculateStake(100e6);
        uint256 bidAmount = 80e6;
        string memory message = "I am the best for this job!";
        bytes32 salt = bytes32(uint256(123));
        bytes32 commitHash = keccak256(abi.encode(bidAmount, message, salt));
        
        vm.prank(bidder1);
        usdc.approve(address(agentic), stake);
        vm.prank(bidder1);
        agentic.commitBid(jobId, commitHash);
        
        // Fast forward past deadline
        vm.warp(block.timestamp + 7 days + 1);
        
        // Reveal bid
        vm.prank(bidder1);
        agentic.revealBid(jobId, bidAmount, message, salt);
        
        IAgenticCommerceV5.Bid memory bid = agentic.getUserBid(jobId, bidder1);
        assertTrue(bid.revealed);
        assertEq(bid.proposedAmount, bidAmount);
        assertEq(bid.message, message);
    }
    
    function testCannotRevealWithWrongAmount() public {
        uint256 jobId = _createOpenJob(100e6);
        uint256 stake = agentic.calculateStake(100e6);
        uint256 bidAmount = 80e6;
        bytes32 salt = bytes32(uint256(123));
        bytes32 commitHash = keccak256(abi.encode(bidAmount, "My pitch", salt));
        
        vm.prank(bidder1);
        usdc.approve(address(agentic), stake);
        vm.prank(bidder1);
        agentic.commitBid(jobId, commitHash);
        
        // Fast forward past deadline
        vm.warp(block.timestamp + 7 days + 1);
        
        // Try to reveal with wrong amount
        vm.prank(bidder1);
        vm.expectRevert("Invalid commitment");
        agentic.revealBid(jobId, 90e6, "My pitch", salt);
    }
    
    function testRevealWindowEnforced() public {
        uint256 jobId = _createOpenJob(100e6);
        uint256 stake = agentic.calculateStake(100e6);
        bytes32 commitHash = keccak256(abi.encode(80e6, "My pitch", bytes32(uint256(123))));
        
        vm.prank(bidder1);
        usdc.approve(address(agentic), stake);
        vm.prank(bidder1);
        agentic.commitBid(jobId, commitHash);
        
        // Try to reveal before deadline
        vm.prank(bidder1);
        vm.expectRevert("Deadline not passed");
        agentic.revealBid(jobId, 80e6, "My pitch", bytes32(uint256(123)));
        
        // Warp to after deadline but before reveal window
        vm.warp(block.timestamp + 7 days);
        
        // Now can reveal
        vm.prank(bidder1);
        agentic.revealBid(jobId, 80e6, "My pitch", bytes32(uint256(123)));
        
        // Verify bid was revealed
        IAgenticCommerceV5.Bid memory bid = agentic.getUserBid(jobId, bidder1);
        assertTrue(bid.revealed);
    }
    
    function testAcceptBid() public {
        // Create open job with longer deadline
        vm.prank(client);
        uint256 jobId = agentic.createOpenJob(
            100e6,
            evaluator,
            block.timestamp + 30 days, // Longer deadline
            "Open job",
            IERC20(address(usdc))
        );
        
        uint256 stake = agentic.calculateStake(100e6);
        uint256 bidAmount = 80e6;
        string memory message = "I am the best!";
        bytes32 salt = bytes32(uint256(123));
        bytes32 commitHash = keccak256(abi.encode(bidAmount, message, salt));
        
        // Approve and commit bid
        vm.prank(bidder1);
        usdc.approve(address(agentic), stake);
        vm.prank(bidder1);
        agentic.commitBid(jobId, commitHash);
        
        // Fast forward past deadline
        vm.warp(block.timestamp + 30 days + 1);
        
        // Reveal bid
        vm.prank(bidder1);
        agentic.revealBid(jobId, bidAmount, message, salt);
        
        // Accept bid first (this sets provider and budget)
        vm.prank(client);
        agentic.acceptBid(jobId, 1); // bidId = 1
        
        // Warp back before expiry to fund
        vm.warp(block.timestamp - 1 days);
        
        // Now approve and fund
        vm.prank(client);
        usdc.approve(address(agentic), bidAmount);
        vm.prank(client);
        agentic.fund(jobId);
        
        IAgenticCommerceV5.Job memory job = agentic.getJob(jobId);
        assertEq(job.provider, bidder1);
        assertEq(job.budget, bidAmount);
        assertEq(uint8(job.status), uint8(IAgenticCommerceV5.JobStatus.Funded));
    }
    
    function testMultipleBidsAccepted() public {
        uint256 jobId = _createOpenJob(200e6);
        uint256 stake = agentic.calculateStake(200e6);
        
        // Bidder 1 commits
        bytes32 commit1 = keccak256(abi.encode(100e6, "Bid 1", bytes32(uint256(1))));
        vm.prank(bidder1);
        usdc.approve(address(agentic), stake);
        vm.prank(bidder1);
        agentic.commitBid(jobId, commit1);
        
        // Bidder 2 commits
        bytes32 commit2 = keccak256(abi.encode(150e6, "Bid 2", bytes32(uint256(2))));
        vm.prank(bidder2);
        usdc.approve(address(agentic), stake);
        vm.prank(bidder2);
        agentic.commitBid(jobId, commit2);
        
        // Fast forward past deadline
        vm.warp(block.timestamp + 7 days + 1);
        
        // Reveal both bids
        vm.prank(bidder1);
        agentic.revealBid(jobId, 100e6, "Bid 1", bytes32(uint256(1)));
        
        vm.prank(bidder2);
        agentic.revealBid(jobId, 150e6, "Bid 2", bytes32(uint256(2)));
        
        // Accept bid from bidder1
        vm.prank(client);
        agentic.acceptBid(jobId, 1);
        
        IAgenticCommerceV5.Job memory job = agentic.getJob(jobId);
        assertEq(job.provider, bidder1);
        assertEq(job.budget, 100e6);
        
        // Check stakes were returned
        IAgenticCommerceV5.Bid memory bid1 = agentic.getUserBid(jobId, bidder1);
        assertEq(bid1.stake, 0); // Returned
    }
    
    /***********************************/
    /* Edge Cases */
    /***********************************/
    
    function testCannotBidOnDirectJob() public {
        vm.prank(client);
        uint256 jobId = agentic.createJob(
            provider,
            evaluator,
            block.timestamp + 7 days,
            "Direct job",
            address(0)
        );
        
        bytes32 commitHash = keccak256(abi.encode(50e6, "Bid", bytes32(uint256(1))));
        
        vm.prank(bidder1);
        vm.expectRevert("Not open job");
        agentic.commitBid(jobId, commitHash);
    }
    
    function testBidAmountCannotExceedMaxBudget() public {
        uint256 jobId = _createOpenJob(100e6);
        uint256 stake = agentic.calculateStake(100e6);
        uint256 bidAmount = 150e6; // Exceeds max budget of 100e6
        bytes32 commitHash = keccak256(abi.encode(bidAmount, "Too high", bytes32(uint256(1))));
        
        vm.prank(bidder1);
        usdc.approve(address(agentic), stake);
        vm.prank(bidder1);
        agentic.commitBid(jobId, commitHash);
        
        // Fast forward past deadline
        vm.warp(block.timestamp + 7 days + 1);
        
        // Try to reveal with amount exceeding max budget
        vm.prank(bidder1);
        vm.expectRevert("Amount exceeds max budget");
        agentic.revealBid(jobId, bidAmount, "Too high", bytes32(uint256(1)));
    }
    
    function testStakeCalculation() public {
        assertEq(agentic.calculateStake(100e6), 1e6);   // 1%
        assertEq(agentic.calculateStake(1000e6), 10e6); // 1%
        assertEq(agentic.calculateStake(1e18), 1e16);   // ETH: 1%
    }
    
    /***********************************/
    /* Helper Functions */
    /***********************************/
    
    function _createOpenJob(uint256 maxBudget) internal returns (uint256) {
        vm.prank(client);
        return agentic.createOpenJob(
            maxBudget,
            evaluator,
            block.timestamp + 7 days,
            "Open job",
            IERC20(address(usdc))
        );
    }
}
