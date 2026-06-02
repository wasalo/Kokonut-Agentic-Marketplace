// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import "forge-std/console.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IAgenticCommerceV9} from "../interfaces/IAgenticCommerceV9.sol";
import {IBiddingSystem} from "../interfaces/IBiddingSystem.sol";
import {AdminRegistry} from "./AdminRegistry.sol";

/**
 * @title BiddingSystem
 * @dev Standalone upgradeable bidding contract for the Kokonut Agent Economy
 * 
 * Features:
 * - Commit-reveal bidding with ETH stakes (1% of max budget)
 * - Winner selection by job creator
 * - Integration with AgenticCommerceV6.1 for job creation and escrow
 * - Pull pattern for stake management (no automatic loss)
 * - ServiceRegistry integration for service linking
 * - ERC-8004 identity validation for bidders
 * 
 * Security:
 * - nonReentrant guards on all state-changing functions
 * - CEI pattern for all token transfers
 * - Access control via modifiers
 * - Input validation on all public functions
 */
contract BiddingSystem is
    Initializable,
    UUPSUpgradeable,
    Ownable2StepUpgradeable,
    ReentrancyGuard,
    PausableUpgradeable,
    IBiddingSystem
{
    using SafeERC20 for IERC20;
    error BiddingSystem__Already_committed();
    error BiddingSystem__Already_revealed();
    error BiddingSystem__Bid_already_accepted();
    error BiddingSystem__Bid_not_revealed();
    error BiddingSystem__Bidding_closed();
    error BiddingSystem__Cannot_cancel();
    error BiddingSystem__Cannot_cancel_bids_revealed();
    error BiddingSystem__Deadline_not_passed();
    error BiddingSystem__Duration_too_long();
    error BiddingSystem__Duration_too_short();
    error BiddingSystem__ETH_transfer_failed();
    error BiddingSystem__Evaluator_blacklisted();
    error BiddingSystem__Exceeds_max_budget();
    error BiddingSystem__Expiry_too_far();
    error BiddingSystem__Expiry_too_soon();
    error BiddingSystem__Insufficient_balance();
    error BiddingSystem__Insufficient_payment();
    error BiddingSystem__Insufficient_stake();
    error BiddingSystem__Insufficient_stake_for_session();
    error BiddingSystem__Invalid_bid();
    error BiddingSystem__Invalid_commitment();
    error BiddingSystem__Invalid_session();
    error BiddingSystem__Invalid_window();
    error BiddingSystem__Job_already_created();
    error BiddingSystem__Job_created();
    error BiddingSystem__Max_10_fee();
    error BiddingSystem__No_bid_found();
    error BiddingSystem__No_stake_to_claim();
    error BiddingSystem__No_stake_to_withdraw();
    error BiddingSystem__No_winner();
    error BiddingSystem__No_winner_selected();
    error BiddingSystem__Not_session_creator();
    error BiddingSystem__Not_the_winner();
    error BiddingSystem__Reveal_window_closed();
    error BiddingSystem__Reveal_window_already_closed();
    error BiddingSystem__Reveal_window_still_open();
    error BiddingSystem__Session_not_active();
    error BiddingSystem__Session_still_active();
    error BiddingSystem__Stake_already_withdrawn();
    error BiddingSystem__Wallet_blacklisted();
    error BiddingSystem__Winner_already_selected();
    error BiddingSystem__Winner_selected();
    error BiddingSystem__Wrong_session_status();
    error BiddingSystem__Wrong_status();
    error BiddingSystem__Zero_address();
    error BiddingSystem__Zero_budget();
    error BiddingSystem__Zero_commerce();
    error BiddingSystem__Zero_commitment();
    error BiddingSystem__Zero_evaluator();
    error BiddingSystem__Zero_owner();
    error BiddingSystem__Zero_treasury();
    error BiddingSystem__Extension_too_long();
    error BiddingSystem__No_show_not_eligible();   // Phase 45b O-3: bid is revealed, accepted, or already withdrawn
    error BiddingSystem__Already_settled();        // Phase 45b O-3: bid was already slashed
    error BiddingSystem__Reveal_window_not_ended();// Phase 45b O-3: slashNoShow called before reveal window ended
    error BiddingSystem__No_fees_to_withdraw();    // Phase 45b O-10: withdrawFees called with zero balance
    error BiddingSystem__Stake_below_min();        // Phase 45c O-4: createBiddingSession stake < minStake
    error BiddingSystem__Stake_above_max();        // Phase 45c O-4: createBiddingSession stake > maxStake
    error BiddingSystem__Invalid_stake_bounds();   // Phase 45c O-4: setStakeBounds with min > max
    error BiddingSystem__Sweep_too_early();        // Phase 45c O-9: sweepUnclaimedStakes before WITHDRAW_TIMEOUT
    /***********************************/
    /* Constants */
    /***********************************/
    
    uint256 public constant MIN_STAKE_BP = 100;      // 1% in basis points
    uint256 public constant FEE_DENOMINATOR = 10000;
    uint256 public constant DEFAULT_REVEAL_WINDOW = 1 hours;
    uint256 public constant MIN_SESSION_DURATION = 1 hours;   // Phase 45c O-5: tighter bound
    uint256 public constant MAX_SESSION_DURATION = 30 days;   // Phase 45c O-5
    uint256 public constant MIN_JOB_EXPIRY = 5 minutes;
    uint256 public constant MAX_JOB_EXPIRY = 365 days;
    uint256 public constant ETH_PLATFORM_FEE_BP = 100; // 1% platform fee
    uint256 public constant MAX_REVEAL_EXTENSION = 7 days;
    uint256 public constant NO_SHOW_SLASH_BP = 500;    // Phase 45b O-3: 5% slash for no-show bidders
    uint256 public constant DEFAULT_MIN_STAKE = 0.001 ether;  // Phase 45c O-4
    uint256 public constant DEFAULT_MAX_STAKE = 100 ether;   // Phase 45c O-4
    uint256 public constant PROTOCOL_VERSION = 2;            // Phase 45c O-8: bump from 1 (Phase 45b O-1) to 2
    uint256 public constant WITHDRAW_TIMEOUT = 30 days;       // Phase 45c O-9
    
    /***********************************/
    /* Storage */
    /***********************************/
    
    // These variables are placed to avoid storage collision
    // Reference: https://docs.openzeppelin.com/upgrades-plugins/writing-proxies#storage-collisions-avoided
    
    uint256 public sessionCounter;
    mapping(uint256 => Session) public sessions;
    mapping(uint256 => Bid[]) public sessionBids;
    mapping(uint256 => mapping(address => uint256)) public bidderToBidIndex;
    mapping(uint256 => mapping(bytes32 => bool)) public validCommits;
    mapping(uint256 => uint256) public totalStakesHeld;
    mapping(uint256 => uint256) public totalPlatformFees;
    
    // Integration addresses
    address public commerce;           // AgenticCommerceV9
    address public treasury;          // Platform treasury
    address public adminRegistry;     // Bad actor blacklist
    
    // Configuration
    uint256 public revealWindow = DEFAULT_REVEAL_WINDOW;
    uint256 public platformFeeBP = ETH_PLATFORM_FEE_BP;
    
    // Storage gap for upgradeability. Phase 45c has consumed 7 of the original 49 slots
    // (totalAccumulatedFees, creatorStakeWithdrawn, accumulatedFeesByToken from Phase 45b,
    // then minStake, maxStake, withdrawStakeClaimableAt, platformFeeBPByToken from 45c),
    // leaving 42 free slots for future upgrades.
    uint256[42] private __gap;

    // Running total of accrued platform fees (D-01 fix — replaces O(n) loop)
    uint256 public totalAccumulatedFees;
    mapping(uint256 => bool) public creatorStakeWithdrawn;

    // Phase 45b O-10: per-token accumulator for ERC-20 platform fees.
    // Tracks accumulated fees per paymentToken so withdrawFees(token) can pull
    // the full balance in one call. address(0) is native ETH, but the ETH
    // balance is also tracked by totalAccumulatedFees above for backward compat.
    mapping(address => uint256) public accumulatedFeesByToken;

    // Phase 45c O-4: min/max stake bounds (owner-settable). uint256 to allow ERC-20
    // denominated stakes in the future. Defaults: 0.001 ETH and 100 ETH.
    uint256 public minStake = DEFAULT_MIN_STAKE;
    uint256 public maxStake = DEFAULT_MAX_STAKE;

    // Phase 45c O-9: per-(session, bidder) timestamp after which the bidder can have
    // their unclaimed stake swept to the treasury. 0 means no pending claim.
    mapping(uint256 => mapping(address => uint256)) public withdrawStakeClaimableAt;

    // Phase 45c O-11: per-token platform fee in basis points. address(0) holds the
    // default override (mirrors the global `platformFeeBP` for consistency). When a
    // token-specific entry is unset, `getPlatformFeeBP(token)` returns the global
    // default `platformFeeBP()`.
    mapping(address => uint256) public platformFeeBPByToken;
    
    /***********************************/
    /* Modifiers */
    /***********************************/
    
    modifier onlySessionCreator(uint256 sessionId) {
        if (!(sessions[sessionId].creator == msg.sender)) revert BiddingSystem__Not_session_creator();
        _;
    }
    
    modifier onlySessionActive(uint256 sessionId) {
        if (!(sessions[sessionId].id != 0)) revert BiddingSystem__Invalid_session();
        if (!(sessions[sessionId].status == SessionStatus.Active)) revert BiddingSystem__Session_not_active();
        if (!(block.timestamp < sessions[sessionId].deadline)) revert BiddingSystem__Bidding_closed();
        _;
    }
    
    modifier onlyAfterDeadline(uint256 sessionId) {
        if (!(sessions[sessionId].id != 0)) revert BiddingSystem__Invalid_session();
        if (!(sessions[sessionId].status == SessionStatus.Active || sessions[sessionId].status == SessionStatus.BiddingClosed)) revert BiddingSystem__Wrong_session_status();
        if (!(block.timestamp >= sessions[sessionId].deadline)) revert BiddingSystem__Deadline_not_passed();
        _;
    }
    
    /***********************************/
    /* Initialize */
    /***********************************/
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    function initialize(address owner_, address commerce_, address treasury_) public initializer {
        if (!(owner_ != address(0))) revert BiddingSystem__Zero_owner();
        if (!(commerce_ != address(0))) revert BiddingSystem__Zero_commerce();
        if (!(treasury_ != address(0))) revert BiddingSystem__Zero_treasury();

        __Ownable_init(owner_);
        __Pausable_init();

        commerce = commerce_;
        treasury = treasury_;
        sessionCounter = 0;
        revealWindow = DEFAULT_REVEAL_WINDOW;
        platformFeeBP = ETH_PLATFORM_FEE_BP;
        // Phase 45c O-4: inline defaults are not applied to proxy storage; explicit
        // initialization is required for fresh deployments. For upgrades, the admin
        // must call setStakeBounds() post-upgrade to seed the bounds.
        minStake = DEFAULT_MIN_STAKE;
        maxStake = DEFAULT_MAX_STAKE;
    }
    
    /***********************************/
    /* UUPS */
    /***********************************/
    
    function _authorizeUpgrade(address) internal override onlyOwner {}

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /***********************************/
    /* Core Bidding Functions */
    /***********************************/

    function createBiddingSession(
        address evaluator,
        uint256 maxBudget,
        uint256 deadline,
        bytes calldata metadata,
        uint256 serviceId,
        address paymentToken,
        bool evaluatorFee,
        address hook
    ) external payable nonReentrant whenNotPaused returns (uint256 sessionId) {
        // Phase 39: Allow address(0) for random evaluator pool selection
        bool useRandomEvaluator = (evaluator == address(0));
        if (!(maxBudget > 0)) revert BiddingSystem__Zero_budget();
        // Phase 45c O-5: min 1h, max 30d deadline window
        if (!(deadline > block.timestamp + MIN_SESSION_DURATION)) revert BiddingSystem__Duration_too_short();
        if (!(deadline <= block.timestamp + MAX_SESSION_DURATION)) revert BiddingSystem__Duration_too_long();
        // Phase 45c O-7: hook must be zero or a contract with code. EOA is rejected to
        // avoid silent misconfiguration where a "webhook relay" is actually a wallet.
        if (hook != address(0)) {
            uint256 size;
            assembly { size := extcodesize(hook) }
            if (size == 0) revert BiddingSystem__Zero_address();
        }

        // Phase 40: Validate payment token and collect stake
        uint256 stakeAmount = calculateStake(maxBudget);
        // Phase 45c O-4: enforce min/max stake bounds. The bounds are interpreted
        // in paymentToken units, so for ETH they read 0.001-100 ETH directly; for
        // an ERC-20 (e.g. USDC with 6 decimals) the owner is expected to set the
        // bounds in the same units (raw 6-decimal integer). Defaults to 0.001 ether
        // and 100 ether which is fine for ETH but is advisory for ERC-20 — the
        // owner should set explicit bounds via setStakeBounds.
        if (!(stakeAmount >= minStake)) revert BiddingSystem__Stake_below_min();
        if (!(stakeAmount <= maxStake)) revert BiddingSystem__Stake_above_max();
        if (!(stakeAmount >= minStake)) revert BiddingSystem__Stake_below_min();
        if (!(stakeAmount <= maxStake)) revert BiddingSystem__Stake_above_max();
        _receiveToken(paymentToken, msg.sender, stakeAmount);

        // Refund excess for ETH payments
        if (paymentToken == address(0)) {
            _refundExcess(paymentToken, msg.sender, msg.value, stakeAmount);
        }

        // Bad Actor: Check if wallets are blacklisted (skip evaluator check for random)
        if (adminRegistry != address(0)) {
            AdminRegistry registry = AdminRegistry(adminRegistry);
            if (!(!registry.isWalletBlacklistedActive(msg.sender))) revert BiddingSystem__Wallet_blacklisted();
            if (!useRandomEvaluator && !(!registry.isWalletBlacklistedActive(evaluator))) revert BiddingSystem__Evaluator_blacklisted();
        }

        sessionId = ++sessionCounter;

        sessions[sessionId] = Session({
            id: sessionId,
            creator: msg.sender,
            evaluator: evaluator,
            maxBudget: maxBudget,
            deadline: deadline,
            revealWindowEnd: deadline + revealWindow,
            metadata: metadata,
            serviceId: serviceId,
            jobId: 0,
            winner: address(0),
            winningBidId: 0,
            jobCreated: false,
            status: SessionStatus.Active,
            useRandomEvaluator: useRandomEvaluator,
            paymentToken: paymentToken,
            evaluatorFee: evaluatorFee,
            hook: hook
        });

        totalStakesHeld[sessionId] += stakeAmount;

        emit BiddingSessionCreated(
            sessionId,
            msg.sender,
            evaluator,
            maxBudget,
            deadline,
            serviceId
        );
    }
    
    function commitBid(uint256 sessionId, bytes32 commitHash)
        external
        payable
        whenNotPaused
        nonReentrant
    {
        if (!(commitHash != bytes32(0))) revert BiddingSystem__Zero_commitment();

        Session storage session = sessions[sessionId];
        if (!(session.id != 0)) revert BiddingSystem__Invalid_session();
        if (!(session.status == SessionStatus.Active)) revert BiddingSystem__Session_not_active();
        if (!(block.timestamp < session.deadline)) revert BiddingSystem__Bidding_closed();

        // Bad Actor: Check if bidder is blacklisted
        if (adminRegistry != address(0)) {
            AdminRegistry registry = AdminRegistry(adminRegistry);
            if (!(!registry.isWalletBlacklistedActive(msg.sender))) revert BiddingSystem__Wallet_blacklisted();
        }

        // Check if bidder already has a bid
        if (bidderToBidIndex[sessionId][msg.sender] != 0) {
            revert BiddingSystem__Already_committed();
        }

        uint256 stakeAmount = calculateStake(session.maxBudget);
        
        // Phase 40: Collect stake in session's payment token
        _receiveToken(session.paymentToken, msg.sender, stakeAmount);
        
        // Refund excess for ETH payments
        if (session.paymentToken == address(0)) {
            _refundExcess(session.paymentToken, msg.sender, msg.value, stakeAmount);
        }
        
        // Create bid entry
        uint256 bidId = sessionBids[sessionId].length + 1;

        sessionBids[sessionId].push(Bid({
            bidId: bidId,
            bidder: msg.sender,
            proposedAmount: 0,
            stake: stakeAmount,
            message: "",
            commitHash: commitHash,
            revealed: false,
            accepted: false,
            rejected: false,
            stakeWithdrawn: false,
            timestamp: block.timestamp,
            status: BidStatus.Pending  // Phase 45c O-12: explicit state machine
        }));
        
        bidderToBidIndex[sessionId][msg.sender] = bidId;
        validCommits[sessionId][commitHash] = true;
        totalStakesHeld[sessionId] += stakeAmount;
        
        emit BidCommitted(sessionId, msg.sender, commitHash, stakeAmount);
    }
    
    function revealBid(
        uint256 sessionId,
        uint256 amount,
        string calldata message,
        bytes32 salt
    ) external nonReentrant whenNotPaused onlyAfterDeadline(sessionId) {
        Session storage session = sessions[sessionId];
        
        // Check reveal window
        if (block.timestamp >= session.revealWindowEnd) {
            revert BiddingSystem__Reveal_window_closed();
        }
        
        uint256 bidIndex = bidderToBidIndex[sessionId][msg.sender];
        if (!(bidIndex != 0)) revert BiddingSystem__No_bid_found();
        
        Bid storage bid = sessionBids[sessionId][bidIndex - 1];
        if (!(!bid.revealed)) revert BiddingSystem__Already_revealed();
        
        // Verify commitment
        // Phase 45b O-1: Hash binds to (sessionId, msg.sender, amount, message, salt)
        // to prevent cross-bidder hash collisions and cross-session replay attacks.
        // Phase 45c O-8: Hash also binds to PROTOCOL_VERSION to enable future hash
        // format upgrades without breaking commit history. v1 (Phase 45b) and v0
        // (Phase 40) reveals are invalidated by this version bump. Pre-upgrade
        // commits must reveal before the upgrade; post-upgrade commits use the new form.
        bytes32 expectedHash = keccak256(abi.encode(
            PROTOCOL_VERSION, sessionId, msg.sender, amount, message, salt
        ));
        if (!(validCommits[sessionId][expectedHash])) revert BiddingSystem__Invalid_commitment();

        // Verify amount doesn't exceed max budget
        if (!(amount <= session.maxBudget)) revert BiddingSystem__Exceeds_max_budget();

        // Update bid
        bid.proposedAmount = amount;
        bid.message = message;
        bid.revealed = true;
        bid.status = BidStatus.Revealed; // Phase 45c O-12

        emit BidRevealed(sessionId, msg.sender, amount, message);
    }
    
    function acceptBid(uint256 sessionId, uint256 bidId)
        external
        whenNotPaused
        nonReentrant
    {
        Session storage session = sessions[sessionId];

        if (!(session.creator == msg.sender)) revert BiddingSystem__Not_session_creator();
        if (!(session.status == SessionStatus.Active || session.status == SessionStatus.BiddingClosed)) revert BiddingSystem__Wrong_status();
        if (!(session.winner == address(0))) revert BiddingSystem__Winner_already_selected();
        if (!(!session.jobCreated)) revert BiddingSystem__Job_already_created();
        
        if (!(bidId > 0 && bidId <= sessionBids[sessionId].length)) revert BiddingSystem__Invalid_bid();
        
        Bid storage bid = sessionBids[sessionId][bidId - 1];
        if (!(bid.revealed)) revert BiddingSystem__Bid_not_revealed();
        if (!(!bid.accepted)) revert BiddingSystem__Bid_already_accepted();
        
        // Accept this bid
        bid.accepted = true;
        bid.status = BidStatus.Accepted; // Phase 45c O-12
        session.winner = bid.bidder;
        session.winningBidId = bidId;
        session.status = SessionStatus.WinnerSelected;

        // Phase 45c O-9: start the 30-day withdraw clock for all other bidders.
        // Winner has their stake returned synchronously below. After WITHDRAW_TIMEOUT
        // (30 days) any un-withdrawn stakes can be swept to the treasury.
        _startWithdrawClockForNonWinners(sessionId, bidId);
        
        // Return winner's stake
        uint256 stake = bid.stake;
        bid.stake = 0;
        totalStakesHeld[sessionId] -= stake;
        
        // Phase 40: Refund in session's payment token
        _sendToken(session.paymentToken, bid.bidder, stake);
        
        emit BidAccepted(sessionId, bid.bidder, bid.proposedAmount, bidId);
        emit StakeClaimed(sessionId, bid.bidder, stake);
    }
    
    function rejectBid(uint256 sessionId, uint256 bidId, string calldata reason) 
        external 
        nonReentrant 
        onlySessionCreator(sessionId) 
    {
        Session storage session = sessions[sessionId];
        
        if (!(session.status == SessionStatus.Active || session.status == SessionStatus.BiddingClosed)) revert BiddingSystem__Wrong_status();
        if (!(bidId > 0 && bidId <= sessionBids[sessionId].length)) revert BiddingSystem__Invalid_bid();
        
        Bid storage bid = sessionBids[sessionId][bidId - 1];
        if (!(bid.revealed)) revert BiddingSystem__Bid_not_revealed();
        if (!(!bid.accepted)) revert BiddingSystem__Bid_already_accepted();
        if (!(bid.rejected == false)) revert BiddingSystem__Bid_already_accepted();
        
        // Mark as rejected and return stake
        bid.rejected = true;
        bid.status = BidStatus.Rejected; // Phase 45c O-12
        uint256 stake = bid.stake;
        bid.stake = 0;
        totalStakesHeld[sessionId] -= stake;
        
        // Phase 40: Refund in session's payment token
        _sendToken(session.paymentToken, bid.bidder, stake);
        
        emit BidRejected(sessionId, bidId, bid.bidder, reason);
    }
    
    /***********************************/
    /* Stake Management (Pull Pattern) */
    /***********************************/
    
    function withdrawStake(uint256 sessionId) external nonReentrant {
        Session storage session = sessions[sessionId];

        if (!(session.id != 0)) revert BiddingSystem__Invalid_session();
        // Phase 45b O-2: include BiddingClosed so non-revealing bidders can pull
        // their stake once the full reveal window has elapsed and the session is
        // closed. Bidders who never revealed should prefer slashNoShow (which
        // slashes 5%) — withdrawStake returns the full stake if the bid is
        // unrevealed and the reveal window has ended.
        if (!(session.status == SessionStatus.BiddingClosed || session.status == SessionStatus.WinnerSelected || session.status == SessionStatus.Completed || session.status == SessionStatus.Cancelled)) revert BiddingSystem__Session_still_active();
        
        uint256 bidIndex = bidderToBidIndex[sessionId][msg.sender];
        if (!(bidIndex != 0)) revert BiddingSystem__No_bid_found();
        
        Bid storage bid = sessionBids[sessionId][bidIndex - 1];
        
        if (!(bid.stake > 0)) revert BiddingSystem__No_stake_to_withdraw();
        if (!(!bid.stakeWithdrawn)) revert BiddingSystem__Stake_already_withdrawn();
        if (!(bid.accepted == false)) revert BiddingSystem__No_stake_to_withdraw();
        if (!(bid.rejected == false)) revert BiddingSystem__No_stake_to_withdraw();
        
        // Check reveal window closed
        if (session.status == SessionStatus.Active || session.status == SessionStatus.BiddingClosed) {
            if (!(block.timestamp >= session.revealWindowEnd)) revert BiddingSystem__Reveal_window_still_open();
        }
        
        uint256 amount = bid.stake;
        bid.stake = 0;
        bid.stakeWithdrawn = true;
        bid.status = BidStatus.Withdrawn; // Phase 45c O-12
        totalStakesHeld[sessionId] -= amount;

        // Phase 45c O-9: clear any pending sweep timestamp for this bidder.
        // The bidder is withdrawing legitimately so there is nothing to sweep.
        withdrawStakeClaimableAt[sessionId][msg.sender] = 0;

        // Phase 40: Refund in session's payment token
        _sendToken(session.paymentToken, msg.sender, amount);
        
        emit StakeWithdrawn(sessionId, msg.sender, amount);
    }
    
    /**
     * @dev Withdraw the session creator's stake after job creation or cancellation (as fallback/safety mechanism).
     */
    function withdrawCreatorStake(uint256 sessionId) external nonReentrant onlySessionCreator(sessionId) {
        Session storage session = sessions[sessionId];
        if (!(session.id != 0)) revert BiddingSystem__Invalid_session();

        // Creator stake is synchronously refunded in cancelSession/createJobAndFund.
        // Keeping this fallback withdraw path lets terminal sessions drain pooled bidder stakes.
        revert BiddingSystem__Stake_already_withdrawn();
    }

    /// @notice Phase 45c O-9: Permissionlessly sweep un-withdrawn bidder stakes to the
    ///         treasury once WITHDRAW_TIMEOUT has elapsed since the session was settled
    ///         (winner accepted, cancelled, or completed). Idempotent: bidders who have
    ///         already withdrawn are skipped. Returns the number of stakes swept.
    ///         Note: a session with no bidder past the 30-day deadline is a no-op
    ///         (sweptCount = 0) and does NOT revert.
    function sweepUnclaimedStakes(uint256 sessionId) external nonReentrant returns (uint256 sweptCount) {
        Session storage session = sessions[sessionId];
        if (!(session.id != 0)) revert BiddingSystem__Invalid_session();

        Bid[] storage bids = sessionBids[sessionId];
        uint256 len = bids.length;
        for (uint256 i = 0; i < len; i++) {
            Bid storage bid = bids[i];
            if (bid.stake == 0) continue;
            if (bid.stakeWithdrawn) continue;
            uint256 deadline = withdrawStakeClaimableAt[sessionId][bid.bidder];
            if (deadline == 0) continue;
            if (block.timestamp < deadline) revert BiddingSystem__Sweep_too_early();

            uint256 amount = bid.stake;
            bid.stake = 0;
            bid.stakeWithdrawn = true;
            bid.status = BidStatus.Withdrawn; // terminal — but stake went to treasury
            totalStakesHeld[sessionId] -= amount;
            withdrawStakeClaimableAt[sessionId][bid.bidder] = 0;
            _sendToken(session.paymentToken, treasury, amount);
            unchecked { sweptCount++; }
        }
    }

    /// @notice Phase 45b O-3: Slash a bidder who committed but never revealed after the
    ///         full reveal window elapsed. Callable only by the session creator. Slashes
    ///         NO_SHOW_SLASH_BP (5%) of the bidder's stake to the treasury and refunds
    ///         the remainder. The bid is marked rejected + stakeWithdrawn so it cannot be
    ///         accepted or slashed again. Reverts on invalid session, un-ended reveal
    ///         window, missing bid, revealed/accepted/already-settled bid, or zero stake.
    function slashNoShow(uint256 sessionId, address bidder) external nonReentrant onlySessionCreator(sessionId) {
        Session storage session = sessions[sessionId];
        if (!(session.id != 0)) revert BiddingSystem__Invalid_session();
        if (!(block.timestamp >= session.revealWindowEnd)) revert BiddingSystem__Reveal_window_not_ended();
        if (!(bidder != address(0))) revert BiddingSystem__Zero_address();

        uint256 bidIndex = bidderToBidIndex[sessionId][bidder];
        if (!(bidIndex != 0)) revert BiddingSystem__No_bid_found();

        Bid storage bid = sessionBids[sessionId][bidIndex - 1];
        if (bid.revealed) revert BiddingSystem__No_show_not_eligible();
        if (bid.accepted) revert BiddingSystem__Bid_already_accepted();
        if (bid.rejected) revert BiddingSystem__Already_settled();
        if (bid.stakeWithdrawn) revert BiddingSystem__Stake_already_withdrawn();

        uint256 totalStake = bid.stake;
        if (!(totalStake > 0)) revert BiddingSystem__No_stake_to_withdraw();

        uint256 slashAmount = (totalStake * NO_SHOW_SLASH_BP) / FEE_DENOMINATOR;
        uint256 refundAmount = totalStake - slashAmount;

        // Effects (CEI): zero out the bid and reduce tracked stake before external calls
        bid.stake = 0;
        bid.stakeWithdrawn = true;
        bid.rejected = true;
        totalStakesHeld[sessionId] -= totalStake;

        // Interactions: slash goes to treasury, remainder refunded to bidder.
        if (slashAmount > 0) {
            _sendToken(session.paymentToken, treasury, slashAmount);
        }
        if (refundAmount > 0) {
            _sendToken(session.paymentToken, bidder, refundAmount);
        }

        emit BidderSlashed(sessionId, bidder, slashAmount, refundAmount);
    }
    
    /***********************************/
    /* Job Creation & Integration */
    /***********************************/
    
    function createJobAndFund(
        uint256 sessionId,
        uint256 jobExpiredAt,
        string calldata description
    ) external payable nonReentrant onlySessionCreator(sessionId) returns (uint256 jobId) {
        Session storage session = sessions[sessionId];
        
        if (!(session.status == SessionStatus.WinnerSelected)) revert BiddingSystem__No_winner_selected();
        if (!(!session.jobCreated)) revert BiddingSystem__Job_already_created();
        
        if (!(jobExpiredAt > block.timestamp + MIN_JOB_EXPIRY)) revert BiddingSystem__Expiry_too_soon();
        if (!(jobExpiredAt <= block.timestamp + MAX_JOB_EXPIRY)) revert BiddingSystem__Expiry_too_far();
        
        // Get winning bid amount
        uint256 bidAmount = sessionBids[sessionId][session.winningBidId - 1].proposedAmount;
        // Phase 45c O-11: use the per-token fee (or global default) at job-funding time.
        uint256 feeBP = getPlatformFeeBP(session.paymentToken);
        uint256 totalPayment = bidAmount + (bidAmount * feeBP) / FEE_DENOMINATOR;
        
        // Phase 40: Collect payment in session's token
        _receiveToken(session.paymentToken, msg.sender, totalPayment);
        
        // Set guard flags BEFORE external call to prevent reentrancy
        session.jobCreated = true;
        session.status = SessionStatus.JobCreated;
        
        // Create job in AgenticCommerceV9 with budget at creation for the session creator (client)
        // Phase 39: Pass address(0) when useRandomEvaluator is true to trigger random selection
        // Phase 40: Pass session.paymentToken
        // Phase 45b: Only forward `value: bidAmount` for native ETH sessions. ERC-20 sessions
        // pull the payment via _receiveToken above and must not send native value (would revert
        // with OutOfFunds on the downstream call when the BiddingSystem has no ETH balance).
        address jobEvaluator = session.useRandomEvaluator ? address(0) : session.evaluator;
        uint256 ethValue = session.paymentToken == address(0) ? bidAmount : 0;
        jobId = IAgenticCommerceV9(commerce).createJobForClient{value: ethValue}(
            msg.sender,           // client (session creator)
            session.winner,       // provider
            bidAmount,            // budget
            session.paymentToken, // paymentToken (Phase 40: from session)
            session.serviceId,    // serviceId
            jobExpiredAt,         // expiredAt
            description,          // description
            jobEvaluator,         // evaluator (address(0) for random, specific address otherwise)
            address(0),           // hook: none
            false,                // evaluatorFee: no
            false,                // clientReview_: no
            true,                 // fundNow: yes
            bidAmount             // fundAmount
        );
        
        // Store jobId after external call (depends on return value)
        session.jobId = jobId;

        // Pay platform fee (tracked for accounting; actual transfer happens via job creation)
        uint256 fee = (bidAmount * feeBP) / FEE_DENOMINATOR;
        if (fee > 0) {
            // Phase 45b O-10: track per-token fees so withdrawFees(token) can pull
            // the full balance in one call. Native ETH continues to use the
            // totalAccumulatedFees counter for backward compat with withdrawPlatformFees.
            if (session.paymentToken == address(0)) {
                totalAccumulatedFees += fee;
            } else {
                accumulatedFeesByToken[session.paymentToken] += fee;
            }
        }

        // Phase 45b O-13: emit EvaluatorFinalized at the moment the session transitions
        // to JobCreated and the evaluator is locked in. address(0) is valid and means
        // the AgenticCommerce pool will select one at random.
        emit EvaluatorFinalized(sessionId, jobEvaluator, block.timestamp);
        
        // Return winner's stake
        uint256 winStake = sessionBids[sessionId][session.winningBidId - 1].stake;
        if (winStake > 0) {
            sessionBids[sessionId][session.winningBidId - 1].stake = 0;
            totalStakesHeld[sessionId] -= winStake;
            _sendToken(session.paymentToken, session.winner, winStake);
        }

        // Return creator's session stake
        uint256 creatorStake = calculateStake(session.maxBudget);
        if (creatorStake > 0 && totalStakesHeld[sessionId] >= creatorStake) {
            creatorStakeWithdrawn[sessionId] = true;
            totalStakesHeld[sessionId] -= creatorStake;
            _sendToken(session.paymentToken, session.creator, creatorStake);
        }
        
        emit JobCreatedFromSession(sessionId, jobId, session.winner, bidAmount);
    }
    
    /***********************************/
    /* Session Management */
    /***********************************/
    
    function cancelSession(uint256 sessionId) external nonReentrant onlySessionCreator(sessionId) {
        Session storage session = sessions[sessionId];

        if (!(session.id != 0)) revert BiddingSystem__Invalid_session();
        // Phase 45b O-2: allow cancellation while status is BiddingClosed too, as
        // long as no revealed bids and no winner. Lets the creator give up after
        // the deadline arrives but before reveals.
        if (!(session.status == SessionStatus.Active || session.status == SessionStatus.BiddingClosed)) revert BiddingSystem__Cannot_cancel();
        if (!(session.winner == address(0))) revert BiddingSystem__Winner_selected();
        if (!(!session.jobCreated)) revert BiddingSystem__Job_created();

        // Check if any bids are revealed
        bool hasRevealedBids = false;
        for (uint256 i = 0; i < sessionBids[sessionId].length; i++) {
            if (sessionBids[sessionId][i].revealed) {
                hasRevealedBids = true;
                break;
            }
        }
        if (!(!hasRevealedBids)) revert BiddingSystem__Cannot_cancel_bids_revealed();

        // Effects before external call
        session.status = SessionStatus.Cancelled;

        // Return creator's session stake
        uint256 creatorStake = calculateStake(session.maxBudget);
        if (creatorStake > 0 && totalStakesHeld[sessionId] >= creatorStake) {
            creatorStakeWithdrawn[sessionId] = true;
            totalStakesHeld[sessionId] -= creatorStake;
        }
        // Phase 40: Refund in session's payment token
        _sendToken(session.paymentToken, msg.sender, creatorStake);

        // Phase 45c O-9: start the 30-day withdraw clock for every committed bidder.
        // cancelSession has no winner, so all bidders are "non-winners" and the
        // winningBidId parameter is 0 (which never matches any bidId).
        _startWithdrawClockForNonWinners(sessionId, 0);

        emit SessionCancelled(sessionId, msg.sender);
    }

    /// @notice Phase 45b O-2: Permissionlessly close bidding once the deadline has passed.
    ///         Transitions the session from Active to BiddingClosed and emits BiddingClosed.
    ///         Reverts if the session is not Active, the deadline has not passed, or the
    ///         session id is invalid. Anyone (including the creator) can call.
    function closeBidding(uint256 sessionId) external nonReentrant {
        Session storage session = sessions[sessionId];
        if (!(session.id != 0)) revert BiddingSystem__Invalid_session();
        if (session.status != SessionStatus.Active) revert BiddingSystem__Wrong_session_status();
        if (!(block.timestamp >= session.deadline)) revert BiddingSystem__Deadline_not_passed();

        session.status = SessionStatus.BiddingClosed;
        emit BiddingClosed(sessionId, msg.sender, block.timestamp);
    }
    
    function completeSession(uint256 sessionId) external nonReentrant {
        Session storage session = sessions[sessionId];

        if (!(session.id != 0)) revert BiddingSystem__Invalid_session();
        if (!(session.status == SessionStatus.JobCreated)) revert BiddingSystem__Wrong_status();

        session.status = SessionStatus.Completed;

        // Phase 45c O-9: start the 30-day withdraw clock for any bidder that
        // did not win (the winner's stake was already refunded in createJobAndFund).
        _startWithdrawClockForNonWinners(sessionId, session.winningBidId);

        emit SessionCompleted(sessionId);
    }
    
    function extendRevealWindow(uint256 sessionId, uint256 additionalSeconds) 
        external 
        onlySessionCreator(sessionId) 
    {
        Session storage session = sessions[sessionId];
        
        if (!(session.id != 0)) revert BiddingSystem__Invalid_session();
        if (!(block.timestamp >= session.deadline)) revert BiddingSystem__Deadline_not_passed();
        if (!(block.timestamp < session.revealWindowEnd)) revert BiddingSystem__Reveal_window_already_closed();
        if (!(additionalSeconds <= MAX_REVEAL_EXTENSION)) revert BiddingSystem__Extension_too_long();
        
        session.revealWindowEnd += additionalSeconds;
        
        emit RevealWindowExtended(sessionId, session.revealWindowEnd);
    }
    
    /***********************************/
    /* View Functions */
    /***********************************/
    
    function getSession(uint256 sessionId) external view returns (Session memory) {
        return sessions[sessionId];
    }
    
    function getBid(uint256 sessionId, uint256 bidId) external view returns (Bid memory) {
        if (!(bidId > 0 && bidId <= sessionBids[sessionId].length)) revert BiddingSystem__Invalid_bid();
        return sessionBids[sessionId][bidId - 1];
    }
    
    function getUserBid(uint256 sessionId, address user) external view returns (Bid memory) {
        uint256 bidIndex = bidderToBidIndex[sessionId][user];
        if (bidIndex == 0) {
            return Bid({
                bidId: 0,
                bidder: address(0),
                proposedAmount: 0,
                stake: 0,
                message: "",
                commitHash: bytes32(0),
                revealed: false,
                accepted: false,
                rejected: false,
                stakeWithdrawn: false,
                timestamp: 0,
                status: BidStatus.None
            });
        }
        return sessionBids[sessionId][bidIndex - 1];
    }

    /// @notice Phase 45c O-12: explicit BidStatus lookup. Returns BidStatus.None for
    ///         unknown bidders. Avoids the offchain dance of joining the
    ///         (revealed, accepted, rejected, stakeWithdrawn) booleans.
    function getBidStatus(uint256 sessionId, address bidder) external view returns (BidStatus) {
        uint256 bidIndex = bidderToBidIndex[sessionId][bidder];
        if (bidIndex == 0) return BidStatus.None;
        return sessionBids[sessionId][bidIndex - 1].status;
    }
    
    function getRevealedBids(uint256 sessionId) external view returns (Bid[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < sessionBids[sessionId].length; i++) {
            if (sessionBids[sessionId][i].revealed) {
                count++;
            }
        }
        
        Bid[] memory revealed = new Bid[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < sessionBids[sessionId].length; i++) {
            if (sessionBids[sessionId][i].revealed) {
                revealed[index] = sessionBids[sessionId][i];
                index++;
            }
        }
        
        return revealed;
    }
    
    function getSessionCount() external view returns (uint256) {
        return sessionCounter;
    }
    
    function calculateStake(uint256 maxBudget) public view returns (uint256) {
        return (maxBudget * MIN_STAKE_BP) / FEE_DENOMINATOR;
    }
    
    /***********************************/
    /* Admin Functions */
    /***********************************/
    
    function setCommerce(address commerce_) external onlyOwner {
        if (!(commerce_ != address(0))) revert BiddingSystem__Zero_commerce();
        emit CommerceUpdated(commerce, commerce_);
        commerce = commerce_;
    }
    
    function setTreasury(address treasury_) external onlyOwner {
        if (!(treasury_ != address(0))) revert BiddingSystem__Zero_treasury();
        emit TreasuryUpdated(treasury, treasury_);
        treasury = treasury_;
    }

    function setAdminRegistry(address _adminRegistry) external onlyOwner {
        if (!(_adminRegistry != address(0))) revert BiddingSystem__Zero_address();
        uint256 size;
        assembly { size := extcodesize(_adminRegistry) }
        if (size == 0) revert BiddingSystem__Zero_address();
        emit AdminRegistryUpdated(adminRegistry, _adminRegistry);
        adminRegistry = _adminRegistry;
    }
    
    function setRevealWindow(uint256 window_) external onlyOwner {
        if (!(window_ >= 15 minutes && window_ <= 24 hours)) revert BiddingSystem__Invalid_window();
        emit RevealWindowUpdated(revealWindow, window_);
        revealWindow = window_;
    }
    
    function setPlatformFeeBP(uint256 basisPoints_) external onlyOwner {
        if (!(basisPoints_ <= 1000)) revert BiddingSystem__Max_10_fee(); // Max 10%
        emit PlatformFeeUpdated(platformFeeBP, basisPoints_);
        platformFeeBP = basisPoints_;
    }

    /// @notice Phase 45c O-11: per-token platform fee override. Use address(0) to
    ///         update the global default (equivalent to setPlatformFeeBP).
    function setPlatformFeeBPForToken(address token, uint256 basisPoints_) external onlyOwner {
        if (!(basisPoints_ <= 1000)) revert BiddingSystem__Max_10_fee(); // Max 10%
        if (token == address(0)) {
            // Update the global default so that getPlatformFeeBP(address(0)) returns it.
            emit PlatformFeeUpdated(platformFeeBP, basisPoints_);
            platformFeeBP = basisPoints_;
        } else {
            platformFeeBPByToken[token] = basisPoints_;
        }
    }

    /// @notice Phase 45c O-11: per-token platform-fee resolver. Returns the
    ///         explicit override for `token` if set, otherwise the global default.
    function getPlatformFeeBP(address token) public view returns (uint256) {
        if (token != address(0)) {
            uint256 override_ = platformFeeBPByToken[token];
            if (override_ != 0) return override_;
        }
        return platformFeeBP;
    }

    /// @notice Phase 45c O-4: update the lower bound for `calculateStake(maxBudget)`.
    function setMinStake(uint256 newMin) external onlyOwner {
        if (!(newMin <= maxStake)) revert BiddingSystem__Invalid_stake_bounds();
        minStake = newMin;
    }

    /// @notice Phase 45c O-4: update the upper bound for `calculateStake(maxBudget)`.
    function setMaxStake(uint256 newMax) external onlyOwner {
        if (!(minStake <= newMax)) revert BiddingSystem__Invalid_stake_bounds();
        maxStake = newMax;
    }

    /// @notice Phase 45c O-4: atomically set both bounds. Useful for ERC-20 tokens
    ///         where the owner wants to set a single (min, max) pair in raw token units.
    function setStakeBounds(uint256 newMin, uint256 newMax) external onlyOwner {
        if (!(newMin <= newMax)) revert BiddingSystem__Invalid_stake_bounds();
        minStake = newMin;
        maxStake = newMax;
    }
    
    function withdrawPlatformFees(address payable to, uint256 amount) external onlyOwner {
        if (!(to != address(0))) revert BiddingSystem__Zero_address();
        if (!(amount <= totalAccumulatedFees)) revert BiddingSystem__Insufficient_balance();
        totalAccumulatedFees -= amount;
        _sendEth(to, amount);
    }

    /// @notice Phase 45b O-10: Withdraw the full accumulated platform-fee balance for
    ///         a given token to the treasury. Use address(0) for native ETH.
    ///         For ERC-20 tokens the entire `accumulatedFeesByToken[token]` balance is
    ///         transferred; for ETH the `totalAccumulatedFees` counter is decremented and
    ///         the equivalent wei balance is sent.
    function withdrawFees(address token) external onlyOwner nonReentrant {
        if (token == address(0)) {
            uint256 amount = totalAccumulatedFees;
            if (!(amount > 0)) revert BiddingSystem__No_fees_to_withdraw();
            totalAccumulatedFees = 0;
            _sendEth(treasury, amount);
            emit FeesWithdrawn(address(0), treasury, amount);
        } else {
            uint256 amount = accumulatedFeesByToken[token];
            if (!(amount > 0)) revert BiddingSystem__No_fees_to_withdraw();
            accumulatedFeesByToken[token] = 0;
            IERC20(token).safeTransfer(treasury, amount);
            emit FeesWithdrawn(token, treasury, amount);
        }
    }
    
    /***********************************/
    /* Receive / Fallback */
    /***********************************/
    
    receive() external payable {}

    /***********************************/
    /* Internal Helpers */
    /***********************************/
    
    function _sendEth(address to, uint256 amount) internal {
        if (amount == 0) return;
        (bool success, ) = payable(to).call{value: amount}("");
        if (!success) revert BiddingSystem__ETH_transfer_failed();
    }

    function _sendToken(address token, address to, uint256 amount) internal {
        if (amount == 0) return;
        if (token == address(0)) {
            _sendEth(to, amount);
        } else {
            IERC20(token).safeTransfer(to, amount);
        }
    }

    /// @dev Phase 45c O-9: write a `block.timestamp + WITHDRAW_TIMEOUT` deadline
    ///      for every non-winning bid that still has a stake. Idempotent — only
    ///      sets the timestamp if it is currently 0 (never rewinds).
    function _startWithdrawClockForNonWinners(uint256 sessionId, uint256 winningBidId) private {
        Bid[] storage bids = sessionBids[sessionId];
        uint256 len = bids.length;
        uint256 deadline = block.timestamp + WITHDRAW_TIMEOUT;
        for (uint256 i = 0; i < len; i++) {
            Bid storage b = bids[i];
            if (b.bidId == winningBidId) continue;
            if (b.stake == 0) continue;
            if (withdrawStakeClaimableAt[sessionId][b.bidder] != 0) continue;
            withdrawStakeClaimableAt[sessionId][b.bidder] = deadline;
        }
    }

    function _receiveToken(address token, address from, uint256 amount) internal {
        if (amount == 0) return;
        if (token == address(0)) {
            if (msg.value < amount) revert BiddingSystem__Insufficient_stake();
        } else {
            IERC20(token).safeTransferFrom(from, address(this), amount);
        }
    }

    function _refundExcess(address token, address from, uint256 received, uint256 required) internal {
        uint256 excess = received - required;
        if (excess > 0) {
            _sendToken(token, from, excess);
        }
    }
}
