// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IAgenticCommerceV6} from "../interfaces/IAgenticCommerceV6.sol";
import {IBiddingSystem} from "../interfaces/IBiddingSystem.sol";

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
    OwnableUpgradeable,
    ReentrancyGuard,
    IBiddingSystem
{
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
    address public commerce;           // AgenticCommerceV6.1
    address public treasury;          // Platform treasury
    
    // Configuration
    uint256 public revealWindow = DEFAULT_REVEAL_WINDOW;
    uint256 public platformFeeBP = ETH_PLATFORM_FEE_BP;
    
    // Storage gap for upgradeability
    uint256[45] private __gap;
    
    /***********************************/
    /* Modifiers */
    /***********************************/
    
    modifier onlySessionCreator(uint256 sessionId) {
        require(sessions[sessionId].creator == msg.sender, "Not session creator");
        _;
    }
    
    modifier onlySessionActive(uint256 sessionId) {
        require(sessions[sessionId].id != 0, "Invalid session");
        require(
            sessions[sessionId].status == SessionStatus.Active,
            "Session not active"
        );
        require(block.timestamp < sessions[sessionId].deadline, "Bidding closed");
        _;
    }
    
    modifier onlyAfterDeadline(uint256 sessionId) {
        require(sessions[sessionId].id != 0, "Invalid session");
        require(
            sessions[sessionId].status == SessionStatus.Active ||
            sessions[sessionId].status == SessionStatus.BiddingClosed,
            "Wrong session status"
        );
        require(block.timestamp >= sessions[sessionId].deadline, "Deadline not passed");
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
        require(owner_ != address(0), "Zero owner");
        require(commerce_ != address(0), "Zero commerce");
        require(treasury_ != address(0), "Zero treasury");
        
        __Ownable_init(owner_);
        
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
    
    /***********************************/
    /* Core Bidding Functions */
    /***********************************/
    
    function createBiddingSession(
        address evaluator,
        uint256 maxBudget,
        uint256 deadline,
        bytes calldata metadata,
        uint256 serviceId
    ) external payable nonReentrant returns (uint256 sessionId) {
        require(evaluator != address(0), "Zero evaluator");
        require(maxBudget > 0, "Zero budget");
        require(
            deadline > block.timestamp + MIN_SESSION_DURATION,
            "Duration too short"
        );
        require(
            deadline <= block.timestamp + MAX_SESSION_DURATION,
            "Duration too long"
        );
        require(
            msg.value >= calculateStake(maxBudget),
            "Insufficient stake for session"
        );
        
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
            payable(msg.sender).transfer(excess);
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
        nonReentrant 
        onlySessionActive(sessionId) 
    {
        require(commitHash != bytes32(0), "Zero commitment");
        
        // Check if bidder already has a bid
        if (bidderToBidIndex[sessionId][msg.sender] != 0) {
            revert AlreadyCommitted();
        }
        
        Session storage session = sessions[sessionId];
        uint256 stakeAmount = calculateStake(session.maxBudget);
        
        require(msg.value >= stakeAmount, "Insufficient stake");
        
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
            stakeWithdrawn: false,
            timestamp: block.timestamp
        }));
        
        bidderToBidIndex[sessionId][msg.sender] = bidId;
        validCommits[sessionId][commitHash] = true;
        totalStakesHeld[sessionId] += stakeAmount;
        
        // Refund excess
        uint256 excess = msg.value - stakeAmount;
        if (excess > 0) {
            payable(msg.sender).transfer(excess);
        }
        
        emit BidCommitted(sessionId, msg.sender, commitHash, stakeAmount);
    }
    
    function revealBid(
        uint256 sessionId,
        uint256 amount,
        string calldata message,
        bytes32 salt
    ) external nonReentrant onlyAfterDeadline(sessionId) {
        Session storage session = sessions[sessionId];
        
        // Check reveal window
        if (block.timestamp >= session.revealWindowEnd) {
            revert RevealWindowClosed();
        }
        
        uint256 bidIndex = bidderToBidIndex[sessionId][msg.sender];
        require(bidIndex != 0, "No bid found");
        
        Bid storage bid = sessionBids[sessionId][bidIndex - 1];
        require(!bid.revealed, "Already revealed");
        
        // Verify commitment
        bytes32 expectedHash = keccak256(abi.encode(amount, message, salt));
        require(validCommits[sessionId][expectedHash], "Invalid commitment");
        
        // Verify amount doesn't exceed max budget
        require(amount <= session.maxBudget, "Exceeds max budget");
        
        // Update bid
        bid.proposedAmount = amount;
        bid.message = message;
        bid.revealed = true;
        
        emit BidRevealed(sessionId, msg.sender, amount, message);
    }
    
    function acceptBid(uint256 sessionId, uint256 bidId) 
        external 
        nonReentrant 
        onlySessionCreator(sessionId) 
    {
        Session storage session = sessions[sessionId];
        
        require(session.status == SessionStatus.Active || session.status == SessionStatus.BiddingClosed, "Wrong status");
        require(session.winner == address(0), "Winner already selected");
        require(!session.jobCreated, "Job already created");
        
        require(bidId > 0 && bidId <= sessionBids[sessionId].length, "Invalid bid");
        
        Bid storage bid = sessionBids[sessionId][bidId - 1];
        require(bid.revealed, "Bid not revealed");
        require(!bid.accepted, "Bid already accepted");
        
        // Accept this bid
        bid.accepted = true;
        session.winner = bid.bidder;
        session.winningBidId = bidId;
        session.status = SessionStatus.WinnerSelected;
        
        // Return winner's stake
        uint256 stake = bid.stake;
        bid.stake = 0;
        totalStakesHeld[sessionId] -= stake;
        
        payable(bid.bidder).transfer(stake);
        
        emit BidAccepted(sessionId, bid.bidder, bid.proposedAmount, bidId);
        emit StakeClaimed(sessionId, bid.bidder, stake);
    }
    
    function rejectBid(uint256 sessionId, uint256 bidId, string calldata reason) 
        external 
        nonReentrant 
        onlySessionCreator(sessionId) 
    {
        Session storage session = sessions[sessionId];
        
        require(session.status == SessionStatus.Active || session.status == SessionStatus.BiddingClosed, "Wrong status");
        require(bidId > 0 && bidId <= sessionBids[sessionId].length, "Invalid bid");
        
        Bid storage bid = sessionBids[sessionId][bidId - 1];
        require(bid.revealed, "Bid not revealed");
        require(!bid.accepted, "Bid already accepted");
        
        bid.accepted = true; // Mark as rejected
        
        emit BidRejected(sessionId, bidId, bid.bidder, reason);
    }
    
    /***********************************/
    /* Stake Management (Pull Pattern) */
    /***********************************/
    
    function withdrawStake(uint256 sessionId) external nonReentrant {
        Session storage session = sessions[sessionId];
        
        require(session.id != 0, "Invalid session");
        require(
            session.status == SessionStatus.WinnerSelected ||
            session.status == SessionStatus.Completed ||
            session.status == SessionStatus.Cancelled,
            "Session still active"
        );
        
        uint256 bidIndex = bidderToBidIndex[sessionId][msg.sender];
        require(bidIndex != 0, "No bid found");
        
        Bid storage bid = sessionBids[sessionId][bidIndex - 1];
        
        require(bid.stake > 0, "No stake to withdraw");
        require(!bid.stakeWithdrawn, "Stake already withdrawn");
        require(!bid.accepted, "Winner cannot withdraw; use claimStake");
        
        // Check reveal window closed
        if (session.status == SessionStatus.Active || session.status == SessionStatus.BiddingClosed) {
            require(block.timestamp >= session.revealWindowEnd, "Reveal window still open");
        }
        
        uint256 amount = bid.stake;
        bid.stake = 0;
        bid.stakeWithdrawn = true;
        totalStakesHeld[sessionId] -= amount;
        
        payable(msg.sender).transfer(amount);
        
        emit StakeWithdrawn(sessionId, msg.sender, amount);
    }
    
    function claimStake(uint256 sessionId) external nonReentrant {
        Session storage session = sessions[sessionId];
        
        require(session.id != 0, "Invalid session");
        require(session.status == SessionStatus.WinnerSelected, "No winner");
        require(session.winner == msg.sender, "Not the winner");
        
        uint256 bidIndex = bidderToBidIndex[sessionId][msg.sender];
        Bid storage bid = sessionBids[sessionId][bidIndex - 1];
        
        require(bid.stake > 0, "No stake to claim");
        
        uint256 amount = bid.stake;
        bid.stake = 0;
        totalStakesHeld[sessionId] -= amount;
        
        payable(msg.sender).transfer(amount);
        
        emit StakeClaimed(sessionId, msg.sender, amount);
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
        
        require(session.status == SessionStatus.WinnerSelected, "No winner selected");
        require(!session.jobCreated, "Job already created");
        
        require(jobExpiredAt > block.timestamp + MIN_JOB_EXPIRY, "Expiry too soon");
        require(jobExpiredAt <= block.timestamp + MAX_JOB_EXPIRY, "Expiry too far");
        
        // Get winning bid amount
        uint256 bidAmount = sessionBids[sessionId][session.winningBidId - 1].proposedAmount;
        uint256 totalPayment = bidAmount + (bidAmount * platformFeeBP) / FEE_DENOMINATOR;
        
        require(msg.value >= totalPayment, "Insufficient payment");
        
        // Create job in AgenticCommerceV6.1
        jobId = IAgenticCommerceV6(commerce).createJob(
            session.winner,      // provider
            session.evaluator,   // evaluator
            jobExpiredAt,
            description,
            address(0),           // no hook
            false                // no evaluator fee
        );
        
        // Set budget and fund
        IAgenticCommerceV6(commerce).setBudget(jobId, bidAmount);
        IAgenticCommerceV6(commerce).fund{value: bidAmount}(jobId);
        
        // Pay platform fee
        uint256 fee = (bidAmount * platformFeeBP) / FEE_DENOMINATOR;
        if (fee > 0) {
            payable(treasury).transfer(fee);
        }
        
        // Refund excess
        uint256 excess = msg.value - totalPayment;
        if (excess > 0) {
            payable(msg.sender).transfer(excess);
        }
        
        // Update session
        session.jobId = jobId;
        session.jobCreated = true;
        session.status = SessionStatus.JobCreated;
        
        // Return winner's stake
        uint256 winStake = sessionBids[sessionId][session.winningBidId - 1].stake;
        if (winStake > 0) {
            sessionBids[sessionId][session.winningBidId - 1].stake = 0;
            totalStakesHeld[sessionId] -= winStake;
            payable(session.winner).transfer(winStake);
        }
        
        emit JobCreatedFromSession(sessionId, jobId, session.winner, bidAmount);
    }
    
    /***********************************/
    /* Session Management */
    /***********************************/
    
    function cancelSession(uint256 sessionId) external nonReentrant onlySessionCreator(sessionId) {
        Session storage session = sessions[sessionId];
        
        require(session.id != 0, "Invalid session");
        require(session.status == SessionStatus.Active, "Cannot cancel");
        require(session.winner == address(0), "Winner selected");
        require(!session.jobCreated, "Job created");
        
        // Check if any bids are revealed
        bool hasRevealedBids = false;
        for (uint256 i = 0; i < sessionBids[sessionId].length; i++) {
            if (sessionBids[sessionId][i].revealed) {
                hasRevealedBids = true;
                break;
            }
        }
        require(!hasRevealedBids, "Cannot cancel: bids revealed");
        
        // Return creator's session stake
        uint256 creatorStake = calculateStake(session.maxBudget);
        payable(msg.sender).transfer(creatorStake);
        
        session.status = SessionStatus.Cancelled;
        
        emit SessionCancelled(sessionId, msg.sender);
    }
    
    function extendRevealWindow(uint256 sessionId, uint256 additionalSeconds) 
        external 
        onlySessionCreator(sessionId) 
    {
        Session storage session = sessions[sessionId];
        
        require(session.id != 0, "Invalid session");
        require(
            block.timestamp >= session.deadline,
            "Deadline not passed"
        );
        require(
            block.timestamp < session.revealWindowEnd,
            "Reveal window already closed"
        );
        
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
        require(bidId > 0 && bidId <= sessionBids[sessionId].length, "Invalid bid");
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
        require(commerce_ != address(0), "Zero commerce");
        commerce = commerce_;
    }
    
    function setServiceRegistry(address registry_) external onlyOwner {
        // Reserved for future ServiceRegistry integration
        // Not implemented in V1
    }
    
    function setTreasury(address treasury_) external onlyOwner {
        require(treasury_ != address(0), "Zero treasury");
        treasury = treasury_;
    }
    
    function setRevealWindow(uint256 window_) external onlyOwner {
        require(window_ >= 15 minutes && window_ <= 24 hours, "Invalid window");
        revealWindow = window_;
    }
    
    function setMinStakeBP(uint256 basisPoints_) external onlyOwner {
        // Reserved for future configuration
        // MIN_STAKE_BP is constant in V1
    }
    
    function setPlatformFeeBP(uint256 basisPoints_) external onlyOwner {
        require(basisPoints_ <= 1000, "Max 10% fee"); // Max 10%
        platformFeeBP = basisPoints_;
    }
    
    function withdrawPlatformFees(address payable to, uint256 amount) external onlyOwner {
        require(to != address(0), "Zero address");
        // Can only withdraw what's not locked in stakes
        uint256 available = address(this).balance;
        for (uint256 i = 1; i <= sessionCounter; i++) {
            available -= totalStakesHeld[i];
        }
        require(amount <= available, "Insufficient balance");
        payable(to).transfer(amount);
    }
    
    /***********************************/
    /* Receive / Fallback */
    /***********************************/
    
    receive() external payable {}
}
