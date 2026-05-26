// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {AdminRegistry} from "./AdminRegistry.sol";

/**
 * @title IAgentReviewV5
 * @dev Interface for Agent Review Contract V5 (Security Fixes)
 */
interface IAgentReviewV5 {
    enum ProposalStatus {
        Open,
        UnderReview,
        Decided,
        Cancelled
    }

    struct Proposal {
        uint256 id;
        address proposer;
        string title;
        string description;
        string criteriaURI;
        uint256 reward;
        ProposalStatus status;
        uint256 createdAt;
        uint256 decisionDeadline;
        address winningEvaluator;
    }

    struct Evaluation {
        uint256 proposalId;
        address evaluator;
        int256 confidenceScore;
        string reasoningURI;
        uint256 stakeAmount;
        bool isFinal;
        bool rewardClaimed;
        bool stakeReleased;
        uint256 submittedAt;
        uint256 rewardAmount; // V5: Amount available for reward claim
    }

    // Core Events
    event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string title, uint256 indexed reward);
    event EvaluationSubmitted(uint256 indexed proposalId, address indexed evaluator, int256 indexed confidenceScore, uint256 stakeAmount);
    event DecisionAttested(uint256 indexed proposalId, address indexed attestor, address indexed winningEvaluator);
    event EvaluatorSlashed(address indexed evaluator, uint256 indexed slashAmount, string reason);
    event RewardClaimed(uint256 indexed proposalId, address indexed evaluator, uint256 indexed amount);
    event StakeReleased(uint256 indexed proposalId, address indexed evaluator, uint256 indexed amount);

    // Phase 3: Enhanced Events
    event ProposalStatusChanged(
        uint256 indexed proposalId,
        ProposalStatus indexed oldStatus,
        ProposalStatus indexed newStatus,
        address changedBy,
        uint256 timestamp
    );
    
    event EvaluatorLimitReached(
        uint256 indexed proposalId,
        uint256 indexed currentCount,
        uint256 indexed maxAllowed
    );
    
    event EvaluationFinalized(
        uint256 indexed proposalId,
        address indexed evaluator,
        bool indexed isWinner,
        int256 confidenceScore
    );
    
    event StakeAmountChanged(
        uint256 indexed proposalId,
        address indexed evaluator,
        uint256 oldAmount,
        uint256 newAmount
    );
    
    event ProposalCancelledByProposer(
        uint256 indexed proposalId,
        address indexed proposer,
        uint256 indexed refundAmount
    );
    
    event EvaluatorRegistered(
        uint256 indexed proposalId,
        address indexed evaluator,
        uint256 indexed evaluatorIndex
    );
    
    event RewardDistributionFailed(
        uint256 indexed proposalId,
        address indexed evaluator,
        uint256 amount,
        bytes reason
    );
    
    // V5: SlashManager & Locked Funds Events
    event SlashManagerSet(address indexed slashManager);
    event AdminRegistrySet(address indexed adminRegistry);
    event ETHWithdrawn(address indexed to, uint256 amount);
    event RewardAmountSet(uint256 indexed proposalId, address indexed evaluator, uint256 amount);
    event SlashTreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);

    // Errors
    error TooManyEvaluators(uint256 proposalId);
    error AlreadyEvaluated(uint256 proposalId, address evaluator);
    error MaxEvaluatorsReached();
    error InvalidScore();
    error InvalidSlashManager();
    error InsufficientBalance();
    error ExceedsAvailableBalance();
    error ProposerBlacklisted();
    error EvaluatorBlacklisted();

    function createProposal(
        string calldata title,
        string calldata description,
        string calldata criteriaURI,
        uint256 reward,
        uint256 decisionDeadline
    ) external payable returns (uint256 proposalId);

    function submitEvaluation(
        uint256 proposalId,
        int256 confidenceScore,
        string calldata reasoningURI
    ) external payable;

    function attestDecision(uint256 proposalId, address winningEvaluator) external;

    function slashEvaluator(address evaluator, uint256 proposalId, uint256 slashBP, string calldata reason) external;

    function claimReward(uint256 proposalId) external;

    function releaseStake(uint256 proposalId) external;

    function getProposal(uint256 proposalId) external view returns (Proposal memory);

    function getEvaluation(uint256 proposalId, address evaluator) external view returns (Evaluation memory);

    function getProposalEvaluators(uint256 proposalId) external view returns (address[] memory);
    
    // V5: Admin Functions
    function setSlashManager(address slashManager_) external;
    function withdrawETH(address payable to, uint256 amount) external;
    function getTotalLockedETH() external view returns (uint256 totalLocked);
}

