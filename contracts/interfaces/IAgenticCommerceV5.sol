// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title IAgenticCommerceV5
 * @dev Interface for Agentic Commerce Protocol V5 - Upgradeable with Bidding System
 * 
 * Features:
 * - UUPS Upgradeable
 * - Open Job bidding with sealed bids
 * - Native ETH and ERC20 support
 * - Comprehensive event system
 */
interface IAgenticCommerceV5 {
    /***********************************/
    /* Constants */
    /***********************************/
    
    function REVEAL_WINDOW() external view returns (uint256);
    function MIN_STAKE_BP() external view returns (uint256);
    function MIN_EXPIRY_DURATION() external view returns (uint256);
    function MAX_EXPIRY_DURATION() external view returns (uint256);
    function MAX_JOBS_PER_CLIENT() external view returns (uint256);
    function MAX_DESCRIPTION_LENGTH() external view returns (uint256);
    function MIN_BUDGET() external view returns (uint256);
    function MAX_BUDGET() external view returns (uint256);
    function MIN_ETH_PAYMENT() external view returns (uint256);
    
    /***********************************/
    /* Enums */
    /***********************************/
    
    enum JobStatus {
        Open,
        Funded,
        Submitted,
        Completed,
        Rejected,
        Expired
    }
    
    enum JobType {
        Direct,
        Open
    }
    
    enum BidStatus {
        Committed,
        Revealed,
        Accepted,
        Withdrawn,
        Forfeited
    }
    
    /***********************************/
    /* Structs */
    /***********************************/
    
    struct Job {
        uint256 id;
        address client;
        address provider;
        address evaluator;
        uint256 serviceId;
        IERC20 paymentToken;
        string description;
        uint256 budget;
        uint256 expiredAt;
        JobStatus status;
        address hook;
        bytes32 deliverable;
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
        uint256 timestamp;
    }
    
    /***********************************/
    /* Events */
    /***********************************/
    
    // Core Events (from V4)
    event JobCreated(uint256 indexed jobId, address indexed client, address indexed provider, address evaluator, uint256 serviceId, uint256 expiredAt);
    event OpenJobCreated(uint256 indexed jobId, address indexed client, uint256 maxBudget, address evaluator, uint256 expiredAt);
    event ProviderSet(uint256 indexed jobId, address indexed provider);
    event BudgetSet(uint256 indexed jobId, uint256 amount);
    event JobFunded(uint256 indexed jobId, address indexed client, uint256 amount);
    event JobSubmitted(uint256 indexed jobId, address indexed provider, bytes32 deliverable);
    event JobCompleted(uint256 indexed jobId, address indexed evaluator, bytes32 reason);
    event JobRejected(uint256 indexed jobId, address indexed rejector, bytes32 reason);
    event JobExpired(uint256 indexed jobId);
    event PaymentReleased(uint256 indexed jobId, address indexed provider, uint256 amount);
    event Refunded(uint256 indexed jobId, address indexed client, uint256 amount);
    
    // Phase 3: Enhanced Events
    event JobStatusChanged(
        uint256 indexed jobId, 
        JobStatus indexed oldStatus, 
        JobStatus indexed newStatus,
        uint256 timestamp
    );
    
    event JobUpdated(
        uint256 indexed jobId,
        bytes32 indexed updateType,
        uint256 timestamp
    );
    
    event PlatformFeeUpdated(
        uint256 oldFeeBP,
        uint256 newFeeBP,
        address indexed oldTreasury,
        address indexed newTreasury
    );
    
    event ServiceRegistrySet(
        address indexed oldRegistry,
        address indexed newRegistry
    );
    
    event JobLimitExceeded(
        address indexed client,
        uint256 attemptedCount,
        uint256 maxAllowed
    );
    
    // Phase 5: Bidding Events
    event BidCommitted(
        uint256 indexed jobId,
        address indexed bidder,
        uint256 stakeAmount,
        bytes32 commitHash
    );
    
    event BidRevealed(
        uint256 indexed jobId,
        address indexed bidder,
        uint256 proposedAmount,
        string message
    );
    
    event BidAccepted(
        uint256 indexed jobId,
        address indexed bidder,
        uint256 bidId,
        uint256 acceptedAmount
    );
    
    event BidWithdrawn(
        uint256 indexed jobId,
        address indexed bidder,
        uint256 stakeReturned
    );
    
    event StakesReturned(
        uint256 indexed jobId,
        address indexed recipient,
        uint256 amount
    );
    
    /***********************************/
    /* Initialize */
    /***********************************/
    
    function initialize(
        address treasury_,
        address serviceRegistry_
    ) external;
    
    /***********************************/
    /* Core Job Functions */
    /***********************************/
    
    /**
     * @dev Create a direct job with fixed provider (existing V4 flow)
     */
    function createJob(
        address provider,
        address evaluator,
        uint256 expiredAt,
        string calldata description,
        address hook
    ) external returns (uint256 jobId);
    
    /**
     * @dev Create an open job for bidding
     */
    function createOpenJob(
        uint256 maxBudget,
        address evaluator,
        uint256 expiredAt,
        string calldata description,
        IERC20 paymentToken
    ) external returns (uint256 jobId);
    
    /**
     * @dev Set provider for direct jobs
     */
    function setProvider(uint256 jobId, address provider) external;
    
    /**
     * @dev Set budget (for direct jobs)
     */
    function setBudget(uint256 jobId, uint256 amount) external;
    
    /**
     * @dev Fund a job (payable for ETH)
     */
    function fund(uint256 jobId) external payable;
    
    /**
     * @dev Submit work deliverable
     */
    function submit(uint256 jobId, bytes32 deliverable) external;
    
    /**
     * @dev Complete job and release payment
     */
    function complete(uint256 jobId, bytes32 reason) external;
    
    /**
     * @dev Reject job
     */
    function reject(uint256 jobId, bytes32 reason) external;
    
    /**
     * @dev Claim refund after expiry
     */
    function claimRefund(uint256 jobId) external;
    
    /***********************************/
    /* Bidding Functions */
    /***********************************/
    
    /**
     * @dev Commit a sealed bid (before deadline)
     * @param jobId The job ID
     * @param commitHash keccak256(abi.encode(amount, message, salt))
     */
    function commitBid(uint256 jobId, bytes32 commitHash) external payable;
    
    /**
     * @dev Reveal a committed bid (after deadline)
     * @param amount Proposed amount (must match commit)
     * @param message Bid message/pitch
     * @param salt Random salt used in commitment
     */
    function revealBid(uint256 jobId, uint256 amount, string calldata message, bytes32 salt) external;
    
    /**
     * @dev Accept a revealed bid (client only)
     */
    function acceptBid(uint256 jobId, uint256 bidId) external;
    
    /***********************************/
    /* View Functions */
    /***********************************/
    
    function getJob(uint256 jobId) external view returns (Job memory);
    function getClientJobCount(address client) external view returns (uint256);
    function getUserBid(uint256 jobId, address user) external view returns (Bid memory);
    function calculateStake(uint256 maxBudget) external pure returns (uint256);
    
    /***********************************/
    /* Admin Functions */
    /***********************************/
    
    function setServiceRegistry(address _serviceRegistry) external;
    function setPlatformFee(uint256 feeBP, address treasury) external;
}
