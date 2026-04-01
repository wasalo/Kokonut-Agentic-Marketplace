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
 * @title IAgenticCommerce
 * @dev Interface for Agentic Commerce Protocol (ERC-8183)
 */
interface IAgenticCommerce {
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
 * @title AgenticCommerce
 * @dev ERC-8183 compliant job escrow with service linkage and hook system.
 *
 * Jobs can be created directly (with raw addresses) or from a service listing
 * (provider, budget, and payment token derived from the service).
 *
 * State Machine: Open -> Funded -> Submitted -> Terminal
 */
contract AgenticCommerce is IAgenticCommerce, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using ERC165Checker for address;

    uint256 public platformFeeBP;
    address public platformTreasury;
    address public serviceRegistry;

    mapping(uint256 => Job) public jobs;
    uint256 public jobCounter;

    uint256 public constant MIN_EXPIRY_DURATION = 5 minutes;
    uint256 public constant FEE_DENOMINATOR = 10000;

    error InvalidJob();
    error WrongStatus();
    error Unauthorized();
    error ZeroAddress();
    error ExpiryTooShort();
    error ZeroBudget();
    error ProviderNotSet();
    error InvalidHook();

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
        serviceRegistry = _serviceRegistry;
    }

    /**
     * @dev Create a job with raw addresses. Payment token and budget set separately.
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
        require(bytes(description).length > 0, "Empty description");
        if (hook != address(0)) {
            require(hook.supportsInterface(type(IACPHook).interfaceId), "Invalid hook");
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

        emit JobCreated(jobId, msg.sender, provider, evaluator, 0, expiredAt);
    }

    /**
     * @dev Create a job from a service listing (requires serviceRegistry to be set).
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
        require(bytes(description).length > 0, "Empty description");

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
    }

    function setBudget(uint256 jobId, uint256 amount) external {
        Job storage job = jobs[jobId];
        require(job.id != 0, "Invalid job");
        require(uint256(job.status) == 0, "Wrong status");
        require(amount > 0, "Zero budget");
        require(msg.sender == job.client || msg.sender == job.provider, "Not authorized");

        job.budget = amount;
        emit BudgetSet(jobId, amount);
    }

    /**
     * @dev Set payment token for a job (for direct creation, not service-based).
     */
    function setPaymentToken(uint256 jobId, address token) external {
        Job storage job = jobs[jobId];
        require(job.id != 0, "Invalid job");
        require(job.client == msg.sender, "Not client");
        require(uint256(job.status) == 0, "Wrong status");
        require(token != address(0), "Zero address");

        job.paymentToken = IERC20(token);
    }

    function fund(uint256 jobId) external nonReentrant {
        Job storage job = jobs[jobId];
        require(job.id != 0, "Invalid job");
        require(uint256(job.status) == 0, "Wrong status");
        require(job.client == msg.sender, "Not client");
        require(job.provider != address(0), "No provider");
        require(job.budget > 0, "No budget");
        require(block.timestamp < job.expiredAt, "Expired");

        // Hook: beforeAction (called before state changes for security)
        if (job.hook != address(0)) {
            IACPHook(job.hook).beforeAction(jobId, this.fund.selector, "");
        }

        job.status = JobStatus.Funded;
        job.paymentToken.safeTransferFrom(msg.sender, address(this), job.budget);
        emit JobFunded(jobId, msg.sender, job.budget);
    }

    function submit(uint256 jobId, bytes32 deliverable) external nonReentrant {
        Job storage job = jobs[jobId];
        require(job.id != 0, "Invalid job");
        require(job.status == JobStatus.Funded, "Wrong status");
        require(job.provider == msg.sender, "Not provider");

        // Hook: beforeAction (called before state changes for security)
        if (job.hook != address(0)) {
            IACPHook(job.hook).beforeAction(jobId, this.submit.selector, abi.encode(deliverable));
        }

        job.status = JobStatus.Submitted;
        job.deliverable = deliverable;
        emit JobSubmitted(jobId, msg.sender, deliverable);
    }

    function complete(uint256 jobId, bytes32 reason) external nonReentrant {
        Job storage job = jobs[jobId];
        require(job.id != 0, "Invalid job");
        require(job.status == JobStatus.Submitted, "Wrong status");
        require(job.evaluator == msg.sender, "Not evaluator");

        // Hook: beforeAction (called before state changes for security)
        if (job.hook != address(0)) {
            IACPHook(job.hook).beforeAction(jobId, this.complete.selector, abi.encode(reason));
        }

        uint256 amount = job.budget;
        uint256 platformFee = (amount * platformFeeBP) / FEE_DENOMINATOR;
        uint256 net = amount - platformFee;

        // State changes before transfers (Checks-Effects-Interactions pattern)
        job.budget = 0;
        job.status = JobStatus.Completed;

        if (platformFee > 0) {
            job.paymentToken.safeTransfer(platformTreasury, platformFee);
        }
        if (net > 0) {
            job.paymentToken.safeTransfer(job.provider, net);
        }

        emit JobCompleted(jobId, msg.sender, reason);
        emit PaymentReleased(jobId, job.provider, net);
    }

    function reject(uint256 jobId, bytes32 reason) external nonReentrant {
        Job storage job = jobs[jobId];
        require(job.id != 0, "Invalid job");

        if (job.status == JobStatus.Open) {
            require(job.client == msg.sender, "Not client");
        } else if (job.status == JobStatus.Funded || job.status == JobStatus.Submitted) {
            require(job.evaluator == msg.sender, "Not evaluator");
        } else {
            revert("Wrong status");
        }

        JobStatus prevStatus = job.status;
        uint256 refundAmount = job.budget;
        job.budget = 0;
        job.status = JobStatus.Rejected;

        if (prevStatus == JobStatus.Funded || prevStatus == JobStatus.Submitted) {
            job.paymentToken.safeTransfer(job.client, refundAmount);
            emit Refunded(jobId, job.client, refundAmount);
        }

        emit JobRejected(jobId, msg.sender, reason);
    }

    function claimRefund(uint256 jobId) external nonReentrant {
        Job storage job = jobs[jobId];
        require(job.id != 0, "Invalid job");
        require(
            job.status == JobStatus.Funded || job.status == JobStatus.Submitted,
            "Wrong status"
        );
        require(block.timestamp >= job.expiredAt, "Not expired");

        uint256 refundAmount = job.budget;
        job.budget = 0;
        job.status = JobStatus.Expired;
        job.paymentToken.safeTransfer(job.client, refundAmount);
        emit Refunded(jobId, job.client, refundAmount);
        emit JobExpired(jobId);
    }

    function getJob(uint256 jobId) external view returns (Job memory) {
        require(jobId > 0 && jobId <= jobCounter, "Invalid job");
        return jobs[jobId];
    }

    function setPlatformFee(uint256 feeBP, address treasury) external onlyOwner {
        require(treasury != address(0), "Zero treasury");
        require(feeBP <= FEE_DENOMINATOR, "Fee too high");
        platformFeeBP = feeBP;
        platformTreasury = treasury;
    }
}