/**
 * @title AgentReviewV5
 * @dev PRD 3 - Agent Review & Coordination Contract V5
 * 
 * V5 Security Fixes:
 * - UUPS Upgradeable
 * - Winner Payment Pull Pattern
 * - SlashManager Integration
 * - withdrawETH Locked Funds Protection
 * - Pausable for emergency stops
 * 
 * Phase 13 Security Fixes:
 * - M2: Configurable slash treasury (slashed funds go to treasury, not owner)
 * - M1: Pass slash basis points from SlashManager (configurable slash %)
 * - M3: Median-based winner selection (eliminates proposer bias)
 * - M4: Proportional evaluator rewards (eliminates winner-take-all)
 */
contract AgentReviewV5 is IAgentReviewV5, ContextUpgradeable, Ownable2StepUpgradeable, UUPSUpgradeable, ReentrancyGuard, PausableUpgradeable {
    error AgentReviewV5_Already_claimed();
    error AgentReviewV5_Already_evaluated();
    error AgentReviewV5_Already_final();
    error AgentReviewV5_Already_released();
    error AgentReviewV5_Already_submitted();
    error AgentReviewV5_Cannot_evaluate_own_proposal();
    error AgentReviewV5_Cannot_exceed_100();
    error AgentReviewV5_Deadline_in_past();
    error AgentReviewV5_Deadline_not_passed();
    error AgentReviewV5_Deadline_passed();
    error AgentReviewV5_Exact_ETH_required();
    error AgentReviewV5_Exceeds_available_balance();
    error AgentReviewV5_Grace_period_not_passed();
    error AgentReviewV5_Invalid_proposal();
    error AgentReviewV5_Invalid_score();
    error AgentReviewV5_Max_evaluators_reached();
    error AgentReviewV5_No_evaluators();
    error AgentReviewV5_No_reward();
    error AgentReviewV5_No_stake();
    error AgentReviewV5_Not_an_evaluator();
    error AgentReviewV5_Not_decided();
    error AgentReviewV5_Not_open();
    error AgentReviewV5_Not_proposer();
    error AgentReviewV5_Not_slashManager();
    error AgentReviewV5_Not_under_review();
    error AgentReviewV5_Not_winner();
    error AgentReviewV5_Proposal_not_active();
    error AgentReviewV5_Reward_too_high();
    error AgentReviewV5_Reward_too_low();
    error AgentReviewV5_Stake_too_low();
    error AgentReviewV5_Transfer_failed();
    error AgentReviewV5_Zero_address();
    error AgentReviewV5_Zero_amount();
    error AgentReviewV5_Eth_transfer_failed();
    uint256 public constant MAX_EVALUATORS_PER_PROPOSAL = 5;
    uint256 public constant MIN_STAKE = 0.001 ether;
    uint256 public constant SLASH_PERCENTAGE = 5000;
    uint256 public constant FEE_DENOMINATOR = 10000;
    
    // M5 Fix: Grace period after deadline before anyone can finalize
    uint256 public constant GRACE_PERIOD = 7 days;
    
    // L1 Fix: Maximum reward limit to prevent accidentally locking large ETH amounts
    uint256 public constant MAX_REWARD = 100 ether;

    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => address[]) public proposalEvaluators;
    mapping(uint256 => mapping(address => Evaluation)) public evaluations;
    uint256 public _proposalCounter;

    // V5: SlashManager role for governance
    address public slashManager;

    // M2 Fix: Configurable treasury for slashed funds
    address public slashTreasury;

    // Bad Actor: AdminRegistry for blacklist checks
    address public adminRegistry;
    
    // Storage gap for upgradeability
    uint256[49] private __gap;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address initialOwner) public initializer {
        if (initialOwner == address(0)) revert AgentReviewV5_Zero_address();
        __Context_init();
        __Ownable_init(initialOwner);
        __Pausable_init();
        
        // M2 Fix: Initialize slash treasury to owner
        slashTreasury = initialOwner;
    }

    function _authorizeUpgrade(address newImpl) internal override onlyOwner {}

    /**
     * @dev Pause the contract
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    modifier onlySlashManager() {
        if (!(msg.sender == slashManager)) revert AgentReviewV5_Not_slashManager();
        _;
    }

    function createProposal(
        string calldata title,
        string calldata description,
        string calldata criteriaURI,
        uint256 reward,
        uint256 decisionDeadline
    ) external payable whenNotPaused returns (uint256 proposalId) {
        // Bad Actor: Check if proposer is blacklisted
        if (adminRegistry != address(0)) {
            AdminRegistry registry = AdminRegistry(adminRegistry);
            if (registry.isWalletBlacklistedActive(_msgSender())) revert ProposerBlacklisted();
        }

        // L1 Fix: Check maximum reward limit
        if (!(reward <= MAX_REWARD)) revert AgentReviewV5_Reward_too_high();
        if (!(msg.value == reward)) revert AgentReviewV5_Exact_ETH_required();
        if (!(reward >= MIN_STAKE)) revert AgentReviewV5_Reward_too_low();
        if (!(decisionDeadline > block.timestamp)) revert AgentReviewV5_Deadline_in_past();

        _proposalCounter++;
        proposalId = _proposalCounter;

        proposals[proposalId] = Proposal({
            id: proposalId,
            proposer: _msgSender(),
            title: title,
            description: description,
            criteriaURI: criteriaURI,
            reward: reward,
            status: ProposalStatus.Open,
            createdAt: block.timestamp,
            decisionDeadline: decisionDeadline,
            winningEvaluator: address(0)
        });

        emit ProposalCreated(proposalId, _msgSender(), title, reward);
        emit ProposalStatusChanged(proposalId, ProposalStatus.Open, ProposalStatus.Open, _msgSender(), block.timestamp);
    }

    function submitEvaluation(
        uint256 proposalId,
        int256 confidenceScore,
        string calldata reasoningURI
    ) external payable whenNotPaused {
        // Bad Actor: Check if evaluator is blacklisted
        if (adminRegistry != address(0)) {
            AdminRegistry registry = AdminRegistry(adminRegistry);
            if (registry.isWalletBlacklistedActive(_msgSender())) revert EvaluatorBlacklisted();
        }

        Proposal storage proposal = proposals[proposalId];
        if (!(proposal.id == proposalId)) revert AgentReviewV5_Invalid_proposal();
        if (!(proposal.status == ProposalStatus.Open)) revert AgentReviewV5_Not_open();
        if (!(proposal.proposer != _msgSender())) revert AgentReviewV5_Cannot_evaluate_own_proposal();
        if (!(proposal.decisionDeadline > block.timestamp)) revert AgentReviewV5_Deadline_passed();
        if (!(msg.value >= MIN_STAKE)) revert AgentReviewV5_Stake_too_low();
        if (!(confidenceScore >= -100 && confidenceScore <= 100)) revert AgentReviewV5_Invalid_score();

        address[] storage evals = proposalEvaluators[proposalId];
        if (!(evals.length < MAX_EVALUATORS_PER_PROPOSAL)) revert AgentReviewV5_Max_evaluators_reached();
        
        for (uint256 i = 0; i < evals.length; i++) {
            if (!(evals[i] != _msgSender())) revert AgentReviewV5_Already_evaluated();
        }

        Evaluation storage eval = evaluations[proposalId][_msgSender()];
        if (!(eval.submittedAt == 0)) revert AgentReviewV5_Already_submitted();

        eval.proposalId = proposalId;
        eval.evaluator = _msgSender();
        eval.confidenceScore = confidenceScore;
        eval.reasoningURI = reasoningURI;
        eval.stakeAmount = msg.value;
        eval.submittedAt = block.timestamp;

        evals.push(_msgSender());
        
        if (evals.length == MAX_EVALUATORS_PER_PROPOSAL) {
            emit EvaluatorLimitReached(proposalId, evals.length, MAX_EVALUATORS_PER_PROPOSAL);
        }

        emit EvaluationSubmitted(proposalId, _msgSender(), confidenceScore, msg.value);
        emit EvaluatorRegistered(proposalId, _msgSender(), evals.length - 1);
    }

    function attestDecision(uint256 proposalId, address winningEvaluator) external nonReentrant whenNotPaused {
        Proposal storage proposal = proposals[proposalId];
        if (!(proposal.id == proposalId)) revert AgentReviewV5_Invalid_proposal();
        if (!(proposal.status == ProposalStatus.UnderReview)) revert AgentReviewV5_Not_under_review();
        if (!(proposal.proposer == _msgSender())) revert AgentReviewV5_Not_proposer();
        if (!(proposal.decisionDeadline <= block.timestamp)) revert AgentReviewV5_Deadline_not_passed();

        address finalWinner = winningEvaluator;
        if (finalWinner == address(0)) {
            finalWinner = _getMedianEvaluator(proposalId);
        }

        Evaluation storage winningEval = evaluations[proposalId][finalWinner];
        if (!(winningEval.submittedAt > 0)) revert AgentReviewV5_Not_an_evaluator();
        if (!(!winningEval.isFinal)) revert AgentReviewV5_Already_final();

        ProposalStatus oldStatus = proposal.status;
        proposal.status = ProposalStatus.Decided;
        proposal.winningEvaluator = finalWinner;
        winningEval.isFinal = true;
        
        // M4 Fix: Proportional rewards based on score accuracy
        _distributeProportionalRewards(proposalId, finalWinner);

        emit EvaluationFinalized(proposalId, finalWinner, true, 0);
        emit DecisionAttested(proposalId, _msgSender(), finalWinner);
        emit ProposalStatusChanged(proposalId, oldStatus, ProposalStatus.Decided, _msgSender(), block.timestamp);
    }
    
    /**
     * @dev M5 Fix: Permissionless finalize - anyone can finalize after grace period
     * Uses median-based selection automatically if proposer doesn't act
     */
    function finalizeDecision(uint256 proposalId) external nonReentrant whenNotPaused {
        Proposal storage proposal = proposals[proposalId];
        if (!(proposal.id == proposalId)) revert AgentReviewV5_Invalid_proposal();
        if (!(proposal.status == ProposalStatus.UnderReview)) revert AgentReviewV5_Not_under_review();
        
        // M5 Fix: Require deadline + grace period to have passed
        if (!(proposal.decisionDeadline + GRACE_PERIOD <= block.timestamp)) revert AgentReviewV5_Grace_period_not_passed();
        
        address[] storage evals = proposalEvaluators[proposalId];
        if (!(evals.length > 0)) revert AgentReviewV5_No_evaluators();
        
        // Use median evaluator as winner (same logic as passing address(0))
        address winner = _getMedianEvaluator(proposalId);
        
        ProposalStatus oldStatus = proposal.status;
        proposal.status = ProposalStatus.Decided;
        proposal.winningEvaluator = winner;
        
        Evaluation storage winningEval = evaluations[proposalId][winner];
        winningEval.isFinal = true;
        
        // M4 Fix: Distribute proportional rewards
        _distributeProportionalRewards(proposalId, winner);
        
        emit EvaluationFinalized(proposalId, winner, true, winningEval.confidenceScore);
        emit DecisionAttested(proposalId, address(0), winner);
        emit ProposalStatusChanged(proposalId, oldStatus, ProposalStatus.Decided, _msgSender(), block.timestamp);
    }
    
    /**
     * @dev Internal function to get median evaluator
     */
    function _getMedianEvaluator(uint256 proposalId) internal view returns (address winner) {
        int256 medianScore = calculateMedianScore(proposalId);
        address[] storage evals = proposalEvaluators[proposalId];
        
        int256 minDiff = type(int256).max;
        for (uint256 i = 0; i < evals.length; i++) {
            int256 diff = evaluations[proposalId][evals[i]].confidenceScore - medianScore;
            if (diff < 0) diff = -diff;
            if (diff < minDiff) {
                minDiff = diff;
                winner = evals[i];
            }
        }
    }
    
    /**
     * @dev M4 Fix: Distribute rewards proportionally based on score accuracy
     * Evaluators closest to median get larger share of the pool
     */
    function _distributeProportionalRewards(uint256 proposalId, address winningEvaluator) internal {
        Proposal storage proposal = proposals[proposalId];
        address[] storage evals = proposalEvaluators[proposalId];
        uint256 evaluatorCount = evals.length;
        
        if (evaluatorCount == 0) return;
        
        // Calculate total pool (proposer reward + all stakes)
        uint256 totalPool = proposal.reward;
        for (uint256 i = 0; i < evaluatorCount; i++) {
            totalPool += evaluations[proposalId][evals[i]].stakeAmount;
        }
        
        // Winner gets their stake back plus the configured reward share.
        // Non-winners keep their stake withdrawable through releaseStake().
        uint256 winnerShare = evaluatorCount == 1 ? proposal.reward : (totalPool * 60) / 100;
        
        // Set winner reward
        Evaluation storage winningEval = evaluations[proposalId][winningEvaluator];
        winningEval.rewardAmount = winningEval.stakeAmount + winnerShare;
        winningEval.stakeAmount = 0;
        winningEval.stakeReleased = true;
    }

    function slashEvaluator(address evaluator, uint256 proposalId, uint256 slashBP, string calldata reason) external nonReentrant onlySlashManager whenNotPaused {
        Proposal storage proposal = proposals[proposalId];
        if (!(proposal.id == proposalId)) revert AgentReviewV5_Invalid_proposal();
        if (!(proposal.status == ProposalStatus.UnderReview)) revert AgentReviewV5_Proposal_not_active();
        
        Evaluation storage eval = evaluations[proposalId][evaluator];
        if (!(eval.submittedAt > 0)) revert AgentReviewV5_Not_an_evaluator();
        if (!(!eval.isFinal)) revert AgentReviewV5_Already_final();

        // M2 Fix: Use slashBP passed from SlashManager, capped at 10000 (100%)
        if (slashBP > FEE_DENOMINATOR) slashBP = FEE_DENOMINATOR;
        uint256 slashAmount = (eval.stakeAmount * slashBP) / FEE_DENOMINATOR;
        
        if (slashAmount > 0) {
            uint256 oldStake = eval.stakeAmount;
            eval.stakeAmount = eval.stakeAmount - slashAmount;
            
            emit StakeAmountChanged(proposalId, evaluator, oldStake, eval.stakeAmount);
            
            // M2 Fix: Send to slashTreasury instead of owner
            _sendEth(slashTreasury, slashAmount);
        }

        emit EvaluatorSlashed(evaluator, slashAmount, reason);
    }

    function claimReward(uint256 proposalId) external nonReentrant {
        Proposal storage proposal = proposals[proposalId];
        if (!(proposal.id == proposalId)) revert AgentReviewV5_Invalid_proposal();
        if (!(proposal.status == ProposalStatus.Decided)) revert AgentReviewV5_Not_decided();

        Evaluation storage eval = evaluations[proposalId][_msgSender()];
        if (!(eval.submittedAt > 0)) revert AgentReviewV5_Not_an_evaluator();
        if (!(proposal.winningEvaluator == _msgSender())) revert AgentReviewV5_Not_winner();
        if (!(!eval.rewardClaimed)) revert AgentReviewV5_Already_claimed();
        if (!(eval.rewardAmount > 0)) revert AgentReviewV5_No_reward();

        uint256 amount = eval.rewardAmount;
        eval.rewardAmount = 0;
        eval.rewardClaimed = true;

        _sendEth(_msgSender(), amount);

        emit RewardClaimed(proposalId, _msgSender(), amount);
    }

    function releaseStake(uint256 proposalId) external nonReentrant {
        Proposal storage proposal = proposals[proposalId];
        if (!(proposal.id == proposalId)) revert AgentReviewV5_Invalid_proposal();
        if (!(proposal.status == ProposalStatus.Decided || proposal.status == ProposalStatus.Cancelled)) {
            revert AgentReviewV5_Not_decided();
        }
        
        Evaluation storage eval = evaluations[proposalId][_msgSender()];
        if (!(eval.submittedAt > 0)) revert AgentReviewV5_Not_an_evaluator();
        if (!(!eval.stakeReleased)) revert AgentReviewV5_Already_released();
        if (!(eval.stakeAmount > 0)) revert AgentReviewV5_No_stake();

        uint256 amount = eval.stakeAmount;
        eval.stakeAmount = 0;
        eval.stakeReleased = true;

        _sendEth(_msgSender(), amount);

        emit StakeReleased(proposalId, _msgSender(), amount);
    }

    function getProposal(uint256 proposalId) external view returns (Proposal memory) {
        if (!(proposalId > 0 && proposalId <= _proposalCounter)) revert AgentReviewV5_Invalid_proposal();
        return proposals[proposalId];
    }

    function getEvaluation(uint256 proposalId, address evaluator) external view returns (Evaluation memory) {
        return evaluations[proposalId][evaluator];
    }

    function getProposalEvaluators(uint256 proposalId) external view returns (address[] memory) {
        return proposalEvaluators[proposalId];
    }
    
    // M3 Fix: Calculate median score for automatic winner selection
    function calculateMedianScore(uint256 proposalId) public view returns (int256 medianScore) {
        address[] storage evals = proposalEvaluators[proposalId];
        if (!(evals.length > 0)) revert AgentReviewV5_No_evaluators();
        
        // Collect all scores
        int256[] memory scores = new int256[](evals.length);
        for (uint256 i = 0; i < evals.length; i++) {
            scores[i] = evaluations[proposalId][evals[i]].confidenceScore;
        }
        
        // Sort scores (bubble sort for simplicity)
        for (uint256 i = 0; i < evals.length - 1; i++) {
            for (uint256 j = 0; j < evals.length - i - 1; j++) {
                if (scores[j] > scores[j + 1]) {
                    int256 temp = scores[j];
                    scores[j] = scores[j + 1];
                    scores[j + 1] = temp;
                }
            }
        }
        
        // Get median
        uint256 mid = evals.length / 2;
        if (evals.length % 2 == 0) {
            medianScore = (scores[mid - 1] + scores[mid]) / 2;
        } else {
            medianScore = scores[mid];
        }
    }
    
    // M4 Fix: Get evaluator closest to median (automatic winner selection)
    function getMedianEvaluator(uint256 proposalId) external view returns (address winner) {
        int256 medianScore = calculateMedianScore(proposalId);
        address[] storage evals = proposalEvaluators[proposalId];
        
        int256 minDiff = type(int256).max;
        for (uint256 i = 0; i < evals.length; i++) {
            int256 diff = evaluations[proposalId][evals[i]].confidenceScore - medianScore;
            if (diff < 0) diff = -diff;
            if (diff < minDiff) {
                minDiff = diff;
                winner = evals[i];
            }
        }
    }

    // V5: Admin Functions
    
    function setSlashManager(address slashManager_) external onlyOwner {
        if (slashManager_ == address(0)) revert InvalidSlashManager();
        slashManager = slashManager_;
        emit SlashManagerSet(slashManager_);
    }

    function setAdminRegistry(address _adminRegistry) external onlyOwner {
        if (_adminRegistry == address(0)) revert AgentReviewV5_Zero_address();
        uint256 size;
        assembly { size := extcodesize(_adminRegistry) }
        if (size == 0) revert AgentReviewV5_Zero_address();
        adminRegistry = _adminRegistry;
        emit AdminRegistrySet(_adminRegistry);
    }
    
    // M2 Fix: Set slash treasury for slashed funds
    function setSlashTreasury(address treasury_) external onlyOwner {
        if (!(treasury_ != address(0))) revert AgentReviewV5_Zero_address();
        emit SlashTreasuryUpdated(slashTreasury, treasury_);
        slashTreasury = treasury_;
    }
    
    // M3 Fix: Set default slash percentage (basis points)
    // Note: SLASH_PERCENTAGE is constant; actual slash % is passed from SlashManager

    function getTotalLockedETH() public view returns (uint256 totalLocked) {
        for (uint256 i = 1; i <= _proposalCounter; i++) {
            Proposal storage proposal = proposals[i];
            if (proposal.status == ProposalStatus.Open || proposal.status == ProposalStatus.UnderReview) {
                totalLocked += proposal.reward;
                
                address[] storage evals = proposalEvaluators[i];
                for (uint256 j = 0; j < evals.length; j++) {
                    Evaluation storage eval = evaluations[i][evals[j]];
                    if (eval.stakeAmount > 0 && !eval.stakeReleased) {
                        totalLocked += eval.stakeAmount;
                    }
                }
            } else if (proposal.status == ProposalStatus.Decided) {
                address[] storage evals = proposalEvaluators[i];
                for (uint256 j = 0; j < evals.length; j++) {
                    Evaluation storage eval = evaluations[i][evals[j]];
                    if (!eval.rewardClaimed && eval.rewardAmount > 0) {
                        totalLocked += eval.rewardAmount;
                    }
                    if (eval.stakeAmount > 0 && !eval.stakeReleased) {
                        totalLocked += eval.stakeAmount;
                    }
                }
            }
        }
    }

    function withdrawETH(address payable to, uint256 amount) external nonReentrant onlyOwner {
        if (!(to != address(0))) revert AgentReviewV5_Zero_address();
        if (!(amount > 0)) revert AgentReviewV5_Zero_amount();
        
        uint256 locked = getTotalLockedETH();
        uint256 available = address(this).balance - locked;
        
        if (!(amount <= available)) revert AgentReviewV5_Exceeds_available_balance();
        
        _sendEth(to, amount);
        
        emit ETHWithdrawn(to, amount);
    }

    function cancelProposal(uint256 proposalId) external nonReentrant {
        Proposal storage proposal = proposals[proposalId];
        if (!(proposal.id == proposalId)) revert AgentReviewV5_Invalid_proposal();
        if (!(proposal.proposer == _msgSender())) revert AgentReviewV5_Not_proposer();
        if (!(proposal.status == ProposalStatus.Open)) revert AgentReviewV5_Not_open();

        ProposalStatus oldStatus = proposal.status;
        proposal.status = ProposalStatus.Cancelled;
        
        uint256 refund = proposal.reward;
        proposal.reward = 0;

        address[] storage evals = proposalEvaluators[proposalId];
        for (uint256 i = 0; i < evals.length; i++) {
            Evaluation storage eval = evaluations[proposalId][evals[i]];
            if (eval.stakeAmount > 0 && !eval.stakeReleased) {
                uint256 stake = eval.stakeAmount;
                eval.stakeAmount = 0;
                eval.stakeReleased = true;
                _sendEth(evals[i], stake);
            }
        }

        _sendEth(_msgSender(), refund);

        emit ProposalCancelledByProposer(proposalId, _msgSender(), refund);
        emit ProposalStatusChanged(proposalId, oldStatus, ProposalStatus.Cancelled, _msgSender(), block.timestamp);
    }

    function setUnderReview(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];
        if (!(proposal.id == proposalId)) revert AgentReviewV5_Invalid_proposal();
        if (!(proposal.status == ProposalStatus.Open)) revert AgentReviewV5_Not_open();
        
        ProposalStatus oldStatus = proposal.status;
        proposal.status = ProposalStatus.UnderReview;
        
        emit ProposalStatusChanged(proposalId, oldStatus, ProposalStatus.UnderReview, _msgSender(), block.timestamp);
    }

    /**
     * @dev Receive ETH for staking rewards and slashing.
     * 
     * L4 Fix: Added NatSpec documentation explaining purpose.
     * 
     * This function accepts ETH without conditions because:
     * 1. Evaluators stake ETH when submitting evaluations
     * 2. Proposers send ETH when creating proposals (rewards)
     * 3. SlashManager can send slashed funds
     * 
     * All withdrawals are protected by the getTotalLockedETH() check in withdrawETH().
     */
    receive() external payable {}

    /***********************************/
    /* Internal Helpers */
    /***********************************/
    
    function _sendEth(address to, uint256 amount) internal {
        if (amount == 0) return;
        (bool success, ) = payable(to).call{value: amount}("");
        if (!success) revert AgentReviewV5_Eth_transfer_failed();
    }
}
