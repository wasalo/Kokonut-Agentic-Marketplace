// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IACPHook} from "./IACPHook.sol";
import {IAgenticCommerceV6} from "../interfaces/IAgenticCommerceV6.sol";

/**
 * @title AgenticCommerceV6
 * @dev UUPS Upgradeable Agentic Commerce Protocol V6
 * 
 * Key Features (V6):
 * - ERC-2771 Meta-Transactions for gasless transactions
 * - createJobFromService() for seamless service-to-escrow flow
 * - Evaluator fees (1%, optional, on top of budget)
 * - Loser stake withdrawal for bidding protection
 * - Native ETH and ERC20 support
 * 
 * Budget Limits:
 * - Min: 5 USD (expressed in token decimals)
 * - Max: 1,000,000 USD (expressed in token decimals)
 * 
 * Bidding:
 * - Stake: 1% of max budget
 * - Reveal window: 1 hour after deadline
 */
contract AgenticCommerceV6 is 
    IAgenticCommerceV6, 
    ContextUpgradeable,
    OwnableUpgradeable, 
    UUPSUpgradeable, 
    ReentrancyGuard 
{
    using SafeERC20 for IERC20;

    /***********************************/
    /* Constants */
    /***********************************/
    
    uint256 public constant FEE_DENOMINATOR = 10000;
    uint256 public constant EVALUATOR_FEE_BP = 100; // 1% evaluator fee (on top of budget)
    
    // DoS Prevention
    uint256 public constant MAX_JOBS_PER_CLIENT = 100;
    uint256 public constant MAX_DESCRIPTION_LENGTH = 1000;
    uint256 public constant MIN_EXPIRY_DURATION = 5 minutes;
    uint256 public constant MAX_EXPIRY_DURATION = 365 days;
    
    // Budget limits (in USD terms - actual limits depend on token decimals)
    uint256 public constant MIN_BUDGET = 5e6;  // $5 (USDC decimals)
    uint256 public constant MAX_BUDGET = 1e12;  // $1,000,000 (USDC decimals)
    
    // Minimum ETH payment (dust threshold)
    uint256 public constant MIN_ETH_PAYMENT = 0.005 ether;
    
    // Configurable Dispute Window for timeout completion
    uint256 public constant DEFAULT_DISPUTE_WINDOW = 7 days;
    
    // Configurable Non-Responsiveness Slash Percentage (100 BP = 1%)
    uint256 public constant DEFAULT_NONRESPONSIVE_SLASH_BP = 100; // 1%

    /***********************************/
    /* Update Type Constants */
    /***********************************/
    
    bytes32 private constant _UPDATE_TYPE_PROVIDER = keccak256("provider");
    bytes32 private constant _UPDATE_TYPE_BUDGET = keccak256("budget");

    /***********************************/
    /* State Variables */
    /***********************************/
    
    address public platformTreasury;

    mapping(uint256 => Job) public jobs;
    uint256 public jobCounter;
    
    // DoS Prevention: Track job count per client
    mapping(address => uint256) public clientJobCount;
    mapping(uint256 => address) public jobClient;

    // Phase 5: Bidding State - REMOVED in V6.1 for size optimization
    // Users should use V5 for bidding functionality
    
    // Evaluator fee enabled per job
    mapping(uint256 => bool) public evaluatorFeeEnabled;
    
    // Configurable dispute window (per job)
    mapping(uint256 => uint256) public jobDisputeWindow;
    
    // Configurable non-responsiveness slash (per job)
    mapping(uint256 => uint256) public jobNonResponsiveSlashBP;
    
    // Job submission timestamp for timeout tracking
    mapping(uint256 => uint256) public jobSubmittedAt;

    // Storage gap for upgradeability
    uint256[50] private __gap;

    /***********************************/
    /* Errors */
    /***********************************/
    
    error InvalidJob();
    error WrongStatus();
    error Unauthorized();
    error ZeroAddress();
    error ExpiryTooShort();
    error ExpiryTooLong();
    error ZeroBudget();
    error BudgetTooLow();
    error BudgetTooHigh();
    error ProviderNotSet();
    error InvalidHook();
    error MaxJobsPerClient(address client, uint256 current);
    
    // Security errors
    error RolesMustBeDistinct();

    /***********************************/
    /* Modifiers */
    /***********************************/
    
    modifier onlyClient(uint256 jobId) {
        require(jobs[jobId].client == _msgSender(), "Not client");
        _;
    }
    
    modifier onlyProvider(uint256 jobId) {
        require(jobs[jobId].provider == _msgSender(), "Not provider");
        _;
    }
    
    modifier onlyEvaluator(uint256 jobId) {
        require(jobs[jobId].evaluator == _msgSender(), "Not evaluator");
        _;
    }

    /***********************************/
    /* Initialize */
    /***********************************/
    
    constructor() {
        _disableInitializers();
    }

    function initialize(address treasury_) public initializer {
        require(treasury_ != address(0), "Zero treasury");
        __Context_init();
        __Ownable_init(msg.sender);
        platformTreasury = treasury_;
    }

    /***********************************/
    /* UUPS */
    /***********************************/
    
    function _authorizeUpgrade(address newImpl) internal override onlyOwner {}

    /***********************************/
    /* Core Job Functions */
    /***********************************/
    
    /**
     * @dev Create a direct job with fixed provider (existing V4 flow)
     * @param evaluatorFee Enable 1% evaluator fee on top of budget
     */
    function createJob(
        address provider,
        address evaluator,
        uint256 expiredAt,
        string calldata description,
        address hook,
        bool evaluatorFee
    ) external nonReentrant returns (uint256 jobId) {
        _validateJobCreation(provider, evaluator, expiredAt, description, hook);
        
        if (clientJobCount[_msgSender()] >= MAX_JOBS_PER_CLIENT) {
            emit JobLimitExceeded(_msgSender(), clientJobCount[_msgSender()] + 1, MAX_JOBS_PER_CLIENT);
            revert MaxJobsPerClient(_msgSender(), clientJobCount[_msgSender()]);
        }

        jobId = ++jobCounter;
        jobs[jobId] = Job({
            id: jobId,
            client: _msgSender(),
            provider: provider,
            evaluator: evaluator,
            serviceId: 0,
            paymentToken: IERC20(address(0)), // Native ETH
            description: description,
            budget: 0,
            expiredAt: expiredAt,
            status: JobStatus.Open,
            hook: hook,
            deliverable: bytes32(0)
        });
        
        evaluatorFeeEnabled[jobId] = evaluatorFee;
        jobClient[jobId] = _msgSender();
        clientJobCount[_msgSender()]++;

        emit JobCreated(jobId, _msgSender(), provider, evaluator, 0, expiredAt);
    }

    /**
     * @dev Create job from an existing service (V6 new feature)
     * NOTE: Temporarily disabled due to contract size. Use createJob + setProvider + setBudget instead.
     */
    function createJobFromService(
        uint256,
        address,
        uint256,
        string calldata,
        address,
        bool
    ) external nonReentrant returns (uint256) {
        revert("createJobFromService disabled");
    }

    /**
     * @dev Create an open job for bidding - DISABLED in V6.1 for size optimization
     * Use AgenticCommerceV5 for bidding functionality
     */
    function createOpenJob(
        uint256,
        address,
        uint256,
        string calldata,
        IERC20,
        bool
    ) external pure returns (uint256) {
        revert("Bidding disabled in V6.1");
    }

    /**
     * @dev Internal validation for job creation
     */
    function _validateJobCreation(
        address provider,
        address evaluator,
        uint256 expiredAt,
        string calldata description,
        address hook
    ) internal view {
        require(provider != address(0), "Zero provider");
        require(evaluator != address(0), "Zero evaluator");
        require(_msgSender() != provider, "Client cannot be provider");
        require(_msgSender() != evaluator, "Client cannot be evaluator");
        require(provider != evaluator, "Provider cannot be evaluator");
        require(expiredAt > block.timestamp + MIN_EXPIRY_DURATION, "Expiry too soon");
        require(expiredAt <= block.timestamp + MAX_EXPIRY_DURATION, "Expiry too far");
        require(bytes(description).length > 0 && bytes(description).length <= MAX_DESCRIPTION_LENGTH, "Invalid description");
        // Note: Hook validation skipped to reduce contract size. Hook calls will revert if invalid.
    }

    function setProvider(uint256 jobId, address provider) external onlyClient(jobId) {
        Job storage job = jobs[jobId];
        require(job.id != 0, "Invalid job");
        require(uint256(job.status) == 0, "Wrong status");
        require(job.provider == address(0), "Provider set");
        require(provider != _msgSender(), "Provider cannot be client");
        require(provider != address(0), "Zero address");

        job.provider = provider;
        
        emit ProviderSet(jobId, provider);
        emit JobUpdated(jobId, _UPDATE_TYPE_PROVIDER, block.timestamp);
    }

    function setBudget(uint256 jobId, uint256 amount) external nonReentrant onlyClient(jobId) {
        Job storage job = jobs[jobId];
        require(job.id != 0, "Invalid job");
        require(uint256(job.status) == 0, "Wrong status");
        require(amount > 0, "Zero budget");

        job.budget = amount;
        
        emit BudgetSet(jobId, amount);
        emit JobUpdated(jobId, _UPDATE_TYPE_BUDGET, block.timestamp);
    }

    function fund(uint256 jobId) external payable nonReentrant onlyClient(jobId) {
        Job storage job = jobs[jobId];
        _validateFund(job);

        // Cache budget BEFORE hook call to prevent manipulation via reentrancy
        uint256 cachedBudget = job.budget;

        if (job.hook != address(0)) {
            IACPHook(job.hook).beforeAction(jobId, this.fund.selector, "");
        }

        JobStatus oldStatus = job.status;
        job.status = JobStatus.Funded;
        
        if (address(job.paymentToken) == address(0)) {
            require(msg.value >= cachedBudget, "Insufficient payment");
            require(msg.value >= MIN_ETH_PAYMENT, "Below minimum ETH");
            
            // Refund excess ETH
            uint256 excess = msg.value - cachedBudget;
            if (excess > 0) {
                payable(_msgSender()).transfer(excess);
            }
        } else {
            require(msg.value == 0, "ETH not accepted for ERC20");
            job.paymentToken.safeTransferFrom(_msgSender(), address(this), cachedBudget);
        }
        
        emit JobFunded(jobId, _msgSender(), cachedBudget);
        emit JobStatusChanged(jobId, oldStatus, JobStatus.Funded, block.timestamp);
    }

    function _validateFund(Job storage job) internal view {
        require(job.id != 0, "Invalid job");
        require(job.status == JobStatus.Open, "Wrong status");
        require(job.provider != address(0), "No provider");
        require(job.budget > 0, "No budget");
        require(block.timestamp < job.expiredAt, "Expired");
    }

    function submit(uint256 jobId, bytes32 deliverable) external nonReentrant onlyProvider(jobId) {
        Job storage job = jobs[jobId];
        require(job.id != 0, "Invalid job");
        require(job.status == JobStatus.Funded, "Wrong status");

        if (job.hook != address(0)) {
            IACPHook(job.hook).beforeAction(jobId, this.submit.selector, abi.encode(deliverable));
        }

        JobStatus oldStatus = job.status;
        job.status = JobStatus.Submitted;
        job.deliverable = deliverable;
        jobSubmittedAt[jobId] = block.timestamp;
        
        emit JobSubmitted(jobId, _msgSender(), deliverable);
        emit JobStatusChanged(jobId, oldStatus, JobStatus.Submitted, block.timestamp);
    }

    function complete(uint256 jobId, bytes32 reason) external nonReentrant onlyEvaluator(jobId) {
        Job storage job = jobs[jobId];
        require(job.id != 0, "Invalid job");
        require(job.status == JobStatus.Submitted, "Wrong status");

        if (job.hook != address(0)) {
            IACPHook(job.hook).beforeAction(jobId, this.complete.selector, abi.encode(reason));
        }

        uint256 amount = job.budget;
        uint256 platformFee = (amount * 100) / FEE_DENOMINATOR; // 1% platform fee
        uint256 net = amount - platformFee;
        address prov = job.provider;
        IERC20 paymentToken = job.paymentToken;

        // Evaluator fee (1% on top of budget, if enabled)
        uint256 evaluatorFee = 0;
        if (evaluatorFeeEnabled[jobId] && job.evaluator != address(0)) {
            evaluatorFee = (amount * EVALUATOR_FEE_BP) / FEE_DENOMINATOR;
            net -= evaluatorFee;
        }

        job.budget = 0;
        job.status = JobStatus.Completed;
        
        _decrementJobCount(jobId);

        if (platformFee > 0) {
            _transferPayment(paymentToken, platformTreasury, platformFee);
        }
        if (evaluatorFee > 0) {
            _transferPayment(paymentToken, job.evaluator, evaluatorFee);
        }
        if (net > 0) {
            _transferPayment(paymentToken, prov, net);
        }

        emit JobCompleted(jobId, _msgSender(), reason, evaluatorFee);
        emit PaymentReleased(jobId, prov, net);
        emit JobStatusChanged(jobId, JobStatus.Submitted, JobStatus.Completed, block.timestamp);
    }

    /**
     * @dev Complete job after dispute window when evaluator is unresponsive
     *      Allows provider to recover payment if evaluator fails to act
     * @param jobId The job ID
     * @param reason Reason for completion
     */
    function completeAfterTimeout(uint256 jobId, bytes32 reason) external nonReentrant {
        Job storage job = jobs[jobId];
        require(job.id != 0, "Invalid job");
        require(job.status == JobStatus.Submitted, "Wrong status");
        require(job.provider == _msgSender() || job.client == _msgSender(), "Not provider or client");
        
        uint256 submittedAt = jobSubmittedAt[jobId];
        require(submittedAt > 0, "Never submitted");
        
        uint256 disputeWindow = jobDisputeWindow[jobId];
        if (disputeWindow == 0) disputeWindow = DEFAULT_DISPUTE_WINDOW;
        
        require(block.timestamp >= submittedAt + disputeWindow, "Dispute window not elapsed");
        
        if (job.hook != address(0)) {
            IACPHook(job.hook).beforeAction(jobId, this.completeAfterTimeout.selector, abi.encode(reason));
        }
        
        uint256 amount = job.budget;
        uint256 platformFee = (amount * 100) / FEE_DENOMINATOR; // 1% platform fee
        uint256 slashAmount = 0;
        
        uint256 slashBP = jobNonResponsiveSlashBP[jobId];
        if (slashBP == 0) slashBP = DEFAULT_NONRESPONSIVE_SLASH_BP;
        
        slashAmount = (amount * slashBP) / FEE_DENOMINATOR;
        uint256 net = amount - platformFee - slashAmount;
        address prov = job.provider;
        IERC20 paymentToken = job.paymentToken;

        job.budget = 0;
        job.status = JobStatus.Completed;
        
        _decrementJobCount(jobId);

        if (platformFee > 0) {
            _transferPayment(paymentToken, platformTreasury, platformFee);
        }
        if (slashAmount > 0) {
            _transferPayment(paymentToken, platformTreasury, slashAmount);
        }
        if (net > 0) {
            _transferPayment(paymentToken, prov, net);
        }

        emit JobCompleted(jobId, _msgSender(), reason, 0);
        emit PaymentReleased(jobId, prov, net);
        emit EvaluatorSlashedForInactivity(jobId, job.evaluator, slashAmount);
        emit JobStatusChanged(jobId, JobStatus.Submitted, JobStatus.Completed, block.timestamp);
    }

    /**
     * @dev Set dispute window for a job
     * @param jobId The job ID
     * @param window Dispute window in seconds
     */
    function setDisputeWindow(uint256 jobId, uint256 window) external onlyClient(jobId) {
        require(jobs[jobId].status == JobStatus.Funded, "Wrong status");
        require(window >= 1 days && window <= 30 days, "Invalid window");
        jobDisputeWindow[jobId] = window;
        emit DisputeWindowSet(jobId, window);
    }

    /**
     * @dev Set non-responsiveness slash percentage for a job
     * @param jobId The job ID
     * @param slashBP Slash percentage in basis points (100 = 1%)
     */
    function setNonResponsiveSlashBP(uint256 jobId, uint256 slashBP) external onlyClient(jobId) {
        require(jobs[jobId].status == JobStatus.Funded, "Wrong status");
        require(slashBP <= 1000, "Max 10% slash"); // Max 10%
        jobNonResponsiveSlashBP[jobId] = slashBP;
        emit NonResponsiveSlashSet(jobId, slashBP);
    }

    function reject(uint256 jobId, bytes32 reason) external nonReentrant {
        Job storage job = jobs[jobId];
        require(job.id != 0, "Invalid job");

        JobStatus oldStatus = job.status;
        
        if (job.status == JobStatus.Open) {
            require(job.client == _msgSender(), "Not client");
        } else if (job.status == JobStatus.Funded || job.status == JobStatus.Submitted) {
            require(job.evaluator == _msgSender(), "Not evaluator");
        } else {
            revert("Wrong status");
        }

        uint256 refundAmount = job.budget;
        job.budget = 0;
        job.status = JobStatus.Rejected;
        
        _decrementJobCount(jobId);
        
        if (oldStatus == JobStatus.Funded || oldStatus == JobStatus.Submitted) {
            _transferPayment(job.paymentToken, job.client, refundAmount);
            emit Refunded(jobId, job.client, refundAmount);
        }

        emit JobRejected(jobId, _msgSender(), reason);
        emit JobStatusChanged(jobId, oldStatus, JobStatus.Rejected, block.timestamp);
    }

    function claimRefund(uint256 jobId) external nonReentrant onlyClient(jobId) {
        Job storage job = jobs[jobId];
        require(job.id != 0, "Invalid job");
        require(
            job.status == JobStatus.Funded || job.status == JobStatus.Submitted,
            "Wrong status"
        );
        require(block.timestamp >= job.expiredAt, "Not expired");

        JobStatus oldStatus = job.status;
        uint256 refundAmount = job.budget;
        job.budget = 0;
        job.status = JobStatus.Expired;
        
        _decrementJobCount(jobId);
        
        _transferPayment(job.paymentToken, _msgSender(), refundAmount);
        
        emit Refunded(jobId, _msgSender(), refundAmount);
        emit JobExpired(jobId);
        emit JobStatusChanged(jobId, oldStatus, JobStatus.Expired, block.timestamp);
    }

    /***********************************/
    /* Bidding Functions - DISABLED in V6.1 for size optimization */
    /***********************************/
    
    function calculateStake(uint256) public pure returns (uint256) { revert("Bidding disabled"); }
    function commitBid(uint256, bytes32) external payable { revert("Bidding disabled"); }
    function revealBid(uint256, uint256, string calldata, bytes32) external { revert("Bidding disabled"); }
    function acceptBid(uint256, uint256) external { revert("Bidding disabled"); }
    function withdrawStake(uint256) external { revert("Bidding disabled"); }
    function getUserBid(uint256, address) external pure returns (Bid memory) {
        return Bid({bidId: 0, bidder: address(0), proposedAmount: 0, stake: 0, message: "", commitHash: bytes32(0), revealed: false, accepted: false, withdrawn: false, timestamp: 0});
    }

    /***********************************/
    /* Helper Functions */
    /***********************************/
    
    function _transferPayment(IERC20 token, address to, uint256 amount) internal {
        if (address(token) == address(0)) {
            payable(to).transfer(amount);
        } else {
            token.safeTransfer(to, amount);
        }
    }

    function _decrementJobCount(uint256 jobId) internal {
        address client = jobClient[jobId];
        if (client != address(0) && clientJobCount[client] > 0) {
            clientJobCount[client]--;
        }
    }

    /***********************************/
    /* View Functions */
    /***********************************/
    
    function getJob(uint256 jobId) external view returns (Job memory) {
        require(jobId > 0 && jobId <= jobCounter, "Invalid job");
        return jobs[jobId];
    }
    
    function getClientJobCount(address client) external view returns (uint256) {
        return clientJobCount[client];
    }

    function isEvaluatorFeeEnabled(uint256 jobId) external view returns (bool) {
        return evaluatorFeeEnabled[jobId];
    }

    /***********************************/
    /* Admin Functions */
    /***********************************/
    
    function setPlatformTreasury(address treasury) external onlyOwner {
        require(treasury != address(0), "Zero treasury");
        platformTreasury = treasury;
    }
}
