// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IBiddingSystem
 * @dev Interface for the standalone Bidding System contract
 * 
 * This contract handles the complete bidding lifecycle:
 * - Commit-reveal bidding with stakes
 * - Winner selection by job creator
 * - Integration with AgenticCommerceV9 for job creation and escrow
 * - Pull pattern for stake management
 */
interface IBiddingSystem {
    /***********************************/
    /* Enums */
    /***********************************/
    
    enum SessionStatus {
        Active,        // Bidding is open
        BiddingClosed, // Deadline passed, reveal window open
        WinnerSelected,// Bid accepted, job can be created
        JobCreated,    // Job created in AgenticCommerce
        Completed,     // Session fully resolved
        Cancelled     // Session cancelled by creator
    }
    
    /***********************************/
    /* Structs */
    /***********************************/
    
    struct Session {
        uint256 id;
        address creator;
        address evaluator;
        uint256 maxBudget;
        uint256 deadline;
        uint256 revealWindowEnd;
        bytes metadata;      // IPFS/hash for job details
        uint256 serviceId;  // Optional linked service
        uint256 jobId;      // Linked job in AgenticCommerce
        address winner;
        uint256 winningBidId;
        bool jobCreated;     // Whether job has been created
        SessionStatus status;
        bool useRandomEvaluator; // Phase 39: Use random evaluator pool for job creation
        address paymentToken; // Phase 40: ERC-20 payment token (address(0) = ETH)
    }
    
    struct Bid {
        uint256 bidId;
        address bidder;
        uint256 proposedAmount;
        uint256 stake;
        string message;
        bytes32 commitHash;
        bool revealed;
        bool accepted;
        bool rejected;
        bool stakeWithdrawn;
        uint256 timestamp;
    }
    
    /***********************************/
    /* Events */
    /***********************************/
    
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
    
    event BidRevealed(
        uint256 indexed sessionId,
        address indexed bidder,
        uint256 proposedAmount,
        string message
    );
    
    event BidAccepted(
        uint256 indexed sessionId,
        address indexed winner,
        uint256 amount,
        uint256 bidId
    );
    
    event BidRejected(
        uint256 indexed sessionId,
        uint256 indexed bidId,
        address indexed bidder,
        string reason
    );
    
    event StakeWithdrawn(
        uint256 indexed sessionId,
        address indexed bidder,
        uint256 amount
    );
    
    event StakeClaimed(
        uint256 indexed sessionId,
        address indexed winner,
        uint256 amount
    );
    
    event JobCreatedFromSession(
        uint256 indexed sessionId,
        uint256 indexed jobId,
        address indexed winner,
        uint256 amount
    );
    
    event SessionCancelled(
        uint256 indexed sessionId,
        address indexed canceller
    );
    
    event SessionCompleted(
        uint256 indexed sessionId
    );
    
    event RevealWindowExtended(
        uint256 indexed sessionId,
        uint256 newRevealWindowEnd
    );
    
    event CommerceUpdated(address indexed oldCommerce, address indexed newCommerce);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event AdminRegistryUpdated(address indexed oldRegistry, address indexed newRegistry);
    event RevealWindowUpdated(uint256 oldWindow, uint256 newWindow);
    event PlatformFeeUpdated(uint256 oldFeeBP, uint256 newFeeBP);

    /// @notice Emitted when a session is explicitly transitioned to BiddingClosed status (Phase 45b O-2).
    event BiddingClosed(uint256 indexed sessionId, address indexed caller, uint256 closedAt);

    /// @notice Emitted when a no-show bidder is slashed by the session creator (Phase 45b O-3).
    /// @param slashAmount Amount sent to the treasury (basis points applied).
    /// @param refundAmount Remaining stake returned to the bidder.
    event BidderSlashed(uint256 indexed sessionId, address indexed bidder, uint256 slashAmount, uint256 refundAmount);

    /// @notice Emitted in createJobAndFund when the session evaluator is locked in (Phase 45b O-13).
    /// @param evaluator The actual evaluator address (address(0) means random pool selection).
    event EvaluatorFinalized(uint256 indexed sessionId, address indexed evaluator, uint256 finalizedAt);

    /// @notice Emitted when accumulated platform fees for a token are withdrawn (Phase 45b O-10).
    /// @param token The ERC-20 token (address(0) for native ETH).
    event FeesWithdrawn(address indexed token, address indexed to, uint256 amount);
    
    /***********************************/
    /* Errors */
    /***********************************/
    
    error InvalidSession();
    error SessionNotActive();
    error SessionExpired();
    error AlreadyCommitted();
    error NoCommitment();
    error AlreadyRevealed();
    error InvalidCommitment();
    error BidNotRevealed();
    error BidAlreadyAccepted();
    error NoStakeToWithdraw();
    error StakeAlreadyWithdrawn();
    error RevealWindowClosed();
    error RevealWindowNotStarted();
    error MaxBudgetExceeded();
    error InsufficientStake();
    error ZeroAddress();
    error Unauthorized();
    error InvalidMetadata();
    error JobAlreadyCreated();
    error SessionNotCancellable();
    error NoBidsToCancel();
    
    /***********************************/
    /* Core Bidding Functions */
    /***********************************/
    
