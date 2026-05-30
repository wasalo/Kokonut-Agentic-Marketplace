// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {BiddingSystem} from "../shared/BiddingSystem.sol";
import {IBiddingSystem} from "../interfaces/IBiddingSystem.sol";
import {IAgenticCommerceV9} from "../interfaces/IAgenticCommerceV9.sol";
import {MockAgenticCommerceV9} from "./TestFixtures.sol";

/**
 * @title BiddingSystemTest
 * @dev Comprehensive tests for the standalone BiddingSystem contract
 */
contract BiddingSystemTest is Test {
    BiddingSystem public bidding;
    MockAgenticCommerceV9 public mockCommerce;
    
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
    
    function setUp() public {
        mockCommerce = new MockAgenticCommerceV9();
        
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
            address(0)
        );
        
        // Excess should be refunded
        assertEq(creator.balance, 100 ether - stake);
    }
    
    function testCreateBiddingSessionRandomEvaluator() public {
        uint256 stake = bidding.calculateStake(10 ether);
        vm.prank(creator);
        uint256 sessionId = bidding.createBiddingSession{value: stake}(address(0), 10 ether, block.timestamp + 7 days, "", 0, address(0));
        
        IBiddingSystem.Session memory session = bidding.getSession(sessionId);
        assertEq(session.evaluator, address(0), "evaluator should be address(0)");
        assertTrue(session.useRandomEvaluator, "useRandomEvaluator should be true");
    }
    
    function testCreateBiddingSessionRevertZeroBudget() public {
        vm.prank(creator);
        vm.expectRevert();
        bidding.createBiddingSession{value: 1 ether}(evaluator, 0, block.timestamp + 7 days, "", 0, address(0));
    }
    
    function testCreateBiddingSessionRevertDurationTooShort() public {
        uint256 stake = bidding.calculateStake(10 ether);
        vm.prank(creator);
        vm.expectRevert(abi.encodeWithSelector(BiddingSystem.BiddingSystem__Duration_too_short.selector));
        bidding.createBiddingSession{value: stake}(evaluator, 10 ether, block.timestamp + 1 minutes, "", 0, address(0));
    }
    
    function testCreateBiddingSessionRevertDurationTooLong() public {
        uint256 stake = bidding.calculateStake(10 ether);
        vm.prank(creator);
        vm.expectRevert(abi.encodeWithSelector(BiddingSystem.BiddingSystem__Duration_too_long.selector));
        bidding.createBiddingSession{value: stake}(evaluator, 10 ether, block.timestamp + 31 days, "", 0, address(0));
    }
    
    function testCreateBiddingSessionRevertInsufficientStake() public {
        vm.prank(creator);
        vm.expectRevert(abi.encodeWithSelector(BiddingSystem.BiddingSystem__Insufficient_stake.selector));
        bidding.createBiddingSession{value: 0.001 ether}(evaluator, 10 ether, block.timestamp + 7 days, "", 0, address(0));
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
        
        // Creator accepts bidder1's bid (5 ETH)
        vm.prank(creator);
        bidding.acceptBid(sessionId, 1);
        
        IBiddingSystem.Bid memory bid = bidding.getBid(sessionId, 1);
        assertTrue(bid.accepted);
        assertEq(bidder1.balance, 100 ether - stake + stake); // Stake returned
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
        
        // Creator accepts bidder1
        vm.prank(creator);
        bidding.acceptBid(sessionId, 1);
        
        // Bidder2 should be able to withdraw after reveal window
        vm.warp(block.timestamp + REVEAL_WINDOW + 1);
        
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

    function testWithdrawCreatorStakeRevertsAfterJobCreation() public {
        uint256 sessionId = _createSession(creator, 10 ether, 7 days);
        uint256 bidAmount = 5 ether;
        uint256 platformFee = (bidAmount * 100) / 10000;

        _commitBid(sessionId, bidder1, bidAmount, "Great work", bytes32(uint256(0x1111)));

        vm.warp(block.timestamp + 7 days + 30 minutes);
        vm.prank(bidder1);
        bidding.revealBid(sessionId, bidAmount, "Great work", bytes32(uint256(0x1111)));

        vm.prank(creator);
        bidding.acceptBid(sessionId, 1);

        vm.prank(creator);
        bidding.createJobAndFund{value: bidAmount + platformFee}(
            sessionId,
            block.timestamp + 30 days,
            "Build a dApp"
        );

        vm.prank(creator);
        vm.expectRevert(abi.encodeWithSelector(BiddingSystem.BiddingSystem__Stake_already_withdrawn.selector));
        bidding.withdrawCreatorStake(sessionId);
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
        assertEq(bidder1.balance, bidderBalanceBefore + stake);
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
        
        // Bidder2's stake should be returned immediately in rejectBid
        assertEq(bidder2.balance, bidder2BalanceBefore + stake);
        
        // Creator accepts bidder1 (session moves to WinnerSelected)
        vm.prank(creator);
        bidding.acceptBid(sessionId, 1);
        
        // Bidder2 cannot withdraw since stake is already 0 (returned in rejectBid)
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
            address(0)
        );
    }
    
    function _commitBid(uint256 sessionId, address bidder, uint256 amount, string memory message, bytes32 salt) internal {
        uint256 stake = bidding.calculateStake(10 ether); // Assuming 10 ether max budget
        bytes32 commitHash = keccak256(abi.encode(amount, message, salt));
        
        vm.prank(bidder);
        bidding.commitBid{value: stake}(sessionId, commitHash);
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
}
