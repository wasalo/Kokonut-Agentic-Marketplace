// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import {IACPHook} from "./IACPHook.sol";
import {IServiceRegistry} from "./ServiceRegistry.sol";
import {IAgenticCommerceV5} from "../interfaces/IAgenticCommerceV5.sol";

/**
 * @title AgenticCommerceV5
 * @dev UUPS Upgradeable Agentic Commerce Protocol V5 with Native Bidding System
 * 
 * Key Features:
 * - UUPS Upgradeable (gas efficient, no proxy admin)
 * - Open Job bidding with sealed bids (commit-reveal)
 * - Native ETH and ERC20 support
 * - Comprehensive event system for analytics
 * - DoS prevention with job limits
 * 
 * Budget Limits:
 * - Min: 5 USD (expressed in token decimals)
 * - Max: 1,000,000 USD (expressed in token decimals)
 * 
 * Bidding:
 * - Stake: 1% of max budget
 * - Reveal window: 1 hour after deadline
 */
contract AgenticCommerceV5 is 
    IAgenticCommerceV5, 
    OwnableUpgradeable, 
    UUPSUpgradeable, 
    ReentrancyGuard 
{
    using SafeERC20 for IERC20;
    using ERC165Checker for address;

    /***********************************/
    /* Constants */
    /***********************************/
    
    uint256 public constant REVEAL_WINDOW = 1 hours;
    uint256 public constant MIN_STAKE_BP = 100; // 1% in basis points
    uint256 public constant FEE_DENOMINATOR = 10000;
    
    // DoS Prevention
    uint256 public constant MAX_JOBS_PER_CLIENT = 100;
    uint256 public constant MAX_DESCRIPTION_LENGTH = 1000;
    uint256 public constant MIN_EXPIRY_DURATION = 5 minutes;
    uint256 public constant MAX_EXPIRY_DURATION = 365 days;
    
    // Budget limits (in USD terms - actual limits depend on token decimals)
    // These are rough approximations; actual limits enforced with token decimals
    uint256 public constant MIN_BUDGET = 5e6;  // $5 (USDC decimals)
    uint256 public constant MAX_BUDGET = 1e12;  // $1,000,000 (USDC decimals)
    
    // Minimum ETH payment (dust threshold)
    uint256 public constant MIN_ETH_PAYMENT = 0.005 ether;

    /***********************************/
    /* Update Type Constants */
    /***********************************/
    
    bytes32 public constant UPDATE_TYPE_PROVIDER = keccak256("provider");
    bytes32 public constant UPDATE_TYPE_BUDGET = keccak256("budget");

    /***********************************/
    /* State Variables */
    /***********************************/
    
    uint256 public platformFeeBP;
    address public platformTreasury;
    address public serviceRegistry;

    mapping(uint256 => Job) public jobs;
    uint256 public jobCounter;
    
    // DoS Prevention: Track job count per client
    mapping(address => uint256) public clientJobCount;
    mapping(uint256 => address) public jobClient;

    // Phase 5: Bidding State
    mapping(uint256 => JobType) public jobTypes;
    mapping(uint256 => uint256) public jobMaxBudget;
    mapping(uint256 => uint256) public jobBidCount;
    mapping(uint256 => Bid[]) public jobBids;
    mapping(uint256 => mapping(address => uint256)) public bidderToBidIndex; // jobId -> bidder -> bidIndex
    mapping(uint256 => mapping(bytes32 => bool)) public validCommits; // jobId -> commitHash -> exists
    
    // Track stakes held per job
    mapping(uint256 => uint256) public totalStakesHeld;
    
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
    error InvalidMaxBudget();
    
    // Bidding errors
    error NotOpenJob();
    error AlreadyBid();
    error CommitExpired();
    error InvalidCommitment();
    error AmountExceedsMaxBudget();
    error BidNotFound();
    error BidNotRevealed();
    error BidAlreadyProcessed();
    error RevealWindowClosed();
    error InvalidStakeAmount();
    error NothingToWithdraw();
    error CommitmentNotFound();

    /***********************************/
    /* Modifiers */
    /***********************************/
    
    modifier onlyClient(uint256 jobId) {
        require(jobs[jobId].client == msg.sender, "Not client");
        _;
    }
    
    modifier onlyProvider(uint256 jobId) {
        require(jobs[jobId].provider == msg.sender, "Not provider");
        _;
    }
    
    modifier onlyEvaluator(uint256 jobId) {
        require(jobs[jobId].evaluator == msg.sender, "Not evaluator");
        _;
    }

    /***********************************/
    /* Initialize */
    /***********************************/
    
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address treasury_,
        address serviceRegistry_
    ) public initializer {
        require(treasury_ != address(0), "Zero treasury");
        __Ownable_init(msg.sender);
        
        platformTreasury = treasury_;
        platformFeeBP = 100; // 1%
        
        if (serviceRegistry_ != address(0)) {
            serviceRegistry = serviceRegistry_;
        }
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
     */
    function createJob(
        address provider,
        address evaluator,
        uint256 expiredAt,
        string calldata description,
        address hook
    ) external nonReentrant returns (uint256 jobId) {
        _validateJobCreation(provider, evaluator, expiredAt, description, hook, JobType.Direct);
        
        // DoS Prevention: Check job count
        if (clientJobCount[msg.sender] >= MAX_JOBS_PER_CLIENT) {
            emit JobLimitExceeded(msg.sender, clientJobCount[msg.sender] + 1, MAX_JOBS_PER_CLIENT);
            revert MaxJobsPerClient(msg.sender, clientJobCount[msg.sender]);
        }

        jobId = ++jobCounter;
        jobs[jobId] = Job({
            id: jobId,
            client: msg.sender,
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
        
        jobTypes[jobId] = JobType.Direct;
        jobClient[jobId] = msg.sender;
        clientJobCount[msg.sender]++;

        emit JobCreated(jobId, msg.sender, provider, evaluator, 0, expiredAt);
    }

    /**
     * @dev Create an open job for bidding
     */
    function createOpenJob(
        uint256 maxBudget,
        address evaluator,
        uint256 expiredAt,
        string calldata description,
        IERC20 paymentToken
    ) external nonReentrant returns (uint256 jobId) {
        require(maxBudget > 0, "Zero max budget");
        require(expiredAt > block.timestamp + MIN_EXPIRY_DURATION, "Expiry too soon");
        require(expiredAt <= block.timestamp + MAX_EXPIRY_DURATION, "Expiry too far");
        require(bytes(description).length > 0, "Empty description");
        require(bytes(description).length <= MAX_DESCRIPTION_LENGTH, "Description too long");
        require(evaluator != address(0), "Zero evaluator");
        
        // DoS Prevention: Check job count
        if (clientJobCount[msg.sender] >= MAX_JOBS_PER_CLIENT) {
            emit JobLimitExceeded(msg.sender, clientJobCount[msg.sender] + 1, MAX_JOBS_PER_CLIENT);
            revert MaxJobsPerClient(msg.sender, clientJobCount[msg.sender]);
        }

        jobId = ++jobCounter;
        jobs[jobId] = Job({
            id: jobId,
            client: msg.sender,
            provider: address(0), // Will be set when bid is accepted
            evaluator: evaluator,
            serviceId: 0,
            paymentToken: paymentToken,
            description: description,
            budget: 0, // Will be set when bid is accepted
            expiredAt: expiredAt,
            status: JobStatus.Open,
            hook: address(0),
            deliverable: bytes32(0)
        });
        
        jobTypes[jobId] = JobType.Open;
        jobMaxBudget[jobId] = maxBudget;
        jobClient[jobId] = msg.sender;
        clientJobCount[msg.sender]++;

        emit OpenJobCreated(jobId, msg.sender, maxBudget, evaluator, expiredAt);
    }

    /**
     * @dev Internal validation for job creation
     */
    function _validateJobCreation(
        address provider,
        address evaluator,
        uint256 expiredAt,
        string calldata description,
        address hook,
        JobType jType
    ) internal view {
        require(provider != address(0), "Zero provider");
        require(evaluator != address(0), "Zero evaluator");
        require(expiredAt > block.timestamp + MIN_EXPIRY_DURATION, "Expiry too soon");
        require(expiredAt <= block.timestamp + MAX_EXPIRY_DURATION, "Expiry too far");
        require(bytes(description).length > 0, "Empty description");
        require(bytes(description).length <= MAX_DESCRIPTION_LENGTH, "Description too long");
        if (hook != address(0)) {
            require(hook.supportsInterface(type(IACPHook).interfaceId), "Invalid hook");
        }
    }

    function setProvider(uint256 jobId, address provider) external onlyClient(jobId) {
        Job storage job = jobs[jobId];
        require(job.id != 0, "Invalid job");
        require(uint256(job.status) == 0, "Wrong status");
        require(job.provider == address(0), "Provider set");
        require(provider != address(0), "Zero address");
        require(jobTypes[jobId] == JobType.Direct, "Use acceptBid for open jobs");

        job.provider = provider;
        
        emit ProviderSet(jobId, provider);
        emit JobUpdated(jobId, UPDATE_TYPE_PROVIDER, block.timestamp);
    }

    function setBudget(uint256 jobId, uint256 amount) external onlyClient(jobId) {
        Job storage job = jobs[jobId];
        require(job.id != 0, "Invalid job");
        require(uint256(job.status) == 0, "Wrong status");
        require(amount > 0, "Zero budget");
        require(jobTypes[jobId] == JobType.Direct, "Use acceptBid for open jobs");
        require(msg.sender == job.client || msg.sender == job.provider, "Not authorized");

        job.budget = amount;
        
        emit BudgetSet(jobId, amount);
        emit JobUpdated(jobId, UPDATE_TYPE_BUDGET, block.timestamp);
    }

    function fund(uint256 jobId) external payable nonReentrant onlyClient(jobId) {
        Job storage job = jobs[jobId];
        _validateFund(jobId, job);

        if (job.hook != address(0)) {
            IACPHook(job.hook).beforeAction(jobId, this.fund.selector, "");
        }

        JobStatus oldStatus = job.status;
        job.status = JobStatus.Funded;
        
        if (address(job.paymentToken) == address(0)) {
            require(msg.value >= job.budget, "Insufficient payment");
            require(msg.value >= MIN_ETH_PAYMENT, "Below minimum ETH");
        } else {
            require(msg.value == 0, "ETH not accepted for ERC20");
            job.paymentToken.safeTransferFrom(msg.sender, address(this), job.budget);
        }
        
        emit JobFunded(jobId, msg.sender, job.budget);
        emit JobStatusChanged(jobId, oldStatus, JobStatus.Funded, block.timestamp);
    }

    function _validateFund(uint256 jobId, Job storage job) internal view {
        require(job.id != 0, "Invalid job");
        require(uint256(job.status) == 0, "Wrong status");
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
        
        emit JobSubmitted(jobId, msg.sender, deliverable);
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
        uint256 platformFee = (amount * platformFeeBP) / FEE_DENOMINATOR;
        uint256 net = amount - platformFee;
        address prov = job.provider;
        IERC20 paymentToken = job.paymentToken;

        job.budget = 0;
        job.status = JobStatus.Completed;
        
        _decrementJobCount(jobId);

        if (platformFee > 0) {
            _transferPayment(paymentToken, platformTreasury, platformFee);
        }
        if (net > 0) {
            _transferPayment(paymentToken, prov, net);
        }

        emit JobCompleted(jobId, msg.sender, reason);
        emit PaymentReleased(jobId, prov, net);
        emit JobStatusChanged(jobId, JobStatus.Submitted, JobStatus.Completed, block.timestamp);
    }

    function reject(uint256 jobId, bytes32 reason) external nonReentrant {
        Job storage job = jobs[jobId];
        require(job.id != 0, "Invalid job");

        JobStatus oldStatus = job.status;
        
        if (job.status == JobStatus.Open) {
            require(job.client == msg.sender, "Not client");
        } else if (job.status == JobStatus.Funded || job.status == JobStatus.Submitted) {
            require(job.evaluator == msg.sender, "Not evaluator");
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

        emit JobRejected(jobId, msg.sender, reason);
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
        
        _transferPayment(job.paymentToken, job.client, refundAmount);
        
        emit Refunded(jobId, msg.sender, refundAmount);
        emit JobExpired(jobId);
        emit JobStatusChanged(jobId, oldStatus, JobStatus.Expired, block.timestamp);
    }

    /***********************************/
    /* Bidding Functions */
    /***********************************/
    
    /**
     * @dev Calculate stake amount (1% of max budget)
     */
    function calculateStake(uint256 maxBudget) public pure returns (uint256) {
        return (maxBudget * MIN_STAKE_BP) / FEE_DENOMINATOR;
    }

    /**
     * @dev Commit a sealed bid (before deadline)
     */
    function commitBid(uint256 jobId, bytes32 commitHash) external payable nonReentrant {
        Job storage job = jobs[jobId];
        require(job.id != 0, "Invalid job");
        require(jobTypes[jobId] == JobType.Open, "Not open job");
        require(uint256(job.status) == 0, "Wrong status");
        require(block.timestamp < job.expiredAt, "Commit expired");
        require(commitHash != bytes32(0), "Zero commitment");
        
        // Check if already committed
        if (bidderToBidIndex[jobId][msg.sender] != 0) {
            revert AlreadyBid();
        }
        
        uint256 stakeAmount = calculateStake(jobMaxBudget[jobId]);
        
        // Handle ETH stake
        if (address(job.paymentToken) == address(0)) {
            require(msg.value >= stakeAmount, "Insufficient stake");
            // Return excess
            if (msg.value > stakeAmount) {
                payable(msg.sender).transfer(msg.value - stakeAmount);
            }
        } else {
            require(msg.value == 0, "ETH not accepted for ERC20");
            // Transfer token stake
            job.paymentToken.safeTransferFrom(msg.sender, address(this), stakeAmount);
        }
        
        // Store commitment
        uint256 bidId = ++jobBidCount[jobId];
        bidderToBidIndex[jobId][msg.sender] = bidId;
        validCommits[jobId][commitHash] = true;
        
        jobBids[jobId].push(Bid({
            bidId: bidId,
            bidder: msg.sender,
            proposedAmount: 0, // Will be set on reveal
            stake: stakeAmount,
            message: "",
            commitHash: commitHash,
            revealed: false,
            accepted: false,
            timestamp: block.timestamp
        }));
        
        totalStakesHeld[jobId] += stakeAmount;
        
        emit BidCommitted(jobId, msg.sender, stakeAmount, commitHash);
    }

    /**
     * @dev Reveal a committed bid (after deadline)
     */
    function revealBid(
        uint256 jobId, 
        uint256 amount, 
        string calldata message,
        bytes32 salt
    ) external nonReentrant {
        Job storage job = jobs[jobId];
        require(job.id != 0, "Invalid job");
        require(jobTypes[jobId] == JobType.Open, "Not open job");
        require(block.timestamp >= job.expiredAt, "Deadline not passed");
        require(block.timestamp < job.expiredAt + REVEAL_WINDOW, "Reveal window closed");
        
        uint256 bidIndex = bidderToBidIndex[jobId][msg.sender];
        require(bidIndex != 0, "No bid found");
        
        Bid storage bid = jobBids[jobId][bidIndex - 1];
        require(!bid.revealed, "Already revealed");
        
        // Verify commitment
        bytes32 expectedHash = keccak256(abi.encode(amount, message, salt));
        require(validCommits[jobId][expectedHash], "Invalid commitment");
        
        // Verify amount doesn't exceed max budget
        require(amount <= jobMaxBudget[jobId], "Amount exceeds max budget");
        
        // Update bid
        bid.proposedAmount = amount;
        bid.message = message;
        bid.revealed = true;
        
        emit BidRevealed(jobId, msg.sender, amount, message);
    }

    /**
     * @dev Accept a revealed bid (client only)
     */
    function acceptBid(uint256 jobId, uint256 bidId) external onlyClient(jobId) nonReentrant {
        Job storage job = jobs[jobId];
        require(job.id != 0, "Invalid job");
        require(jobTypes[jobId] == JobType.Open, "Not open job");
        
        Bid storage bid = jobBids[jobId][bidId - 1];
        require(bid.bidder != address(0), "Bid not found");
        require(bid.revealed, "Bid not revealed");
        require(!bid.accepted, "Bid already accepted");
        
        // Set provider and budget
        job.provider = bid.bidder;
        job.budget = bid.proposedAmount;
        bid.accepted = true;
        
        emit ProviderSet(jobId, bid.bidder);
        emit BudgetSet(jobId, bid.proposedAmount);
        emit BidAccepted(jobId, bid.bidder, bidId, bid.proposedAmount);
        
        // Return stake to winner
        uint256 stakeAmount = bid.stake;
        bid.stake = 0;
        totalStakesHeld[jobId] -= stakeAmount;
        _transferPayment(job.paymentToken, bid.bidder, stakeAmount);
        emit StakesReturned(jobId, bid.bidder, stakeAmount);
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
    
    function getUserBid(uint256 jobId, address user) external view returns (Bid memory) {
        uint256 bidIndex = bidderToBidIndex[jobId][user];
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
                timestamp: 0
            });
        }
        return jobBids[jobId][bidIndex - 1];
    }

    /***********************************/
    /* Admin Functions */
    /***********************************/
    
    function setServiceRegistry(address _serviceRegistry) external onlyOwner {
        require(_serviceRegistry != address(0), "Zero address");
        
        address oldRegistry = serviceRegistry;
        serviceRegistry = _serviceRegistry;
        
        emit ServiceRegistrySet(oldRegistry, _serviceRegistry);
    }

    function setPlatformFee(uint256 feeBP, address treasury) external onlyOwner {
        require(treasury != address(0), "Zero treasury");
        require(feeBP <= FEE_DENOMINATOR, "Fee too high");
        
        uint256 oldFeeBP = platformFeeBP;
        address oldTreasury = platformTreasury;
        
        platformFeeBP = feeBP;
        platformTreasury = treasury;
        
        emit PlatformFeeUpdated(oldFeeBP, feeBP, oldTreasury, treasury);
    }

}
