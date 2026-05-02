// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title MilestoneEscrowV2
 * @dev UUPS Upgradeable contract for milestone-based payments and dispute resolution
 * 
 * V2 Changes:
 * - Per-token arbiter fees (not hardcoded ETH)
 * - Per-token arbiter stakes (supports USDC, USDT, etc.)
 * - Dispute flagging uses job's paymentToken instead of ETH
 * - Removed critical $1T USDC transfer bug
 */
contract MilestoneEscrowV2 is 
    ContextUpgradeable,
    Ownable2StepUpgradeable, 
    UUPSUpgradeable, 
    ReentrancyGuard,
    PausableUpgradeable
{
    using SafeERC20 for IERC20;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /***********************************/
    /* Constants */
    /***********************************/
    
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
        address flagger;
        address arbiter;
        uint256 flaggedAt;
        bool resolved;
        bool releaseToProvider;
        uint256 feePaid; // Amount of fee paid in paymentToken
        uint256 milestoneIndex; // Index of the disputed milestone (VULN-11 fix)
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
    
    // V2: Per-token configuration
    mapping(address => uint256) public arbiterFeePerToken; // Fee to flag dispute
    mapping(address => uint256) public arbiterStakePerToken; // Stake to register as arbiter
    mapping(address => bool) public supportedTokens;
    
    // Job milestone data
    mapping(uint256 => JobMilestones) public jobMilestones;
    mapping(uint256 => uint256) public milestoneTotalAmount; // I6-04: Running total for O(1) budget checks
    
    // Arbiter system
    address[] public arbiterPool;
    mapping(address => uint256) public arbiterStakes;
    mapping(address => address) public arbiterStakeToken; // Token used for stake
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
    error InsufficientArbiterFee();
    error ArbiterHasActiveDisputes();
    error DisputeAlreadyExists();
    error DisputeNotActive();
    error DisputeAlreadyResolved();
    error OnlyArbiterOrParty();
    error Unauthorized();
    error TokenNotSupported();
    error InvalidTokenAmount();

    /***********************************/
    /* Events */
    /***********************************/
    
    event MilestoneEnabled(uint256 indexed jobId);
    event MilestoneAdded(uint256 indexed jobId, uint256 indexed milestoneIndex, string description, uint256 amount);
    event MilestoneCompleted(uint256 indexed jobId, uint256 indexed milestoneIndex, bytes32 proofHash);
    event MilestoneReleased(uint256 indexed jobId, uint256 indexed milestoneIndex, uint256 amount);
    event MilestoneNotReleased(uint256 indexed jobId, uint256 indexed milestoneIndex, string reason);
    
    event ArbiterRegistered(address indexed arbiter, address token, uint256 stake);
    event ArbiterUnregistered(address indexed arbiter, address token, uint256 refundedStake);
    event DisputeFlagged(uint256 indexed jobId, address indexed flagger, address token, uint256 fee);
    event EvidenceSubmitted(uint256 indexed jobId, address indexed submitter, bytes32 evidenceHash);
    event DisputeResolved(uint256 indexed jobId, bool releasedToProvider, address indexed arbiter, address token, uint256 arbiterFee);
    event ArbiterSlashed(address indexed arbiter, uint256 slashedAmount, string reason);
    event ArbiterAssigned(uint256 indexed jobId, address indexed arbiter);
    
    event ArbiterFeeUpdated(address indexed token, uint256 newFee);
    event ArbiterStakeUpdated(address indexed token, uint256 newStake);
    event TokenSupportUpdated(address indexed token, bool supported);
    event AgenticCommerceSet(address indexed oldAddress, address indexed newAddress);

    /***********************************/
    /* Initialization */
    /***********************************/
    
    function initialize(address initialOwner, address _agenticCommerce) public initializer {
        __Context_init();
        __Ownable_init(initialOwner);
        __Pausable_init();

        // P7-04 FIX: Validate agenticCommerce is a contract
        if (_agenticCommerce != address(0)) {
            uint256 size;
            assembly { size := extcodesize(_agenticCommerce) }
            if (size == 0) revert InvalidJob();
        }

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
        // A3-04 FIX: Validate is contract
        if (_agenticCommerce != address(0)) {
            uint256 size;
            assembly { size := extcodesize(_agenticCommerce) }
            if (size == 0) revert InvalidJob();
        }
        emit AgenticCommerceSet(agenticCommerce, _agenticCommerce);
        agenticCommerce = _agenticCommerce;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Set arbiter fee for a specific token
     * @param token The payment token address
     * @param fee The fee amount in token's native units
     */
    function setArbiterFee(address token, uint256 fee) external onlyOwner {
        arbiterFeePerToken[token] = fee;
        emit ArbiterFeeUpdated(token, fee);
    }
    
    /**
     * @dev Set arbiter stake requirement for a specific token
     * @param token The staking token address
     * @param stake The stake amount in token's native units
     */
    function setArbiterStake(address token, uint256 stake) external onlyOwner {
        arbiterStakePerToken[token] = stake;
        emit ArbiterStakeUpdated(token, stake);
    }
    
    /**
     * @dev Set token support status
     * @param token The token address
     * @param supported Whether the token is supported
     */
    function setSupportedToken(address token, bool supported) external onlyOwner {
        supportedTokens[token] = supported;
        emit TokenSupportUpdated(token, supported);
    }

    /***********************************/
    /* Milestone Functions */
    /***********************************/
    
    /**
     * @dev Enable milestones for a job.
     * A3-06 NOTE: Both agenticCommerce AND client can enable milestones.
     * This allows clients to self-enable milestones for direct jobs,
     * but agenticCommerce can also enable them as part of job creation flow.
     */
    function enableMilestones(
        uint256 jobId,
        address client,
        address provider,
        address paymentToken,
        uint256 totalBudget
    ) external whenNotPaused {
        if (_msgSender() != agenticCommerce && _msgSender() != client) revert Unauthorized();
        if (client == address(0) || provider == address(0)) revert ZeroAddress();
        if (client == provider) revert InvalidJob();
        if (!supportedTokens[paymentToken]) revert TokenNotSupported();
        
        jobMilestones[jobId].client = client;
        jobMilestones[jobId].provider = provider;
        jobMilestones[jobId].paymentToken = paymentToken;
        jobMilestones[jobId].totalBudget = totalBudget;
        jobMilestones[jobId].usesMilestones = true;
        
        emit MilestoneEnabled(jobId);
    }
    
    /**
     * @dev Add a milestone to a job
     */
    function addMilestone(
        uint256 jobId,
        uint256 amount,
        string calldata description,
        uint256 dueDate
    ) external whenNotPaused {
        JobMilestones storage jm = jobMilestones[jobId];
        if (jm.client == address(0)) revert InvalidJob();
        if (_msgSender() != jm.client) revert Unauthorized();
        if (!jm.usesMilestones) revert MilestonesNotEnabled();
        if (jm.milestones.length >= MAX_MILESTONES_PER_JOB) revert TooManyMilestones();
        if (amount == 0) revert InvalidTokenAmount();
        
        // I6-04 FIX: Use running total for O(1) budget check
        uint256 currentTotal = milestoneTotalAmount[jobId];
        if (currentTotal + amount > jm.totalBudget) revert MilestoneAmountExceedsBudget();
        
        jm.milestones.push(Milestone({
            description: description,
            amount: amount,
            dueDate: dueDate,
            completed: false,
            released: false,
            proofHash: bytes32(0)
        }));
        
        // I6-04 FIX: Update running total
        milestoneTotalAmount[jobId] = currentTotal + amount;
        
        emit MilestoneAdded(jobId, jm.milestones.length - 1, description, amount);
    }
    
    /**
     * @dev Submit milestone completion
     */
    function submitMilestone(
        uint256 jobId,
        uint256 milestoneIndex,
        bytes32 proofHash
    ) external whenNotPaused {
        JobMilestones storage jm = jobMilestones[jobId];
        if (jm.provider == address(0)) revert InvalidJob();
        if (_msgSender() != jm.provider) revert Unauthorized();
        if (milestoneIndex >= jm.milestones.length) revert MilestoneIndexOutOfBounds();
        
        Milestone storage milestone = jm.milestones[milestoneIndex];
        if (milestone.completed) revert MilestoneAlreadyCompleted();
        
        milestone.completed = true;
        milestone.proofHash = proofHash;
        
        emit MilestoneCompleted(jobId, milestoneIndex, proofHash);
    }
    
    /**
     * @dev Release milestone payment
     */
    function releaseMilestone(
        uint256 jobId,
        uint256 milestoneIndex
    ) external nonReentrant whenNotPaused {
        JobMilestones storage jm = jobMilestones[jobId];
        if (jm.client == address(0)) revert InvalidJob();
        if (_msgSender() != jm.client) revert Unauthorized();
        if (milestoneIndex >= jm.milestones.length) revert MilestoneIndexOutOfBounds();
        
        Milestone storage milestone = jm.milestones[milestoneIndex];
        if (!milestone.completed) revert MilestoneNotCompleted();
        if (milestone.released) revert MilestoneAlreadyReleased();
        
        milestone.released = true;
        
        // Transfer payment token to provider
        IERC20(jm.paymentToken).safeTransfer(jm.provider, milestone.amount);
        
        emit MilestoneReleased(jobId, milestoneIndex, milestone.amount);
    }

    /***********************************/
    /* Dispute Functions */
    /***********************************/
    
    /**
     * @dev Flag a dispute for a job. Fee is paid in the job's paymentToken.
     * @param jobId The job ID
     */
    function flagDispute(uint256 jobId, uint256 milestoneIndex) external nonReentrant {
        JobMilestones storage jm = jobMilestones[jobId];
        if (jm.client == address(0)) revert InvalidJob();
        if (_msgSender() != jm.client && _msgSender() != jm.provider) revert Unauthorized();
        if (milestoneIndex >= jm.milestones.length) revert MilestoneIndexOutOfBounds();
        if (disputes[jobId].flaggedAt != 0) revert DisputeAlreadyExists();
        if (arbiterPool.length == 0) revert NotRegisteredArbiter();
        
        address paymentToken = jm.paymentToken;
        uint256 fee = arbiterFeePerToken[paymentToken];
        if (fee == 0) revert InsufficientArbiterFee();
        
        // Assign random arbiter
        uint256 randomIndex = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            jobId,
            _msgSender()
        ))) % arbiterPool.length;
        
        address assignedArbiter = arbiterPool[randomIndex];
        
        // Effects: Write state before external call
        disputes[jobId] = Dispute({
            jobId: jobId,
            flagger: _msgSender(),
            arbiter: assignedArbiter,
            flaggedAt: block.timestamp,
            resolved: false,
            releaseToProvider: false,
            feePaid: fee,
            milestoneIndex: milestoneIndex
        });
        
        activeDisputeIds.push(jobId);
        
        // Interaction: Transfer fee with fee-on-transfer detection
        uint256 balanceBefore = IERC20(paymentToken).balanceOf(address(this));
        IERC20(paymentToken).safeTransferFrom(_msgSender(), address(this), fee);
        uint256 balanceAfter = IERC20(paymentToken).balanceOf(address(this));
        if (balanceAfter - balanceBefore != fee) revert InvalidTokenAmount();
        
        emit DisputeFlagged(jobId, _msgSender(), paymentToken, fee);
        emit ArbiterAssigned(jobId, assignedArbiter);
    }
    
    /**
     * @dev Submit evidence for a dispute
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
     * @dev Resolve a dispute. Arbiter fee is paid from the fee collected during flagging.
     * Removes the dispute from activeDisputeIds immediately.
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
        uint256 mi = dispute.milestoneIndex;

        // VULN-11 FIX: Only resolve the specific disputed milestone, not all milestones
        if (mi < jm.milestones.length && !jm.milestones[mi].released) {
            if (releaseToProvider) {
                jm.milestones[mi].released = true;
                IERC20(jm.paymentToken).safeTransfer(jm.provider, jm.milestones[mi].amount);
                emit MilestoneReleased(jobId, mi, jm.milestones[mi].amount);
            } else {
                // Only refund completed milestones to client
                if (jm.milestones[mi].completed) {
                    jm.milestones[mi].released = true;
                    IERC20(jm.paymentToken).safeTransfer(jm.client, jm.milestones[mi].amount);
                    emit MilestoneReleased(jobId, mi, jm.milestones[mi].amount);
                } else {
                    emit MilestoneNotReleased(jobId, mi, "Milestone not completed");
                }
            }
        }

        // Remove from activeDisputeIds immediately (swap-and-pop)
        _removeActiveDispute(jobId);

        // E4-06 FIX: Ensure contract holds enough payment token before transfer
        uint256 arbiterFee = dispute.feePaid;
        if (arbiterFee > 0) {
            uint256 contractBalance = IERC20(jm.paymentToken).balanceOf(address(this));
            if (contractBalance < arbiterFee) revert InsufficientArbiterFee();
            IERC20(jm.paymentToken).safeTransfer(dispute.arbiter, arbiterFee);
        }

        emit DisputeResolved(jobId, releaseToProvider, dispute.arbiter, jm.paymentToken, arbiterFee);
    }

    /**
     * @dev Remove a resolved dispute from activeDisputeIds using swap-and-pop.
     */
    function _removeActiveDispute(uint256 jobId) internal {
        uint256 length = activeDisputeIds.length;
        for (uint256 i = 0; i < length; i++) {
            if (activeDisputeIds[i] == jobId) {
                if (i != length - 1) {
                    activeDisputeIds[i] = activeDisputeIds[length - 1];
                }
                activeDisputeIds.pop();
                break;
            }
        }
    }
    
    /**
     * @dev Get dispute details
     */
    function getDispute(uint256 jobId) external view returns (Dispute memory) {
        return disputes[jobId];
    }
    
    /**
     * @dev Get active disputes
     */
    function getActiveDisputes() external view returns (uint256[] memory) {
        return activeDisputeIds;
    }
    
    /**
     * @dev Slash an arbiter
     */
    function slashArbiter(address arbiter, string calldata reason) external onlyOwner {
        if (!isRegisteredArbiter[arbiter]) revert NotRegisteredArbiter();
        
        uint256 stake = arbiterStakes[arbiter];
        uint256 slashAmount = (stake * SLASH_PERCENT) / 10000;
        
        arbiterStakes[arbiter] = stake - slashAmount;
        
        // Transfer slashed amount to platform treasury (or burn)
        // For now, leave in contract
        
        emit ArbiterSlashed(arbiter, slashAmount, reason);
    }
    
    /**
     * @dev Withdraw accidentally sent tokens or accumulated slashed funds (owner only).
     * @param token The token address to withdraw.
     * @param amount The amount to withdraw.
     */
    function withdrawToken(address token, uint256 amount) external onlyOwner {
        if (amount == 0) revert InvalidTokenAmount();
        IERC20(token).safeTransfer(msg.sender, amount);
    }

    /***********************************/
    /* Arbiter Functions */
    /***********************************/
    
    /**
     * @dev Register as an arbiter with token stake
     * @param token The token to stake (must be supported)
     * @param amount The amount to stake
     */
    function registerAsArbiter(address token, uint256 amount) external nonReentrant {
        if (isRegisteredArbiter[_msgSender()]) revert ArbiterAlreadyRegistered();
        if (!supportedTokens[token]) revert TokenNotSupported();
        
        uint256 requiredStake = arbiterStakePerToken[token];
        if (requiredStake == 0) revert InsufficientArbiterStake();
        if (amount < requiredStake) revert InsufficientArbiterStake();
        
        // Effects: Write state before external call
        arbiterStakes[_msgSender()] = amount;
        arbiterStakeToken[_msgSender()] = token;
        isRegisteredArbiter[_msgSender()] = true;
        arbiterPool.push(_msgSender());
        
        // Interaction: Transfer stake with fee-on-transfer detection
        uint256 balanceBefore = IERC20(token).balanceOf(address(this));
        IERC20(token).safeTransferFrom(_msgSender(), address(this), amount);
        uint256 balanceAfter = IERC20(token).balanceOf(address(this));
        if (balanceAfter - balanceBefore != amount) revert InvalidTokenAmount();
        
        emit ArbiterRegistered(_msgSender(), token, amount);
    }
    
    /**
     * @dev Unregister as an arbiter
     */
    function unregisterAsArbiter() external nonReentrant {
        if (!isRegisteredArbiter[_msgSender()]) revert NotRegisteredArbiter();
        
        // Check no active disputes
        for (uint256 i = 0; i < activeDisputeIds.length; i++) {
            Dispute storage d = disputes[activeDisputeIds[i]];
            if (!d.resolved && d.arbiter == _msgSender()) {
                revert ArbiterHasActiveDisputes();
            }
        }
        
        uint256 stake = arbiterStakes[_msgSender()];
        address token = arbiterStakeToken[_msgSender()];
        arbiterStakes[_msgSender()] = 0;
        arbiterStakeToken[_msgSender()] = address(0);
        isRegisteredArbiter[_msgSender()] = false;
        
        // Remove from pool
        for (uint256 i = 0; i < arbiterPool.length; i++) {
            if (arbiterPool[i] == _msgSender()) {
                arbiterPool[i] = arbiterPool[arbiterPool.length - 1];
                arbiterPool.pop();
                break;
            }
        }
        
        // Return staked tokens
        if (stake > 0 && token != address(0)) {
            IERC20(token).safeTransfer(_msgSender(), stake);
        }
        
        emit ArbiterUnregistered(_msgSender(), token, stake);
    }
    
    /**
     * @dev Get arbiter stake
     */
    function getArbiterStake(address arbiter) external view returns (uint256) {
        return arbiterStakes[arbiter];
    }
    
    /**
     * @dev Get arbiter stake token
     */
    function getArbiterStakeToken(address arbiter) external view returns (address) {
        return arbiterStakeToken[arbiter];
    }
    
    /**
     * @dev Get all arbiters
     */
    function getArbiters() external view returns (address[] memory) {
        return arbiterPool;
    }
    
    /**
     * @dev Get milestones for a job
     */
    function getJobMilestones(uint256 jobId) external view returns (Milestone[] memory) {
        return jobMilestones[jobId].milestones;
    }

    /// @dev Storage gap for upgrade safety
    uint256[50] private __gap;
}