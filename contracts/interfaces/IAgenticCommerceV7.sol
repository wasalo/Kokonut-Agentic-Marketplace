// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title IAgenticCommerceV7
 * @dev Interface for Agentic Commerce Protocol V7
 * 
 * V7 Features (Client Review Flow):
 * - Client must approve before evaluator can finalize payment
 * - New workflow: Provider submits → Client approves → Evaluator finalizes → Payment
 * - requiresClientReview flag per job
 * - clientApproved flag for approval tracking
 */
interface IAgenticCommerceV7 {
    /***********************************/
    /* Constants */
    /***********************************/
    
    function MIN_EXPIRY_DURATION() external view returns (uint256);
    function MAX_EXPIRY_DURATION() external view returns (uint256);
    function MAX_JOBS_PER_CLIENT() external view returns (uint256);
    function MAX_DESCRIPTION_LENGTH() external view returns (uint256);
    function MIN_BUDGET() external view returns (uint256);
    function MAX_BUDGET() external view returns (uint256);
    function MIN_ETH_PAYMENT() external view returns (uint256);
    function EVALUATOR_FEE_BP() external view returns (uint256);
    function FEE_DENOMINATOR() external view returns (uint256);
    function DEFAULT_DISPUTE_WINDOW() external view returns (uint256);
    function DEFAULT_NONRESPONSIVE_SLASH_BP() external view returns (uint256);
    
    /***********************************/
    /* Enums */
    /***********************************/
    
    enum JobStatus {
        Open,      // 0
        Funded,    // 1
        Submitted, // 2
        Completed, // 3
        Rejected,  // 4
        Expired,   // 5
        PendingClientApproval  // 6 - V7: New status for client review
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
        bool withdrawn;
        uint256 timestamp;
    }

    /***********************************/
    /* Events */
    /***********************************/
    
    event JobCreated(uint256 indexed jobId, address indexed client, address indexed provider, uint256 serviceId, uint256 expiredAt);
    event OpenJobCreated(uint256 indexed jobId, address indexed client, uint256 maxBudget, address indexed evaluator, uint256 expiredAt);
    event ProviderSet(uint256 indexed jobId, address indexed provider, address oldProvider);
    event BudgetSet(uint256 indexed jobId, uint256 indexed oldBudget, uint256 indexed newBudget);
    event JobFunded(uint256 indexed jobId, address indexed client, uint256 amount);
    event JobSubmitted(uint256 indexed jobId, address indexed provider, bytes32 deliverable);
    event JobCompleted(uint256 indexed jobId, address indexed evaluator, address indexed provider, uint256 evaluatorFee);
    event JobRejected(uint256 indexed jobId, address indexed rejector, bytes32 reason);
    event JobExpired(uint256 indexed jobId);
    event PaymentReleased(uint256 indexed jobId, address indexed provider, uint256 amount);
    event Refunded(uint256 indexed jobId, address indexed client, uint256 amount);
    event PermissionlessRefund(uint256 indexed jobId, address indexed client, address caller, uint256 amount);
    
    // V7 Events
    event ClientApproved(uint256 indexed jobId, address indexed client);
    
    event JobStatusChanged(
        uint256 indexed jobId, 
        JobStatus indexed oldStatus, 
        JobStatus indexed newStatus,
        address changedBy,
        uint256 timestamp
    );
    
    event JobUpdated(
        uint256 indexed jobId,
        bytes32 indexed updateType,
        bytes32 oldValue,
        bytes32 newValue,
        uint256 timestamp
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
    
    event DisputeWindowSet(uint256 indexed jobId, uint256 window);
    event NonResponsiveSlashSet(uint256 indexed jobId, uint256 slashBP);
    event EvaluatorSlashedForInactivity(uint256 indexed jobId, address indexed evaluator, uint256 slashAmount);
    
    /***********************************/
    /* Initialize */
    /***********************************/
    
    function initialize(address treasury_, address initialOwner_) external;
    
    /***********************************/
    /* Core Job Functions */
    /***********************************/
    
    function createJob(
        address provider,
        address evaluator,
        uint256 expiredAt,
        string calldata description,
        address hook,
        bool evaluatorFee,
        bool clientReview_
    ) external returns (uint256 jobId);
    
    function createJobFromService(
        uint256 serviceId,
        address evaluator,
        uint256 expiredAt,
        string calldata description,
        address hook,
        bool evaluatorFee
    ) external returns (uint256 jobId);
    
    function createOpenJob(
        uint256 maxBudget,
        address evaluator,
        uint256 expiredAt,
        string calldata description,
        IERC20 paymentToken,
        bool evaluatorFee
    ) external returns (uint256 jobId);
    
    function setProvider(uint256 jobId, address provider) external;
    function setBudget(uint256 jobId, uint256 amount) external;
    function fund(uint256 jobId, uint256 expectedBudget) external payable;
    function submit(uint256 jobId, bytes32 deliverable) external;
    
    // V7 Functions
    function approveByClient(uint256 jobId) external;
    function finalizeByEvaluator(uint256 jobId, bytes32 reason) external;
    
    function complete(uint256 jobId, bytes32 reason) external;
    function completeAfterTimeout(uint256 jobId, bytes32 reason) external;
    function setDisputeWindow(uint256 jobId, uint256 window) external;
    function setNonResponsiveSlashBP(uint256 jobId, uint256 slashBP) external;
    function reject(uint256 jobId, bytes32 reason) external;
    function claimRefund(uint256 jobId) external;
    
    /***********************************/
    /* View Functions */
    /***********************************/
    
    function getJob(uint256 jobId) external view returns (Job memory);
    function getClientJobCount(address client) external view returns (uint256);
    function isEvaluatorFeeEnabled(uint256 jobId) external view returns (bool);
    
    // V7 View Functions
    function hasClientApproved(uint256 jobId) external view returns (bool);
    function isClientReviewRequired(uint256 jobId) external view returns (bool);
    
    /***********************************/
    /* Admin Functions */
    /***********************************/
    
    function setPlatformTreasury(address treasury) external;
}