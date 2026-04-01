// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import {IACPHook} from "./IACPHook.sol";
import {IServiceRegistry} from "./ServiceRegistry.sol";

/**
 * @title IAgenticCommerceV4
 * @dev Interface for Agentic Commerce Protocol V4 (Comprehensive Events)
 */
interface IAgenticCommerceV4 {
    enum JobStatus {
        Open,
        Funded,
        Submitted,
        Completed,
        Rejected,
        Expired
    }
    
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
    
    // Core Events
    event JobCreated(uint256 indexed jobId, address indexed client, address indexed provider, address evaluator, uint256 serviceId, uint256 expiredAt);
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
        bytes32 indexed updateType, // keccak256("provider"), keccak256("budget"), etc.
        uint256 timestamp
    );
    
    event PaymentTokenSet(
        uint256 indexed jobId,
        address indexed token
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
    
    event EmergencyRefund(
        uint256 indexed jobId,
        address indexed client,
        uint256 amount,
        string reason
    );

    function createJob(
        address provider,
        address evaluator,
        uint256 expiredAt,
        string calldata description,
        address hook
    ) external returns (uint256 jobId);
    
    function createJobFromService(
        uint256 serviceId,
        address evaluator,
        uint256 expiredAt,
        string calldata description
    ) external returns (uint256 jobId);
    
    function setProvider(uint256 jobId, address provider) external;
    function setBudget(uint256 jobId, uint256 amount) external;
    function fund(uint256 jobId) external;
    function submit(uint256 jobId, bytes32 deliverable) external;
    function complete(uint256 jobId, bytes32 reason) external;
    function reject(uint256 jobId, bytes32 reason) external;
    function claimRefund(uint256 jobId) external;
    function getJob(uint256 jobId) external view returns (Job memory);
}

/**
 * @title AgenticCommerceV4
 * @dev ERC-8183 compliant job escrow V4 with comprehensive events
 *
 * Phase 3 Features:
 * - Comprehensive event system for better tracking
 * - All Phase 2 DoS prevention features preserved
 */
