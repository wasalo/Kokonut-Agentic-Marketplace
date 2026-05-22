// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
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
    /***********************************/
    /* Constants */
    /***********************************/
    
    uint256 public constant MIN_STAKE_BP = 100;      // 1% in basis points
    uint256 public constant FEE_DENOMINATOR = 10000;
    uint256 public constant DEFAULT_REVEAL_WINDOW = 1 hours;
    uint256 public constant MIN_SESSION_DURATION = 5 minutes;
    uint256 public constant MAX_SESSION_DURATION = 30 days;
    uint256 public constant MIN_JOB_EXPIRY = 5 minutes;
    uint256 public constant MAX_JOB_EXPIRY = 365 days;
    uint256 public constant ETH_PLATFORM_FEE_BP = 100; // 1% platform fee
    uint256 public constant MAX_REVEAL_EXTENSION = 7 days;
    
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
    
    // Storage gap for upgradeability
    uint256[49] private __gap;
    
    // Running total of accrued platform fees (D-01 fix — replaces O(n) loop)
    uint256 public totalAccumulatedFees;
    
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
        uint256 serviceId
    ) external payable nonReentrant whenNotPaused returns (uint256 sessionId) {
        if (!(evaluator != address(0))) revert BiddingSystem__Zero_evaluator();
        if (!(maxBudget > 0)) revert BiddingSystem__Zero_budget();
        if (!(deadline > block.timestamp + MIN_SESSION_DURATION)) revert BiddingSystem__Duration_too_short();
        if (!(deadline <= block.timestamp + MAX_SESSION_DURATION)) revert BiddingSystem__Duration_too_long();
        if (!(msg.value >= calculateStake(maxBudget))) revert BiddingSystem__Insufficient_stake_for_session();

        // Bad Actor: Check if wallets are blacklisted
        if (adminRegistry != address(0)) {
            AdminRegistry registry = AdminRegistry(adminRegistry);
            if (!(!registry.isWalletBlacklistedActive(msg.sender))) revert BiddingSystem__Wallet_blacklisted();
            if (!(!registry.isWalletBlacklistedActive(evaluator))) revert BiddingSystem__Evaluator_blacklisted();
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
            status: SessionStatus.Active
        });
        
        uint256 stakeAmount = calculateStake(maxBudget);
        totalStakesHeld[sessionId] += stakeAmount;
        
        // Refund excess ETH
        uint256 excess = msg.value - stakeAmount;
        if (excess > 0) {
            _sendEth(msg.sender, excess);
        }
        
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
        
        if (!(msg.value >= stakeAmount)) revert BiddingSystem__Insufficient_stake();
        
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
            timestamp: block.timestamp
        }));
        
        bidderToBidIndex[sessionId][msg.sender] = bidId;
        validCommits[sessionId][commitHash] = true;
        totalStakesHeld[sessionId] += stakeAmount;
        
        // Refund excess
        uint256 excess = msg.value - stakeAmount;
        if (excess > 0) {
            _sendEth(msg.sender, excess);
        }
        
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
        bytes32 expectedHash = keccak256(abi.encode(amount, message, salt));
        if (!(validCommits[sessionId][expectedHash])) revert BiddingSystem__Invalid_commitment();
        
        // Verify amount doesn't exceed max budget
        if (!(amount <= session.maxBudget)) revert BiddingSystem__Exceeds_max_budget();
        
        // Update bid
        bid.proposedAmount = amount;
        bid.message = message;
        bid.revealed = true;
        
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
        session.winner = bid.bidder;
        session.winningBidId = bidId;
        session.status = SessionStatus.WinnerSelected;
        
        // Return winner's stake
        uint256 stake = bid.stake;
        bid.stake = 0;
        totalStakesHeld[sessionId] -= stake;
        
        _sendEth(bid.bidder, stake);
        
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
        uint256 stake = bid.stake;
        bid.stake = 0;
        totalStakesHeld[sessionId] -= stake;
        
        _sendEth(bid.bidder, stake);
        
        emit BidRejected(sessionId, bidId, bid.bidder, reason);
    }
    
    /***********************************/
    /* Stake Management (Pull Pattern) */
    /***********************************/
    
    function withdrawStake(uint256 sessionId) external nonReentrant {
        Session storage session = sessions[sessionId];
        
        if (!(session.id != 0)) revert BiddingSystem__Invalid_session();
        if (!(session.status == SessionStatus.WinnerSelected || session.status == SessionStatus.Completed || session.status == SessionStatus.Cancelled)) revert BiddingSystem__Session_still_active();
        
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
        totalStakesHeld[sessionId] -= amount;
        
        _sendEth(msg.sender, amount);
        
        emit StakeWithdrawn(sessionId, msg.sender, amount);
    }
    
    /**
     * @dev Withdraw the session creator's stake after job creation or cancellation (as fallback/safety mechanism).
     */
    function withdrawCreatorStake(uint256 sessionId) external nonReentrant onlySessionCreator(sessionId) {
        Session storage session = sessions[sessionId];
        if (!(session.id != 0)) revert BiddingSystem__Invalid_session();
        
        // Allowed if job is created or session is cancelled
        if (!(session.status == SessionStatus.JobCreated || session.status == SessionStatus.Completed || session.status == SessionStatus.Cancelled)) {
            revert BiddingSystem__Wrong_status();
        }
        
        uint256 creatorStake = calculateStake(session.maxBudget);
        if (!(totalStakesHeld[sessionId] >= creatorStake)) revert BiddingSystem__No_stake_to_withdraw();
        
        totalStakesHeld[sessionId] -= creatorStake;
        _sendEth(session.creator, creatorStake);
        
        emit StakeWithdrawn(sessionId, session.creator, creatorStake);
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
        uint256 totalPayment = bidAmount + (bidAmount * platformFeeBP) / FEE_DENOMINATOR;
        
        if (!(msg.value >= totalPayment)) revert BiddingSystem__Insufficient_payment();
        
        // Create job in AgenticCommerceV9 with budget at creation for the session creator (client)
        jobId = IAgenticCommerceV9(commerce).createJobForClient{value: bidAmount}(
            msg.sender,           // client (session creator)
            session.winner,       // provider
            bidAmount,            // budget
            address(0),           // paymentToken: ETH
            session.serviceId,    // serviceId
            jobExpiredAt,         // expiredAt
            description,          // description
            session.evaluator,    // evaluator
            address(0),           // hook: none
            false,                // evaluatorFee: no
            false,                // clientReview_: no
            true,                 // fundNow: yes
            bidAmount             // fundAmount
        );
        
        // Update session state before external calls
        session.jobId = jobId;
        session.jobCreated = true;
        session.status = SessionStatus.JobCreated;
        
        // Pay platform fee
        uint256 fee = (bidAmount * platformFeeBP) / FEE_DENOMINATOR;
        if (fee > 0) {
            totalAccumulatedFees += fee;
        }
        
        // Refund excess
        uint256 excess = msg.value - totalPayment;
        if (excess > 0) {
            _sendEth(msg.sender, excess);
        }
        
        // Return winner's stake
        uint256 winStake = sessionBids[sessionId][session.winningBidId - 1].stake;
        if (winStake > 0) {
            sessionBids[sessionId][session.winningBidId - 1].stake = 0;
            totalStakesHeld[sessionId] -= winStake;
            _sendEth(session.winner, winStake);
        }

        // Return creator's session stake
        uint256 creatorStake = calculateStake(session.maxBudget);
        if (creatorStake > 0 && totalStakesHeld[sessionId] >= creatorStake) {
            totalStakesHeld[sessionId] -= creatorStake;
            _sendEth(session.creator, creatorStake);
        }
        
        emit JobCreatedFromSession(sessionId, jobId, session.winner, bidAmount);
    }
    
    /***********************************/
    /* Session Management */
    /***********************************/
    
    function cancelSession(uint256 sessionId) external nonReentrant onlySessionCreator(sessionId) {
        Session storage session = sessions[sessionId];
        
        if (!(session.id != 0)) revert BiddingSystem__Invalid_session();
        if (!(session.status == SessionStatus.Active)) revert BiddingSystem__Cannot_cancel();
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
            totalStakesHeld[sessionId] -= creatorStake;
        }
        _sendEth(msg.sender, creatorStake);
        
        emit SessionCancelled(sessionId, msg.sender);
    }
    
    function completeSession(uint256 sessionId) external nonReentrant {
        Session storage session = sessions[sessionId];
        
        if (!(session.id != 0)) revert BiddingSystem__Invalid_session();
        if (!(session.status == SessionStatus.JobCreated)) revert BiddingSystem__Wrong_status();
        
        session.status = SessionStatus.Completed;
        
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
                timestamp: 0
            });
        }
        return sessionBids[sessionId][bidIndex - 1];
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
    
    function withdrawPlatformFees(address payable to, uint256 amount) external onlyOwner {
        if (!(to != address(0))) revert BiddingSystem__Zero_address();
        if (!(amount <= totalAccumulatedFees)) revert BiddingSystem__Insufficient_balance();
        totalAccumulatedFees -= amount;
        _sendEth(to, amount);
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
}