    /**
     * @dev Create a new bidding session
     * @param evaluator Address of the evaluator/judge
     * @param maxBudget Maximum budget for the job
     * @param deadline When bidding closes
     * @param metadata IPFS hash or data URI with job details
     * @param serviceId Optional linked service from ServiceRegistry
     * @param paymentToken ERC-20 token address (address(0) for ETH)
     */
    function createBiddingSession(
        address evaluator,
        uint256 maxBudget,
        uint256 deadline,
        bytes calldata metadata,
        uint256 serviceId,
        address paymentToken
    ) external payable returns (uint256 sessionId);
    
    /**
     * @dev Commit a sealed bid
     * @param sessionId The bidding session ID
     * @param commitHash keccak256(abi.encode(sessionId, msg.sender, amount, message, salt))
     *      Hash now binds to (session, sender) to prevent cross-bidder hash collisions
     *      and cross-session replay (Phase 45b O-1).
     */
    function commitBid(uint256 sessionId, bytes32 commitHash) external payable;
    
    /**
     * @dev Reveal a committed bid
     * @param sessionId The bidding session ID
     * @param amount Proposed bid amount
     * @param message Bid message
     * @param salt Random salt used in commit
     */
    function revealBid(
        uint256 sessionId,
        uint256 amount,
        string calldata message,
        bytes32 salt
    ) external;
    
    /**
     * @dev Accept a revealed bid as the winner
     * @param sessionId The bidding session ID
     * @param bidId The bid ID to accept
     */
    function acceptBid(uint256 sessionId, uint256 bidId) external;
    
    /**
     * @dev Reject a bid (optional, for dispute)
     * @param sessionId The bidding session ID
     * @param bidId The bid ID to reject
     * @param reason Reason for rejection
     */
    function rejectBid(uint256 sessionId, uint256 bidId, string calldata reason) external;
    
    /***********************************/
    /* Stake Management (Pull Pattern) */
    /***********************************/
    
    /**
     * @dev Withdraw stake for non-winning bidders
     * @param sessionId The bidding session ID
     */
    function withdrawStake(uint256 sessionId) external;
    
    /**
     * @dev Withdraw the session creator's stake after job creation or cancellation (as fallback/safety mechanism).
     * @param sessionId The bidding session ID
     */
    function withdrawCreatorStake(uint256 sessionId) external;
    
    /***********************************/
    /* Job Creation & Integration */
    /***********************************/
    
    /**
     * @dev Create a job in AgenticCommerceV9 with the winning bid
     * @param sessionId The bidding session ID
     * @param jobExpiredAt When the job expires
     * @param description Job description
     */
    function createJobAndFund(
        uint256 sessionId,
        uint256 jobExpiredAt,
        string calldata description
    ) external payable returns (uint256 jobId);
    
    /***********************************/
    /* Session Management */
    /***********************************/
    
    /**
     * @dev Cancel session if no bids have been accepted
     * @param sessionId The bidding session ID
     */
    function cancelSession(uint256 sessionId) external;

    function completeSession(uint256 sessionId) external;

    /**
     * @dev Extend reveal window if needed
     * @param sessionId The bidding session ID
     * @param additionalSeconds Additional seconds to add
     */
    function extendRevealWindow(uint256 sessionId, uint256 additionalSeconds) external;

    /**
     * @dev Permissionlessly close bidding once the deadline has passed (Phase 45b O-2).
     *      Transitions the session from Active to BiddingClosed. Idempotently safe:
     *      calling on an already-closed session reverts. This makes the BiddingClosed
     *      state explicit on-chain (it was previously only a latent status inferred
     *      from the deadline check in onlyAfterDeadline).
     */
    function closeBidding(uint256 sessionId) external;

    /**
     * @dev Slash a no-show bidder after the full reveal window has elapsed (Phase 45b O-3).
     *      Callable only by the session creator. Slashes NO_SHOW_SLASH_BP (5%) of the
     *      bidder's stake to the treasury, refunds the remainder. The bid is marked
     *      rejected so it cannot be accepted later. Cannot slash a revealed, accepted,
     *      or already-withdrawn bid.
     */
    function slashNoShow(uint256 sessionId, address bidder) external;
    
    /***********************************/
    /* View Functions */
    /***********************************/
    
    function getSession(uint256 sessionId) external view returns (Session memory);
    function getBid(uint256 sessionId, uint256 bidId) external view returns (Bid memory);
    function getUserBid(uint256 sessionId, address user) external view returns (Bid memory);
    function getRevealedBids(uint256 sessionId) external view returns (Bid[] memory);
    function getSessionCount() external view returns (uint256);
    function calculateStake(uint256 maxBudget) external view returns (uint256);
    
    /***********************************/
    /* Admin Functions */
    /***********************************/
    
    function setCommerce(address commerce_) external;
    function setRevealWindow(uint256 window_) external;

    /// @notice Withdraw accumulated native-ETH platform fees (legacy, kept for backward compat).
    function withdrawPlatformFees(address payable to, uint256 amount) external;

    /// @notice Withdraw the full accumulated platform-fee balance for a given token
    ///         (Phase 45b O-10). Use address(0) for native ETH. Pulls the entire
    ///         accumulated balance in one call to the treasury.
    function withdrawFees(address token) external;

    /// @notice View the accumulated platform-fee balance for a given token
    ///         (Phase 45b O-10). Use address(0) for native ETH.
    function accumulatedFeesByToken(address token) external view returns (uint256);
}
