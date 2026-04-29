// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IACPHook} from "./IACPHook.sol";
import {IAgenticCommerceV9} from "../interfaces/IAgenticCommerceV9.sol";
import {IPriceOracleV2} from "../interfaces/IPriceOracleV2.sol";
import {AdminRegistry} from "./AdminRegistry.sol";

/**
 * @title AgenticCommerceV9
 * @dev UUPS Upgradeable Agentic Commerce Protocol V9
 * 
 * V9 Changes:
 * - Multi-token minimum budget support (configurable per token)
 * - Owner-changeable minBudgetUsd baseline
 * - Per-token minimum budget overrides
 * - Stablecoin detection for USD-denominated minimums
 * - Removed hardcoded MIN_BUDGET_USDC/MIN_BUDGET_ETH constants
 * - Removed redundant MIN_ETH_PAYMENT check
 */
contract AgenticCommerceV9 is 
    IAgenticCommerceV9, 
    ContextUpgradeable,
    OwnableUpgradeable, 
    UUPSUpgradeable, 
    PausableUpgradeable,
    ReentrancyGuard
{
    using SafeERC20 for IERC20;

    /***********************************/
    /* Constants */
    /***********************************/
    
    uint256 public constant FEE_DENOMINATOR = 10000;
    uint256 public constant EVALUATOR_FEE_BP = 100; // 1%
    
    uint256 public constant MAX_JOBS_PER_CLIENT = 100;
    uint256 public constant MAX_DESCRIPTION_LENGTH = 1000;
    uint256 public constant MIN_EXPIRY_DURATION = 5 minutes;
    uint256 public constant MAX_EXPIRY_DURATION = 365 days;
    uint256 public constant DEFAULT_DISPUTE_WINDOW = 7 days;
    uint256 public constant DEFAULT_NONRESPONSIVE_SLASH_BP = 100;

    /***********************************/
    /* State Variables */
    /***********************************/
    
    // V9: Multi-token minimum budget configuration
    uint256 public minBudgetUsd; // Base minimum in 6-decimal USD terms ($5 = 5e6)
    mapping(address => uint256) public minBudgetOverride; // Per-token override (0 = use default)
    mapping(address => bool) public isStablecoin; // True for stablecoins (1:1 with USD)
    
    address public platformTreasury;
    address public adminRegistry;
    IPriceOracleV2 public priceOracle; // V9: Price oracle for dynamic minimums

    mapping(uint256 => Job) public jobs;
    uint256 public jobCounter;
    
    mapping(address => uint256) public clientJobCount;
    mapping(uint256 => address) public jobClient;

    mapping(uint256 => bool) public evaluatorFeeEnabled;
    mapping(uint256 => bool) public requiresClientReview;
    mapping(uint256 => bool) public clientApproved;
    mapping(uint256 => uint256) public clientApprovedAt;
    mapping(uint256 => uint256) public jobDisputeWindow;
    mapping(uint256 => uint256) public jobNonResponsiveSlashBP;
    mapping(uint256 => uint256) public jobSubmittedAt;

    mapping(address => bool) public allowedTokens;
    
    // Evaluator pool for random selection
    address[] public evaluatorPool;
    mapping(address => bool) public isRegisteredEvaluator;

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
    error TokenNotConfigured(address token);
    error ClientNotApproved();
    error InsufficientPayment();
    error RolesMustBeDistinct();
    error InvalidPrice();

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
    
    function initialize(address _platformTreasury, address _adminRegistry, address _priceOracle) external initializer {
        __Context_init();
        __Ownable_init(_msgSender());
        __UUPSUpgradeable_init();
        __Pausable_init();
        
        platformTreasury = _platformTreasury;
        adminRegistry = _adminRegistry;
        priceOracle = IPriceOracleV2(_priceOracle);
        
        // V9: Default minimum budget $5 USD
        minBudgetUsd = 5e6;
        
        // Default allowed tokens
        allowedTokens[address(0)] = true; // Native ETH
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /***********************************/
    /* V9: Multi-Token Budget Minimums */
    /***********************************/
    
    /**
     * @dev Calculate the minimum budget for a specific token
     * @param token The payment token address (address(0) for ETH)
     * @param decimals The token's decimal places
     * @return The minimum budget amount in the token's native units
     */
    function getMinBudget(address token, uint8 decimals) public view returns (uint256) {
        // Check for per-token override first
        if (minBudgetOverride[token] > 0) {
            return minBudgetOverride[token];
        }
        
        // Stablecoins: direct USD amount adjusted for decimals
        if (isStablecoin[token]) {
            return minBudgetUsd * (10 ** (decimals - 6));
        }
        
        // ETH: use price oracle for dynamic calculation
        if (token == address(0)) {
            int256 ethPrice = priceOracle.getUsdPriceOfToken(address(0));
            if (ethPrice <= 0) revert InvalidPrice();
            // minBudgetUsd (6 dec) * 10^(decimals-6) * 10^8 (chainlink dec) / ethPrice (8 dec)
            return (minBudgetUsd * (10 ** (decimals - 6)) * 1e8) / uint256(ethPrice);
        }
        
        // Volatile tokens: use price oracle
        int256 tokenPrice = priceOracle.getUsdPriceOfToken(token);
        if (tokenPrice > 0) {
            return (minBudgetUsd * (10 ** (decimals - 6)) * 1e8) / uint256(tokenPrice);
        }
        
        revert InvalidPrice();
    }
    
    function setMinBudgetUsd(uint256 newMin) external onlyOwner {
        uint256 oldMin = minBudgetUsd;
        minBudgetUsd = newMin;
        emit MinBudgetChanged(address(0), oldMin, newMin);
    }
    
    function setMinBudgetOverride(address token, uint256 minAmount) external onlyOwner {
        minBudgetOverride[token] = minAmount;
        emit MinBudgetOverrideChanged(token, minAmount);
    }
    
    function setStablecoin(address token, bool isStable) external onlyOwner {
        isStablecoin[token] = isStable;
        emit StablecoinStatusChanged(token, isStable);
    }

    /***********************************/
    /* Token Management */
    /***********************************/
    
    function setAllowedToken(address token, bool allowed) external onlyOwner {
        allowedTokens[token] = allowed;
        emit TokenAllowlistUpdated(token, allowed);
    }
    
    function _isTokenAllowed(address token) internal view returns (bool) {
        if (token == address(0)) return true;
        return allowedTokens[token];
    }

    /***********************************/
    /* Core Job Functions - V9 Enhanced */
    /***********************************/
    
    /**
     * @dev V9: Create job with multi-token budget validation
     */
    function createJob(
        address provider,
        uint256 budget,
        address paymentToken,
        uint256 serviceId,
        uint256 expiredAt,
        string calldata description,
        address evaluator,
        address hook,
        bool evaluatorFee,
        bool clientReview_,
        bool fundNow,
        uint256 fundAmount
    ) external payable nonReentrant whenNotPaused returns (uint256 jobId) {
        // Validate inputs
        _validateJobCreation(provider, evaluator, expiredAt, description, hook);
        
        if (!_isTokenAllowed(paymentToken)) revert TokenNotAllowed(paymentToken);
        
        // V9: Validate budget using multi-token minimum
        if (budget > 0) {
            uint8 decimals = _getTokenDecimals(paymentToken);
            uint256 minBudget = getMinBudget(paymentToken, decimals);
            if (budget < minBudget) revert BudgetTooLow();
        }
        
        // Blacklist check
        if (adminRegistry != address(0)) {
            AdminRegistry registry = AdminRegistry(adminRegistry);
            if (registry.isWalletBlacklistedActive(_msgSender())) revert("Client blacklisted");
            if (registry.isWalletBlacklistedActive(provider)) revert("Provider blacklisted");
            if (evaluator != address(0) && registry.isWalletBlacklistedActive(evaluator)) revert("Evaluator blacklisted");
        }
        
        if (clientJobCount[_msgSender()] >= MAX_JOBS_PER_CLIENT) {
            revert MaxJobsPerClient(_msgSender(), clientJobCount[_msgSender()]);
        }
        
        jobId = ++jobCounter;
        
        // Determine evaluator - random or specified
        address finalEvaluator = evaluator;
        bool isRandomEvaluator = (evaluator == address(0));
        if (isRandomEvaluator) {
            finalEvaluator = _selectRandomEvaluator();
        }
        
        // Set job status based on funding
        JobStatus initialStatus = fundNow ? JobStatus.Funded : JobStatus.Open;
        
        jobs[jobId] = Job({
            id: jobId,
            client: _msgSender(),
            provider: provider,
            evaluator: finalEvaluator,
            serviceId: serviceId,
            paymentToken: IERC20(paymentToken),
            description: description,
            budget: budget,
            expiredAt: expiredAt,
            status: initialStatus,
            hook: hook,
            deliverable: bytes32(0)
        });
        
        evaluatorFeeEnabled[jobId] = evaluatorFee;
        requiresClientReview[jobId] = clientReview_;
        jobClient[jobId] = _msgSender();
        clientJobCount[_msgSender()]++;
        
        // Handle immediate funding
        if (fundNow) {
            uint256 amountToFund = fundAmount > 0 ? fundAmount : budget;
            if (amountToFund == 0) revert ZeroBudget();
            
            if (paymentToken == address(0)) {
                // Native ETH
                if (msg.value < amountToFund) revert InsufficientPayment();
                
                uint256 excess = msg.value - amountToFund;
                if (excess > 0) payable(_msgSender()).transfer(excess);
            } else {
                // ERC20
                if (msg.value > 0) revert InvalidJob();
                
                IERC20 token = IERC20(paymentToken);
                uint256 allowance = token.allowance(_msgSender(), address(this));
                if (allowance < amountToFund) revert InsufficientPayment();
                
                token.safeTransferFrom(_msgSender(), address(this), amountToFund);
            }
            
            emit JobFunded(jobId, _msgSender(), amountToFund);
        }
        
        emit JobCreated(jobId, _msgSender(), provider, budget, expiredAt);
        
        if (isRandomEvaluator) {
            emit EvaluatorRandomlySelected(jobId, finalEvaluator);
        }
    }

    /**
     * @dev V7 backward-compatible createJob (no budget, no immediate funding)
     */
    function createJobV7(
        address provider,
        address evaluator,
        uint256 expiredAt,
        string calldata description,
        address hook,
        bool evaluatorFee,
        bool clientReview_
    ) external nonReentrant whenNotPaused returns (uint256 jobId) {
        _validateJobCreation(provider, evaluator, expiredAt, description, hook);
        
        if (adminRegistry != address(0)) {
            AdminRegistry registry = AdminRegistry(adminRegistry);
            if (registry.isWalletBlacklistedActive(_msgSender())) revert("Client blacklisted");
            if (registry.isWalletBlacklistedActive(provider)) revert("Provider blacklisted");
            if (evaluator != address(0) && registry.isWalletBlacklistedActive(evaluator)) revert("Evaluator blacklisted");
        }
        
        if (clientJobCount[_msgSender()] >= MAX_JOBS_PER_CLIENT) {
            revert MaxJobsPerClient(_msgSender(), clientJobCount[_msgSender()]);
        }
        
        jobId = ++jobCounter;
        
        address finalEvaluator = evaluator;
        bool isRandomEvaluator = (evaluator == address(0));
        if (isRandomEvaluator) {
            finalEvaluator = _selectRandomEvaluator();
        }
        
        jobs[jobId] = Job({
            id: jobId,
            client: _msgSender(),
            provider: provider,
            evaluator: finalEvaluator,
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

        emit JobCreated(jobId, _msgSender(), provider, 0, expiredAt);
        
        if (isRandomEvaluator) {
            emit EvaluatorRandomlySelected(jobId, finalEvaluator);
        }
    }

    /***********************************/
    /* Job Management Functions */
    /***********************************/
    
    function setBudget(uint256 jobId, uint256 amount) external nonReentrant onlyClient(jobId) {
        Job storage job = jobs[jobId];
        if (job.id == 0) revert InvalidJob();
        if (job.status != JobStatus.Open) revert WrongStatus();
        if (amount == 0) revert ZeroBudget();
        
        // V9: Validate against token-specific minimum
        address paymentToken = address(job.paymentToken);
        uint8 decimals = _getTokenDecimals(paymentToken);
        uint256 minBudget = getMinBudget(paymentToken, decimals);
        if (amount < minBudget) revert BudgetTooLow();
        
        uint256 oldBudget = job.budget;
        job.budget = amount;
        
        emit JobBudgetUpdated(jobId, oldBudget, amount);
    }

    function setPaymentToken(uint256 jobId, address paymentToken) external onlyAllowedToken(paymentToken) onlyClient(jobId) {
        Job storage job = jobs[jobId];
        if (job.id == 0) revert InvalidJob();
        if (job.status != JobStatus.Open) revert WrongStatus();
        
        address oldToken = address(job.paymentToken);
        job.paymentToken = IERC20(paymentToken);
        
        emit JobPaymentTokenUpdated(jobId, oldToken, paymentToken);
    }

    function fund(uint256 jobId, uint256 expectedBudget) external payable nonReentrant onlyClient(jobId) {
        Job storage job = jobs[jobId];
        if (job.id == 0) revert InvalidJob();
        if (job.status != JobStatus.Open) revert WrongStatus();
        if (job.provider == address(0)) revert ProviderNotSet();
        if (job.budget == 0) revert ZeroBudget();
        if (block.timestamp >= job.expiredAt) revert InvalidJob();
        
        uint256 cachedBudget = job.budget;
        if (expectedBudget != 0 && cachedBudget != expectedBudget) {
            revert BudgetMismatch(expectedBudget, cachedBudget);
        }
        
        JobStatus oldStatus = job.status;
        job.status = JobStatus.Funded;
        
        if (job.hook != address(0)) {
            IACPHook(job.hook).beforeAction(jobId, this.fund.selector, "");
        }
        
        if (address(job.paymentToken) == address(0)) {
            if (msg.value < cachedBudget) revert BudgetTooLow();
            
            uint256 excess = msg.value - cachedBudget;
            if (excess > 0) payable(_msgSender()).transfer(excess);
        } else {
            if (msg.value != 0) revert InvalidJob();
            job.paymentToken.safeTransferFrom(_msgSender(), address(this), cachedBudget);
        }
        
        emit JobFunded(jobId, _msgSender(), cachedBudget);
        emit JobStatusChanged(jobId, oldStatus, JobStatus.Funded, _msgSender(), block.timestamp);
    }

    function submit(uint256 jobId, bytes32 deliverable) external nonReentrant onlyProvider(jobId) {
        Job storage job = jobs[jobId];
        if (job.id == 0) revert InvalidJob();
        if (job.status != JobStatus.Funded) revert WrongStatus();

        JobStatus oldStatus = job.status;
        
        if (requiresClientReview[jobId]) {
            job.status = JobStatus.PendingClientApproval;
        } else {
            job.status = JobStatus.Submitted;
        }
        
        job.deliverable = deliverable;
        jobSubmittedAt[jobId] = block.timestamp;
        
        if (job.hook != address(0)) {
            IACPHook(job.hook).beforeAction(jobId, this.submit.selector, "");
        }
        
        emit JobSubmitted(jobId, _msgSender(), deliverable);
        emit JobStatusChanged(jobId, oldStatus, job.status, _msgSender(), block.timestamp);
    }

    function approveByClient(uint256 jobId) external nonReentrant onlyClient(jobId) {
        Job storage job = jobs[jobId];
        if (job.id == 0) revert InvalidJob();
        if (job.status != JobStatus.PendingClientApproval) revert WrongStatus();
        
        clientApproved[jobId] = true;
        clientApprovedAt[jobId] = block.timestamp;
        job.status = JobStatus.Submitted;
        
        emit JobStatusChanged(jobId, JobStatus.PendingClientApproval, JobStatus.Submitted, _msgSender(), block.timestamp);
    }

    function finalizeByEvaluator(uint256 jobId, bytes32 reason) external nonReentrant onlyEvaluator(jobId) {
        Job storage job = jobs[jobId];
        if (job.id == 0) revert InvalidJob();
        if (job.status != JobStatus.Submitted) revert WrongStatus();
        
        // If client review was required, verify it's approved
        if (requiresClientReview[jobId] && !clientApproved[jobId]) revert ClientNotApproved();
        
        _releasePayment(jobId, reason);
    }

    function _releasePayment(uint256 jobId, bytes32 reason) internal {
        Job storage job = jobs[jobId];
        JobStatus oldStatus = job.status;
        job.status = JobStatus.Completed;
        
        uint256 amount = job.budget;
        job.budget = 0;
        
        // Calculate fees
        uint256 platformFee = (amount * 100) / FEE_DENOMINATOR; // 1%
        uint256 evaluatorFeeAmount = evaluatorFeeEnabled[jobId] ? (amount * EVALUATOR_FEE_BP) / FEE_DENOMINATOR : 0;
        uint256 providerPayment = amount - platformFee - evaluatorFeeAmount;
        
        // Transfer payments
        _transferPayment(job.paymentToken, platformTreasury, platformFee);
        
        if (evaluatorFeeAmount > 0) {
            _transferPayment(job.paymentToken, job.evaluator, evaluatorFeeAmount);
        }
        
        _transferPayment(job.paymentToken, job.provider, providerPayment);
        
        if (job.hook != address(0)) {
            IACPHook(job.hook).beforeAction(jobId, this.finalizeByEvaluator.selector, "");
        }
        
        emit PaymentReleased(jobId, providerPayment, platformFee, evaluatorFeeAmount);
        emit JobStatusChanged(jobId, oldStatus, JobStatus.Completed, _msgSender(), block.timestamp);
    }

    function _transferPayment(IERC20 token, address to, uint256 amount) internal {
        if (amount == 0) return;
        if (address(token) == address(0)) {
            payable(to).transfer(amount);
        } else {
            token.safeTransfer(to, amount);
        }
    }

    /***********************************/
    /* Evaluator Pool Functions */
    /***********************************/
    
    function registerAsEvaluator() external {
        require(!isRegisteredEvaluator[msg.sender], "Already registered");
        evaluatorPool.push(msg.sender);
        isRegisteredEvaluator[msg.sender] = true;
        emit EvaluatorRegistered(msg.sender);
    }
    
    function unregisterAsEvaluator() external {
        require(isRegisteredEvaluator[msg.sender], "Not registered");
        
        // Remove from pool
        for (uint256 i = 0; i < evaluatorPool.length; i++) {
            if (evaluatorPool[i] == msg.sender) {
                evaluatorPool[i] = evaluatorPool[evaluatorPool.length - 1];
                evaluatorPool.pop();
                break;
            }
        }
        
        isRegisteredEvaluator[msg.sender] = false;
        emit EvaluatorUnregistered(msg.sender);
    }
    
    function getEvaluatorPoolSize() external view returns (uint256) {
        return evaluatorPool.length;
    }
    
    // V8: Improved randomness using block.prevrandao
    function _selectRandomEvaluator() internal returns (address evaluator) {
        require(evaluatorPool.length > 0, "No evaluators available");
        
        uint256 randomIndex = uint256(keccak256(abi.encodePacked(
            block.prevrandao,
            block.timestamp,
            msg.sender,
            jobCounter
        ))) % evaluatorPool.length;
        
        evaluator = evaluatorPool[randomIndex];
        if (!isRegisteredEvaluator[evaluator]) {
            for (uint256 i = 0; i < evaluatorPool.length; i++) {
                if (isRegisteredEvaluator[evaluatorPool[i]]) {
                    return evaluatorPool[i];
                }
            }
            revert("No active evaluators");
        }
    }

    /***********************************/
    /* Validation */
    /***********************************/
    
    function _validateJobCreation(
        address provider,
        address evaluator,
        uint256 expiredAt,
        string calldata description,
        address hook
    ) internal view {
        if (provider == address(0)) revert ZeroAddress();
        if (evaluator != address(0)) {
            if (_msgSender() == evaluator) revert RolesMustBeDistinct();
            if (provider == evaluator) revert RolesMustBeDistinct();
        }
        if (expiredAt <= block.timestamp + MIN_EXPIRY_DURATION) revert ExpiryTooShort();
        if (expiredAt > block.timestamp + MAX_EXPIRY_DURATION) revert ExpiryTooLong();
        if (bytes(description).length == 0 || bytes(description).length > MAX_DESCRIPTION_LENGTH) revert InvalidJob();
    }
    
    /**
     * @dev Get token decimals. Uses IERC20Metadata if available, falls back to 18 for ETH.
     */
    function _getTokenDecimals(address token) internal view returns (uint8) {
        if (token == address(0)) return 18;
        
        // Try to call decimals() on the token
        (bool success, bytes memory data) = token.staticcall(abi.encodeWithSignature("decimals()"));
        if (success && data.length >= 32) {
            return abi.decode(data, (uint8));
        }
        
        // Default to 18 if call fails
        return 18;
    }

    /***********************************/
    /* Admin Functions */
    /***********************************/
    
    function setPlatformTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Zero address");
        platformTreasury = _treasury;
    }
    
    function setAdminRegistry(address _registry) external onlyOwner {
        adminRegistry = _registry;
    }
    
    function setPriceOracle(address _priceOracle) external onlyOwner {
        require(_priceOracle != address(0), "Zero address");
        priceOracle = IPriceOracleV2(_priceOracle);
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }

    /***********************************/
    /* Events */
    /***********************************/
    
    // V9 Events
    event MinBudgetChanged(address indexed token, uint256 oldMin, uint256 newMin);
    event MinBudgetOverrideChanged(address indexed token, uint256 minAmount);
    event StablecoinStatusChanged(address indexed token, bool isStable);
    
    // V8 Events
    event TokenAllowlistUpdated(address indexed token, bool allowed);
    event EvaluatorRegistered(address indexed evaluator);
    event EvaluatorUnregistered(address indexed evaluator);
    event EvaluatorRandomlySelected(uint256 indexed jobId, address indexed evaluator);
    event JobBudgetUpdated(uint256 indexed jobId, uint256 oldBudget, uint256 newBudget);
    event JobPaymentTokenUpdated(uint256 indexed jobId, address oldToken, address newToken);
    event JobCreated(uint256 indexed jobId, address indexed client, address provider, uint256 budget, uint256 expiredAt);
    event JobFunded(uint256 indexed jobId, address indexed client, uint256 amount);
    event JobSubmitted(uint256 indexed jobId, address indexed provider, bytes32 deliverable);
    event JobStatusChanged(uint256 indexed jobId, JobStatus oldStatus, JobStatus newStatus, address changedBy, uint256 timestamp);
    event PaymentReleased(uint256 indexed jobId, uint256 providerAmount, uint256 platformFee, uint256 evaluatorFee);
}