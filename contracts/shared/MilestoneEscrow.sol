// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title MilestoneEscrow
 * @dev UUPS Upgradeable contract for milestone-based payments and dispute resolution
 * 
 * Features:
 * - Milestone-based payment release
 * - Arbiter pool for dispute resolution
 * - 0.01 ETH arbiter stake requirement
 * - 7-day auto-release timeout
 */
contract MilestoneEscrow is 
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
    
    uint256 public constant ARBITER_STAKE = 0.01 ether;
    uint256 public constant ARBITER_FEE = 0.001 ether;
    uint256 public constant SLASH_PERCENT = 5000; // 50%
    uint256 public constant MAX_MILESTONES_PER_JOB = 10;
    uint256 public constant ARBITER_RESPONSE_WINDOW = 7 days;
    uint256 public constant MIN_EVALUATOR_REPUTATION = 50;
    
    /***********************************/
    /* Data Structures */
    /***********************************/
    
    struct Milestone {
        string description;
        uint256 amount;
        uint256 dueDate;
        bool completed;
        bool released;
        bytes32 proofHash;
    }
    
    struct Dispute {
        uint256 jobId;
        address flaggler;
        address arbiter;
        uint256 flaggedAt;
        bool resolved;
        bool releaseToProvider;
    }
    
    struct JobMilestones {
        address client;
        address provider;
        address paymentToken;
        uint256 totalBudget;
        bool usesMilestones;
        Milestone[] milestones;
    }

    /***********************************/
    /* State Variables */
    /***********************************/
    
    // Job milestone data
    mapping(uint256 => JobMilestones) public jobMilestones;
    uint256 public jobCounter;
    
    // Arbiter system
    address[] public arbiterPool;
    mapping(address => uint256) public arbiterStakes;
    mapping(address => bool) public isRegisteredArbiter;
    
    // Dispute system
    mapping(uint256 => Dispute) public disputes;
    uint256[] public activeDisputeIds;
    
    // Reference to AgenticCommerce (for budget lookup)
    address public agenticCommerce;
    
    /***********************************/
    /* Errors */
    /***********************************/
    
    error ZeroAddress();
    error InvalidJob();
    error MilestonesNotEnabled();
    error TooManyMilestones();
    error MilestoneIndexOutOfBounds();
    error MilestoneAlreadyCompleted();
    error MilestoneAlreadyReleased();
    error MilestoneNotCompleted();
    error MilestoneAmountExceedsBudget();
    error MilestoneDueDatePassed();
    error OnlyArbiterCanRelease();
    error NotRegisteredArbiter();
    error ArbiterAlreadyRegistered();
    error InsufficientArbiterStake();
    error ArbiterHasActiveDisputes();
    error DisputeAlreadyExists();
    error DisputeNotActive();
    error DisputeAlreadyResolved();
    error OnlyArbiterOrParty();
    error Unauthorized();

    /***********************************/
    /* Events */
    /***********************************/
    
    event MilestoneEnabled(uint256 indexed jobId);
    event MilestoneAdded(uint256 indexed jobId, uint256 indexed milestoneIndex, string description, uint256 amount);
    event MilestoneCompleted(uint256 indexed jobId, uint256 indexed milestoneIndex, bytes32 proofHash);
    event MilestoneReleased(uint256 indexed jobId, uint256 indexed milestoneIndex, uint256 amount);
    event MilestoneAutoReleased(uint256 indexed jobId, uint256 indexed milestoneIndex, uint256 amount);
    
    event ArbiterRegistered(address indexed arbiter, uint256 stake);
    event ArbiterUnregistered(address indexed arbiter, uint256 refundedStake);
    event DisputeFlagged(uint256 indexed jobId, address indexed flaggler, uint256 fee);
    event EvidenceSubmitted(uint256 indexed jobId, address indexed submitter, bytes32 evidenceHash);
    event DisputeResolved(uint256 indexed jobId, bool releasedToProvider, address indexed arbiter, uint256 arbiterFee);
    event ArbiterSlashed(address indexed arbiter, uint256 slashedAmount, string reason);
    event ArbiterAssigned(uint256 indexed jobId, address indexed arbiter);
    
    event AgenticCommerceSet(address indexed oldAddress, address indexed newAddress);

    /***********************************/
    /* Initialization */
    /***********************************/
    
    function initialize(address initialOwner, address _agenticCommerce) public initializer {
        __Context_init();
        __Ownable_init(initialOwner);
        __UUPSUpgradeable_init();
        __Pausable_init();

        agenticCommerce = _agenticCommerce;

        emit AgenticCommerceSet(address(0), _agenticCommerce);
    }

    /***********************************/
    /* UUPS */
    /***********************************/
    
    function _authorizeUpgrade(address newImpl) internal override onlyOwner {}

    /***********************************/
    /* Admin Functions */
    /***********************************/

    function setAgenticCommerce(address _agenticCommerce) external onlyOwner {
        emit AgenticCommerceSet(agenticCommerce, _agenticCommerce);
        agenticCommerce = _agenticCommerce;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /***********************************/
    /* Milestone Functions */
    /***********************************/
    
    /**
     * @dev Enable milestones for a job (called by client via AgenticCommerce)
     * @param jobId The job ID
     * @param client The job client
     * @param provider The job provider
     * @param paymentToken The payment token address
     * @param totalBudget Total job budget
     */
    function enableMilestones(
        uint256 jobId,
        address client,
        address provider,
        address paymentToken,
        uint256 totalBudget
    ) external whenNotPaused {
        if (_msgSender() != agenticCommerce) revert Unauthorized();
        
        jobMilestones[jobId].client = client;
        jobMilestones[jobId].provider = provider;
        jobMilestones[jobId].paymentToken = paymentToken;
        jobMilestones[jobId].totalBudget = totalBudget;
        jobMilestones[jobId].usesMilestones = true;
        
        emit MilestoneEnabled(jobId);
    }
    
    /**
     * @dev Add a milestone to a job
     * @param jobId The job ID
     * @param description Milestone description
     * @param amount Milestone amount
     * @param dueDate Unix timestamp for due date
     */
    function addMilestone(
        uint256 jobId,
        string calldata description,
        uint256 amount,
        uint256 dueDate
    ) external whenNotPaused {
        JobMilestones storage jm = jobMilestones[jobId];
        if (jm.client == address(0)) revert InvalidJob();
        if (_msgSender() != jm.client) revert Unauthorized();
        
        uint256 count = jm.milestones.length;
        if (count >= MAX_MILESTONES_PER_JOB) revert TooManyMilestones();
        
        // Validate total doesn't exceed budget
        uint256 totalAmount = amount;
        for (uint256 i = 0; i < count; i++) {
            totalAmount += jm.milestones[i].amount;
        }
        if (totalAmount > jm.totalBudget) revert MilestoneAmountExceedsBudget();
        
        jm.milestones.push(Milestone({
            description: description,
            amount: amount,
            dueDate: dueDate,
            completed: false,
            released: false,
            proofHash: bytes32(0)
        }));
        
        emit MilestoneAdded(jobId, count, description, amount);
    }
    
    /**
     * @dev Mark a milestone as completed
     * @param jobId The job ID
     * @param milestoneIndex The milestone index
     * @param proofHash Hash of completion proof
     */
    function completeMilestone(
        uint256 jobId,
        uint256 milestoneIndex,
        bytes32 proofHash
    ) external whenNotPaused {
        JobMilestones storage jm = jobMilestones[jobId];
        if (jm.provider == address(0)) revert InvalidJob();
        if (_msgSender() != jm.provider) revert Unauthorized();
        
        uint256 count = jm.milestones.length;
        if (milestoneIndex >= count) revert MilestoneIndexOutOfBounds();
        
        Milestone storage milestone = jm.milestones[milestoneIndex];
        if (milestone.completed) revert MilestoneAlreadyCompleted();
        if (milestone.released) revert MilestoneAlreadyReleased();
        
        milestone.completed = true;
        milestone.proofHash = proofHash;
        
        emit MilestoneCompleted(jobId, milestoneIndex, proofHash);
    }
    
    /**
     * @dev Release a completed milestone (arbiter or auto-release)
     * @param jobId The job ID
     * @param milestoneIndex The milestone index
     */
    function releaseMilestone(uint256 jobId, uint256 milestoneIndex)
        external
        whenNotPaused
        nonReentrant
    {
        JobMilestones storage jm = jobMilestones[jobId];
        if (jm.provider == address(0)) revert InvalidJob();
        
        uint256 count = jm.milestones.length;
        if (milestoneIndex >= count) revert MilestoneIndexOutOfBounds();
        
        Milestone storage milestone = jm.milestones[milestoneIndex];
        if (!milestone.completed) revert MilestoneNotCompleted();
        if (milestone.released) revert MilestoneAlreadyReleased();
        
        // Check arbiter or auto-release
        Dispute storage dispute = disputes[jobId];
        bool arbiterCanRelease = dispute.arbiter == _msgSender() && dispute.jobId == jobId && !dispute.resolved;
        bool canAutoRelease = block.timestamp > dispute.flaggedAt + ARBITER_RESPONSE_WINDOW;
        
        if (!arbiterCanRelease && !canAutoRelease && dispute.flaggedAt != 0) revert OnlyArbiterCanRelease();
        
        milestone.released = true;
        
        // Transfer payment
        IERC20(jm.paymentToken).safeTransfer(jm.provider, milestone.amount);
        emit MilestoneReleased(jobId, milestoneIndex, milestone.amount);
        
        if (canAutoRelease && !milestone.released) {
            emit MilestoneAutoReleased(jobId, milestoneIndex, milestone.amount);
        }
    }
    
    /**
     * @dev Get milestones for a job
     * @param jobId The job ID
     * @return Array of milestones
     */
    function getJobMilestones(uint256 jobId) external view returns (Milestone[] memory) {
        return jobMilestones[jobId].milestones;
    }
    
    /**
     * @dev Get milestone count
     * @param jobId The job ID
     * @return Number of milestones
     */
    function getMilestoneCount(uint256 jobId) external view returns (uint256) {
        return jobMilestones[jobId].milestones.length;
    }

    /***********************************/
    /* Arbiter Functions */
    /***********************************/
    
    /**
     * @dev Register as an arbiter
     */
    function registerAsArbiter() external payable {
        if (isRegisteredArbiter[_msgSender()]) revert ArbiterAlreadyRegistered();
        if (msg.value < ARBITER_STAKE) revert InsufficientArbiterStake();
        
        arbiterStakes[_msgSender()] = msg.value;
        isRegisteredArbiter[_msgSender()] = true;
        arbiterPool.push(_msgSender());
        
        emit ArbiterRegistered(_msgSender(), msg.value);
    }
    
    /**
     * @dev Unregister as an arbiter
     */
    function unregisterAsArbiter() external {
        if (!isRegisteredArbiter[_msgSender()]) revert NotRegisteredArbiter();
        
        // Check no active disputes
        for (uint256 i = 0; i < activeDisputeIds.length; i++) {
            Dispute storage d = disputes[activeDisputeIds[i]];
            if (!d.resolved && d.arbiter == _msgSender()) {
                revert ArbiterHasActiveDisputes();
            }
        }
        
        uint256 stake = arbiterStakes[_msgSender()];
        arbiterStakes[_msgSender()] = 0;
        isRegisteredArbiter[_msgSender()] = false;
        
        // Remove from pool
        for (uint256 i = 0; i < arbiterPool.length; i++) {
            if (arbiterPool[i] == _msgSender()) {
                arbiterPool[i] = arbiterPool[arbiterPool.length - 1];
                arbiterPool.pop();
                break;
            }
        }
        
        payable(_msgSender()).transfer(stake);
        
        emit ArbiterUnregistered(_msgSender(), stake);
    }
    
    /**
     * @dev Get arbiter stake
     * @param arbiter Arbiter address
     * @return Stake amount
     */
    function getArbiterStake(address arbiter) external view returns (uint256) {
        return arbiterStakes[arbiter];
    }
    
    /**
     * @dev Check if address is registered arbiter
     * @param account Address to check
     * @return True if registered
     */
    function isArbiter(address account) external view returns (bool) {
        return isRegisteredArbiter[account];
    }

    /***********************************/
    /* Dispute Functions */
    /***********************************/
    
    /**
     * @dev Flag a dispute for a job
     * @param jobId The job ID
     */
    function flagDispute(uint256 jobId) external payable nonReentrant {
        JobMilestones storage jm = jobMilestones[jobId];
        if (jm.client == address(0)) revert InvalidJob();
        
        if (_msgSender() != jm.client && _msgSender() != jm.provider) revert Unauthorized();
        if (msg.value < ARBITER_FEE) revert InsufficientArbiterStake();
        
        if (disputes[jobId].flaggedAt != 0) revert DisputeAlreadyExists();
        
        // Assign random arbiter
        if (arbiterPool.length == 0) revert NotRegisteredArbiter();
        
        uint256 randomIndex = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            jobId,
            _msgSender()
        ))) % arbiterPool.length;
        
        address assignedArbiter = arbiterPool[randomIndex];
        
        disputes[jobId] = Dispute({
            jobId: jobId,
            flaggler: _msgSender(),
            arbiter: assignedArbiter,
            flaggedAt: block.timestamp,
            resolved: false,
            releaseToProvider: false
        });
        
        activeDisputeIds.push(jobId);
        
        emit DisputeFlagged(jobId, _msgSender(), msg.value);
        emit ArbiterAssigned(jobId, assignedArbiter);
    }
    
    /**
     * @dev Submit evidence for a dispute
     * @param jobId The job ID
     * @param evidenceHash Hash of evidence
     */
    function submitEvidence(uint256 jobId, bytes32 evidenceHash) external whenNotPaused {
        Dispute storage dispute = disputes[jobId];
        if (dispute.flaggedAt == 0) revert DisputeNotActive();
        if (dispute.resolved) revert DisputeAlreadyResolved();
        
        JobMilestones storage jm = jobMilestones[jobId];
        if (_msgSender() != jm.client && _msgSender() != jm.provider) revert Unauthorized();
        
        emit EvidenceSubmitted(jobId, _msgSender(), evidenceHash);
    }
    
    /**
     * @dev Resolve a dispute
     * @param jobId The job ID
     * @param releaseToProvider True to release, false to refund
     */
    function resolveDispute(uint256 jobId, bool releaseToProvider)
        external
        whenNotPaused
        nonReentrant
    {
        Dispute storage dispute = disputes[jobId];
        if (dispute.arbiter != _msgSender()) revert OnlyArbiterOrParty();
        if (dispute.resolved) revert DisputeAlreadyResolved();
        
        dispute.resolved = true;
        dispute.releaseToProvider = releaseToProvider;
        
        JobMilestones storage jm = jobMilestones[jobId];
        
        if (releaseToProvider) {
            // Release all unreleased milestones to provider
            for (uint256 i = 0; i < jm.milestones.length; i++) {
                if (!jm.milestones[i].released) {
                    jm.milestones[i].released = true;
                    IERC20(jm.paymentToken).safeTransfer(jm.provider, jm.milestones[i].amount);
                    emit MilestoneReleased(jobId, i, jm.milestones[i].amount);
                }
            }
        } else {
            // Refund all to client
            for (uint256 i = 0; i < jm.milestones.length; i++) {
                if (!jm.milestones[i].released && jm.milestones[i].completed) {
                    jm.milestones[i].released = true;
                    IERC20(jm.paymentToken).safeTransfer(jm.client, jm.milestones[i].amount);
                }
            }
        }
        
        // Pay arbiter
        IERC20(jm.paymentToken).safeTransfer(dispute.arbiter, ARBITER_FEE);
        
        emit DisputeResolved(jobId, releaseToProvider, dispute.arbiter, ARBITER_FEE);
    }
    
    /**
     * @dev Get dispute details
     * @param jobId The job ID
     * @return Dispute struct
     */
    function getDispute(uint256 jobId) external view returns (Dispute memory) {
        return disputes[jobId];
    }
    
    /**
     * @dev Get active disputes
     * @return Array of active dispute job IDs
     */
    function getActiveDisputes() external view returns (uint256[] memory) {
        return activeDisputeIds;
    }
    
    /**
     * @dev Get arbiter count
     * @return Number of registered arbiters
     */
    function getArbiterCount() external view returns (uint256) {
        return arbiterPool.length;
    }
}