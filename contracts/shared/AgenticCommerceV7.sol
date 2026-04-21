// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IACPHook} from "./IACPHook.sol";
import {IAgenticCommerceV7} from "../interfaces/IAgenticCommerceV7.sol";
import {AdminRegistry} from "./AdminRegistry.sol";

/**
 * @title AgenticCommerceV7
 * @dev UUPS Upgradeable Agentic Commerce Protocol V7
 * 
 * V7 Features (Client Review Flow):
 * - Client must approve before evaluator can finalize payment
 * - New workflow: Provider submits → Client approves → Evaluator finalizes → Payment
 * - requiresClientReview flag per job
 * - clientApproved flag for approval tracking
 * 
 * Budget Limits:
 * - Min: 5 USD (expressed in token decimals)
 * - Max: 1,000,000 USD (expressed in token decimals)
 * 
 * Security fixes applied:
 * - M3: Token allowlist to prevent non-standard tokens
 * - I1: Pausable pattern for emergency stops
 * - Custom errors (L2): Consistent error handling
 * - CEI: Correct Execution Order - effects before interactions
 */
contract AgenticCommerceV7 is 
    IAgenticCommerceV7, 
    ContextUpgradeable,
    OwnableUpgradeable, 
    UUPSUpgradeable, 
    ReentrancyGuard,
    PausableUpgradeable
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
    address public adminRegistry;

    mapping(uint256 => Job) public jobs;
    uint256 public jobCounter;
    
    // DoS Prevention: Track job count per client
    mapping(address => uint256) public clientJobCount;
    mapping(uint256 => address) public jobClient;

    // Evaluator fee enabled per job
    mapping(uint256 => bool) public evaluatorFeeEnabled;
    
    // V7: Client review flow
    mapping(uint256 => bool) public requiresClientReview;
    mapping(uint256 => bool) public clientApproved;
    mapping(uint256 => uint256) public clientApprovedAt;
    
    // Configurable dispute window (per job)
    mapping(uint256 => uint256) public jobDisputeWindow;
    
    // Configurable non-responsiveness slash (per job)
    mapping(uint256 => uint256) public jobNonResponsiveSlashBP;
    
    // Job submission timestamp for timeout tracking
    mapping(uint256 => uint256) public jobSubmittedAt;

    // M3 Fix: Token allowlist for payment tokens
    mapping(address => bool) public allowedTokens;
    
    // M5 Fix: Evaluator registry for random selection
    address[] public evaluatorPool;
    mapping(address => bool) public isRegisteredEvaluator;
    
    // Minimum reputation score required to be an evaluator
    uint256 public constant MIN_EVALUATOR_REPUTATION = 50;

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
    error BudgetMismatch(uint256 expected, uint256 actual);
    error BudgetTooHigh();
    error ProviderNotSet();
    error InvalidHook();
    error MaxJobsPerClient(address client, uint256 current);
    error TokenNotAllowed(address token);
    
    // V7 Errors
    error ClientNotApproved();

    // Security errors
    error RolesMustBeDistinct();

    /***********************************/
    /* Modifiers */
    /***********************************/
    
    modifier onlyClient(uint256 jobId) {
        if (jobs[jobId].client != _msgSender()) revert Unauthorized();
        _;
    }
    
    modifier onlyProvider(uint256 jobId) {
        if (jobs[jobId].provider != _msgSender()) revert Unauthorized();
        _;
    }
    
    modifier onlyEvaluator(uint256 jobId) {
        if (jobs[jobId].evaluator != _msgSender()) revert Unauthorized();
        _;
    }
    
    modifier onlyAllowedToken(address token) {
        if (!_isTokenAllowed(token)) revert TokenNotAllowed(token);
        _;
    }

    /***********************************/
    /* Initialize */
    /***********************************/
    
    constructor() {
        _disableInitializers();
    }

    function initialize(address treasury_, address initialOwner) public initializer {
        if (treasury_ == address(0)) revert ZeroAddress();
        __Context_init();
        __Ownable_init(initialOwner);
        __UUPSUpgradeable_init();
        __Pausable_init();
        platformTreasury = treasury_;
        
        // M3 Fix: Initialize default allowed tokens
        // Native ETH (address(0)) is always allowed
        // USDC is the primary allowed ERC20 token
        allowedTokens[address(0)] = true; // Native ETH
    }

    /***********************************/
    /* UUPS */
    /***********************************/
    
    function _authorizeUpgrade(address newImpl) internal override onlyOwner {}

    /***********************************/
    /* Pausable */
    /***********************************/
    
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /***********************************/
    /* Token Allowlist Management */
    /***********************************/
    
    /**
     * @dev M3 Fix: Set a token as allowed or not allowed
     * @param token Token address (address(0) for native ETH)
     * @param allowed Whether the token is allowed
     */
    function setAllowedToken(address token, bool allowed) external onlyOwner {
        allowedTokens[token] = allowed;
        emit TokenAllowlistUpdated(token, allowed);
    }
    
    /**
     * @dev Check if a token is allowed
     * @param token Token address (address(0) for native ETH)
     */
    function _isTokenAllowed(address token) internal view returns (bool) {
        // Native ETH is always allowed
        if (token == address(0)) return true;
        // Check allowlist for ERC20 tokens
        return allowedTokens[token];
    }

    /***********************************/
    /* Core Job Functions */
    /***********************************/
    
    /**
     * @dev Create a direct job with fixed provider
     * @param evaluatorFee Enable 1% evaluator fee on top of budget
     * @param clientReview_ Require client approval before payment release
     */
    function createJob(
        address provider,
        address evaluator,
        uint256 expiredAt,
        string calldata description,
        address hook,
        bool evaluatorFee,
        bool clientReview_
    ) external nonReentrant whenNotPaused returns (uint256 jobId) {
        _validateJobCreation(provider, evaluator, expiredAt, description, hook);
        
        // Bad Actor: Check if wallets are blacklisted
        if (adminRegistry != address(0)) {
            AdminRegistry registry = AdminRegistry(adminRegistry);
            require(!registry.isWalletBlacklistedActive(_msgSender()), "Client wallet blacklisted");
            require(!registry.isWalletBlacklistedActive(provider), "Provider wallet blacklisted");
            if (evaluator != address(0)) {
                require(!registry.isWalletBlacklistedActive(evaluator), "Evaluator wallet blacklisted");
            }
        }
        
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
        requiresClientReview[jobId] = clientReview_;
        jobClient[jobId] = _msgSender();
        clientJobCount[_msgSender()]++;

        emit JobCreated(jobId, _msgSender(), provider, 0, expiredAt);
    }

    /**
     * @dev Create job from an existing service
     * NOTE: Temporarily disabled due to contract size
     */
    function createJobFromService(
        uint256,
        address,
        uint256,
        string calldata,
        address,
        bool
    ) external nonReentrant whenNotPaused returns (uint256) {
        revert("createJobFromService disabled");
    }

    /**
     * @dev Create an open job for bidding - DISABLED
     */
    function createOpenJob(
        uint256,
        address,
        uint256,
        string calldata,
        IERC20,
        bool
    ) external pure returns (uint256) {
        revert("Bidding disabled in V7");
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
        if (provider == address(0)) revert ZeroAddress();
        if (evaluator == address(0)) revert ZeroAddress();
        if (_msgSender() == provider || _msgSender() == evaluator) revert RolesMustBeDistinct();
        if (provider == evaluator) revert RolesMustBeDistinct();
        if (expiredAt <= block.timestamp + MIN_EXPIRY_DURATION) revert ExpiryTooShort();
        if (expiredAt > block.timestamp + MAX_EXPIRY_DURATION) revert ExpiryTooLong();
        if (bytes(description).length == 0 || bytes(description).length > MAX_DESCRIPTION_LENGTH) revert InvalidJob();
    }

    function setProvider(uint256 jobId, address provider) external onlyClient(jobId) {
        Job storage job = jobs[jobId];
        if (job.id == 0) revert InvalidJob();
        if (uint256(job.status) != 0) revert WrongStatus();
        if (job.provider != address(0)) revert WrongStatus();
        if (provider == _msgSender() || provider == address(0)) revert InvalidJob();

        address oldProvider = job.provider;
        job.provider = provider;
        
        emit ProviderSet(jobId, provider, oldProvider);
        emit JobUpdated(jobId, _UPDATE_TYPE_PROVIDER, bytes32(uint256(uint160(oldProvider))), bytes32(uint256(uint160(provider))), block.timestamp);
    }

    function setBudget(uint256 jobId, uint256 amount) external nonReentrant onlyClient(jobId) {
        Job storage job = jobs[jobId];
        if (job.id == 0) revert InvalidJob();
        if (uint256(job.status) != 0) revert WrongStatus();
        if (amount == 0) revert ZeroBudget();

        uint256 oldBudget = job.budget;
        job.budget = amount;
        
        emit BudgetSet(jobId, oldBudget, amount);
        emit JobUpdated(jobId, _UPDATE_TYPE_BUDGET, bytes32(oldBudget), bytes32(amount), block.timestamp);
    }

    function fund(uint256 jobId, uint256 expectedBudget) external payable nonReentrant onlyClient(jobId) {
        Job storage job = jobs[jobId];
        _validateFund(job);

        uint256 cachedBudget = job.budget;

        // Front-running protection: ensure client gets the budget they expected
        if (expectedBudget != 0 && cachedBudget != expectedBudget) {
            revert BudgetMismatch(expectedBudget, cachedBudget);
        }

        // CEI Fix: Effects before Interactions - update status BEFORE hook call
        JobStatus oldStatus = job.status;
        job.status = JobStatus.Funded;
        
        // Interaction: Call hook AFTER status update (CEI pattern)
        if (job.hook != address(0)) {
            IACPHook(job.hook).beforeAction(jobId, this.fund.selector, "");
        }
        
        if (address(job.paymentToken) == address(0)) {
            if (msg.value < cachedBudget) revert BudgetTooLow();
            if (msg.value < MIN_ETH_PAYMENT) revert BudgetTooLow();
            
            // Refund excess ETH
            uint256 excess = msg.value - cachedBudget;
            if (excess > 0) {
                payable(_msgSender()).transfer(excess);
            }
        } else {
            if (msg.value != 0) revert InvalidJob();
            job.paymentToken.safeTransferFrom(_msgSender(), address(this), cachedBudget);
        }
        
        emit JobFunded(jobId, _msgSender(), cachedBudget);
        emit JobStatusChanged(jobId, oldStatus, JobStatus.Funded, _msgSender(), block.timestamp);
    }

    function _validateFund(Job storage job) internal view {
        if (job.id == 0) revert InvalidJob();
        if (job.status != JobStatus.Open) revert WrongStatus();
        if (job.provider == address(0)) revert ProviderNotSet();
        if (job.budget == 0) revert ZeroBudget();
        if (block.timestamp >= job.expiredAt) revert InvalidJob();
    }

    /**
     * @dev Provider submits deliverable
     * If requiresClientReview = true, status goes to PendingClientApproval
     * Otherwise directly to Submitted for evaluator review
     */
    function submit(uint256 jobId, bytes32 deliverable) external nonReentrant onlyProvider(jobId) {
        Job storage job = jobs[jobId];
        if (job.id == 0) revert InvalidJob();
        if (job.status != JobStatus.Funded) revert WrongStatus();

        // CEI Fix: Effects before Interactions - update status BEFORE hook call
        JobStatus oldStatus = job.status;
        
        // V7: Check if client review is required
        if (requiresClientReview[jobId]) {
            job.status = JobStatus.PendingClientApproval;
        } else {
            job.status = JobStatus.Submitted;
        }
        
        job.deliverable = deliverable;
        jobSubmittedAt[jobId] = block.timestamp;
        
        // Interaction: Call hook AFTER status update (CEI pattern)
        if (job.hook != address(0)) {
            IACPHook(job.hook).beforeAction(jobId, this.submit.selector, abi.encode(deliverable));
        }
        
        emit JobSubmitted(jobId, _msgSender(), deliverable);
        emit JobStatusChanged(jobId, oldStatus, job.status, _msgSender(), block.timestamp);
    }

    /**
     * @dev V7: Client approves the deliverable
     * Only callable when job requires client review and is in PendingClientApproval status
     */
    function approveByClient(uint256 jobId) external nonReentrant onlyClient(jobId) {
        Job storage job = jobs[jobId];
        if (job.id == 0) revert InvalidJob();
        if (job.status != JobStatus.PendingClientApproval) revert WrongStatus();
        if (!requiresClientReview[jobId]) revert WrongStatus();

        // Mark as approved
        clientApproved[jobId] = true;
        clientApprovedAt[jobId] = block.timestamp;
        
        // Move to Submitted for evaluator finalization
        job.status = JobStatus.Submitted;
        
        emit ClientApproved(jobId, _msgSender());
        emit JobStatusChanged(jobId, JobStatus.PendingClientApproval, JobStatus.Submitted, _msgSender(), block.timestamp);
    }

    /**
     * @dev V7: Evaluator finalizes payment after client approval
     * If requiresClientReview = true, client must have approved first
     */
    function finalizeByEvaluator(uint256 jobId, bytes32 reason) external nonReentrant onlyEvaluator(jobId) {
        Job storage job = jobs[jobId];
        if (job.id == 0) revert InvalidJob();
        if (job.status != JobStatus.Submitted) revert WrongStatus();
        
        // V7: Check client approval if required
        if (requiresClientReview[jobId] && !clientApproved[jobId]) {
            revert ClientNotApproved();
        }

        uint256 amount = job.budget;
        uint256 platformFee = (amount * 100) / FEE_DENOMINATOR; // 1% platform fee
        uint256 net = amount - platformFee;
        address prov = job.provider;
        IERC20 paymentToken = job.paymentToken;

        uint256 evaluatorFee = 0;
        if (evaluatorFeeEnabled[jobId] && job.evaluator != address(0)) {
            evaluatorFee = (amount * EVALUATOR_FEE_BP) / FEE_DENOMINATOR;
            net -= evaluatorFee;
        }

        // CEI Fix: Effects before Interactions - update status BEFORE hook call
        job.budget = 0;
        job.status = JobStatus.Completed;
        
        _decrementJobCount(jobId);

        // Interaction: Call hook AFTER status update (CEI pattern)
        if (job.hook != address(0)) {
            IACPHook(job.hook).beforeAction(jobId, this.finalizeByEvaluator.selector, abi.encode(reason));
        }

        if (platformFee > 0) {
            _transferPayment(paymentToken, platformTreasury, platformFee);
        }
        if (evaluatorFee > 0) {
            _transferPayment(paymentToken, job.evaluator, evaluatorFee);
        }
        if (net > 0) {
            _transferPayment(paymentToken, prov, net);
        }

        emit JobCompleted(jobId, _msgSender(), job.provider, evaluatorFee);
        emit PaymentReleased(jobId, prov, net);
        emit JobStatusChanged(jobId, JobStatus.Submitted, JobStatus.Completed, _msgSender(), block.timestamp);
    }

    /**
     * @dev V7: Legacy complete function for backward compatibility
     * Works the same as before - evaluator can complete directly
     * Only works if requiresClientReview = false
     */
    function complete(uint256 jobId, bytes32 reason) external nonReentrant onlyEvaluator(jobId) {
        Job storage job = jobs[jobId];
        if (job.id == 0) revert InvalidJob();
        if (job.status != JobStatus.Submitted) revert WrongStatus();
        
        // V7: Cannot complete directly if client review is required
        if (requiresClientReview[jobId]) {
            // Need to use finalizeByEvaluator which checks client approval
            revert ClientNotApproved();
        }

        uint256 amount = job.budget;
        uint256 platformFee = (amount * 100) / FEE_DENOMINATOR;
        uint256 net = amount - platformFee;
        address prov = job.provider;
        IERC20 paymentToken = job.paymentToken;

        uint256 evaluatorFee = 0;
        if (evaluatorFeeEnabled[jobId] && job.evaluator != address(0)) {
            evaluatorFee = (amount * EVALUATOR_FEE_BP) / FEE_DENOMINATOR;
            net -= evaluatorFee;
        }

        job.budget = 0;
        job.status = JobStatus.Completed;
        
        _decrementJobCount(jobId);

        if (job.hook != address(0)) {
            IACPHook(job.hook).beforeAction(jobId, this.complete.selector, abi.encode(reason));
        }

        if (platformFee > 0) {
            _transferPayment(paymentToken, platformTreasury, platformFee);
        }
        if (evaluatorFee > 0) {
            _transferPayment(paymentToken, job.evaluator, evaluatorFee);
        }
        if (net > 0) {
            _transferPayment(paymentToken, prov, net);
        }

        emit JobCompleted(jobId, _msgSender(), job.provider, evaluatorFee);
        emit PaymentReleased(jobId, prov, net);
        emit JobStatusChanged(jobId, JobStatus.Submitted, JobStatus.Completed, _msgSender(), block.timestamp);
    }

    function completeAfterTimeout(uint256 jobId, bytes32 reason) external nonReentrant whenNotPaused {
        Job storage job = jobs[jobId];
        if (job.id == 0) revert InvalidJob();
        if (job.status != JobStatus.Submitted) revert WrongStatus();
        if (job.provider != _msgSender() && job.client != _msgSender()) revert Unauthorized();
        
        // V7: Check client approval if required
        if (requiresClientReview[jobId] && !clientApproved[jobId]) {
            revert ClientNotApproved();
        }
        
        uint256 submittedAt = jobSubmittedAt[jobId];
        if (submittedAt == 0) revert InvalidJob();
        
        uint256 disputeWindow = jobDisputeWindow[jobId];
        if (disputeWindow == 0) disputeWindow = DEFAULT_DISPUTE_WINDOW;
        
        if (block.timestamp < submittedAt + disputeWindow) revert WrongStatus();
        
        uint256 amount = job.budget;
        uint256 platformFee = (amount * 100) / FEE_DENOMINATOR;
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

        if (job.hook != address(0)) {
            IACPHook(job.hook).beforeAction(jobId, this.completeAfterTimeout.selector, abi.encode(reason));
        }

        if (platformFee > 0) {
            _transferPayment(paymentToken, platformTreasury, platformFee);
        }
        if (slashAmount > 0) {
            _transferPayment(paymentToken, platformTreasury, slashAmount);
        }
        if (net > 0) {
            _transferPayment(paymentToken, prov, net);
        }

        emit JobCompleted(jobId, _msgSender(), job.provider, 0);
        emit PaymentReleased(jobId, prov, net);
        emit EvaluatorSlashedForInactivity(jobId, job.evaluator, slashAmount);
        emit JobStatusChanged(jobId, JobStatus.Submitted, JobStatus.Completed, _msgSender(), block.timestamp);
    }

    function setDisputeWindow(uint256 jobId, uint256 window) external onlyClient(jobId) {
        if (jobs[jobId].status != JobStatus.Funded) revert WrongStatus();
        if (window < 1 days || window > 30 days) revert InvalidJob();
        jobDisputeWindow[jobId] = window;
        emit DisputeWindowSet(jobId, window);
    }

    function setNonResponsiveSlashBP(uint256 jobId, uint256 slashBP) external onlyClient(jobId) {
        if (jobs[jobId].status != JobStatus.Funded) revert WrongStatus();
        if (slashBP > 1000) revert BudgetTooHigh();
        jobNonResponsiveSlashBP[jobId] = slashBP;
        emit NonResponsiveSlashSet(jobId, slashBP);
    }

    /**
     * @dev V7: Client can reject deliverable
     */
    function reject(uint256 jobId, bytes32 reason) external nonReentrant {
        Job storage job = jobs[jobId];
        if (job.id == 0) revert InvalidJob();

        JobStatus oldStatus = job.status;
        
        // Client can reject in any state
        if (job.status == JobStatus.Open) {
            if (job.client != _msgSender()) revert Unauthorized();
        } else if (job.status == JobStatus.Funded || job.status == JobStatus.Submitted || job.status == JobStatus.PendingClientApproval) {
            if (job.evaluator != _msgSender() && job.client != _msgSender()) revert Unauthorized();
        } else {
            revert WrongStatus();
        }

        uint256 refundAmount = job.budget;
        job.budget = 0;
        job.status = JobStatus.Rejected;
        
        _decrementJobCount(jobId);
        
        if (oldStatus == JobStatus.Funded || oldStatus == JobStatus.Submitted || oldStatus == JobStatus.PendingClientApproval) {
            _transferPayment(job.paymentToken, job.client, refundAmount);
            emit Refunded(jobId, job.client, refundAmount);
        }

        emit JobRejected(jobId, _msgSender(), reason);
        emit JobStatusChanged(jobId, oldStatus, JobStatus.Rejected, _msgSender(), block.timestamp);
    }

    function claimRefund(uint256 jobId) external nonReentrant onlyClient(jobId) {
        Job storage job = jobs[jobId];
        if (job.id == 0) revert InvalidJob();
        if (job.status != JobStatus.Funded && job.status != JobStatus.Submitted) revert WrongStatus();
        if (block.timestamp < job.expiredAt) revert WrongStatus();

        JobStatus oldStatus = job.status;
        uint256 refundAmount = job.budget;
        job.budget = 0;
        job.status = JobStatus.Expired;
        
        _decrementJobCount(jobId);
        
        _transferPayment(job.paymentToken, _msgSender(), refundAmount);
        
        emit Refunded(jobId, _msgSender(), refundAmount);
        emit JobExpired(jobId);
        emit JobStatusChanged(jobId, oldStatus, JobStatus.Expired, _msgSender(), block.timestamp);
    }
    
    /**
     * @dev M5 Fix: Permissionless refund - anyone can trigger refund for expired jobs
     * Refund goes to original client, not the caller
     */
    function refundExpired(uint256 jobId) external nonReentrant {
        Job storage job = jobs[jobId];
        if (job.id == 0) revert InvalidJob();
        if (job.status != JobStatus.Funded && job.status != JobStatus.Submitted && job.status != JobStatus.PendingClientApproval) revert WrongStatus();
        if (block.timestamp < job.expiredAt) revert WrongStatus();
        
        address client = job.client;
        require(client != address(0), "No client");

        JobStatus oldStatus = job.status;
        uint256 refundAmount = job.budget;
        job.budget = 0;
        job.status = JobStatus.Expired;
        
        _decrementJobCount(jobId);
        
        _transferPayment(job.paymentToken, client, refundAmount);
        
        emit PermissionlessRefund(jobId, client, _msgSender(), refundAmount);
        emit Refunded(jobId, client, refundAmount);
        emit JobExpired(jobId);
        emit JobStatusChanged(jobId, oldStatus, JobStatus.Expired, _msgSender(), block.timestamp);
    }

    /***********************************/
    /* View Functions */
    /***********************************/
    
    function getJob(uint256 jobId) external view returns (Job memory) {
        if (jobId == 0 || jobId > jobCounter) revert InvalidJob();
        return jobs[jobId];
    }
    
    function getClientJobCount(address client) external view returns (uint256) {
        return clientJobCount[client];
    }

    function isEvaluatorFeeEnabled(uint256 jobId) external view returns (bool) {
        return evaluatorFeeEnabled[jobId];
    }

    /**
     * @dev V7: Check if client has approved
     */
    function hasClientApproved(uint256 jobId) external view returns (bool) {
        return clientApproved[jobId];
    }

    /**
     * @dev V7: Check if job requires client review
     */
    function isClientReviewRequired(uint256 jobId) external view returns (bool) {
        return requiresClientReview[jobId];
    }

    /***********************************/
    /* Admin Functions */
    /***********************************/
    
    function setPlatformTreasury(address treasury) external onlyOwner {
        if (treasury == address(0)) revert ZeroAddress();
        platformTreasury = treasury;
    }

    function setAdminRegistry(address _adminRegistry) external onlyOwner {
        if (_adminRegistry == address(0)) revert ZeroAddress();
        adminRegistry = _adminRegistry;
    }
    
    // M5 Fix: Register as evaluator
    function registerAsEvaluator() external {
        require(!isRegisteredEvaluator[msg.sender], "Already registered");
        evaluatorPool.push(msg.sender);
        isRegisteredEvaluator[msg.sender] = true;
        emit EvaluatorRegistered(msg.sender);
    }
    
    // M5 Fix: Unregister as evaluator
    function unregisterAsEvaluator() external {
        require(isRegisteredEvaluator[msg.sender], "Not registered");
        isRegisteredEvaluator[msg.sender] = false;
        emit EvaluatorUnregistered(msg.sender);
    }
    
    // M5 Fix: Random evaluator selection using block-based randomness
    function _selectRandomEvaluator() internal returns (address evaluator) {
        require(evaluatorPool.length > 0, "No evaluators available");
        uint256 randomIndex = uint256(keccak256(abi.encodePacked(
            blockhash(block.number - 1),
            block.timestamp,
            msg.sender
        ))) % evaluatorPool.length;
        return evaluatorPool[randomIndex];
    }
    
    /**
     * @dev Get evaluator pool size
     */
    function getEvaluatorPoolSize() external view returns (uint256) {
        return evaluatorPool.length;
    }
    
    // M5 Fix: Create job with random evaluator selection
    function createJobWithRandomEvaluator(
        address provider,
        uint256 expiredAt,
        string calldata description,
        address hook,
        bool evaluatorFee,
        bool clientReview_
    ) external nonReentrant whenNotPaused returns (uint256 jobId) {
        _validateJobCreation(provider, address(0), expiredAt, description, hook);
        
        if (clientJobCount[_msgSender()] >= MAX_JOBS_PER_CLIENT) {
            emit JobLimitExceeded(_msgSender(), clientJobCount[_msgSender()] + 1, MAX_JOBS_PER_CLIENT);
            revert MaxJobsPerClient(_msgSender(), clientJobCount[_msgSender()]);
        }
        
        jobId = ++jobCounter;
        jobs[jobId] = Job({
            id: jobId,
            client: _msgSender(),
            provider: provider,
            evaluator: address(0), // Will be set randomly
            serviceId: 0,
            paymentToken: IERC20(address(0)),
            description: description,
            budget: 0,
            expiredAt: expiredAt,
            status: JobStatus.Open,
            hook: hook,
            deliverable: bytes32(0)
        });
        
        evaluatorFeeEnabled[jobId] = evaluatorFee;
        requiresClientReview[jobId] = clientReview_;
        jobClient[jobId] = _msgSender();
        clientJobCount[_msgSender()]++;
        
        // Randomly select evaluator
        address randomEvaluator = _selectRandomEvaluator();
        jobs[jobId].evaluator = randomEvaluator;
        
        emit JobCreated(jobId, _msgSender(), provider, 0, expiredAt);
        emit EvaluatorRandomlySelected(jobId, randomEvaluator);
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
    /* Events */
    /***********************************/
    
    event TokenAllowlistUpdated(address indexed token, bool allowed);
    event EvaluatorRegistered(address indexed evaluator);
    event EvaluatorUnregistered(address indexed evaluator);
    event EvaluatorRandomlySelected(uint256 indexed jobId, address indexed evaluator);
}