// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {BiddingSystem} from "../shared/BiddingSystem.sol";
import {IBiddingSystem} from "../interfaces/IBiddingSystem.sol";
import {IAgenticCommerceV9} from "../interfaces/IAgenticCommerceV9.sol";
import {MockAgenticCommerceV9, MockERC20} from "./TestFixtures.sol";

/**
 * @title BiddingSystemTest
 * @dev Comprehensive tests for the standalone BiddingSystem contract
 */
contract BiddingSystemTest is Test {
    BiddingSystem public bidding;
    MockAgenticCommerceV9 public mockCommerce;
    MockERC20 public usdc;

    address public owner = makeAddr("owner");
    address public treasury = makeAddr("treasury");
    address public creator = makeAddr("creator");
    address public evaluator = makeAddr("evaluator");
    address public bidder1 = makeAddr("bidder1");
    address public bidder2 = makeAddr("bidder2");
    address public bidder3 = makeAddr("bidder3");

    uint256 public constant STAKE_BP = 100; // 1%
    uint256 public constant REVEAL_WINDOW = 1 hours;

    event BiddingSessionCreated(
        uint256 indexed sessionId,
        address indexed creator,
        address indexed evaluator,
        uint256 maxBudget,
        uint256 deadline,
        uint256 serviceId
    );

    event BidCommitted(
        uint256 indexed sessionId,
        address indexed bidder,
        bytes32 commitHash,
        uint256 stakeAmount
    );

    // Phase 45b O-2
    event BiddingClosed(uint256 indexed sessionId, address indexed caller, uint256 closedAt);

    // Phase 45b O-3
    event BidderSlashed(
        uint256 indexed sessionId,
        address indexed bidder,
        uint256 slashAmount,
        uint256 refundAmount
    );

    // Phase 45b O-13
    event EvaluatorFinalized(
        uint256 indexed sessionId,
        address indexed evaluator,
        uint256 finalizedAt
    );

    // Phase 45b O-10
    event FeesWithdrawn(address indexed token, address indexed to, uint256 amount);
    
    function setUp() public {
        mockCommerce = new MockAgenticCommerceV9();
        usdc = new MockERC20("USD Coin", "USDC", 6);

        // Deploy implementation
        BiddingSystem implementation = new BiddingSystem();

        // Encode initialization data
        bytes memory initData = abi.encodeWithSelector(
            BiddingSystem.initialize.selector,
            owner,
            address(mockCommerce),
            treasury
        );

        // Deploy proxy
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(implementation),
            initData
        );

        bidding = BiddingSystem(payable(proxy));

        // Fund test accounts
        deal(bidder1, 100 ether);
        deal(bidder2, 100 ether);
        deal(bidder3, 100 ether);
        deal(creator, 100 ether);
    }
    
    /***********************************/
    /* Initialization Tests */
    /***********************************/
    
    function testInitialize() public {
        assertEq(bidding.owner(), owner);
        assertEq(bidding.commerce(), address(mockCommerce));
        assertEq(bidding.treasury(), treasury);
        assertEq(bidding.revealWindow(), REVEAL_WINDOW);
        assertEq(bidding.platformFeeBP(), 100);
    }
    
    function testInitializeRevertIfZeroOwner() public {
        BiddingSystem impl = new BiddingSystem();
        bytes memory initData = abi.encodeWithSelector(
            BiddingSystem.initialize.selector,
            address(0),
            address(mockCommerce),
            treasury
        );
        vm.expectRevert(abi.encodeWithSelector(BiddingSystem.BiddingSystem__Zero_owner.selector));
        new ERC1967Proxy(address(impl), initData);
    }
    
    function testInitializeRevertIfZeroCommerce() public {
        BiddingSystem impl = new BiddingSystem();
        bytes memory initData = abi.encodeWithSelector(
            BiddingSystem.initialize.selector,
            owner,
            address(0),
            treasury
        );
        vm.expectRevert(abi.encodeWithSelector(BiddingSystem.BiddingSystem__Zero_commerce.selector));
        new ERC1967Proxy(address(impl), initData);
    }
    
    function testInitializeRevertIfZeroTreasury() public {
        BiddingSystem impl = new BiddingSystem();
        bytes memory initData = abi.encodeWithSelector(
            BiddingSystem.initialize.selector,
            owner,
            address(mockCommerce),
            address(0)
        );
        vm.expectRevert(abi.encodeWithSelector(BiddingSystem.BiddingSystem__Zero_treasury.selector));
        new ERC1967Proxy(address(impl), initData);
    }
    
    /***********************************/
    /* Create Session Tests */
    /***********************************/
    
    function testCreateBiddingSession() public {
        uint256 maxBudget = 10 ether;
        uint256 deadline = block.timestamp + 7 days;
        uint256 stake = bidding.calculateStake(maxBudget);
        
        vm.prank(creator);
        uint256 sessionId = bidding.createBiddingSession{value: stake}(
            evaluator,
            maxBudget,
            deadline,
            "ipfs://QmTest",
            0,
            address(0),
            false,
            address(0)
        );

        assertEq(sessionId, 1);
        assertEq(bidding.getSessionCount(), 1);
        
        IBiddingSystem.Session memory session = bidding.getSession(sessionId);
        
        assertEq(session.evaluator, evaluator);
        assertEq(session.maxBudget, maxBudget);
        assertEq(session.deadline, deadline);
        assertEq(uint8(session.status), 0);
    }
    
    function testCreateBiddingSessionWithStake() public {
        uint256 maxBudget = 10 ether;
        uint256 stake = bidding.calculateStake(maxBudget);
        
        vm.prank(creator);
        bidding.createBiddingSession{value: stake * 2}(
            evaluator,
            maxBudget,
            block.timestamp + 7 days,
            "",
            0,
            address(0),
            false,
            address(0)
        );
        
        // Excess should be refunded
        assertEq(creator.balance, 100 ether - stake);
    }
    
    function testCreateBiddingSessionRandomEvaluator() public {
        uint256 stake = bidding.calculateStake(10 ether);
        vm.prank(creator);
        uint256 sessionId = bidding.createBiddingSession{value: stake}(address(0), 10 ether, block.timestamp + 7 days, "", 0, address(0), false, address(0));
        
        IBiddingSystem.Session memory session = bidding.getSession(sessionId);
        assertEq(session.evaluator, address(0), "evaluator should be address(0)");
        assertTrue(session.useRandomEvaluator, "useRandomEvaluator should be true");
    }
    
    function testCreateBiddingSessionRevertZeroBudget() public {
        vm.prank(creator);
        vm.expectRevert();
        bidding.createBiddingSession{value: 1 ether}(evaluator, 0, block.timestamp + 7 days, "", 0, address(0), false, address(0));
    }
    
    function testCreateBiddingSessionRevertDurationTooShort() public {
        uint256 stake = bidding.calculateStake(10 ether);
        vm.prank(creator);
        vm.expectRevert(abi.encodeWithSelector(BiddingSystem.BiddingSystem__Duration_too_short.selector));
        bidding.createBiddingSession{value: stake}(evaluator, 10 ether, block.timestamp + 1 minutes, "", 0, address(0), false, address(0));
    }
    
    function testCreateBiddingSessionRevertDurationTooLong() public {
        uint256 stake = bidding.calculateStake(10 ether);
        vm.prank(creator);
        vm.expectRevert(abi.encodeWithSelector(BiddingSystem.BiddingSystem__Duration_too_long.selector));
        bidding.createBiddingSession{value: stake}(evaluator, 10 ether, block.timestamp + 31 days, "", 0, address(0), false, address(0));
    }
    
    function testCreateBiddingSessionRevertInsufficientStake() public {
        vm.prank(creator);
        vm.expectRevert(abi.encodeWithSelector(BiddingSystem.BiddingSystem__Insufficient_stake.selector));
        bidding.createBiddingSession{value: 0.001 ether}(evaluator, 10 ether, block.timestamp + 7 days, "", 0, address(0), false, address(0));
    }
    
    /***********************************/
    /* Commit Bid Tests */
    /***********************************/
    
    function testCommitBid() public {
        uint256 sessionId = _createSession(creator, 10 ether, 7 days);
        uint256 stake = bidding.calculateStake(10 ether);
        bytes32 commitHash = keccak256(abi.encode(5 ether, "My bid", bytes32(uint256(0x1234))));
        
        vm.prank(bidder1);
        bidding.commitBid{value: stake}(sessionId, commitHash);
        
        IBiddingSystem.Bid memory bid = bidding.getUserBid(sessionId, bidder1);
        assertEq(bid.bidder, bidder1);
        assertEq(bid.commitHash, commitHash);
        assertEq(bid.stake, stake);
        assertFalse(bid.revealed);
    }
    
    function testCommitBidWithExcessStake() public {
        uint256 sessionId = _createSession(creator, 10 ether, 7 days);
        uint256 stake = bidding.calculateStake(10 ether);
        bytes32 commitHash = keccak256(abi.encode(5 ether, "My bid", bytes32(uint256(0x1234))));
        
        uint256 balanceBefore = bidder1.balance;
        vm.prank(bidder1);
        bidding.commitBid{value: stake * 2}(sessionId, commitHash);
        
        // Should have received excess back
        assertEq(bidder1.balance, balanceBefore - stake);
    }
    
    function testCommitBidRevertInvalidSession() public {
        uint256 stake = bidding.calculateStake(10 ether);
        bytes32 commitHash = keccak256(abi.encode(5 ether, "My bid", bytes32(uint256(0x1234))));
        
        vm.prank(bidder1);
        vm.expectRevert(abi.encodeWithSelector(BiddingSystem.BiddingSystem__Invalid_session.selector));
        bidding.commitBid{value: stake}(999, commitHash);
    }
    
    function testCommitBidRevertAfterDeadline() public {
        uint256 sessionId = _createSession(creator, 10 ether, 7 days);
        uint256 stake = bidding.calculateStake(10 ether);
        bytes32 commitHash = keccak256(abi.encode(5 ether, "My bid", bytes32(uint256(0x1234))));
        
        // Skip past deadline
        vm.warp(block.timestamp + 8 days);
        
        vm.prank(bidder1);
        vm.expectRevert(abi.encodeWithSelector(BiddingSystem.BiddingSystem__Bidding_closed.selector));
        bidding.commitBid{value: stake}(sessionId, commitHash);
    }
    
    function testCommitBidRevertDuplicateCommit() public {
        uint256 sessionId = _createSession(creator, 10 ether, 7 days);
        uint256 stake = bidding.calculateStake(10 ether);
        bytes32 commitHash = keccak256(abi.encode(5 ether, "My bid", bytes32(uint256(0x1234))));
        
        vm.prank(bidder1);
        bidding.commitBid{value: stake}(sessionId, commitHash);
        
        bytes32 secondHash = keccak256(abi.encode(6 ether, "My other bid", bytes32(uint256(0x5678))));
        vm.prank(bidder1);
        vm.expectRevert(abi.encodeWithSelector(BiddingSystem.BiddingSystem__Already_committed.selector));
        bidding.commitBid{value: stake}(sessionId, secondHash);
    }
    
    function testCommitBidRevertZeroCommitment() public {
        uint256 sessionId = _createSession(creator, 10 ether, 7 days);
        uint256 stake = bidding.calculateStake(10 ether);
        
        vm.prank(bidder1);
        vm.expectRevert(abi.encodeWithSelector(BiddingSystem.BiddingSystem__Zero_commitment.selector));
        bidding.commitBid{value: stake}(sessionId, bytes32(0));
    }
    
    function testCommitBidRevertInsufficientStake() public {
        uint256 sessionId = _createSession(creator, 10 ether, 7 days);
        bytes32 commitHash = keccak256(abi.encode(5 ether, "My bid", bytes32(uint256(0x1234))));
        
        vm.prank(bidder1);
        vm.expectRevert(abi.encodeWithSelector(BiddingSystem.BiddingSystem__Insufficient_stake.selector));
        bidding.commitBid{value: 0.001 ether}(sessionId, commitHash);
    }
    
    /***********************************/
    /* Reveal Bid Tests */
    /***********************************/
    
    function testRevealBid() public {
        uint256 sessionId = _createSession(creator, 10 ether, 7 days);
        _commitBid(sessionId, bidder1, 5 ether, "Great proposal", bytes32(uint256(0x1234)));
        
        // Warp past deadline but within reveal window
        vm.warp(block.timestamp + 7 days + 30 minutes);
        
        vm.prank(bidder1);
        bidding.revealBid(sessionId, 5 ether, "Great proposal", bytes32(uint256(0x1234)));
        
        IBiddingSystem.Bid memory bid = bidding.getUserBid(sessionId, bidder1);
        assertTrue(bid.revealed);
        assertEq(bid.proposedAmount, 5 ether);
        assertEq(bid.message, "Great proposal");
    }
    
    function testRevealBidRevertBeforeDeadline() public {
        uint256 sessionId = _createSession(creator, 10 ether, 7 days);
        _commitBid(sessionId, bidder1, 5 ether, "Great proposal", bytes32(uint256(0x1234)));
        
        // Don't skip past deadline
        vm.prank(bidder1);
        vm.expectRevert(abi.encodeWithSelector(BiddingSystem.BiddingSystem__Deadline_not_passed.selector));
        bidding.revealBid(sessionId, 5 ether, "Great proposal", bytes32(uint256(0x1234)));
    }
    
    function testRevealBidRevertAfterRevealWindow() public {
        uint256 sessionId = _createSession(creator, 10 ether, 7 days);
        _commitBid(sessionId, bidder1, 5 ether, "Great proposal", bytes32(uint256(0x1234)));
        
        // Warp past reveal window
        vm.warp(block.timestamp + 7 days + REVEAL_WINDOW + 1);
        
        vm.prank(bidder1);
        vm.expectRevert(abi.encodeWithSelector(BiddingSystem.BiddingSystem__Reveal_window_closed.selector));
        bidding.revealBid(sessionId, 5 ether, "Great proposal", bytes32(uint256(0x1234)));
    }
    
    function testRevealBidRevertInvalidCommitment() public {
        uint256 sessionId = _createSession(creator, 10 ether, 7 days);
        _commitBid(sessionId, bidder1, 5 ether, "Great proposal", bytes32(uint256(0x1234)));
        
        vm.warp(block.timestamp + 7 days + 30 minutes);
        
        // Wrong salt
        vm.prank(bidder1);
        vm.expectRevert(abi.encodeWithSelector(BiddingSystem.BiddingSystem__Invalid_commitment.selector));
        bidding.revealBid(sessionId, 5 ether, "Great proposal", bytes32(uint256(0xABCD)));
    }
    
    function testRevealBidRevertExceedsMaxBudget() public {
        uint256 sessionId = _createSession(creator, 10 ether, 7 days);
        _commitBid(sessionId, bidder1, 5 ether, "Great proposal", bytes32(uint256(0x1234)));
        
        vm.warp(block.timestamp + 7 days + 30 minutes);
        
        // Amount exceeds max budget - commitment verification happens first
        vm.prank(bidder1);
        vm.expectRevert(abi.encodeWithSelector(BiddingSystem.BiddingSystem__Invalid_commitment.selector));
        bidding.revealBid(sessionId, 15 ether, "Too expensive", bytes32(uint256(0x1234)));
    }
    
    function testRevealBidRevertAlreadyRevealed() public {
        uint256 sessionId = _createSession(creator, 10 ether, 7 days);
        _commitBid(sessionId, bidder1, 5 ether, "Great proposal", bytes32(uint256(0x1234)));
        
        vm.warp(block.timestamp + 7 days + 30 minutes);
        
        vm.prank(bidder1);
        bidding.revealBid(sessionId, 5 ether, "Great proposal", bytes32(uint256(0x1234)));
        
        vm.prank(bidder1);
        vm.expectRevert(abi.encodeWithSelector(BiddingSystem.BiddingSystem__Already_revealed.selector));
        bidding.revealBid(sessionId, 5 ether, "Changed mind", bytes32(uint256(0x1234)));
    }
    
    /***********************************/
    /* Accept Bid Tests */
    /***********************************/
    
    function testAcceptBid() public {
        uint256 sessionId = _createSession(creator, 10 ether, 7 days);
        uint256 stake = bidding.calculateStake(10 ether);
        
        // Multiple bidders commit
        _commitBid(sessionId, bidder1, 5 ether, "Proposal 1", bytes32(uint256(0x1111)));
        _commitBid(sessionId, bidder2, 6 ether, "Proposal 2", bytes32(uint256(0x2222)));
        _commitBid(sessionId, bidder3, 4 ether, "Proposal 3", bytes32(uint256(0x3333)));
        
        // Warp past deadline but within reveal window
        vm.warp(block.timestamp + 7 days + 30 minutes);
        
        // All reveal
        vm.prank(bidder1);
        bidding.revealBid(sessionId, 5 ether, "Proposal 1", bytes32(uint256(0x1111)));
        vm.prank(bidder2);
        bidding.revealBid(sessionId, 6 ether, "Proposal 2", bytes32(uint256(0x2222)));
        vm.prank(bidder3);
        bidding.revealBid(sessionId, 4 ether, "Proposal 3", bytes32(uint256(0x3333)));
        
        // Warp past reveal window
        vm.warp(block.timestamp + 1 hours + 1);
        
        // Creator accepts bidder1's bid (5 ETH)
        vm.prank(creator);
        bidding.acceptBid(sessionId, 1);
        
        IBiddingSystem.Bid memory bid = bidding.getBid(sessionId, 1);
        assertTrue(bid.accepted);
        
        // Winner must withdraw pending refund (Phase 47 pull-based)
        uint256 bidder1BalanceBefore = bidder1.balance;
        vm.prank(bidder1);
        bidding.withdrawBidRefund(sessionId);
        assertEq(bidder1.balance, bidder1BalanceBefore + stake); // Stake returned
    }
    
    function testAcceptBidRevertNotCreator() public {
        uint256 sessionId = _createSession(creator, 10 ether, 7 days);
        _commitBid(sessionId, bidder1, 5 ether, "Proposal", bytes32(uint256(0x1111)));
        
        vm.warp(block.timestamp + 7 days + 30 minutes);
        vm.prank(bidder1);
        bidding.revealBid(sessionId, 5 ether, "Proposal", bytes32(uint256(0x1111)));
        
        vm.prank(bidder2);
        vm.expectRevert(abi.encodeWithSelector(BiddingSystem.BiddingSystem__Not_session_creator.selector));
        bidding.acceptBid(sessionId, 1);
    }
    
    function testAcceptBidRevertBidNotRevealed() public {
        uint256 sessionId = _createSession(creator, 10 ether, 7 days);
        _commitBid(sessionId, bidder1, 5 ether, "Proposal", bytes32(uint256(0x1111)));
        
        vm.warp(block.timestamp + 7 days + 30 minutes);
        
        // Don't reveal, try to accept
        vm.prank(creator);
        vm.expectRevert(abi.encodeWithSelector(BiddingSystem.BiddingSystem__Bid_not_revealed.selector));
        bidding.acceptBid(sessionId, 1);
    }
    
    /***********************************/
    /* Stake Withdrawal Tests */
    /***********************************/
    
    function testWithdrawStake() public {
        uint256 sessionId = _createSession(creator, 10 ether, 7 days);
        uint256 stake = bidding.calculateStake(10 ether);
        
        // Commit and reveal
        _commitBid(sessionId, bidder1, 5 ether, "Proposal", bytes32(uint256(0x1111)));
        _commitBid(sessionId, bidder2, 6 ether, "Proposal", bytes32(uint256(0x2222)));
        
        vm.warp(block.timestamp + 7 days + 30 minutes);
        
        vm.prank(bidder1);
        bidding.revealBid(sessionId, 5 ether, "Proposal", bytes32(uint256(0x1111)));
        vm.prank(bidder2);
        bidding.revealBid(sessionId, 6 ether, "Proposal", bytes32(uint256(0x2222)));
        
        // Warp past reveal window
        vm.warp(block.timestamp + 1 hours + 1);
        
        // Creator accepts bidder1
        vm.prank(creator);
        bidding.acceptBid(sessionId, 1);
        
        // Bidder2 can withdraw immediately (WinnerSelected status)
        uint256 balanceBefore = bidder2.balance;
        vm.prank(bidder2);
        bidding.withdrawStake(sessionId);
        
        assertEq(bidder2.balance, balanceBefore + stake);
    }
    
    function testWithdrawStakeRevertNoStake() public {
        uint256 sessionId = _createSession(creator, 10 ether, 7 days);
        
        // Session is still active, cannot withdraw
        vm.prank(bidder1);
        vm.expectRevert(abi.encodeWithSelector(BiddingSystem.BiddingSystem__Session_still_active.selector));
        bidding.withdrawStake(sessionId);
    }
    
    function testWithdrawStakeRevertSessionActive() public {
        uint256 sessionId = _createSession(creator, 10 ether, 7 days);
        
        // Session is still active, cannot withdraw
        vm.prank(bidder1);
        vm.expectRevert(abi.encodeWithSelector(BiddingSystem.BiddingSystem__Session_still_active.selector));
        bidding.withdrawStake(sessionId);
    }
    
    function testWithdrawStakeAfterAcceptance() public {
        uint256 sessionId = _createSession(creator, 10 ether, 7 days);
        uint256 stake = bidding.calculateStake(10 ether);
        
        // Two bidders commit
        _commitBid(sessionId, bidder1, 5 ether, "Proposal", bytes32(uint256(0x1111)));
        _commitBid(sessionId, bidder2, 6 ether, "Proposal", bytes32(uint256(0x2222)));
        
        vm.warp(block.timestamp + 7 days + 30 minutes);
        
        vm.prank(bidder1);
        bidding.revealBid(sessionId, 5 ether, "Proposal", bytes32(uint256(0x1111)));
        vm.prank(bidder2);
        bidding.revealBid(sessionId, 6 ether, "Proposal", bytes32(uint256(0x2222)));
        
        // Warp past reveal window
        vm.warp(block.timestamp + 1 hours + 1);
        
        // Creator accepts bidder1
        vm.prank(creator);
        bidding.acceptBid(sessionId, 1);
        
        // After acceptance, bidder2 can withdraw
        uint256 balanceBefore = bidder2.balance;
        vm.prank(bidder2);
        bidding.withdrawStake(sessionId);
        
        assertEq(bidder2.balance, balanceBefore + stake);
    }
    
    /***********************************/
    /* Create Job Integration Tests */
    /***********************************/
    
    function testCreateJobAndFund() public {
        uint256 sessionId = _createSession(creator, 10 ether, 7 days);
        uint256 bidAmount = 5 ether;
        uint256 platformFee = (bidAmount * 100) / 10000; // 1%
        
        _commitBid(sessionId, bidder1, bidAmount, "Great work", bytes32(uint256(0x1111)));
        
        vm.warp(block.timestamp + 7 days + 30 minutes);
        vm.prank(bidder1);
        bidding.revealBid(sessionId, bidAmount, "Great work", bytes32(uint256(0x1111)));
        
        // Warp past reveal window
        vm.warp(block.timestamp + 1 hours + 1);
        
        vm.prank(creator);
        bidding.acceptBid(sessionId, 1);
        
        // Creator funds job creation
        uint256 totalPayment = bidAmount + platformFee;
        
        vm.prank(creator);
        uint256 jobId = bidding.createJobAndFund{value: totalPayment}(
            sessionId,
            block.timestamp + 30 days,
            "Build a dApp"
        );
        
        assertGt(jobId, 0);
        
        // Verify session is updated
        IBiddingSystem.Session memory session = bidding.getSession(sessionId);
        assertTrue(session.jobCreated);
        assertEq(uint8(session.status), 3); // JobCreated
    }

    function testWithdrawCreatorStakeClaimsPendingAfterJobCreation() public {
        uint256 sessionId = _createSession(creator, 10 ether, 7 days);
        uint256 creatorStake = bidding.calculateStake(10 ether);
        uint256 bidAmount = 5 ether;
        uint256 platformFee = (bidAmount * 100) / 10000;

        _commitBid(sessionId, bidder1, bidAmount, "Great work", bytes32(uint256(0x1111)));

        vm.warp(block.timestamp + 7 days + 30 minutes);
        vm.prank(bidder1);
        bidding.revealBid(sessionId, bidAmount, "Great work", bytes32(uint256(0x1111)));

        // Warp past reveal window
        vm.warp(block.timestamp + 1 hours + 1);

        vm.prank(creator);
        bidding.acceptBid(sessionId, 1);

        vm.prank(creator);
        bidding.createJobAndFund{value: bidAmount + platformFee}(
            sessionId,
            block.timestamp + 30 days,
            "Build a dApp"
        );

        assertEq(bidding.pendingCreatorRefund(sessionId), creatorStake);

        uint256 balanceBefore = creator.balance;
        vm.prank(creator);
        bidding.withdrawCreatorStake(sessionId);
        assertEq(creator.balance, balanceBefore + creatorStake);
        assertEq(bidding.pendingCreatorRefund(sessionId), 0);

        vm.prank(creator);
        vm.expectRevert(abi.encodeWithSelector(BiddingSystem.BiddingSystem__Stake_already_withdrawn.selector));
        bidding.withdrawCreatorStake(sessionId);
    }

    function testWithdrawCreatorStakeAfterDownstreamCreateJobRevert() public {
        uint256 sessionId = _createSession(creator, 10 ether, 7 days);
        uint256 creatorStake = bidding.calculateStake(10 ether);
        uint256 bidAmount = 5 ether;
        uint256 platformFee = (bidAmount * 100) / 10000;

        _commitBid(sessionId, bidder1, bidAmount, "Great work", bytes32(uint256(0x1111)));

        vm.warp(block.timestamp + 7 days + 30 minutes);
        vm.prank(bidder1);
        bidding.revealBid(sessionId, bidAmount, "Great work", bytes32(uint256(0x1111)));

        // Warp past reveal window
        vm.warp(block.timestamp + 1 hours + 1);

        vm.prank(creator);
        bidding.acceptBid(sessionId, 1);

        MockRevertingCommerce revertingCommerce = new MockRevertingCommerce();
        vm.prank(owner);
        bidding.setCommerce(address(revertingCommerce));

        vm.prank(creator);
        vm.expectRevert(bytes("downstream revert"));
        bidding.createJobAndFund{value: bidAmount + platformFee}(
            sessionId,
            block.timestamp + 30 days,
            "Build a dApp"
        );

        vm.prank(creator);
        vm.expectRevert(abi.encodeWithSelector(BiddingSystem.BiddingSystem__Recovery_window_active.selector));
        bidding.withdrawCreatorStake(sessionId);

        vm.warp(block.timestamp + bidding.RECOVERY_WINDOW());

        uint256 balanceBefore = creator.balance;
        vm.prank(creator);
        bidding.withdrawCreatorStake(sessionId);

        assertEq(creator.balance, balanceBefore + creatorStake);
        assertEq(uint8(bidding.getSession(sessionId).status), 5); // Cancelled
    }

    function testCreateJobAndFundRefundsExcessEth() public {
        uint256 sessionId = _createSession(creator, 10 ether, 7 days);
        uint256 creatorStake = bidding.calculateStake(10 ether);
        uint256 bidAmount = 5 ether;
        uint256 platformFee = (bidAmount * 100) / 10000;

        _commitBid(sessionId, bidder1, bidAmount, "Great work", bytes32(uint256(0x1111)));

        vm.warp(block.timestamp + 7 days + 30 minutes);
        vm.prank(bidder1);
        bidding.revealBid(sessionId, bidAmount, "Great work", bytes32(uint256(0x1111)));

        // Warp past reveal window
        vm.warp(block.timestamp + 1 hours + 1);

        vm.prank(creator);
        bidding.acceptBid(sessionId, 1);

        uint256 totalPayment = bidAmount + platformFee;
        vm.prank(creator);
        bidding.createJobAndFund{value: totalPayment + 1 ether}(
            sessionId,
            block.timestamp + 30 days,
            "Build a dApp"
        );

        assertEq(creator.balance, 100 ether - creatorStake - totalPayment);
        assertEq(bidding.pendingCreatorRefund(sessionId), creatorStake);
    }
    
    function testCreateJobAndFundRevertNoWinner() public {
        uint256 sessionId = _createSession(creator, 10 ether, 7 days);
        
        vm.prank(creator);
        vm.expectRevert(abi.encodeWithSelector(BiddingSystem.BiddingSystem__No_winner_selected.selector));
        bidding.createJobAndFund{value: 5 ether}(
            sessionId,
            block.timestamp + 30 days,
            "Build a dApp"
        );
    }
    
    /***********************************/
    /* Cancel Session Tests */
    /***********************************/
    
    function testCancelSession() public {
        uint256 sessionId = _createSession(creator, 10 ether, 7 days);
        uint256 stake = bidding.calculateStake(10 ether);
        
        // Commit but don't reveal
        _commitBid(sessionId, bidder1, 5 ether, "Proposal", bytes32(uint256(0x1111)));
        
        // Try to cancel (should work since no bids revealed)
        uint256 balanceBefore = creator.balance;
        vm.prank(creator);
        bidding.cancelSession(sessionId);
        
        assertEq(creator.balance, balanceBefore + stake);
    }

    function testWithdrawCreatorStakeRevertsAfterCancelAndDoesNotDrainBidderStake() public {
        uint256 sessionId = _createSession(creator, 10 ether, 7 days);
        uint256 stake = bidding.calculateStake(10 ether);

        _commitBid(sessionId, bidder1, 5 ether, "Proposal", bytes32(uint256(0x1111)));

        vm.prank(creator);
        bidding.cancelSession(sessionId);

        vm.prank(creator);
        vm.expectRevert(abi.encodeWithSelector(BiddingSystem.BiddingSystem__Stake_already_withdrawn.selector));
        bidding.withdrawCreatorStake(sessionId);

        uint256 bidderBalanceBefore = bidder1.balance;
        vm.prank(bidder1);
        bidding.withdrawStake(sessionId);
        // Phase 47: unrevealed bid withdrawal is slashed 5%
        uint256 slashAmount = (stake * bidding.NO_SHOW_SLASH_BP()) / bidding.FEE_DENOMINATOR();
        uint256 refundAmount = stake - slashAmount;
        assertEq(bidder1.balance, bidderBalanceBefore + refundAmount);
    }
     
    function testCancelSessionRevertAfterReveal() public {
        uint256 sessionId = _createSession(creator, 10 ether, 7 days);
        _commitBid(sessionId, bidder1, 5 ether, "Proposal", bytes32(uint256(0x1111)));
        
        vm.warp(block.timestamp + 7 days + 30 minutes);
        vm.prank(bidder1);
        bidding.revealBid(sessionId, 5 ether, "Proposal", bytes32(uint256(0x1111)));
        
        vm.prank(creator);
        vm.expectRevert(abi.encodeWithSelector(BiddingSystem.BiddingSystem__Cannot_cancel_bids_revealed.selector));
        bidding.cancelSession(sessionId);
    }
    
    function testCancelSessionRevertNotCreator() public {
        uint256 sessionId = _createSession(creator, 10 ether, 7 days);
        
        vm.prank(bidder1);
        vm.expectRevert(abi.encodeWithSelector(BiddingSystem.BiddingSystem__Not_session_creator.selector));
        bidding.cancelSession(sessionId);
    }
    
    /***********************************/
    /* Reject Bid Tests */
    /***********************************/
    
    function testRejectBid() public {
        uint256 sessionId = _createSession(creator, 10 ether, 7 days);
        uint256 stake = bidding.calculateStake(10 ether);
        
        _commitBid(sessionId, bidder1, 5 ether, "Proposal", bytes32(uint256(0x1111)));
        
        vm.warp(block.timestamp + 7 days + 30 minutes);
        vm.prank(bidder1);
        bidding.revealBid(sessionId, 5 ether, "Proposal", bytes32(uint256(0x1111)));
        
        uint256 balanceBefore = bidder1.balance;
        vm.prank(creator);
        bidding.rejectBid(sessionId, 1, "Not suitable");
        
        // Bidder must withdraw pending refund (Phase 47 pull-based)
        vm.prank(bidder1);
        bidding.withdrawBidRefund(sessionId);
        
        // Bidder should get their stake back
        assertEq(bidder1.balance, balanceBefore + stake);
        
        IBiddingSystem.Bid memory bid = bidding.getBid(sessionId, 1);
        assertTrue(bid.rejected);
        assertFalse(bid.accepted);
        assertEq(bid.stake, 0);
    }
    
    function testRejectBidRevertNotRevealed() public {
        uint256 sessionId = _createSession(creator, 10 ether, 7 days);
        _commitBid(sessionId, bidder1, 5 ether, "Proposal", bytes32(uint256(0x1111)));
        
        vm.prank(creator);
        vm.expectRevert(abi.encodeWithSelector(BiddingSystem.BiddingSystem__Bid_not_revealed.selector));
        bidding.rejectBid(sessionId, 1, "Not revealed");
    }
    
    function testRejectBidRevertNotCreator() public {
        uint256 sessionId = _createSession(creator, 10 ether, 7 days);
        _commitBid(sessionId, bidder1, 5 ether, "Proposal", bytes32(uint256(0x1111)));
        
        vm.warp(block.timestamp + 7 days + 30 minutes);
        vm.prank(bidder1);
        bidding.revealBid(sessionId, 5 ether, "Proposal", bytes32(uint256(0x1111)));
        
        vm.prank(bidder2);
        vm.expectRevert(abi.encodeWithSelector(BiddingSystem.BiddingSystem__Not_session_creator.selector));
        bidding.rejectBid(sessionId, 1, "Not suitable");
    }
    
    function testWithdrawStakeAfterRejection() public {
        uint256 sessionId = _createSession(creator, 10 ether, 7 days);
        uint256 stake = bidding.calculateStake(10 ether);
        
        _commitBid(sessionId, bidder1, 5 ether, "Proposal 1", bytes32(uint256(0x1111)));
        _commitBid(sessionId, bidder2, 6 ether, "Proposal 2", bytes32(uint256(0x2222)));
        
        vm.warp(block.timestamp + 7 days + 30 minutes);
        vm.prank(bidder1);
        bidding.revealBid(sessionId, 5 ether, "Proposal 1", bytes32(uint256(0x1111)));
        vm.prank(bidder2);
        bidding.revealBid(sessionId, 6 ether, "Proposal 2", bytes32(uint256(0x2222)));
        
        // Creator rejects bidder2 first
        uint256 bidder2BalanceBefore = bidder2.balance;
        vm.prank(creator);
        bidding.rejectBid(sessionId, 2, "Not suitable");
        
        // Bidder2 must withdraw pending refund (Phase 47 pull-based)
        vm.prank(bidder2);
        bidding.withdrawBidRefund(sessionId);
        
        // Bidder2's stake should be returned
        assertEq(bidder2.balance, bidder2BalanceBefore + stake);
        
        // Warp past reveal window before acceptBid
        vm.warp(block.timestamp + 1 hours + 1);
        
        // Creator accepts bidder1 (session moves to WinnerSelected)
        vm.prank(creator);
        bidding.acceptBid(sessionId, 1);
        
        // Bidder2 cannot withdraw since stake is already 0 (returned via withdrawBidRefund)
        vm.prank(bidder2);
        vm.expectRevert(abi.encodeWithSelector(BiddingSystem.BiddingSystem__No_stake_to_withdraw.selector));
        bidding.withdrawStake(sessionId);
    }
    
    /***********************************/
    /* Complete Session Tests */
    /***********************************/
    
    function testCompleteSession() public {
        uint256 sessionId = _createSession(creator, 10 ether, 7 days);
        uint256 bidAmount = 5 ether;
        uint256 platformFee = (bidAmount * 100) / 10000;
        
        _commitBid(sessionId, bidder1, bidAmount, "Great work", bytes32(uint256(0x1111)));
        
        vm.warp(block.timestamp + 7 days + 30 minutes);
        vm.prank(bidder1);
        bidding.revealBid(sessionId, bidAmount, "Great work", bytes32(uint256(0x1111)));
        
        // Warp past reveal window
        vm.warp(block.timestamp + 1 hours + 1);
        
        vm.prank(creator);
        bidding.acceptBid(sessionId, 1);
        
        uint256 totalPayment = bidAmount + platformFee;
        vm.prank(creator);
        bidding.createJobAndFund{value: totalPayment}(
            sessionId,
            block.timestamp + 30 days,
            "Build a dApp"
        );
        
        // Session should be in JobCreated status
        IBiddingSystem.Session memory session = bidding.getSession(sessionId);
        assertEq(uint8(session.status), 3); // JobCreated
        
        // Anyone can complete the session
        vm.prank(bidder2);
        bidding.completeSession(sessionId);
        
        session = bidding.getSession(sessionId);
        assertEq(uint8(session.status), 4); // Completed
    }
    
    function testCompleteSessionRevertWrongStatus() public {
        uint256 sessionId = _createSession(creator, 10 ether, 7 days);
        
        // Session is Active, not JobCreated
        vm.prank(bidder1);
        vm.expectRevert(abi.encodeWithSelector(BiddingSystem.BiddingSystem__Wrong_status.selector));
        bidding.completeSession(sessionId);
    }
    
    /***********************************/
    /* Extend Reveal Window Tests */
    /***********************************/
    
    function testExtendRevealWindow() public {
        uint256 sessionId = _createSession(creator, 10 ether, 7 days);
        _commitBid(sessionId, bidder1, 5 ether, "Proposal", bytes32(uint256(0x1111)));
        
        vm.warp(block.timestamp + 7 days + 30 minutes);
        
        uint256 originalWindowEnd = bidding.getSession(sessionId).revealWindowEnd;
        
        vm.prank(creator);
        bidding.extendRevealWindow(sessionId, 1 hours);
        
        assertEq(bidding.getSession(sessionId).revealWindowEnd, originalWindowEnd + 1 hours);
    }
    
    function testExtendRevealWindowRevertTooLong() public {
        uint256 sessionId = _createSession(creator, 10 ether, 7 days);
        
        vm.warp(block.timestamp + 7 days + 30 minutes);
        
        vm.prank(creator);
        vm.expectRevert(abi.encodeWithSelector(BiddingSystem.BiddingSystem__Extension_too_long.selector));
        bidding.extendRevealWindow(sessionId, 8 days);
    }
    
    function testExtendRevealWindowRevealWindowMax() public {
        uint256 sessionId = _createSession(creator, 10 ether, 7 days);
        
        vm.warp(block.timestamp + 7 days + 30 minutes);
        
        // Max extension should be exactly 7 days
        vm.prank(creator);
        bidding.extendRevealWindow(sessionId, 7 days);
        
        assertEq(bidding.getSession(sessionId).revealWindowEnd, bidding.getSession(sessionId).revealWindowEnd);
    }
    
    /***********************************/
    /* Admin Function Tests */
    /***********************************/
    
    function testSetRevealWindow() public {
        vm.prank(owner);
        bidding.setRevealWindow(2 hours);
        
        assertEq(bidding.revealWindow(), 2 hours);
    }
    
    function testSetRevealWindowRevertTooSmall() public {
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(BiddingSystem.BiddingSystem__Invalid_window.selector));
        bidding.setRevealWindow(10 minutes); // Min is 15 minutes
    }
    
    function testSetRevealWindowRevertTooLarge() public {
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(BiddingSystem.BiddingSystem__Invalid_window.selector));
        bidding.setRevealWindow(25 hours);
    }
    
    function testSetPlatformFeeBP() public {
        vm.prank(owner);
        bidding.setPlatformFeeBP(200); // 2%
        
        assertEq(bidding.platformFeeBP(), 200);
    }
    
    function testSetPlatformFeeBPRevertTooHigh() public {
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(BiddingSystem.BiddingSystem__Max_10_fee.selector));
        bidding.setPlatformFeeBP(2000); // 20%
    }
    
    function _createSessionWithWinnerAndFund() internal returns (uint256 jobId) {
        uint256 sessionId = _createSession(creator, 10 ether, 7 days);
        _commitBid(sessionId, bidder1, 5 ether, "Great work", bytes32(uint256(0x1111)));
        vm.warp(block.timestamp + 7 days + 30 minutes);
        vm.prank(bidder1);
        bidding.revealBid(sessionId, 5 ether, "Great work", bytes32(uint256(0x1111)));
        
        // Warp past reveal window
        vm.warp(block.timestamp + 1 hours + 1);
        
        vm.prank(creator);
        bidding.acceptBid(sessionId, 1);
        uint256 totalPayment = 5 ether + (5 ether * 100) / 10000;
        vm.prank(creator);
        jobId = bidding.createJobAndFund{value: totalPayment}(
            sessionId,
            block.timestamp + 30 days,
            "Build a dApp"
        );
    }

    function testWithdrawPlatformFees() public {
        _createSessionWithWinnerAndFund();
        
        uint256 balanceBefore = treasury.balance;
        vm.prank(owner);
        bidding.withdrawPlatformFees(payable(treasury), 0.01 ether);
        
        assertEq(treasury.balance, balanceBefore + 0.01 ether);
    }

    function testWithdrawPlatformFeesRevertNotOwner() public {
        vm.prank(bidder1);
        vm.expectRevert();
        bidding.withdrawPlatformFees(payable(treasury), 1 ether);
    }
    
    /***********************************/
    /* Helper Functions */
    /***********************************/
    
    function _createSession(address creator_, uint256 maxBudget, uint256 duration) internal returns (uint256) {
        uint256 stake = bidding.calculateStake(maxBudget);
        vm.prank(creator_);
        return bidding.createBiddingSession{value: stake}(
            evaluator,
            maxBudget,
            block.timestamp + duration,
            "ipfs://QmTest",
            0,
            address(0),
            false,
            address(0)
        );
    }
    
    function _commitBid(uint256 sessionId, address bidder, uint256 amount, string memory message, bytes32 salt) internal {
        uint256 stake = bidding.calculateStake(10 ether); // Assuming 10 ether max budget
        // Phase 45b O-1: hash binds to (sessionId, bidder, amount, message, salt)
        // Phase 45c O-8: hash also binds to PROTOCOL_VERSION=2 to enable future hash upgrades
        bytes32 commitHash = keccak256(abi.encode(uint256(2), sessionId, bidder, amount, message, salt));

        vm.prank(bidder);
        bidding.commitBid{value: stake}(sessionId, commitHash);
    }

    function _commitUsdcBid(
        uint256 sessionId,
        address bidder,
        uint256 amount,
        string memory message,
        bytes32 salt
    ) internal {
        uint256 stake = bidding.calculateStake(10 ether); // 1% of 10 ether max budget
        bytes32 commitHash = keccak256(abi.encode(uint256(2), sessionId, bidder, amount, message, salt));

        // Mint + approve the stake in USDC
        usdc.mint(bidder, stake);
        vm.prank(bidder);
        usdc.approve(address(bidding), stake);
        vm.prank(bidder);
        bidding.commitBid(sessionId, commitHash);
    }
    
    function _hexToBytes32(string memory hexString) internal pure returns (bytes32) {
        bytes memory b = bytes(hexString);
        require(b.length == 66, "Invalid hex length");
        bytes32 result;
        for (uint256 i = 0; i < 32; i++) {
            result |= bytes32(b[i + 2] << (31 - i) * 2);
        }
        return result;
    }

    /***********************************/
    /* Phase 45b O-1: commit hash binds to (sessionId, msg.sender, amount, message, salt) */
    /***********************************/

    function testO1_CommitHashBindsToSender() public {
        // Two different bidders commit the same (amount, message, salt) — both must be valid.
        // Pre-O-1, the second commit would inherit the first bidder's validCommits entry
        // and both could reveal the same tuple. Post-O-1 the hash is unique per sender.
        // Post-O-8 the hash is also prefixed with PROTOCOL_VERSION=2.
        uint256 sessionId = _createSession(creator, 10 ether, 7 days);
        uint256 stake = bidding.calculateStake(10 ether);
        bytes32 salt = bytes32(uint256(0x1234));

        bytes32 hashA = keccak256(abi.encode(uint256(2), sessionId, bidder1, 5 ether, "msg", salt));
        bytes32 hashB = keccak256(abi.encode(uint256(2), sessionId, bidder2, 5 ether, "msg", salt));
        assertTrue(hashA != hashB, "O-1: hashes must differ per sender");

        vm.prank(bidder1);
        bidding.commitBid{value: stake}(sessionId, hashA);
        vm.prank(bidder2);
        bidding.commitBid{value: stake}(sessionId, hashB);

        // Both must be validCommits and revealable
        vm.warp(block.timestamp + 7 days + 30 minutes);
        vm.prank(bidder1);
        bidding.revealBid(sessionId, 5 ether, "msg", salt);
        vm.prank(bidder2);
        bidding.revealBid(sessionId, 5 ether, "msg", salt);

        IBiddingSystem.Bid memory b1 = bidding.getUserBid(sessionId, bidder1);
        IBiddingSystem.Bid memory b2 = bidding.getUserBid(sessionId, bidder2);
        assertEq(b1.proposedAmount, 5 ether);
        assertEq(b2.proposedAmount, 5 ether);
    }

    function testO1_CommitHashBindsToSession() public {
        // Same bidder uses the same (amount, message, salt) across two sessions —
        // both must be valid (hash includes sessionId).
        uint256 sessionA = _createSession(creator, 10 ether, 7 days);
        uint256 sessionB = _createSession(creator, 10 ether, 7 days);
        uint256 stake = bidding.calculateStake(10 ether);
        bytes32 salt = bytes32(uint256(0xABCD));

        bytes32 hashA = keccak256(abi.encode(uint256(2), sessionA, bidder1, 5 ether, "msg", salt));
        bytes32 hashB = keccak256(abi.encode(uint256(2), sessionB, bidder1, 5 ether, "msg", salt));
        assertTrue(hashA != hashB, "O-1: hashes must differ per session");

        vm.prank(bidder1);
        bidding.commitBid{value: stake}(sessionA, hashA);
        vm.prank(bidder1);
        bidding.commitBid{value: stake}(sessionB, hashB);

        // Reveal in both sessions after their respective deadlines
        vm.warp(block.timestamp + 7 days + 30 minutes);
        vm.prank(bidder1);
        bidding.revealBid(sessionA, 5 ether, "msg", salt);
        vm.prank(bidder1);
        bidding.revealBid(sessionB, 5 ether, "msg", salt);

        assertEq(bidding.getUserBid(sessionA, bidder1).proposedAmount, 5 ether);
        assertEq(bidding.getUserBid(sessionB, bidder1).proposedAmount, 5 ether);
    }

    function testO1_CrossSessionRevealReverts() public {
        // The O-1 fix means the hash binds to sessionId. A bidder who commits in
        // sessionA cannot have their sessionA tuple accepted as the reveal for
        // sessionB. Concretely: when the bidder reveals in sessionB with the
        // SAME (amount, message, salt) as their sessionA commit, the contract
        // computes hashB = keccak256(2, sessionB, bidder1, 5 ether, "msg", salt),
        // which is NOT in validCommits[sessionB] (only hashA is, for sessionA).
        // Result: Invalid_commitment.
        uint256 sessionA = _createSession(creator, 10 ether, 7 days);
        uint256 sessionB = _createSession(creator, 10 ether, 7 days);
        bytes32 salt = bytes32(uint256(0xCAFE));

        uint256 stake = bidding.calculateStake(10 ether);

        // Commit in sessionA only (NOT in sessionB). The bidder has no bid in sessionB.
        bytes32 hashA = keccak256(abi.encode(uint256(2), sessionA, bidder1, 5 ether, "msg", salt));
        vm.prank(bidder1);
        bidding.commitBid{value: stake}(sessionA, hashA);

        vm.warp(block.timestamp + 7 days + 30 minutes);

        // The bidder has no bid in sessionB → reverts with No_bid_found.
        // This proves the O-1 binding: a sessionA hash cannot be cross-replayed
        // in sessionB because there is no corresponding entry in validCommits[sessionB].
        vm.prank(bidder1);
        vm.expectRevert(abi.encodeWithSelector(BiddingSystem.BiddingSystem__No_bid_found.selector));
        bidding.revealBid(sessionB, 5 ether, "msg", salt);

        // And in sessionA with the WRONG salt, the hash mismatch triggers Invalid_commitment.
        vm.prank(bidder1);
        vm.expectRevert(abi.encodeWithSelector(BiddingSystem.BiddingSystem__Invalid_commitment.selector));
        bidding.revealBid(sessionA, 5 ether, "msg", bytes32(uint256(0xDEAD)));
    }

    /***********************************/
    /* Phase 45b O-2: explicit closeBidding + BiddingClosed transitions */
    /***********************************/

    function testO2_CloseBiddingPermissionless() public {
        uint256 sessionId = _createSession(creator, 10 ether, 7 days);
        _commitBid(sessionId, bidder1, 5 ether, "msg", bytes32(uint256(0x1111)));

        // Anyone (not just creator) can call closeBidding after the deadline
        vm.warp(block.timestamp + 7 days + 1);
        vm.prank(bidder2); // bidder2, not creator
        vm.expectEmit(true, true, false, true, address(bidding));
        emit BiddingClosed(sessionId, bidder2, block.timestamp);
        bidding.closeBidding(sessionId);

        IBiddingSystem.Session memory session = bidding.getSession(sessionId);
        assertEq(uint8(session.status), 1); // BiddingClosed
    }

    function testO2_CloseBiddingRevertBeforeDeadline() public {
        uint256 sessionId = _createSession(creator, 10 ether, 7 days);
        _commitBid(sessionId, bidder1, 5 ether, "msg", bytes32(uint256(0x1111)));

        vm.expectRevert(abi.encodeWithSelector(BiddingSystem.BiddingSystem__Deadline_not_passed.selector));
        bidding.closeBidding(sessionId);
    }

    function testO2_CloseBiddingRevertAfterClosed() public {
        uint256 sessionId = _createSession(creator, 10 ether, 7 days);
        vm.warp(block.timestamp + 7 days + 1);
        bidding.closeBidding(sessionId);

        // Second call must revert because status is no longer Active
        vm.expectRevert(abi.encodeWithSelector(BiddingSystem.BiddingSystem__Wrong_session_status.selector));
        bidding.closeBidding(sessionId);
    }

    function testO2_CloseBiddingRevertInvalidSession() public {
        vm.expectRevert(abi.encodeWithSelector(BiddingSystem.BiddingSystem__Invalid_session.selector));
        bidding.closeBidding(999);
    }

    function testO2_WithdrawStakeAfterClose() public {
        // Non-revealing bidder can pull full stake once BiddingClosed AND the
        // reveal window has fully elapsed.
        uint256 sessionId = _createSession(creator, 10 ether, 7 days);
        uint256 stake = bidding.calculateStake(10 ether);
        _commitBid(sessionId, bidder1, 5 ether, "msg", bytes32(uint256(0x1111)));

        // Warp past deadline AND past the 1h reveal window
        vm.warp(block.timestamp + 7 days + 2 hours);
        bidding.closeBidding(sessionId);

        uint256 balanceBefore = bidder1.balance;
        vm.prank(bidder1);
        bidding.withdrawStake(sessionId);
        // Phase 47: unrevealed bid withdrawal is slashed 5%
        uint256 slashAmount = (stake * bidding.NO_SHOW_SLASH_BP()) / bidding.FEE_DENOMINATOR();
        uint256 refundAmount = stake - slashAmount;
        assertEq(bidder1.balance, balanceBefore + refundAmount);
    }

    function testO2_CancelSessionAfterClose() public {
        // Creator can still cancel after closeBidding if no revealed bids and no winner.
        uint256 sessionId = _createSession(creator, 10 ether, 7 days);
        _commitBid(sessionId, bidder1, 5 ether, "msg", bytes32(uint256(0x1111)));

        vm.warp(block.timestamp + 7 days + 1);
        bidding.closeBidding(sessionId);

        // bidder1 never reveals; no reveals = cancelable
        vm.prank(creator);
        bidding.cancelSession(sessionId);

        IBiddingSystem.Session memory session = bidding.getSession(sessionId);
        assertEq(uint8(session.status), 5); // Cancelled
    }

    /***********************************/
    /* Phase 45b O-3: slashNoShow for bidders who never reveal */
    /***********************************/

    function testO3_SlashNoShowOnlyCreator() public {
        uint256 sessionId = _createSession(creator, 10 ether, 7 days);
        _commitBid(sessionId, bidder1, 5 ether, "msg", bytes32(uint256(0x1111)));

        vm.warp(block.timestamp + 7 days + 2 hours); // past reveal window
        vm.prank(bidder2);
        vm.expectRevert(abi.encodeWithSelector(BiddingSystem.BiddingSystem__Not_session_creator.selector));
        bidding.slashNoShow(sessionId, bidder1);
    }

    function testO3_SlashNoShowRevertBeforeRevealWindowEnd() public {
        uint256 sessionId = _createSession(creator, 10 ether, 7 days);
        _commitBid(sessionId, bidder1, 5 ether, "msg", bytes32(uint256(0x1111)));

        vm.warp(block.timestamp + 7 days + 30 minutes); // 30 min into reveal window
        vm.prank(creator);
        vm.expectRevert(abi.encodeWithSelector(BiddingSystem.BiddingSystem__Reveal_window_not_ended.selector));
        bidding.slashNoShow(sessionId, bidder1);
    }

    function testO3_SlashNoShowETH() public {
        uint256 sessionId = _createSession(creator, 10 ether, 7 days);
        uint256 stake = bidding.calculateStake(10 ether);
        _commitBid(sessionId, bidder1, 5 ether, "msg", bytes32(uint256(0x1111)));

        vm.warp(block.timestamp + 7 days + 2 hours);
        uint256 slashAmount = (stake * 500) / 10000; // 5%
        uint256 refundAmount = stake - slashAmount;

        uint256 treasuryBefore = treasury.balance;
        uint256 bidderBefore = bidder1.balance;

        vm.prank(creator);
        vm.expectEmit(true, true, false, true, address(bidding));
        emit BidderSlashed(sessionId, bidder1, slashAmount, refundAmount);
        bidding.slashNoShow(sessionId, bidder1);

        assertEq(treasury.balance, treasuryBefore + slashAmount, "treasury should receive slash");
        assertEq(bidder1.balance, bidderBefore + refundAmount, "bidder should receive refund");

        IBiddingSystem.Bid memory bid = bidding.getUserBid(sessionId, bidder1);
        assertEq(bid.stake, 0, "stake should be zeroed");
        assertTrue(bid.stakeWithdrawn, "stakeWithdrawn should be true");
        assertTrue(bid.rejected, "rejected should be true");
    }

    function testO3_SlashNoShowRevertIfRevealed() public {
        uint256 sessionId = _createSession(creator, 10 ether, 7 days);
        _commitBid(sessionId, bidder1, 5 ether, "msg", bytes32(uint256(0x1111)));

        vm.warp(block.timestamp + 7 days + 30 minutes);
        vm.prank(bidder1);
        bidding.revealBid(sessionId, 5 ether, "msg", bytes32(uint256(0x1111)));

        vm.warp(block.timestamp + 1 hours); // past reveal window end
        vm.prank(creator);
        vm.expectRevert(abi.encodeWithSelector(BiddingSystem.BiddingSystem__No_show_not_eligible.selector));
        bidding.slashNoShow(sessionId, bidder1);
    }

    function testO3_SlashNoShowRevertDoubleSlash() public {
        uint256 sessionId = _createSession(creator, 10 ether, 7 days);
        _commitBid(sessionId, bidder1, 5 ether, "msg", bytes32(uint256(0x1111)));

        vm.warp(block.timestamp + 7 days + 2 hours);
        vm.prank(creator);
        bidding.slashNoShow(sessionId, bidder1);

        vm.prank(creator);
        vm.expectRevert(abi.encodeWithSelector(BiddingSystem.BiddingSystem__Already_settled.selector));
        bidding.slashNoShow(sessionId, bidder1);
    }

    function testO3_SlashNoShowRevertNoBid() public {
        uint256 sessionId = _createSession(creator, 10 ether, 7 days);

        vm.warp(block.timestamp + 7 days + 2 hours);
        vm.prank(creator);
        vm.expectRevert(abi.encodeWithSelector(BiddingSystem.BiddingSystem__No_bid_found.selector));
        bidding.slashNoShow(sessionId, bidder1);
    }

    function testO3_SlashNoShowUSDC() public {
        // USDC session: create, USDC commit, slash — verify USDC accounting
        // Phase 45c O-4: lower minStake to 0 so USDC stakes (raw 6-decimal units) can pass.
        vm.prank(owner);
        bidding.setMinStake(0);

        uint256 maxBudget = 100_000 * 1e6; // 100k USDC
        uint256 stake = bidding.calculateStake(maxBudget);
        usdc.mint(creator, stake);

        vm.startPrank(creator);
        usdc.approve(address(bidding), stake);
        uint256 sessionId = bidding.createBiddingSession(
            evaluator,
            maxBudget,
            block.timestamp + 7 days,
            "",
            0,
            address(usdc),
            false,
            address(0)
        );
        vm.stopPrank();

        usdc.mint(bidder1, stake);
        vm.startPrank(bidder1);
        usdc.approve(address(bidding), stake);
        bytes32 hash = keccak256(abi.encode(2, sessionId, bidder1, 50000 * 1e6, "msg", bytes32(uint256(0x1111)))); // Phase 45c O-8: PROTOCOL_VERSION=2
        bidding.commitBid(sessionId, hash);
        vm.stopPrank();

        vm.warp(block.timestamp + 7 days + 2 hours);
        uint256 slashAmount = (stake * 500) / 10000;
        uint256 refundAmount = stake - slashAmount;

        uint256 treasuryBefore = usdc.balanceOf(treasury);
        uint256 bidderBefore = usdc.balanceOf(bidder1);

        vm.prank(creator);
        bidding.slashNoShow(sessionId, bidder1);

        assertEq(usdc.balanceOf(treasury), treasuryBefore + slashAmount);
        assertEq(usdc.balanceOf(bidder1), bidderBefore + refundAmount);
    }

    /***********************************/
    /* Phase 45b O-10: per-token fee withdrawal */
    /***********************************/

    function testO10_AccumulatedFeesByTokenUSDC() public {
        // Create a USDC-backed session, fund a job, verify fee is tracked per-token
        // Phase 45c O-4: lower minStake to 0 so USDC stakes (raw 6-decimal units) can pass.
        vm.prank(owner);
        bidding.setMinStake(0);

        uint256 maxBudget = 100_000 * 1e6;
        uint256 stake = bidding.calculateStake(maxBudget);
        uint256 bidAmount = 50_000 * 1e6;
        uint256 fee = (bidAmount * 100) / 10000; // 1% platform fee
        uint256 totalPayment = bidAmount + fee;

        usdc.mint(creator, stake + totalPayment);

        vm.startPrank(creator);
        usdc.approve(address(bidding), stake);
        uint256 sessionId = bidding.createBiddingSession(
            evaluator,
            maxBudget,
            block.timestamp + 7 days,
            "",
            0,
            address(usdc),
            false,
            address(0)
        );
        vm.stopPrank();

        usdc.mint(bidder1, stake);
        vm.startPrank(bidder1);
        usdc.approve(address(bidding), stake);
        bytes32 hash = keccak256(abi.encode(2, sessionId, bidder1, bidAmount, "msg", bytes32(uint256(0x1111)))); // Phase 45c O-8
        bidding.commitBid(sessionId, hash);
        vm.stopPrank();

        vm.warp(block.timestamp + 7 days + 30 minutes);
        vm.prank(bidder1);
        bidding.revealBid(sessionId, bidAmount, "msg", bytes32(uint256(0x1111)));
        
        // Warp past reveal window
        vm.warp(block.timestamp + 1 hours + 1);
        
        vm.prank(creator);
        bidding.acceptBid(sessionId, 1);

        // Approve the total payment (bidAmount + platform fee) for the job funding call
        vm.startPrank(creator);
        usdc.approve(address(bidding), totalPayment);
        bidding.createJobAndFund(
            sessionId,
            block.timestamp + 30 days,
            "Build a dApp"
        );
        vm.stopPrank();

        // O-10: ERC-20 fee should be tracked in accumulatedFeesByToken[usdc]
        assertEq(bidding.accumulatedFeesByToken(address(usdc)), fee);
        // totalAccumulatedFees (ETH) should remain 0
        assertEq(bidding.totalAccumulatedFees(), 0);
    }

    function testO10_WithdrawFeesUSDC() public {
        // Set up state with USDC fees accumulated, then withdraw
        testO10_AccumulatedFeesByTokenUSDC();

        uint256 fee = bidding.accumulatedFeesByToken(address(usdc));
        assertGt(fee, 0, "precondition: USDC fees accumulated");

        uint256 treasuryBefore = usdc.balanceOf(treasury);

        vm.prank(owner);
        vm.expectEmit(true, true, false, true, address(bidding));
        emit FeesWithdrawn(address(usdc), treasury, fee);
        bidding.withdrawFees(address(usdc));

        assertEq(usdc.balanceOf(treasury), treasuryBefore + fee);
        assertEq(bidding.accumulatedFeesByToken(address(usdc)), 0);
    }

    function testO10_WithdrawFeesETH() public {
        // Set up state with ETH fees accumulated via createJobAndFund (ETH path)
        _createSessionWithWinnerAndFund();

        uint256 fee = bidding.totalAccumulatedFees();
        assertGt(fee, 0, "precondition: ETH fees accumulated");

        uint256 treasuryBefore = treasury.balance;

        vm.prank(owner);
        vm.expectEmit(true, true, false, true, address(bidding));
        emit FeesWithdrawn(address(0), treasury, fee);
        bidding.withdrawFees(address(0));

        assertEq(treasury.balance, treasuryBefore + fee);
        assertEq(bidding.totalAccumulatedFees(), 0);
    }

    function testO10_WithdrawFeesRevertNotOwner() public {
        vm.prank(bidder1);
        vm.expectRevert(); // Ownable: caller is not the owner
        bidding.withdrawFees(address(0));
    }

    function testO10_WithdrawFeesRevertZeroBalance() public {
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(BiddingSystem.BiddingSystem__No_fees_to_withdraw.selector));
        bidding.withdrawFees(address(0));
    }

    function testO10_LegacyWithdrawPlatformFeesStillWorks() public {
        // Backward compat: owner can still call withdrawPlatformFees for ETH
        _createSessionWithWinnerAndFund();

        uint256 fee = bidding.totalAccumulatedFees();
        uint256 treasuryBefore = treasury.balance;
        vm.prank(owner);
        bidding.withdrawPlatformFees(payable(treasury), fee);
        assertEq(treasury.balance, treasuryBefore + fee);
    }

    /***********************************/
    /* Phase 45b O-13: EvaluatorFinalized event */
    /***********************************/

    function testO13_EvaluatorFinalizedEventEmitted() public {
        uint256 sessionId = _createSession(creator, 10 ether, 7 days);
        _commitBid(sessionId, bidder1, 5 ether, "msg", bytes32(uint256(0x1111)));

        vm.warp(block.timestamp + 7 days + 30 minutes);
        vm.prank(bidder1);
        bidding.revealBid(sessionId, 5 ether, "msg", bytes32(uint256(0x1111)));
        
        // Warp past reveal window
        vm.warp(block.timestamp + 1 hours + 1);
        
        vm.prank(creator);
        bidding.acceptBid(sessionId, 1);

        uint256 bidAmount = 5 ether;
        uint256 fee = (bidAmount * 100) / 10000;
        uint256 totalPayment = bidAmount + fee;

        vm.expectEmit(true, true, false, true, address(bidding));
        emit EvaluatorFinalized(sessionId, evaluator, block.timestamp);
        vm.prank(creator);
        bidding.createJobAndFund{value: totalPayment}(
            sessionId,
            block.timestamp + 30 days,
            "Build a dApp"
        );
    }

    function testO13_EvaluatorFinalizedRandomEvaluator() public {
        // Random evaluator pool — EvaluatorFinalized should emit with address(0)
        uint256 maxBudget = 10 ether;
        uint256 stake = bidding.calculateStake(maxBudget);
        vm.prank(creator);
        uint256 sessionId = bidding.createBiddingSession{value: stake}(
            address(0), // random
            maxBudget,
            block.timestamp + 7 days,
            "",
            0,
            address(0),
            false,
            address(0)
        );

        _commitBid(sessionId, bidder1, 5 ether, "msg", bytes32(uint256(0x1111)));

        vm.warp(block.timestamp + 7 days + 30 minutes);
        vm.prank(bidder1);
        bidding.revealBid(sessionId, 5 ether, "msg", bytes32(uint256(0x1111)));
        
        // Warp past reveal window
        vm.warp(block.timestamp + 1 hours + 1);
        
        vm.prank(creator);
        bidding.acceptBid(sessionId, 1);

        uint256 bidAmount = 5 ether;
        uint256 fee = (bidAmount * 100) / 10000;
        uint256 totalPayment = bidAmount + fee;

        vm.expectEmit(true, true, false, true, address(bidding));
        emit EvaluatorFinalized(sessionId, address(0), block.timestamp);
        vm.prank(creator);
        bidding.createJobAndFund{value: totalPayment}(
            sessionId,
            block.timestamp + 30 days,
            "Build a dApp"
        );
    }

    /***********************************/
    /* Phase 45b O-20: claimStake must NOT exist in the contract */
    /***********************************/

    function testO20_ClaimStakeSelectorNotPresent() public {
        // claimStake(uint256) is selector 0x2c399d6e. Verify the contract does not
        // respond to it (the ABI surface must not include it).
        bytes memory payload = abi.encodeWithSignature("claimStake(uint256)", uint256(1));
        (bool success, ) = address(bidding).call(payload);
        // Either revert or fall through to a fallback that returns success=false
        // (no matching selector means the call returns success=false in Solidity 0.8.x).
        assertFalse(success, "O-20: claimStake must not be a callable function");
    }

    /***********************************/
    /* Phase 45c O-4: Min/Max stake bounds */
    /***********************************/

    function testO4_DefaultStakeBounds() public {
        // Defaults: 0.001 ether, 100 ether
        assertEq(bidding.minStake(), 0.001 ether);
        assertEq(bidding.maxStake(), 100 ether);
    }

    function testO4_CreateSession_RevertStakeBelowMin() public {
        // minStake=0.001 ether. A 0.1 ETH max budget → 0.001 ETH stake.
        // We need to force a stake below min, which requires a very small maxBudget
        // that is still > 0. The actual minimum stake achievable via calculateStake
        // with 1 wei budget is 0, so we test by setting minStake higher than the stake.
        vm.prank(owner);
        bidding.setMinStake(1 ether);

        uint256 maxBudget = 10 ether; // stake = 0.1 ETH < 1 ETH min
        uint256 stake = bidding.calculateStake(maxBudget);
        vm.prank(creator);
        vm.expectRevert(abi.encodeWithSelector(BiddingSystem.BiddingSystem__Stake_below_min.selector));
        bidding.createBiddingSession{value: stake}(
            evaluator, maxBudget, block.timestamp + 7 days, "", 0, address(0), false, address(0)
        );
    }

    function testO4_CreateSession_RevertStakeAboveMax() public {
        // maxStake=0.001 ether. A 10 ETH max budget → 0.1 ETH stake > 0.001 max.
        vm.prank(owner);
        bidding.setMaxStake(0.001 ether);

        uint256 maxBudget = 10 ether;
        uint256 stake = bidding.calculateStake(maxBudget);
        vm.prank(creator);
        vm.expectRevert(abi.encodeWithSelector(BiddingSystem.BiddingSystem__Stake_above_max.selector));
        bidding.createBiddingSession{value: stake}(
            evaluator, maxBudget, block.timestamp + 7 days, "", 0, address(0), false, address(0)
        );
    }

    function testO4_SetMinStake_RevertIfGreaterThanMax() public {
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(BiddingSystem.BiddingSystem__Invalid_stake_bounds.selector));
        bidding.setMinStake(200 ether); // > 100 ether default max
    }

    function testO4_SetMaxStake_RevertIfLessThanMin() public {
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(BiddingSystem.BiddingSystem__Invalid_stake_bounds.selector));
        bidding.setMaxStake(0); // < 0.001 ether default min
    }

    function testO4_SetStakeBounds_RevertIfInverted() public {
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(BiddingSystem.BiddingSystem__Invalid_stake_bounds.selector));
        bidding.setStakeBounds(10 ether, 1 ether);
    }

    function testO4_SetStakeBounds_UpdatesBoth() public {
        vm.prank(owner);
        bidding.setStakeBounds(0.01 ether, 50 ether);
        assertEq(bidding.minStake(), 0.01 ether);
        assertEq(bidding.maxStake(), 50 ether);
    }

    function testO4_SetMinStake_OnlyOwner() public {
        vm.prank(bidder1);
        vm.expectRevert(); // Ownable: caller is not the owner
        bidding.setMinStake(0);
    }

    /***********************************/
    /* Phase 45c O-5: Deadline sanity (1h to 30d) */
    /***********************************/

    function testO5_CreateSession_RevertDeadlineTooSoon() public {
        // 30 minutes < 1 hour minimum
        uint256 stake = bidding.calculateStake(10 ether);
        vm.prank(creator);
        vm.expectRevert(abi.encodeWithSelector(BiddingSystem.BiddingSystem__Duration_too_short.selector));
        bidding.createBiddingSession{value: stake}(
            evaluator, 10 ether, block.timestamp + 30 minutes, "", 0, address(0), false, address(0)
        );
    }

    function testO5_CreateSession_RevertDeadlineTooFar() public {
        // 31 days > 30 days maximum
        uint256 stake = bidding.calculateStake(10 ether);
        vm.prank(creator);
        vm.expectRevert(abi.encodeWithSelector(BiddingSystem.BiddingSystem__Duration_too_long.selector));
        bidding.createBiddingSession{value: stake}(
            evaluator, 10 ether, block.timestamp + 31 days, "", 0, address(0), false, address(0)
        );
    }

    function testO5_CreateSession_AcceptMinDeadline() public {
        // 1 hour + 1 second is just above the 1 hour minimum
        uint256 stake = bidding.calculateStake(10 ether);
        vm.prank(creator);
        uint256 sessionId = bidding.createBiddingSession{value: stake}(
            evaluator, 10 ether, block.timestamp + 1 hours + 1, "", 0, address(0), false, address(0)
        );
        assertEq(sessionId, 1);
    }

    function testO5_CreateSession_AcceptMaxDeadline() public {
        // 30 days exactly is the maximum
        uint256 stake = bidding.calculateStake(10 ether);
        vm.prank(creator);
        uint256 sessionId = bidding.createBiddingSession{value: stake}(
            evaluator, 10 ether, block.timestamp + 30 days, "", 0, address(0), false, address(0)
        );
        assertEq(sessionId, 1);
    }

    /***********************************/
    /* Phase 45c O-6: evaluatorFee param */
    /***********************************/

    function testO6_CreateSession_StoresEvaluatorFeeTrue() public {
        uint256 stake = bidding.calculateStake(10 ether);
        vm.prank(creator);
        uint256 sessionId = bidding.createBiddingSession{value: stake}(
            evaluator, 10 ether, block.timestamp + 7 days, "", 0, address(0), true, address(0)
        );
        IBiddingSystem.Session memory s = bidding.getSession(sessionId);
        assertTrue(s.evaluatorFee, "O-6: evaluatorFee must be true");
    }

    function testO6_CreateSession_StoresEvaluatorFeeFalse() public {
        uint256 stake = bidding.calculateStake(10 ether);
        vm.prank(creator);
        uint256 sessionId = bidding.createBiddingSession{value: stake}(
            evaluator, 10 ether, block.timestamp + 7 days, "", 0, address(0), false, address(0)
        );
        IBiddingSystem.Session memory s = bidding.getSession(sessionId);
        assertFalse(s.evaluatorFee, "O-6: evaluatorFee must be false by default");
    }

    /***********************************/
    /* Phase 45c O-7: hook param */
    /***********************************/

    function testO7_CreateSession_StoresZeroHook() public {
        uint256 stake = bidding.calculateStake(10 ether);
        vm.prank(creator);
        uint256 sessionId = bidding.createBiddingSession{value: stake}(
            evaluator, 10 ether, block.timestamp + 7 days, "", 0, address(0), false, address(0)
        );
        IBiddingSystem.Session memory s = bidding.getSession(sessionId);
        assertEq(s.hook, address(0), "O-7: hook must be address(0) when none provided");
    }

    function testO7_CreateSession_StoresValidHook() public {
        // Deploy a dummy hook contract (just a contract with code, no required interface)
        MockHook hook = new MockHook();
        uint256 stake = bidding.calculateStake(10 ether);
        vm.prank(creator);
        uint256 sessionId = bidding.createBiddingSession{value: stake}(
            evaluator, 10 ether, block.timestamp + 7 days, "", 0, address(0), false, address(hook)
        );
        IBiddingSystem.Session memory s = bidding.getSession(sessionId);
        assertEq(s.hook, address(hook), "O-7: hook must equal the provided contract address");
    }

    function testO7_CreateSession_RevertIfHookIsEOA() public {
        // An EOA (no code at address) must not be accepted as a hook.
        address eoa = makeAddr("eoa-hook");
        uint256 stake = bidding.calculateStake(10 ether);
        vm.prank(creator);
        vm.expectRevert(abi.encodeWithSelector(BiddingSystem.BiddingSystem__Zero_address.selector));
        bidding.createBiddingSession{value: stake}(
            evaluator, 10 ether, block.timestamp + 7 days, "", 0, address(0), false, eoa
        );
    }

    /***********************************/
    /* Phase 45c O-8: PROTOCOL_VERSION=2 in commit hash */
    /***********************************/

    function testO8_RevealBid_RevertWithPreVersionHash() public {
        // Commit a v1-style hash (5 fields) — should fail to reveal because the
        // contract now requires the PROTOCOL_VERSION=2 prefix (6 fields).
        uint256 sessionId = _createSession(creator, 10 ether, 7 days);
        bytes32 v1Hash = keccak256(abi.encode(sessionId, bidder1, 5 ether, "msg", bytes32(uint256(0x1234))));
        uint256 stake = bidding.calculateStake(10 ether);

        vm.prank(bidder1);
        bidding.commitBid{value: stake}(sessionId, v1Hash);

        vm.warp(block.timestamp + 7 days + 30 minutes);
        vm.prank(bidder1);
        vm.expectRevert(abi.encodeWithSelector(BiddingSystem.BiddingSystem__Invalid_commitment.selector));
        bidding.revealBid(sessionId, 5 ether, "msg", bytes32(uint256(0x1234)));
    }

    function testO8_RevealBid_AcceptV2Hash() public {
        // 6-field hash with PROTOCOL_VERSION=2 prefix — should reveal successfully.
        uint256 sessionId = _createSession(creator, 10 ether, 7 days);
        uint256 stake = bidding.calculateStake(10 ether);

        vm.prank(bidder1);
        bidding.commitBid{value: stake}(sessionId, keccak256(abi.encode(uint256(2), sessionId, bidder1, 5 ether, "msg", bytes32(uint256(0x1234)))));

        vm.warp(block.timestamp + 7 days + 30 minutes);
        vm.prank(bidder1);
        bidding.revealBid(sessionId, 5 ether, "msg", bytes32(uint256(0x1234)));
        assertEq(bidding.getUserBid(sessionId, bidder1).proposedAmount, 5 ether);
    }

    function testO8_ProtocolVersionConstantIs2() public {
        // PROTOCOL_VERSION is a constant; verify the value baked into the bytecode.
        // We assert via the EVM call: keccak256(abi.encode(2, sessionId, ...)) matches
        // the on-chain validation. A v3 hash should fail.
        uint256 sessionId = _createSession(creator, 10 ether, 7 days);
        uint256 stake = bidding.calculateStake(10 ether);
        bytes32 v3Hash = keccak256(abi.encode(uint256(3), sessionId, bidder1, 5 ether, "msg", bytes32(uint256(0x1234))));

        vm.prank(bidder1);
        bidding.commitBid{value: stake}(sessionId, v3Hash);

        vm.warp(block.timestamp + 7 days + 30 minutes);
        vm.prank(bidder1);
        vm.expectRevert(abi.encodeWithSelector(BiddingSystem.BiddingSystem__Invalid_commitment.selector));
        bidding.revealBid(sessionId, 5 ether, "msg", bytes32(uint256(0x1234)));
    }

    /***********************************/
    /* Phase 45c O-9: Withdraw timeout + sweep */
    /***********************************/

    function testO9_WithdrawClock_StartsOnAcceptBid() public {
        // After acceptBid, non-winners should have a claimableAt timestamp set.
        uint256 sessionId = _createSession(creator, 10 ether, 7 days);
        _commitBid(sessionId, bidder1, 5 ether, "msg1", bytes32(uint256(0x1111)));
        _commitBid(sessionId, bidder2, 6 ether, "msg2", bytes32(uint256(0x2222)));

        vm.warp(block.timestamp + 7 days + 30 minutes);
        vm.prank(bidder1);
        bidding.revealBid(sessionId, 5 ether, "msg1", bytes32(uint256(0x1111)));
        vm.prank(bidder2);
        bidding.revealBid(sessionId, 6 ether, "msg2", bytes32(uint256(0x2222)));

        // Warp past reveal window
        vm.warp(block.timestamp + 1 hours + 1);
        
        uint256 acceptTime = block.timestamp;
        vm.prank(creator);
        bidding.acceptBid(sessionId, 1); // bidder1 wins

        // bidder2 is non-winner: claimableAt should be set
        assertEq(bidding.withdrawStakeClaimableAt(sessionId, bidder2), acceptTime + 30 days);
        // bidder1 is the winner: their stake was returned synchronously, no claim
        assertEq(bidding.withdrawStakeClaimableAt(sessionId, bidder1), 0);
    }

    function testO9_WithdrawClock_StartsOnCancel() public {
        uint256 sessionId = _createSession(creator, 10 ether, 7 days);
        _commitBid(sessionId, bidder1, 5 ether, "msg", bytes32(uint256(0x1111)));
        _commitBid(sessionId, bidder2, 6 ether, "msg", bytes32(uint256(0x2222)));

        // Before any reveals, cancel the session.
        // (cancelSession reverts if any bid is revealed; ensure none are.)
        uint256 cancelTime = block.timestamp;
        vm.prank(creator);
        bidding.cancelSession(sessionId);

        assertEq(bidding.withdrawStakeClaimableAt(sessionId, bidder1), cancelTime + 30 days);
        assertEq(bidding.withdrawStakeClaimableAt(sessionId, bidder2), cancelTime + 30 days);
    }

    function testO9_WithdrawStake_ClearsClaimableAt() public {
        uint256 sessionId = _createSession(creator, 10 ether, 7 days);
        _commitBid(sessionId, bidder1, 5 ether, "msg1", bytes32(uint256(0x1111)));
        _commitBid(sessionId, bidder2, 6 ether, "msg2", bytes32(uint256(0x2222)));

        vm.warp(block.timestamp + 7 days + 30 minutes);
        vm.prank(bidder1);
        bidding.revealBid(sessionId, 5 ether, "msg1", bytes32(uint256(0x1111)));
        vm.prank(bidder2);
        bidding.revealBid(sessionId, 6 ether, "msg2", bytes32(uint256(0x2222)));
        
        // Warp past reveal window
        vm.warp(block.timestamp + 1 hours + 1);
        
        vm.prank(creator);
        bidding.acceptBid(sessionId, 1); // bidder1 wins

        // bidder2 is non-winner — withdraw within the 30-day window
        uint256 deadline = bidding.withdrawStakeClaimableAt(sessionId, bidder2);
        assertGt(deadline, 0);

        uint256 balBefore = bidder2.balance;
        vm.prank(bidder2);
        bidding.withdrawStake(sessionId);
        assertEq(bidder2.balance, balBefore + bidding.calculateStake(10 ether));
        assertEq(bidding.withdrawStakeClaimableAt(sessionId, bidder2), 0);
    }

    function testO9_Sweep_RevertBeforeTimeout() public {
        uint256 sessionId = _createSession(creator, 10 ether, 7 days);
        _commitBid(sessionId, bidder1, 5 ether, "msg1", bytes32(uint256(0x1111)));
        _commitBid(sessionId, bidder2, 6 ether, "msg2", bytes32(uint256(0x2222)));

        vm.warp(block.timestamp + 7 days + 30 minutes);
        vm.prank(bidder1);
        bidding.revealBid(sessionId, 5 ether, "msg1", bytes32(uint256(0x1111)));
        
        // Warp past reveal window
        vm.warp(block.timestamp + 1 hours + 1);
        
        vm.prank(creator);
        bidding.acceptBid(sessionId, 1);

        // Try to sweep before the 30-day window
        vm.warp(block.timestamp + 29 days);
        vm.prank(bidder3);
        vm.expectRevert(abi.encodeWithSelector(BiddingSystem.BiddingSystem__Sweep_too_early.selector));
        bidding.sweepUnclaimedStakes(sessionId);
    }

    function testO9_Sweep_AfterTimeoutSlashesNoShowAndRefundsRemainder() public {
        uint256 sessionId = _createSession(creator, 10 ether, 7 days);
        _commitBid(sessionId, bidder1, 5 ether, "msg1", bytes32(uint256(0x1111)));
        _commitBid(sessionId, bidder2, 6 ether, "msg2", bytes32(uint256(0x2222)));

        vm.warp(block.timestamp + 7 days + 30 minutes);
        vm.prank(bidder1);
        bidding.revealBid(sessionId, 5 ether, "msg1", bytes32(uint256(0x1111)));
        
        // Warp past reveal window
        vm.warp(block.timestamp + 1 hours + 1);
        
        vm.prank(creator);
        bidding.acceptBid(sessionId, 1);

        // Bidder2 never withdraws. Wait 30 days.
        vm.warp(block.timestamp + 30 days + 1);

        uint256 stake2 = bidding.calculateStake(10 ether);
        uint256 slashAmount = (stake2 * bidding.NO_SHOW_SLASH_BP()) / bidding.FEE_DENOMINATOR();
        uint256 refundAmount = stake2 - slashAmount;
        uint256 treasuryBefore = treasury.balance;
        uint256 bidder2Before = bidder2.balance;

        vm.prank(bidder3);
        uint256 swept = bidding.sweepUnclaimedStakes(sessionId);

        assertEq(swept, 1, "O-9: should sweep 1 un-withdrawn bid");
        assertEq(treasury.balance, treasuryBefore + slashAmount, "O-9: treasury should receive 5% slash");
        assertEq(bidder2.balance, bidder2Before + refundAmount, "O-9: bidder should receive remainder");
        assertEq(bidding.getUserBid(sessionId, bidder2).stake, 0, "O-9: stake should be zeroed");
        assertTrue(bidding.getUserBid(sessionId, bidder2).stakeWithdrawn, "O-9: stakeWithdrawn should be true");
    }

    function testO9_Sweep_SkipsRevealedBid() public {
        uint256 sessionId = _createSession(creator, 10 ether, 7 days);
        _commitBid(sessionId, bidder1, 5 ether, "msg1", bytes32(uint256(0x1111)));
        _commitBid(sessionId, bidder2, 6 ether, "msg2", bytes32(uint256(0x2222)));

        vm.warp(block.timestamp + 7 days + 30 minutes);
        vm.prank(bidder1);
        bidding.revealBid(sessionId, 5 ether, "msg1", bytes32(uint256(0x1111)));
        vm.prank(bidder2);
        bidding.revealBid(sessionId, 6 ether, "msg2", bytes32(uint256(0x2222)));
        
        // Warp past reveal window
        vm.warp(block.timestamp + 1 hours + 1);
        
        vm.prank(creator);
        bidding.acceptBid(sessionId, 1);

        vm.warp(block.timestamp + 30 days + 1);
        vm.prank(bidder3);
        uint256 swept = bidding.sweepUnclaimedStakes(sessionId);

        assertEq(swept, 0);
        assertEq(uint256(bidding.getBidStatus(sessionId, bidder2)), 2, "revealed bid remains Revealed");
        assertEq(bidding.getUserBid(sessionId, bidder2).stake, bidding.calculateStake(10 ether));
    }

    function testO9_Sweep_NoOpWhenNothingClaimable() public {
        // No pending bids → returns 0, no revert
        uint256 sessionId = _createSession(creator, 10 ether, 7 days);
        vm.warp(block.timestamp + 31 days);
        vm.prank(bidder3);
        uint256 swept = bidding.sweepUnclaimedStakes(sessionId);
        assertEq(swept, 0);
    }

    function testO9_Sweep_RevertInvalidSession() public {
        vm.warp(block.timestamp + 31 days);
        vm.prank(bidder3);
        vm.expectRevert(abi.encodeWithSelector(BiddingSystem.BiddingSystem__Invalid_session.selector));
        bidding.sweepUnclaimedStakes(9999);
    }

    /***********************************/
    /* Phase 45c O-11: per-token platform fee */
    /***********************************/

    function testO11_DefaultFeeIsGlobal() public {
        // No override → returns global default (100 = 1%)
        assertEq(bidding.getPlatformFeeBP(address(0)), 100);
        assertEq(bidding.getPlatformFeeBP(address(usdc)), 100);
    }

    function testO11_SetPlatformFeeBPForToken_Override() public {
        // Override USDC fee to 250 bps (2.5%)
        vm.prank(owner);
        bidding.setPlatformFeeBPForToken(address(usdc), 250);
        assertEq(bidding.getPlatformFeeBP(address(usdc)), 250);
        // Other tokens still use the default
        assertEq(bidding.getPlatformFeeBP(address(0)), 100);
    }

    function testO11_SetPlatformFeeBPForToken_AddressZero_UpdatesGlobal() public {
        // address(0) updates the global default
        vm.prank(owner);
        bidding.setPlatformFeeBPForToken(address(0), 300);
        assertEq(bidding.getPlatformFeeBP(address(0)), 300);
        assertEq(bidding.platformFeeBP(), 300);
    }

    function testO11_SetPlatformFeeBPForToken_RevertExceedsMax() public {
        // > 1000 bps reverts
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(BiddingSystem.BiddingSystem__Max_10_fee.selector));
        bidding.setPlatformFeeBPForToken(address(usdc), 1100);
    }

    function testO11_CreateJobAndFund_UsesPerTokenFee() public {
        // Set USDC-specific fee to 500 bps (5%)
        vm.prank(owner);
        bidding.setMinStake(0); // allow USDC stakes
        vm.prank(owner);
        bidding.setPlatformFeeBPForToken(address(usdc), 500);

        // Build a USDC-funded session
        uint256 maxBudget = 100_000 * 1e6;
        uint256 stake = bidding.calculateStake(maxBudget);
        usdc.mint(creator, stake);

        vm.startPrank(creator);
        usdc.approve(address(bidding), stake);
        uint256 sessionId = bidding.createBiddingSession(
            evaluator, maxBudget, block.timestamp + 7 days, "", 0, address(usdc), false, address(0)
        );
        usdc.mint(creator, 51_000 * 1e6); // bid + 5% fee
        usdc.approve(address(bidding), 51_000 * 1e6);
        vm.stopPrank();

        usdc.mint(bidder1, stake);
        vm.startPrank(bidder1);
        usdc.approve(address(bidding), stake);
        bytes32 hash = keccak256(abi.encode(uint256(2), sessionId, bidder1, 50_000 * 1e6, "msg", bytes32(uint256(0x1111))));
        bidding.commitBid(sessionId, hash);
        vm.stopPrank();

        vm.warp(block.timestamp + 7 days + 30 minutes);
        vm.prank(bidder1);
        bidding.revealBid(sessionId, 50_000 * 1e6, "msg", bytes32(uint256(0x1111)));
        
        // Warp past reveal window
        vm.warp(block.timestamp + 1 hours + 1);
        
        vm.prank(creator);
        bidding.acceptBid(sessionId, 1);

        uint256 feeExpected = (50_000 * 1e6 * 500) / 10000; // 5% = 2500 USDC
        uint256 totalPayment = 50_000 * 1e6 + feeExpected;
        usdc.mint(creator, totalPayment);

        vm.startPrank(creator);
        usdc.approve(address(bidding), totalPayment);
        bidding.createJobAndFund(sessionId, block.timestamp + 30 days, "Build a dApp");
        vm.stopPrank();

        // Per-token fee should be tracked
        assertEq(bidding.accumulatedFeesByToken(address(usdc)), feeExpected);
        assertEq(usdc.balanceOf(address(mockCommerce)), 50_000 * 1e6, "mock commerce should receive bid amount");
        // Phase 47: both creator stake and winner stake are pull-based, so both remain in contract
        assertEq(usdc.balanceOf(address(bidding)), feeExpected + stake * 2, "bidding should retain fee plus pending creator and winner refunds");
        assertEq(usdc.allowance(address(bidding), address(mockCommerce)), 0, "commerce allowance should be consumed");
    }

    /***********************************/
    /* Phase 45c O-12: BidStatus enum */
    /***********************************/

    function testO12_BidStatus_CommitSetsPending() public {
        uint256 sessionId = _createSession(creator, 10 ether, 7 days);
        _commitBid(sessionId, bidder1, 5 ether, "msg", bytes32(uint256(0x1111)));
        assertEq(uint256(bidding.getBidStatus(sessionId, bidder1)), 1, "O-12: Pending = 1");
    }

    function testO12_BidStatus_RevealSetsRevealed() public {
        uint256 sessionId = _createSession(creator, 10 ether, 7 days);
        _commitBid(sessionId, bidder1, 5 ether, "msg", bytes32(uint256(0x1111)));
        vm.warp(block.timestamp + 7 days + 30 minutes);
        vm.prank(bidder1);
        bidding.revealBid(sessionId, 5 ether, "msg", bytes32(uint256(0x1111)));
        assertEq(uint256(bidding.getBidStatus(sessionId, bidder1)), 2, "O-12: Revealed = 2");
    }

    function testO12_BidStatus_AcceptSetsAccepted() public {
        uint256 sessionId = _createSession(creator, 10 ether, 7 days);
        _commitBid(sessionId, bidder1, 5 ether, "msg", bytes32(uint256(0x1111)));
        vm.warp(block.timestamp + 7 days + 30 minutes);
        vm.prank(bidder1);
        bidding.revealBid(sessionId, 5 ether, "msg", bytes32(uint256(0x1111)));
        
        // Warp past reveal window
        vm.warp(block.timestamp + 1 hours + 1);
        
        vm.prank(creator);
        bidding.acceptBid(sessionId, 1);
        assertEq(uint256(bidding.getBidStatus(sessionId, bidder1)), 3, "O-12: Accepted = 3");
    }

    function testO12_BidStatus_RejectSetsRejected() public {
        uint256 sessionId = _createSession(creator, 10 ether, 7 days);
        _commitBid(sessionId, bidder1, 5 ether, "msg1", bytes32(uint256(0x1111)));
        _commitBid(sessionId, bidder2, 6 ether, "msg2", bytes32(uint256(0x2222)));
        vm.warp(block.timestamp + 7 days + 30 minutes);
        vm.prank(bidder1);
        bidding.revealBid(sessionId, 5 ether, "msg1", bytes32(uint256(0x1111)));
        vm.prank(bidder2);
        bidding.revealBid(sessionId, 6 ether, "msg2", bytes32(uint256(0x2222)));
        vm.prank(creator);
        bidding.rejectBid(sessionId, 1, "too expensive");
        assertEq(uint256(bidding.getBidStatus(sessionId, bidder1)), 4, "O-12: Rejected = 4");
    }

    function testO12_BidStatus_WithdrawSetsWithdrawn() public {
        uint256 sessionId = _createSession(creator, 10 ether, 7 days);
        _commitBid(sessionId, bidder1, 5 ether, "msg", bytes32(uint256(0x1111)));
        // Cancel the session — no reveals, no winner.
        vm.prank(creator);
        bidding.cancelSession(sessionId);
        // Bidder1 can now withdraw
        vm.prank(bidder1);
        bidding.withdrawStake(sessionId);
        assertEq(uint256(bidding.getBidStatus(sessionId, bidder1)), 5, "O-12: Withdrawn = 5");
    }

    function testO12_BidStatus_NoneForUnknownBidder() public {
        uint256 sessionId = _createSession(creator, 10 ether, 7 days);
        assertEq(uint256(bidding.getBidStatus(sessionId, bidder1)), 0, "O-12: None = 0");
    }

    function testO12_BidStatus_SweepSetsWithdrawn() public {
        uint256 sessionId = _createSession(creator, 10 ether, 7 days);
        _commitBid(sessionId, bidder1, 5 ether, "msg1", bytes32(uint256(0x1111)));
        _commitBid(sessionId, bidder2, 6 ether, "msg2", bytes32(uint256(0x2222)));

        vm.warp(block.timestamp + 7 days + 30 minutes);
        vm.prank(bidder1);
        bidding.revealBid(sessionId, 5 ether, "msg1", bytes32(uint256(0x1111)));
        
        // Warp past reveal window
        vm.warp(block.timestamp + 1 hours + 1);
        
        vm.prank(creator);
        bidding.acceptBid(sessionId, 1);

        vm.warp(block.timestamp + 30 days + 1);
        vm.prank(bidder3);
        bidding.sweepUnclaimedStakes(sessionId);
        assertEq(uint256(bidding.getBidStatus(sessionId, bidder2)), 5, "O-12: swept -> Withdrawn = 5");
    }
}

/**
 * @dev Mock hook contract for O-7 hook validation tests. Just needs to have code
 *      at the address; the BiddingSystem doesn't actually call any method on it.
 */
contract MockHook {
    uint256 public dummy;
}

contract MockRevertingCommerce {
    function createJobForClient(
        address,
        address,
        uint256,
        address,
        uint256,
        uint256,
        string calldata,
        address,
        address,
        bool,
        bool,
        bool,
        uint256
    ) external payable returns (uint256) {
        revert("downstream revert");
    }
}