contract AgenticCommerceV4 is IAgenticCommerceV4, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using ERC165Checker for address;

    // DoS Prevention: Limits (from Phase 2)
    uint256 public constant MAX_JOBS_PER_CLIENT = 100;
    uint256 public constant MAX_DESCRIPTION_LENGTH = 1000;
    uint256 public constant MAX_EXPIRY_DURATION = 365 days;
    
    uint256 public platformFeeBP;
    address public platformTreasury;
    address public serviceRegistry;

    mapping(uint256 => Job) public jobs;
    uint256 public jobCounter;
    
    // DoS Prevention: Track job count per client
    mapping(address => uint256) public clientJobCount;
    mapping(uint256 => address) public jobClient;

    uint256 public constant MIN_EXPIRY_DURATION = 5 minutes;
    uint256 public constant FEE_DENOMINATOR = 10000;

    // Phase 3: Update type constants
    bytes32 public constant UPDATE_TYPE_PROVIDER = keccak256("provider");
    bytes32 public constant UPDATE_TYPE_BUDGET = keccak256("budget");
    bytes32 public constant UPDATE_TYPE_PAYMENT_TOKEN = keccak256("paymentToken");

    // Additional errors not in interface
    error InvalidJob();
    error WrongStatus();
    error Unauthorized();
    error ZeroAddress();
    error ExpiryTooShort();
    error ExpiryTooLong();
    error ZeroBudget();
    error ProviderNotSet();
    error InvalidHook();
    error MaxJobsPerClient(address client, uint256 current);

    constructor(address treasury_) Ownable(msg.sender) {
        require(treasury_ != address(0), "Zero treasury");
        platformTreasury = treasury_;
        platformFeeBP = 0;
    }

    /**
     * @dev Set or update the service registry address (owner only).
     */
    function setServiceRegistry(address _serviceRegistry) external onlyOwner {
        require(_serviceRegistry != address(0), "Zero address");
        
        address oldRegistry = serviceRegistry;
        serviceRegistry = _serviceRegistry;
        
        emit ServiceRegistrySet(oldRegistry, _serviceRegistry);
    }

    /**
     * @dev Create a job with raw addresses.
     */
    function createJob(
        address provider,
        address evaluator,
        uint256 expiredAt,
        string calldata description,
        address hook
    ) external nonReentrant returns (uint256 jobId) {
        require(provider != address(0), "Zero provider");
        require(evaluator != address(0), "Zero evaluator");
        require(expiredAt > block.timestamp + MIN_EXPIRY_DURATION, "Expiry too soon");
        require(expiredAt <= block.timestamp + MAX_EXPIRY_DURATION, "Expiry too far");
        require(bytes(description).length > 0, "Empty description");
        require(bytes(description).length <= MAX_DESCRIPTION_LENGTH, "Description too long");
        if (hook != address(0)) {
            require(hook.supportsInterface(type(IACPHook).interfaceId), "Invalid hook");
        }
        
        // DoS Prevention: Check and increment client job count
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
            paymentToken: IERC20(address(0)),
            description: description,
            budget: 0,
            expiredAt: expiredAt,
            status: JobStatus.Open,
            hook: hook,
            deliverable: bytes32(0)
        });
        
        jobClient[jobId] = msg.sender;
        clientJobCount[msg.sender]++;

        emit JobCreated(jobId, msg.sender, provider, evaluator, 0, expiredAt);
    }

    /**
     * @dev Create a job from a service listing.
     */
    function createJobFromService(
        uint256 serviceId,
        address evaluator,
        uint256 expiredAt,
        string calldata description
    ) external nonReentrant returns (uint256 jobId) {
        require(serviceRegistry != address(0), "ServiceRegistry not set");
        require(evaluator != address(0), "Zero evaluator");
        require(expiredAt > block.timestamp + MIN_EXPIRY_DURATION, "Expiry too soon");
        require(expiredAt <= block.timestamp + MAX_EXPIRY_DURATION, "Expiry too far");
        require(bytes(description).length > 0, "Empty description");
        require(bytes(description).length <= MAX_DESCRIPTION_LENGTH, "Description too long");
        
        // DoS Prevention: Check and increment client job count
        if (clientJobCount[msg.sender] >= MAX_JOBS_PER_CLIENT) {
            emit JobLimitExceeded(msg.sender, clientJobCount[msg.sender] + 1, MAX_JOBS_PER_CLIENT);
            revert MaxJobsPerClient(msg.sender, clientJobCount[msg.sender]);
        }

        IServiceRegistry.Service memory svc = IServiceRegistry(serviceRegistry).getService(serviceId);
        require(svc.isActive, "Service not active");
        require(svc.provider != address(0), "Service has no provider");

        jobId = ++jobCounter;
        jobs[jobId] = Job({
            id: jobId,
            client: msg.sender,
            provider: svc.provider,
            evaluator: evaluator,
            serviceId: serviceId,
            paymentToken: IERC20(svc.paymentToken),
            description: description,
            budget: svc.price,
            expiredAt: expiredAt,
            status: JobStatus.Open,
            hook: address(0),
            deliverable: bytes32(0)
        });
        
        jobClient[jobId] = msg.sender;
        clientJobCount[msg.sender]++;

        emit JobCreated(jobId, msg.sender, svc.provider, evaluator, serviceId, expiredAt);
    }

    function setProvider(uint256 jobId, address provider) external {
        Job storage job = jobs[jobId];
        require(job.id != 0, "Invalid job");
        require(job.client == msg.sender, "Not client");
        require(uint256(job.status) == 0, "Wrong status");
        require(job.provider == address(0), "Provider set");
        require(provider != address(0), "Zero address");

        job.provider = provider;
        
        emit ProviderSet(jobId, provider);
        emit JobUpdated(jobId, UPDATE_TYPE_PROVIDER, block.timestamp);
    }

    function setBudget(uint256 jobId, uint256 amount) external {
        Job storage job = jobs[jobId];
        require(job.id != 0, "Invalid job");
        require(uint256(job.status) == 0, "Wrong status");
        require(amount > 0, "Zero budget");
        require(msg.sender == job.client || msg.sender == job.provider, "Not authorized");

        job.budget = amount;
        
        emit BudgetSet(jobId, amount);
        emit JobUpdated(jobId, UPDATE_TYPE_BUDGET, block.timestamp);
    }

    /**
     * @dev Set payment token for a job.
     */
    function setPaymentToken(uint256 jobId, address token) external {
        Job storage job = jobs[jobId];
        require(job.id != 0, "Invalid job");
        require(job.client == msg.sender, "Not client");
        require(uint256(job.status) == 0, "Wrong status");
        require(token != address(0), "Zero address");

        job.paymentToken = IERC20(token);
        
        emit PaymentTokenSet(jobId, token);
        emit JobUpdated(jobId, UPDATE_TYPE_PAYMENT_TOKEN, block.timestamp);
    }

    function fund(uint256 jobId) external nonReentrant {
        Job storage job = jobs[jobId];
        require(job.id != 0, "Invalid job");
        require(uint256(job.status) == 0, "Wrong status");
        require(job.client == msg.sender, "Not client");
        require(job.provider != address(0), "No provider");
        require(job.budget > 0, "No budget");
        require(block.timestamp < job.expiredAt, "Expired");

        if (job.hook != address(0)) {
            IACPHook(job.hook).beforeAction(jobId, this.fund.selector, "");
        }

        JobStatus oldStatus = job.status;
        job.status = JobStatus.Funded;
        
        job.paymentToken.safeTransferFrom(msg.sender, address(this), job.budget);
        
        emit JobFunded(jobId, msg.sender, job.budget);
        emit JobStatusChanged(jobId, oldStatus, JobStatus.Funded, block.timestamp);
    }

    function submit(uint256 jobId, bytes32 deliverable) external nonReentrant {
        Job storage job = jobs[jobId];
        require(job.id != 0, "Invalid job");
        require(job.status == JobStatus.Funded, "Wrong status");
        require(job.provider == msg.sender, "Not provider");

        if (job.hook != address(0)) {
            IACPHook(job.hook).beforeAction(jobId, this.submit.selector, abi.encode(deliverable));
        }

        JobStatus oldStatus = job.status;
        job.status = JobStatus.Submitted;
        job.deliverable = deliverable;
        
        emit JobSubmitted(jobId, msg.sender, deliverable);
        emit JobStatusChanged(jobId, oldStatus, JobStatus.Submitted, block.timestamp);
    }

    function complete(uint256 jobId, bytes32 reason) external nonReentrant {
        Job storage job = jobs[jobId];
        require(job.id != 0, "Invalid job");
        require(job.status == JobStatus.Submitted, "Wrong status");
        require(job.evaluator == msg.sender, "Not evaluator");

        if (job.hook != address(0)) {
            IACPHook(job.hook).beforeAction(jobId, this.complete.selector, abi.encode(reason));
        }

        uint256 amount = job.budget;
        uint256 platformFee = (amount * platformFeeBP) / FEE_DENOMINATOR;
        uint256 net = amount - platformFee;

        JobStatus oldStatus = job.status;
        job.budget = 0;
        job.status = JobStatus.Completed;
        
        // DoS Prevention: Decrement client job count
        address client = jobClient[jobId];
        if (client != address(0) && clientJobCount[client] > 0) {
            clientJobCount[client]--;
        }

        if (platformFee > 0) {
            job.paymentToken.safeTransfer(platformTreasury, platformFee);
        }
        if (net > 0) {
            job.paymentToken.safeTransfer(job.provider, net);
        }

        emit JobCompleted(jobId, msg.sender, reason);
        emit PaymentReleased(jobId, job.provider, net);
        emit JobStatusChanged(jobId, oldStatus, JobStatus.Completed, block.timestamp);
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
        
        // DoS Prevention: Decrement client job count
        address client = jobClient[jobId];
        if (client != address(0) && clientJobCount[client] > 0) {
            clientJobCount[client]--;
        }

        if (oldStatus == JobStatus.Funded || oldStatus == JobStatus.Submitted) {
            job.paymentToken.safeTransfer(job.client, refundAmount);
            emit Refunded(jobId, job.client, refundAmount);
        }

        emit JobRejected(jobId, msg.sender, reason);
        emit JobStatusChanged(jobId, oldStatus, JobStatus.Rejected, block.timestamp);
    }

    function claimRefund(uint256 jobId) external nonReentrant {
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
        
        // DoS Prevention: Decrement client job count
        address client = jobClient[jobId];
        if (client != address(0) && clientJobCount[client] > 0) {
            clientJobCount[client]--;
        }
        
        job.paymentToken.safeTransfer(job.client, refundAmount);
        
        emit Refunded(jobId, job.client, refundAmount);
        emit JobExpired(jobId);
        emit JobStatusChanged(jobId, oldStatus, JobStatus.Expired, block.timestamp);
    }

    /**
     * @dev Emergency refund function for owner
     */
    function emergencyRefund(uint256 jobId, string calldata reason) external onlyOwner nonReentrant {
        Job storage job = jobs[jobId];
        require(job.id != 0, "Invalid job");
        require(job.status == JobStatus.Funded || job.status == JobStatus.Submitted, "Wrong status");
        
        JobStatus oldStatus = job.status;
        uint256 refundAmount = job.budget;
        job.budget = 0;
        job.status = JobStatus.Rejected;
        
        address client = jobClient[jobId];
        if (client != address(0) && clientJobCount[client] > 0) {
            clientJobCount[client]--;
        }
        
        job.paymentToken.safeTransfer(job.client, refundAmount);
        
        emit EmergencyRefund(jobId, job.client, refundAmount, reason);
        emit Refunded(jobId, job.client, refundAmount);
        emit JobStatusChanged(jobId, oldStatus, JobStatus.Rejected, block.timestamp);
    }

    function getJob(uint256 jobId) external view returns (Job memory) {
        require(jobId > 0 && jobId <= jobCounter, "Invalid job");
        return jobs[jobId];
    }

    function getClientJobCount(address client) external view returns (uint256) {
        return clientJobCount[client];
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
