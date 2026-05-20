// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
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
import {IServiceRegistryV2} from "./ServiceRegistryV2.sol";

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
    Ownable2StepUpgradeable, 
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
    uint256 public constant MAX_BUDGET_USD = 1_000_000e6; // $1M USD (6 decimals)
    uint256 public constant MIN_EVALUATOR_STAKE = 0.01 ether; // 0.01 ETH stake required
    uint256 public constant EVALUATOR_REVEAL_DELAY = 6; // 6 blocks commit-reveal delay
    uint256 public constant MIN_PLATFORM_FEE = 1; // M2-01: Minimum 1 wei platform fee to prevent dust loss

    /***********************************/
    /* State Variables */
    /***********************************/
    
    // V9: Multi-token minimum budget configuration
    uint256 public minBudgetUsd; // Base minimum in 6-decimal USD terms ($5 = 5e6)
    uint256 public maxBudgetUsd; // Max budget in 6-decimal USD terms ($1M = 1_000_000e6)
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
    mapping(address => uint256) public evaluatorStakes; // A3-01: ETH stake per evaluator
    
    // Commit-reveal for random evaluator selection (A3-02/F8-01)
    struct EvaluatorCommit {
        bytes32 commitHash;
        uint256 commitBlock;
        bool revealed;
    }
    mapping(uint256 => EvaluatorCommit) public evaluatorCommits;
    mapping(uint256 => uint256) public jobCreationBlock;

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
    error EvaluatorAlreadyRegistered();
    error EvaluatorNotRegistered();
    error NoEvaluatorsAvailable();
    error InsufficientEvaluatorStake();
    error EvaluatorNotRevealed();
    error RevealTooEarly();
    error NoCommitFound();
    error InvalidCommit();
    error BlockhashUnavailable();
    error NoActiveEvaluators();
    error ClientBlacklisted();
    error ProviderBlacklisted();
    error EvaluatorBlacklisted();
    error JobNotExpired();
    error DisputeWindowTooShort();
    error DisputeWindowTooLong();
    error SlashBPTooHigh();
    error DecimalsQueryFailed(address token);
    error InvalidDecimals(address token, uint8 decimals);
    error EthTransferFailed();
    error RefundFailed();
    error StakeRefundFailed();
    error StakeTransferFailed();

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

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    function initialize(address _platformTreasury, address _adminRegistry, address _priceOracle) external initializer {
        __Context_init();
        __Ownable_init(_msgSender());
        __Pausable_init();
        
        platformTreasury = _platformTreasury;
        adminRegistry = _adminRegistry;
        priceOracle = IPriceOracleV2(_priceOracle);
        
        // V9: Default minimum budget $5 USD, max $1M USD
        minBudgetUsd = 5e6;
        maxBudgetUsd = MAX_BUDGET_USD;
        
        // Default allowed tokens
        allowedTokens[address(0)] = true; // Native ETH
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /***********************************/
    /* V9: Multi-Token Budget Minimums */
    /***********************************/
    
    /**
     * @dev Check if budget exceeds the maximum allowed in USD terms.
     * @param token The payment token address.
     * @param decimals The token's decimal places.
     * @param budget The budget amount in token's native units.
     */
    function _checkMaxBudget(address token, uint8 decimals, uint256 budget) internal view {
        if (maxBudgetUsd == 0) return;
        if (decimals < 6) decimals = 6;

        uint256 budgetInUsd;
        if (isStablecoin[token]) {
            budgetInUsd = budget / (10 ** (decimals - 6));
        } else if (token == address(0)) {
            int256 ethPrice = priceOracle.getUsdPriceOfToken(address(0));
            if (ethPrice <= 0) return;
            budgetInUsd = (budget * uint256(ethPrice)) / (10 ** decimals) / 100;
        } else {
            int256 tokenPrice = priceOracle.getUsdPriceOfToken(token);
            if (tokenPrice <= 0) return;
            budgetInUsd = (budget * uint256(tokenPrice)) / (10 ** decimals) / 100;
        }

        if (budgetInUsd > maxBudgetUsd) revert BudgetTooHigh();
    }

    /**
     * @dev Calculate the minimum budget for a specific token
     * @param token The payment token address (address(0) for ETH)
     * @param decimals The token's decimal places
     * @return The minimum budget amount in the token's native units
     */
    function getMinBudget(address token, uint8 decimals) public view returns (uint256) {
        if (minBudgetOverride[token] > 0) {
            return minBudgetOverride[token];
        }
        
        if (decimals < 6) decimals = 6;
        
        if (isStablecoin[token]) {
            return minBudgetUsd * (10 ** (decimals - 6));
        }
        
        if (token == address(0)) {
            int256 ethPrice = priceOracle.getUsdPriceOfToken(address(0));
            if (ethPrice <= 0) revert InvalidPrice();
            return (minBudgetUsd * (10 ** (decimals - 6)) * 1e8) / uint256(ethPrice);
        }
        
        int256 tokenPrice = priceOracle.getUsdPriceOfToken(token);
        if (tokenPrice > 0) {
            return (minBudgetUsd * (10 ** (decimals - 6)) * 1e8) / uint256(tokenPrice);
        }
        
        revert InvalidPrice();
    }
    
    /**
     * @dev Set the global minimum budget in USD (6 decimals).
     * @param newMin New minimum budget in USD (e.g., 5e6 for $5).
     */
    function setMinBudgetUsd(uint256 newMin) external onlyOwner {
        if (newMin < 1e6) revert InvalidJob();
        uint256 oldMin = minBudgetUsd;
        minBudgetUsd = newMin;
        emit MinBudgetChanged(address(0), oldMin, newMin);
    }

    /**
     * @dev Set the global maximum budget in USD (6 decimals).
     * @param newMax New maximum budget in USD (e.g., 1_000_000e6 for $1M).
     * Setting to 0 means no maximum (unlimited).
     */
    function setMaxBudgetUsd(uint256 newMax) external onlyOwner {
        if (newMax > 0 && newMax < minBudgetUsd) revert InvalidJob();
        uint256 oldMax = maxBudgetUsd;
        maxBudgetUsd = newMax;
        emit MaxBudgetChanged(oldMax, newMax);
    }

    /**
     * @dev Set a per-token minimum budget override.
     * @param token Token address.
     * @param minAmount Minimum amount in token's native units (0 = remove override).
     */
    function setMinBudgetOverride(address token, uint256 minAmount) external onlyOwner {
        minBudgetOverride[token] = minAmount;
        emit MinBudgetOverrideChanged(token, minAmount);
    }

    /**
     * @dev Mark a token as stablecoin (1:1 with USD) for minimum budget calculation.
     * @param token Token address.
     * @param isStable True if token is a stablecoin.
     */
    function setStablecoin(address token, bool isStable) external onlyOwner {
        isStablecoin[token] = isStable;
        emit StablecoinStatusChanged(token, isStable);
    }

    /***********************************/
    /* Token Management */
    /***********************************/
    
    /**
     * @dev Allow or disallow a payment token.
     * @param token Token address.
     * @param allowed True to allow, false to disallow.
     */
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
        return _createJob(
            _msgSender(),
            provider,
            budget,
            paymentToken,
            serviceId,
            expiredAt,
            description,
            evaluator,
            hook,
            evaluatorFee,
            clientReview_,
            fundNow,
            fundAmount
        );
    }

    function createJobForClient(
        address client,
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
        return _createJob(
            client,
            provider,
            budget,
            paymentToken,
            serviceId,
            expiredAt,
            description,
            evaluator,
            hook,
            evaluatorFee,
            clientReview_,
            fundNow,
            fundAmount
        );
    }

    function _createJob(
        address client,
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
    ) internal returns (uint256 jobId) {
        // Validate inputs
        _validateJobCreation(provider, evaluator, expiredAt, description, hook);
        
        if (!_isTokenAllowed(paymentToken)) revert TokenNotAllowed(paymentToken);
        
        if (msg.value > 0 && !fundNow) revert InvalidJob();
        
        // Validate budget using multi-token minimum and maximum
        if (budget == 0) revert ZeroBudget();
        uint8 decimals = _getTokenDecimals(paymentToken);
        uint256 minBudget = getMinBudget(paymentToken, decimals);
        if (budget < minBudget) revert BudgetTooLow();
        _checkMaxBudget(paymentToken, decimals, budget);
        
        // Blacklist check with P7-01 try/catch
        if (adminRegistry != address(0)) {
            try AdminRegistry(adminRegistry).isWalletBlacklistedActive(client) returns (bool isBlacklisted) {
                if (isBlacklisted) revert ClientBlacklisted();
            } catch {
                emit BlacklistCheckFailed(adminRegistry);
                if (blacklistCheckRequired) revert();
            }
            try AdminRegistry(adminRegistry).isWalletBlacklistedActive(provider) returns (bool isBlacklisted) {
                if (isBlacklisted) revert ProviderBlacklisted();
            } catch {
                emit BlacklistCheckFailed(adminRegistry);
                if (blacklistCheckRequired) revert();
            }
            if (evaluator != address(0)) {
                try AdminRegistry(adminRegistry).isWalletBlacklistedActive(evaluator) returns (bool isBlacklisted) {
                    if (isBlacklisted) revert EvaluatorBlacklisted();
                } catch {
                    emit BlacklistCheckFailed(adminRegistry);
                    if (blacklistCheckRequired) revert();
                }
            }
        }

        if (clientJobCount[client] >= MAX_JOBS_PER_CLIENT) {
            revert MaxJobsPerClient(client, clientJobCount[client]);
        }

        jobId = ++jobCounter;

        // Determine evaluator - random or specified
        address finalEvaluator = evaluator;
        bool isRandomEvaluator = (evaluator == address(0));
        
        // A3-02/F8-01: Commit-reveal for random evaluator
        if (isRandomEvaluator) {
            bytes32 salt = keccak256(abi.encodePacked(block.timestamp, msg.sender, jobId));
            evaluatorCommits[jobId] = EvaluatorCommit({
                commitHash: keccak256(abi.encodePacked(salt, jobId, block.number)),
                commitBlock: block.number,
                revealed: false
            });
            jobCreationBlock[jobId] = block.number;
            finalEvaluator = address(0); // Will be finalized after 6 blocks
        }

        // Set job status based on funding
        JobStatus initialStatus = fundNow ? JobStatus.Funded : JobStatus.Open;
        
        jobs[jobId] = Job({
            id: jobId,
            client: client,
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
        jobClient[jobId] = client;
        clientJobCount[client]++;
        
        // Handle immediate funding
        if (fundNow) {
            uint256 amountToFund = fundAmount > 0 ? fundAmount : budget;
            if (amountToFund == 0) revert ZeroBudget();
            
            if (paymentToken == address(0)) {
                // Native ETH
                if (msg.value < amountToFund) revert InsufficientPayment();
                
                uint256 excess = msg.value - amountToFund;
                if (excess > 0) {
                    (bool success, ) = payable(_msgSender()).call{value: excess}("");
                    if (!success) revert RefundFailed();
                }
            } else {
                // ERC20
                if (msg.value > 0) revert InvalidJob();
                
                IERC20 token = IERC20(paymentToken);
                uint256 allowance = token.allowance(_msgSender(), address(this));
                if (allowance < amountToFund) revert InsufficientPayment();
                
                uint256 balanceBefore = token.balanceOf(address(this));
                token.safeTransferFrom(_msgSender(), address(this), amountToFund);
                uint256 balanceAfter = token.balanceOf(address(this));
                if (balanceAfter - balanceBefore != amountToFund) revert InvalidJob();
            }
            
            emit JobFunded(jobId, _msgSender(), amountToFund);
        }
        
        emit JobCreated(jobId, client, provider, budget, expiredAt, evaluatorFee, clientReview_, isRandomEvaluator);
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

        // Blacklist check with P7-01 try/catch
        if (adminRegistry != address(0)) {
            try AdminRegistry(adminRegistry).isWalletBlacklistedActive(_msgSender()) returns (bool isBlacklisted) {
                if (isBlacklisted) revert ClientBlacklisted();
            } catch {
                emit BlacklistCheckFailed(adminRegistry);
                if (blacklistCheckRequired) revert();
            }
            try AdminRegistry(adminRegistry).isWalletBlacklistedActive(provider) returns (bool isBlacklisted) {
                if (isBlacklisted) revert ProviderBlacklisted();
            } catch {
                emit BlacklistCheckFailed(adminRegistry);
                if (blacklistCheckRequired) revert();
            }
            if (evaluator != address(0)) {
                try AdminRegistry(adminRegistry).isWalletBlacklistedActive(evaluator) returns (bool isBlacklisted) {
                    if (isBlacklisted) revert EvaluatorBlacklisted();
                } catch {
                    emit BlacklistCheckFailed(adminRegistry);
                    if (blacklistCheckRequired) revert();
                }
            }
        }

        if (clientJobCount[_msgSender()] >= MAX_JOBS_PER_CLIENT) {
            revert MaxJobsPerClient(_msgSender(), clientJobCount[_msgSender()]);
        }

        jobId = ++jobCounter;

        address finalEvaluator = evaluator;
        bool isRandomEvaluator = (evaluator == address(0));
        if (isRandomEvaluator) {
            bytes32 salt = keccak256(abi.encodePacked(block.timestamp, msg.sender, jobId));
            evaluatorCommits[jobId] = EvaluatorCommit({
                commitHash: keccak256(abi.encodePacked(salt, jobId, block.number)),
                commitBlock: block.number,
                revealed: false
            });
            jobCreationBlock[jobId] = block.number;
            finalEvaluator = address(0);
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

        emit JobCreated(jobId, _msgSender(), provider, 0, expiredAt, evaluatorFee, clientReview_, isRandomEvaluator);
    }

    /***********************************/
    /* Job Management Functions */
    /***********************************/
    
    /**
     * @dev Set the budget for an Open job.
     * @param jobId The job ID.
     * @param amount New budget amount in token's native units.
     */
    function setBudget(uint256 jobId, uint256 amount) external nonReentrant onlyClient(jobId) {
        Job storage job = jobs[jobId];
        if (job.id == 0) revert InvalidJob();
        if (job.status != JobStatus.Open) revert WrongStatus();
        if (amount == 0) revert ZeroBudget();

        // V9: Validate against token-specific minimum and maximum
        address paymentToken = address(job.paymentToken);
        uint8 decimals = _getTokenDecimals(paymentToken);
        uint256 minBudget = getMinBudget(paymentToken, decimals);
        if (amount < minBudget) revert BudgetTooLow();
        _checkMaxBudget(paymentToken, decimals, amount);

        uint256 oldBudget = job.budget;
        job.budget = amount;

        emit JobBudgetUpdated(jobId, oldBudget, amount);
    }

    /**
     * @dev Change the payment token for an Open job.
     * @param jobId The job ID.
     * @param paymentToken New payment token address.
     */
    function setPaymentToken(uint256 jobId, address paymentToken) external onlyAllowedToken(paymentToken) onlyClient(jobId) {
        Job storage job = jobs[jobId];
        if (job.id == 0) revert InvalidJob();
        if (job.status != JobStatus.Open) revert WrongStatus();

        address oldToken = address(job.paymentToken);
        job.paymentToken = IERC20(paymentToken);

        emit JobPaymentTokenUpdated(jobId, oldToken, paymentToken);
    }

    /**
     * @dev Fund an Open job. Client transfers budget to contract.
     * @param jobId The job ID to fund.
     * @param expectedBudget Expected budget (front-running protection, 0 to skip).
     */
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
            try IACPHook(job.hook).beforeAction(jobId, this.fund.selector, "") {
                // hook succeeded
            } catch {
                emit HookFailed(jobId, this.fund.selector);
            }
        }
        
        if (address(job.paymentToken) == address(0)) {
            if (msg.value < cachedBudget) revert BudgetTooLow();
            
            uint256 excess = msg.value - cachedBudget;
            if (excess > 0) {
                (bool successExcess, ) = payable(_msgSender()).call{value: excess}("");
                if (!successExcess) revert EthTransferFailed();
            }
        } else {
            if (msg.value != 0) revert InvalidJob();
            uint256 balanceBefore = job.paymentToken.balanceOf(address(this));
            job.paymentToken.safeTransferFrom(_msgSender(), address(this), cachedBudget);
            uint256 balanceAfter = job.paymentToken.balanceOf(address(this));
            if (balanceAfter - balanceBefore != cachedBudget) revert InvalidJob();
        }
        
        emit JobFunded(jobId, _msgSender(), cachedBudget);
        emit JobStatusChanged(jobId, oldStatus, JobStatus.Funded, _msgSender(), block.timestamp);
    }

    /**
     * @dev Submit work deliverable for a Funded job.
     * @param jobId The job ID.
     * @param deliverable Hash of the deliverable.
     */
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
        
        // Hook before any external calls
        if (job.hook != address(0)) {
            try IACPHook(job.hook).beforeAction(jobId, this.submit.selector, "") {
                // hook succeeded
            } catch {
                emit HookFailed(jobId, this.submit.selector);
            }
        }
        
        emit JobSubmitted(jobId, _msgSender(), deliverable);
        emit JobStatusChanged(jobId, oldStatus, job.status, _msgSender(), block.timestamp);
    }

    /**
     * @dev Approve submitted work by client (required when clientReview is enabled).
     * @param jobId The job ID to approve.
     */
    function approveByClient(uint256 jobId) external nonReentrant onlyClient(jobId) {
        Job storage job = jobs[jobId];
        if (job.id == 0) revert InvalidJob();
        if (job.status != JobStatus.PendingClientApproval) revert WrongStatus();
        if (!requiresClientReview[jobId]) revert ClientNotApproved(); // Explicit defense-in-depth

        clientApproved[jobId] = true;
        clientApprovedAt[jobId] = block.timestamp;
        job.status = JobStatus.Submitted;

        emit JobStatusChanged(jobId, JobStatus.PendingClientApproval, JobStatus.Submitted, _msgSender(), block.timestamp);
    }

    /**
     * @dev Finalize a Submitted job and release payment (evaluator only).
     * @param jobId The job ID.
     * @param reason Finalization reason.
     */
    function finalizeByEvaluator(uint256 jobId, bytes32 reason) external nonReentrant onlyEvaluator(jobId) {
        Job storage job = jobs[jobId];
        if (job.id == 0) revert InvalidJob();
        if (job.status != JobStatus.Submitted) revert WrongStatus();
        
        // If client review was required, verify it's approved
        if (requiresClientReview[jobId] && !clientApproved[jobId]) revert ClientNotApproved();
        
        _releasePayment(jobId, reason);
    }

    function _releasePayment(uint256 jobId, bytes32 /* reason */) internal {
        Job storage job = jobs[jobId];
        JobStatus oldStatus = job.status;
        job.status = JobStatus.Completed;

        uint256 amount = job.budget;
        job.budget = 0;

        // Decrement active job count for the client
        _decrementJobCount(jobId);

        // Calculate fees with M2-01 minimum fee floor
        uint256 platformFee = (amount * 100) / FEE_DENOMINATOR; // 1%
        if (platformFee > 0 && platformFee < MIN_PLATFORM_FEE) platformFee = MIN_PLATFORM_FEE;
        uint256 evaluatorFeeAmount = evaluatorFeeEnabled[jobId] ? (amount * EVALUATOR_FEE_BP) / FEE_DENOMINATOR : 0;
        uint256 providerPayment = amount - platformFee - evaluatorFeeAmount;

        // Hook before transfers (prevents reentrancy after state changes)
        if (job.hook != address(0)) {
            try IACPHook(job.hook).beforeAction(jobId, this.finalizeByEvaluator.selector, "") {
                // hook succeeded
            } catch {
                emit HookFailed(jobId, this.finalizeByEvaluator.selector);
            }
        }

        // Transfer payments
        _transferPayment(job.paymentToken, platformTreasury, platformFee);

        if (evaluatorFeeAmount > 0) {
            _transferPayment(job.paymentToken, job.evaluator, evaluatorFeeAmount);
        }

        _transferPayment(job.paymentToken, job.provider, providerPayment);

        // Refund service listing bond if serviceId is provided and registry is configured
        if (serviceRegistry != address(0) && job.serviceId > 0) {
            try IServiceRegistryV2(serviceRegistry).refundServiceBond(job.serviceId) {} catch {}
        }

        emit PaymentReleased(jobId, providerPayment, platformFee, evaluatorFeeAmount);
        emit JobStatusChanged(jobId, oldStatus, JobStatus.Completed, _msgSender(), block.timestamp);
    }

    /**
     * @dev Decrement client's active job count.
     * @param jobId The job ID to decrement count for.
     */
    function _decrementJobCount(uint256 jobId) internal {
        address client = jobClient[jobId];
        if (client != address(0) && clientJobCount[client] > 0) {
            clientJobCount[client]--;
        }
    }

    function _transferPayment(IERC20 token, address to, uint256 amount) internal {
        if (amount == 0) return;
        if (to == address(0)) revert ZeroAddress();
        if (address(token) == address(0)) {
            (bool success, ) = payable(to).call{value: amount}("");
            if (!success) revert EthTransferFailed();
        } else {
            token.safeTransfer(to, amount);
        }
    }

    /***********************************/
    /* Job Recovery / Timeout Functions */
    /***********************************/

    /**
     * @dev Reject a job. Client can reject Open jobs; Evaluator can reject Funded/Submitted jobs.
     * @param jobId The job ID to reject.
     * @param reason Reason for rejection.
     */
    function reject(uint256 jobId, bytes32 reason) external nonReentrant whenNotPaused {
        Job storage job = jobs[jobId];
        if (job.id == 0) revert InvalidJob();

        JobStatus oldStatus = job.status;

        if (job.status == JobStatus.Open) {
            if (job.client != _msgSender()) revert Unauthorized();
        } else if (job.status == JobStatus.Funded || job.status == JobStatus.Submitted || job.status == JobStatus.PendingClientApproval) {
            if (job.evaluator != _msgSender()) revert Unauthorized();
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

    /**
     * @dev Claim refund for an expired job (client only).
     * @param jobId The job ID to claim refund for.
     */
    function claimRefund(uint256 jobId) external nonReentrant onlyClient(jobId) whenNotPaused {
        Job storage job = jobs[jobId];
        if (job.id == 0) revert InvalidJob();
        if (job.status != JobStatus.Funded && job.status != JobStatus.Submitted && job.status != JobStatus.PendingClientApproval) revert WrongStatus();
        if (block.timestamp < job.expiredAt) revert JobNotExpired();

        JobStatus oldStatus = job.status;
        uint256 refundAmount = job.budget;
        if (refundAmount == 0) revert ZeroBudget(); // I6-02: explicit budget check
        job.budget = 0;
        job.status = JobStatus.Expired;

        _decrementJobCount(jobId);

        _transferPayment(job.paymentToken, _msgSender(), refundAmount);

        emit Refunded(jobId, _msgSender(), refundAmount);
        emit JobExpired(jobId);
        emit JobStatusChanged(jobId, oldStatus, JobStatus.Expired, _msgSender(), block.timestamp);
    }

    /**
     * @dev Permissionless refund for expired jobs. Anyone can trigger.
     * @param jobId The job ID to refund.
     */
    function refundExpired(uint256 jobId) external nonReentrant whenNotPaused {
        Job storage job = jobs[jobId];
        if (job.id == 0) revert InvalidJob();
        if (job.status != JobStatus.Funded && job.status != JobStatus.Submitted && job.status != JobStatus.PendingClientApproval) revert WrongStatus();
        if (block.timestamp < job.expiredAt) revert JobNotExpired();

        address client = job.client;
        if (client == address(0)) revert InvalidJob();

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

    /**
     * @dev Complete job after evaluator timeout (dispute window passed).
     * Callable by provider or client after dispute window.
     * @param jobId The job ID.
     * @param reason Completion reason.
     */
    function completeAfterTimeout(uint256 jobId, bytes32 reason) external nonReentrant whenNotPaused {
        Job storage job = jobs[jobId];
        if (job.id == 0) revert InvalidJob();
        if (job.status != JobStatus.Submitted && job.status != JobStatus.PendingClientApproval) revert WrongStatus();
        if (job.provider != _msgSender() && job.client != _msgSender()) revert Unauthorized();

        uint256 submittedAt = jobSubmittedAt[jobId];
        if (submittedAt == 0) revert InvalidJob();

        uint256 disputeWindow = jobDisputeWindow[jobId];
        if (disputeWindow == 0) disputeWindow = DEFAULT_DISPUTE_WINDOW;

        if (block.timestamp < submittedAt + disputeWindow) revert WrongStatus();

        // If client review is pending, auto-approve after timeout
        if (job.status == JobStatus.PendingClientApproval) {
            clientApproved[jobId] = true;
        }

        uint256 amount = job.budget;
        uint256 platformFee = (amount * 100) / FEE_DENOMINATOR;
        uint256 slashBP = jobNonResponsiveSlashBP[jobId];
        if (slashBP == 0) slashBP = DEFAULT_NONRESPONSIVE_SLASH_BP;

        uint256 slashAmount = (amount * slashBP) / FEE_DENOMINATOR;
        uint256 net = amount - platformFee - slashAmount;
        address prov = job.provider;
        IERC20 paymentToken = job.paymentToken;

        // CEI: Effects before Interactions
        job.budget = 0;
        job.status = JobStatus.Completed;

        _decrementJobCount(jobId);

        if (job.hook != address(0)) {
            try IACPHook(job.hook).beforeAction(jobId, this.completeAfterTimeout.selector, abi.encode(reason)) {
                // hook succeeded
            } catch {
                emit HookFailed(jobId, this.completeAfterTimeout.selector);
            }
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

        // Refund service listing bond if serviceId is provided and registry is configured
        if (serviceRegistry != address(0) && job.serviceId > 0) {
            try IServiceRegistryV2(serviceRegistry).refundServiceBond(job.serviceId) {} catch {}
        }

        emit JobCompleted(jobId, _msgSender(), job.provider, slashAmount);
        emit PaymentReleased(jobId, net, platformFee, slashAmount);
        emit EvaluatorSlashedForInactivity(jobId, job.evaluator, slashAmount);
        emit JobStatusChanged(jobId, JobStatus.Submitted, JobStatus.Completed, _msgSender(), block.timestamp);
    }

    /**
     * @dev Set custom dispute window for a job (client only, before submission).
     * @param jobId The job ID.
     * @param window Dispute window in seconds (min 1 day, max 30 days).
     */
    function setDisputeWindow(uint256 jobId, uint256 window) external onlyClient(jobId) {
        if (jobs[jobId].status != JobStatus.Funded) revert WrongStatus();
        if (window < 1 days || window > 30 days) revert InvalidJob();
        jobDisputeWindow[jobId] = window;
        emit DisputeWindowSet(jobId, window);
    }

    /**
     * @dev Set non-responsive slash basis points for a job (client only, before submission).
     * @param jobId The job ID.
     * @param slashBP Slash percentage in basis points (max 1000 = 10%).
     */
    function setNonResponsiveSlashBP(uint256 jobId, uint256 slashBP) external onlyClient(jobId) {
        if (jobs[jobId].status != JobStatus.Funded) revert WrongStatus();
        if (slashBP > 1000) revert SlashBPTooHigh(); // Max 10%
        jobNonResponsiveSlashBP[jobId] = slashBP;
        emit NonResponsiveSlashSet(jobId, slashBP);
    }

    /***********************************/
    /* Evaluator Pool Functions */
    /***********************************/
    
    /**
     * @dev Register as an evaluator in the random selection pool.
     * A3-01: Requires MIN_EVALUATOR_STAKE (0.01 ETH) to prevent spam.
     */
    function registerAsEvaluator() external payable {
        if (isRegisteredEvaluator[msg.sender]) revert EvaluatorAlreadyRegistered();
        if (msg.value < MIN_EVALUATOR_STAKE) revert InsufficientEvaluatorStake();

        // Blacklist check with P7-01 try/catch
        if (adminRegistry != address(0)) {
            try AdminRegistry(adminRegistry).isWalletBlacklistedActive(msg.sender) returns (bool isBlacklisted) {
                if (isBlacklisted) revert EvaluatorBlacklisted();
            } catch {
                // Fail open to prevent DOS
            }
        }

        evaluatorPool.push(msg.sender);
        isRegisteredEvaluator[msg.sender] = true;
        evaluatorStakes[msg.sender] = msg.value;
        emit EvaluatorRegistered(msg.sender);
    }

    /**
     * @dev Unregister as an evaluator. Refunds staked ETH.
     */
    function unregisterAsEvaluator() external {
        if (!isRegisteredEvaluator[msg.sender]) revert EvaluatorNotRegistered();

        // Remove from pool
        for (uint256 i = 0; i < evaluatorPool.length; i++) {
            if (evaluatorPool[i] == msg.sender) {
                evaluatorPool[i] = evaluatorPool[evaluatorPool.length - 1];
                evaluatorPool.pop();
                break;
            }
        }

        isRegisteredEvaluator[msg.sender] = false;
        uint256 stake = evaluatorStakes[msg.sender];
        evaluatorStakes[msg.sender] = 0;
        
        if (stake > 0) {
            (bool success, ) = payable(msg.sender).call{value: stake}("");
            if (!success) revert StakeRefundFailed();
        }
        
        emit EvaluatorUnregistered(msg.sender);
    }
    
    /**
     * @dev Slash an evaluator's stake (owner only).
     * @param evaluator The evaluator to slash.
     * @param reason Reason for slashing.
     */
    function slashEvaluatorStake(address evaluator, string calldata reason) external nonReentrant onlyOwner {
        if (!isRegisteredEvaluator[evaluator]) revert EvaluatorNotRegistered();
        
        uint256 stake = evaluatorStakes[evaluator];
        if (stake == 0) revert InsufficientEvaluatorStake();
        
        // Remove from pool and clear registrations BEFORE external call
        for (uint256 i = 0; i < evaluatorPool.length; i++) {
            if (evaluatorPool[i] == evaluator) {
                evaluatorPool[i] = evaluatorPool[evaluatorPool.length - 1];
                evaluatorPool.pop();
                break;
            }
        }
        
        isRegisteredEvaluator[evaluator] = false;
        evaluatorStakes[evaluator] = 0;
        
        // Transfer slashed stake to platform treasury
        if (platformTreasury != address(0)) {
            (bool success, ) = payable(platformTreasury).call{value: stake}("");
            if (!success) revert StakeTransferFailed();
        }
        
        emit EvaluatorSlashed(evaluator, stake, reason);
    }

    /**
     * @dev Permissionless cleanup of stale evaluators (blacklisted or unregistered).
     * Anyone can call to remove stale entries and keep the pool healthy.
     * @return removedCount Number of stale evaluators removed.
     */
    function cleanupStaleEvaluators() external returns (uint256 removedCount) {
        if (evaluatorPool.length == 0) return 0;

        // Iterate backwards to safely remove elements
        for (uint256 i = evaluatorPool.length; i > 0; i--) {
            address evalAddr = evaluatorPool[i - 1];
            bool isStale = !isRegisteredEvaluator[evalAddr];

            // Also check blacklist
            if (!isStale && adminRegistry != address(0)) {
                AdminRegistry registry = AdminRegistry(adminRegistry);
                if (registry.isWalletBlacklistedActive(evalAddr)) {
                    isStale = true;
                }
            }

            if (isStale) {
                evaluatorPool[i - 1] = evaluatorPool[evaluatorPool.length - 1];
                evaluatorPool.pop();
                removedCount++;
            }
        }

        if (removedCount > 0) {
            emit StaleEvaluatorsCleaned(removedCount);
        }
    }

    /**
     * @dev Get the current evaluator pool size.
     * @return Number of evaluators in the pool.
     */
    function getEvaluatorPoolSize() external view returns (uint256) {
        return evaluatorPool.length;
    }

    /**
     * @dev Select a random evaluator from the pool using commit-reveal.
     * A3-02/F8-01: Uses blockhash(jobCreationBlock + 6) for randomness.
     * The blockhash at commitBlock + 6 is finalized and not manipulable by the miner.
     * @param jobId The job ID to select evaluator for.
     * @param salt A salt value to increase entropy.
     */
    function _selectRandomEvaluator(uint256 jobId, bytes32 salt) internal view returns (address evaluator) {
        if (evaluatorPool.length == 0) revert NoEvaluatorsAvailable();

        uint256 commitBlock = jobCreationBlock[jobId];
        if (commitBlock == 0) revert NoCommitFound();

        // Use blockhash from commitBlock + 6 (finalized, not manipulable)
        uint256 revealBlock = commitBlock + EVALUATOR_REVEAL_DELAY;
        bytes32 randomSeed = blockhash(revealBlock);
        
        // Fallback if blockhash is unavailable (e.g., >256 blocks old)
        if (randomSeed == bytes32(0)) {
            randomSeed = keccak256(abi.encodePacked(block.prevrandao, block.timestamp, jobId));
        }

        uint256 randomIndex = uint256(keccak256(abi.encodePacked(
            randomSeed,
            salt,
            jobId,
            msg.sender
        ))) % evaluatorPool.length;

        evaluator = evaluatorPool[randomIndex];
        if (!isRegisteredEvaluator[evaluator]) {
            for (uint256 i = 0; i < evaluatorPool.length; i++) {
                if (isRegisteredEvaluator[evaluatorPool[i]]) {
                    return evaluatorPool[i];
                }
            }
            revert NoActiveEvaluators();
        }
    }
    
    /**
     * @dev Finalize random evaluator selection after commit-reveal delay.
     * Permissionless — anyone can call after 6 blocks.
     * @param jobId The job ID to finalize evaluator for.
     * @param salt The salt used during job creation.
     */
    function finalizeRandomEvaluator(uint256 jobId, bytes32 salt) external {
        Job storage job = jobs[jobId];
        if (job.id == 0) revert InvalidJob();
        if (job.evaluator != address(0)) revert EvaluatorAlreadyRegistered();
        
        EvaluatorCommit storage commit = evaluatorCommits[jobId];
        if (commit.commitBlock == 0) revert NoCommitFound();
        if (commit.revealed) revert EvaluatorAlreadyRegistered();
        if (block.number < commit.commitBlock + EVALUATOR_REVEAL_DELAY) revert RevealTooEarly();
        
        // Verify commitment
        bytes32 expectedCommit = keccak256(abi.encodePacked(salt, jobId, commit.commitBlock));
        if (commit.commitHash != expectedCommit) revert InvalidCommit();
        
        commit.revealed = true;
        
        address finalEvaluator = _selectRandomEvaluator(jobId, salt);
        job.evaluator = finalEvaluator;
        
        emit EvaluatorRandomlySelected(jobId, finalEvaluator);
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
        // ToB H-01: Prevent provider == client scenario (address swap protection)
        if (provider == _msgSender()) revert RolesMustBeDistinct();
        if (expiredAt <= block.timestamp + MIN_EXPIRY_DURATION) revert ExpiryTooShort();
        if (expiredAt > block.timestamp + MAX_EXPIRY_DURATION) revert ExpiryTooLong();
        if (bytes(description).length == 0 || bytes(description).length > MAX_DESCRIPTION_LENGTH) revert InvalidJob();
        
        // VULN-09/12 FIX: Validate hook is a deployed contract (not EOA or zero address)
        if (hook != address(0)) {
            uint256 size;
            assembly {
                size := extcodesize(hook)
            }
            if (size == 0) revert InvalidHook();
        }
    }
    
    /**
     * @dev Get token decimals. Uses IERC20Metadata if available, falls back to 18 for ETH.
     */
    function _getTokenDecimals(address token) internal view returns (uint8) {
        if (token == address(0)) return 18;
        
        (bool success, bytes memory data) = token.staticcall(abi.encodeWithSignature("decimals()"));
        if (!(success && data.length >= 32)) revert DecimalsQueryFailed(token);
        uint8 decimals = abi.decode(data, (uint8));
        if (!(decimals > 0)) revert InvalidDecimals(token, decimals);
        return decimals;
    }

    /***********************************/
    /* Admin Functions */
    /***********************************/
    
    /**
     * @dev Set the platform treasury address.
     * @param _treasury New treasury address.
     */
    function setPlatformTreasury(address _treasury) external onlyOwner {
        if (_treasury == address(0)) revert ZeroAddress();
        address oldTreasury = platformTreasury;
        platformTreasury = _treasury;
        emit PlatformTreasurySet(oldTreasury, _treasury);
    }

    /**
     * @dev Set the AdminRegistry address.
     * @param _registry New AdminRegistry address.
     */
    function setAdminRegistry(address _registry) external onlyOwner {
        if (_registry != address(0)) {
            uint256 size;
            assembly { size := extcodesize(_registry) }
            if (size == 0) revert InvalidHook(); // A3-03: validate is contract
        }
        address oldRegistry = adminRegistry;
        adminRegistry = _registry;
        emit AdminRegistrySet(oldRegistry, _registry);
    }

    /**
     * @dev Set the ServiceRegistry address.
     * @param _registry New ServiceRegistry address.
     */
    function setServiceRegistry(address _registry) external onlyOwner {
        if (_registry != address(0)) {
            uint256 size;
            assembly { size := extcodesize(_registry) }
            if (size == 0) revert InvalidHook();
        }
        address oldRegistry = serviceRegistry;
        serviceRegistry = _registry;
        emit ServiceRegistrySet(oldRegistry, _registry);
    }

    /**
     * @dev Set the PriceOracle address.
     * @param _priceOracle New PriceOracle address.
     */
    function setPriceOracle(address _priceOracle) external onlyOwner {
        if (_priceOracle == address(0)) revert ZeroAddress();
        address oldOracle = address(priceOracle);
        priceOracle = IPriceOracleV2(_priceOracle);
        emit PriceOracleSet(oldOracle, _priceOracle);
    }
    
    /**
     * @dev Pause contract operations (owner only).
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause contract operations (owner only).
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /***********************************/
    /* Events */
    /***********************************/
    
    // V9 Events
    event MinBudgetChanged(address indexed token, uint256 oldMin, uint256 newMin);
    event MaxBudgetChanged(uint256 oldMax, uint256 newMax);
    event MinBudgetOverrideChanged(address indexed token, uint256 minAmount);
    event StablecoinStatusChanged(address indexed token, bool isStable);
    
    // V8 Events
    event TokenAllowlistUpdated(address indexed token, bool allowed);
    event EvaluatorRegistered(address indexed evaluator);
    event EvaluatorUnregistered(address indexed evaluator);
    event EvaluatorRandomlySelected(uint256 indexed jobId, address indexed evaluator);
    event StaleEvaluatorsCleaned(uint256 removedCount);
    event EvaluatorSlashed(address indexed evaluator, uint256 stake, string reason);
    event JobBudgetUpdated(uint256 indexed jobId, uint256 oldBudget, uint256 newBudget);
    event JobPaymentTokenUpdated(uint256 indexed jobId, address oldToken, address newToken);
    event JobCreated(uint256 indexed jobId, address indexed client, address provider, uint256 budget, uint256 expiredAt, bool evaluatorFee, bool clientReview, bool randomEvaluator);
    event JobFunded(uint256 indexed jobId, address indexed client, uint256 amount);
    event JobSubmitted(uint256 indexed jobId, address indexed provider, bytes32 deliverable);
    event JobStatusChanged(uint256 indexed jobId, JobStatus oldStatus, JobStatus newStatus, address changedBy, uint256 timestamp);
    event PaymentReleased(uint256 indexed jobId, uint256 providerAmount, uint256 platformFee, uint256 evaluatorFee);

    // Admin Events
    event PlatformTreasurySet(address indexed oldTreasury, address indexed newTreasury);
    event AdminRegistrySet(address indexed oldRegistry, address indexed newRegistry);
    event ServiceRegistrySet(address indexed oldRegistry, address indexed newRegistry);
    event PriceOracleSet(address indexed oldOracle, address indexed newOracle);

    // Job Lifecycle Events (ported from V6)
    event JobRejected(uint256 indexed jobId, address indexed rejector, bytes32 reason);
    event JobExpired(uint256 indexed jobId);
    event JobCompleted(uint256 indexed jobId, address indexed by, address indexed provider, uint256 evaluatorFee);
    event Refunded(uint256 indexed jobId, address indexed client, uint256 amount);
    event PermissionlessRefund(uint256 indexed jobId, address indexed client, address indexed caller, uint256 amount);
    event DisputeWindowSet(uint256 indexed jobId, uint256 window);
    event NonResponsiveSlashSet(uint256 indexed jobId, uint256 slashBP);
    event EvaluatorSlashedForInactivity(uint256 indexed jobId, address indexed evaluator, uint256 slashAmount);
    event BlacklistCheckFailed(address indexed adminRegistry);
    event HookFailed(uint256 indexed jobId, bytes4 indexed selector);

    // C-01: Toggle — when true, blacklist check failures revert instead of failing open

    // C-01: Toggle — when true, blacklist check failures revert instead of failing open
    bool public blacklistCheckRequired;

    address public serviceRegistry;
    
    /// @dev Storage gap for upgrade safety
    uint256[48] private __gap;
}