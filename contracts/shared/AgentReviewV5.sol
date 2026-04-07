// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

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
    event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string title, uint256 reward);
    event EvaluationSubmitted(uint256 indexed proposalId, address indexed evaluator, int256 confidenceScore, uint256 stakeAmount);
    event DecisionAttested(uint256 indexed proposalId, address indexed attestor, address indexed winningEvaluator);
    event EvaluatorSlashed(address indexed evaluator, uint256 slashAmount, string reason);
    event RewardClaimed(uint256 indexed proposalId, address indexed evaluator, uint256 amount);
    event StakeReleased(uint256 indexed proposalId, address indexed evaluator, uint256 amount);

    // Phase 3: Enhanced Events
    event ProposalStatusChanged(
        uint256 indexed proposalId,
        ProposalStatus indexed oldStatus,
        ProposalStatus indexed newStatus,
        uint256 timestamp
    );
    
    event EvaluatorLimitReached(
        uint256 indexed proposalId,
        uint256 currentCount,
        uint256 maxAllowed
    );
    
    event EvaluationFinalized(
        uint256 indexed proposalId,
        address indexed evaluator,
        bool isWinner
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
        uint256 refundAmount
    );
    
    event EvaluatorRegistered(
        uint256 indexed proposalId,
        address indexed evaluator,
        uint256 evaluatorIndex
    );
    
    event RewardDistributionFailed(
        uint256 indexed proposalId,
        address indexed evaluator,
        uint256 amount,
        bytes reason
    );
    
    // V5: SlashManager & Locked Funds Events
    event SlashManagerSet(address indexed slashManager);
    event ETHWithdrawn(address indexed to, uint256 amount);
    event RewardAmountSet(uint256 indexed proposalId, address indexed evaluator, uint256 amount);

    // Errors
    error TooManyEvaluators(uint256 proposalId);
    error AlreadyEvaluated(uint256 proposalId, address evaluator);
    error MaxEvaluatorsReached();
    error InvalidScore();
    error InvalidSlashManager();
    error InsufficientBalance();
    error ExceedsAvailableBalance();

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

    function slashEvaluator(address evaluator, uint256 proposalId, string calldata reason) external;

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
 * - UUPS Upgradeable (was non-upgradeable)
 * - Winner Payment Pull Pattern (was direct transfer)
 * - SlashManager Integration (was onlyOwner)
 * - withdrawETH Locked Funds Protection (was no protection)
 */
contract AgentReviewV5 is IAgentReviewV5, ContextUpgradeable, OwnableUpgradeable, UUPSUpgradeable, ReentrancyGuard {
    uint256 public constant MAX_EVALUATORS_PER_PROPOSAL = 5;
    uint256 public constant MIN_STAKE = 0.001 ether;
    uint256 public constant SLASH_PERCENTAGE = 5000;
    uint256 public constant FEE_DENOMINATOR = 10000;

    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => address[]) public proposalEvaluators;
    mapping(uint256 => mapping(address => Evaluation)) public evaluations;
    uint256 public _proposalCounter;

    // V5: SlashManager role for governance
    address public slashManager;
    
    // Storage gap for upgradeability
    uint256[50] private __gap;

    constructor() {
        _disableInitializers();
    }

    function initialize(address initialOwner) public initializer {
        __Context_init();
        __Ownable_init(initialOwner);
    }

    function _authorizeUpgrade(address newImpl) internal override onlyOwner {}

    modifier onlySlashManager() {
        require(msg.sender == slashManager, "Not slashManager");
        _;
    }

    function createProposal(
        string calldata title,
        string calldata description,
        string calldata criteriaURI,
        uint256 reward,
        uint256 decisionDeadline
    ) external payable returns (uint256 proposalId) {
        require(msg.value == reward, "Exact ETH required");
        require(reward >= MIN_STAKE, "Reward too low");
        require(decisionDeadline > block.timestamp, "Deadline in past");

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
        emit ProposalStatusChanged(proposalId, ProposalStatus.Open, ProposalStatus.Open, block.timestamp);
    }

    function submitEvaluation(
        uint256 proposalId,
        int256 confidenceScore,
        string calldata reasoningURI
    ) external payable {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.id == proposalId, "Invalid proposal");
        require(proposal.status == ProposalStatus.Open, "Not open");
        require(proposal.proposer != _msgSender(), "Cannot evaluate own proposal");
        require(proposal.decisionDeadline > block.timestamp, "Deadline passed");
        require(msg.value >= MIN_STAKE, "Stake too low");
        require(confidenceScore >= -100 && confidenceScore <= 100, "Invalid score");

        address[] storage evals = proposalEvaluators[proposalId];
        require(evals.length < MAX_EVALUATORS_PER_PROPOSAL, "Max evaluators reached");
        
        for (uint256 i = 0; i < evals.length; i++) {
            require(evals[i] != _msgSender(), "Already evaluated");
        }

        Evaluation storage eval = evaluations[proposalId][_msgSender()];
        require(eval.submittedAt == 0, "Already submitted");

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

    function attestDecision(uint256 proposalId, address winningEvaluator) external nonReentrant {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.id == proposalId, "Invalid proposal");
        require(proposal.status == ProposalStatus.UnderReview, "Not under review");
        require(proposal.proposer == _msgSender(), "Not proposer");
        require(proposal.decisionDeadline <= block.timestamp, "Deadline not passed");

        Evaluation storage winningEval = evaluations[proposalId][winningEvaluator];
        require(winningEval.submittedAt > 0, "Not an evaluator");
        require(!winningEval.isFinal, "Already final");

        ProposalStatus oldStatus = proposal.status;
        proposal.status = ProposalStatus.Decided;
        proposal.winningEvaluator = winningEvaluator;
        winningEval.isFinal = true;
        
        // V5: Set reward amount for pull pattern instead of direct transfer
        uint256 stake = winningEval.stakeAmount;
        uint256 totalReward = stake + proposal.reward;
        winningEval.rewardAmount = totalReward;

        // V5: Losers can now claim their stakes via releaseStake()
        // Winner must call claimReward() to pull their reward

        for (uint256 i = 0; i < proposalEvaluators[proposalId].length; i++) {
            address evalAddr = proposalEvaluators[proposalId][i];
            if (evalAddr != winningEvaluator) {
                Evaluation storage eval = evaluations[proposalId][evalAddr];
                eval.isFinal = true;
                emit EvaluationFinalized(proposalId, evalAddr, false);
            }
        }

        emit EvaluationFinalized(proposalId, winningEvaluator, true);
        emit DecisionAttested(proposalId, _msgSender(), winningEvaluator);
        emit ProposalStatusChanged(proposalId, oldStatus, ProposalStatus.Decided, block.timestamp);
    }

    // V5: SlashManager can now call slashEvaluator
    function slashEvaluator(address evaluator, uint256 proposalId, string calldata reason) external onlySlashManager {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.id == proposalId, "Invalid proposal");
        require(proposal.status == ProposalStatus.UnderReview, "Proposal not active");
        
        Evaluation storage eval = evaluations[proposalId][evaluator];
        require(eval.submittedAt > 0, "Not an evaluator");
        require(!eval.isFinal, "Already final");

        uint256 slashAmount = (eval.stakeAmount * SLASH_PERCENTAGE) / FEE_DENOMINATOR;
        if (slashAmount > 0) {
            uint256 oldStake = eval.stakeAmount;
            eval.stakeAmount = eval.stakeAmount - slashAmount;
            
            emit StakeAmountChanged(proposalId, evaluator, oldStake, eval.stakeAmount);
            
            (bool success, ) = owner().call{value: slashAmount}("");
            require(success, "Transfer failed");
        }

        emit EvaluatorSlashed(evaluator, slashAmount, reason);
    }

    function claimReward(uint256 proposalId) external nonReentrant {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.id == proposalId, "Invalid proposal");
        require(proposal.status == ProposalStatus.Decided, "Not decided");
        require(proposal.winningEvaluator == _msgSender(), "Not winner");

        Evaluation storage eval = evaluations[proposalId][_msgSender()];
        require(eval.isFinal, "Not winner");
        require(!eval.rewardClaimed, "Already claimed");
        require(eval.rewardAmount > 0, "No reward");

        uint256 amount = eval.rewardAmount;
        eval.rewardAmount = 0;
        eval.rewardClaimed = true;

        (bool success, ) = _msgSender().call{value: amount}("");
        require(success, "Transfer failed");

        emit RewardClaimed(proposalId, _msgSender(), amount);
    }

    function releaseStake(uint256 proposalId) external nonReentrant {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.id == proposalId, "Invalid proposal");
        
        Evaluation storage eval = evaluations[proposalId][_msgSender()];
        require(eval.submittedAt > 0, "Not an evaluator");
        require(!eval.stakeReleased, "Already released");
        require(eval.stakeAmount > 0, "No stake");

        uint256 amount = eval.stakeAmount;
        eval.stakeAmount = 0;
        eval.stakeReleased = true;

        (bool success, ) = _msgSender().call{value: amount}("");
        require(success, "Transfer failed");

        emit StakeReleased(proposalId, _msgSender(), amount);
    }

    function getProposal(uint256 proposalId) external view returns (Proposal memory) {
        require(proposalId > 0 && proposalId <= _proposalCounter, "Invalid proposal");
        return proposals[proposalId];
    }

    function getEvaluation(uint256 proposalId, address evaluator) external view returns (Evaluation memory) {
        return evaluations[proposalId][evaluator];
    }

    function getProposalEvaluators(uint256 proposalId) external view returns (address[] memory) {
        return proposalEvaluators[proposalId];
    }

    // V5: Admin Functions
    
    function setSlashManager(address slashManager_) external onlyOwner {
        require(slashManager_ != address(0), "Zero address");
        slashManager = slashManager_;
        emit SlashManagerSet(slashManager_);
    }

    // V5: Calculate total locked ETH (stakes + unclaimed rewards)
    function getTotalLockedETH() public view returns (uint256 totalLocked) {
        for (uint256 i = 0; i < _proposalCounter; i++) {
            Proposal storage proposal = proposals[i];
            if (proposal.status == ProposalStatus.Open || proposal.status == ProposalStatus.UnderReview) {
                // Locked reward
                totalLocked += proposal.reward;
                
                // Locked evaluator stakes
                address[] storage evals = proposalEvaluators[i];
                for (uint256 j = 0; j < evals.length; j++) {
                    Evaluation storage eval = evaluations[i][evals[j]];
                    if (eval.stakeAmount > 0 && !eval.stakeReleased) {
                        totalLocked += eval.stakeAmount;
                    }
                }
            } else if (proposal.status == ProposalStatus.Decided) {
                // Decided proposals - count unclaimed rewards and stakes
                address[] storage evals = proposalEvaluators[i];
                for (uint256 j = 0; j < evals.length; j++) {
                    Evaluation storage eval = evaluations[i][evals[j]];
                    // Winner unclaimed reward
                    if (evals[j] == proposal.winningEvaluator && !eval.rewardClaimed && eval.rewardAmount > 0) {
                        totalLocked += eval.rewardAmount;
                    }
                    // Loser unclaimed stake
                    if (eval.stakeAmount > 0 && !eval.stakeReleased) {
                        totalLocked += eval.stakeAmount;
                    }
                }
            }
        }
    }

    // V5: Secure withdrawETH with locked funds protection
    function withdrawETH(address payable to, uint256 amount) external onlyOwner {
        require(to != address(0), "Zero address");
        require(amount > 0, "Zero amount");
        
        uint256 locked = getTotalLockedETH();
        uint256 available = address(this).balance - locked;
        
        require(amount <= available, "Exceeds available balance");
        
        (bool success, ) = to.call{value: amount}("");
        require(success, "Transfer failed");
        
        emit ETHWithdrawn(to, amount);
    }

    function cancelProposal(uint256 proposalId) external nonReentrant {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.id == proposalId, "Invalid proposal");
        require(proposal.proposer == _msgSender(), "Not proposer");
        require(proposal.status == ProposalStatus.Open, "Not open");

        ProposalStatus oldStatus = proposal.status;
        proposal.status = ProposalStatus.Cancelled;
        
        uint256 refund = proposal.reward;
        proposal.reward = 0;

        (bool success, ) = _msgSender().call{value: refund}("");
        require(success, "Transfer failed");

        emit ProposalCancelledByProposer(proposalId, _msgSender(), refund);
        emit ProposalStatusChanged(proposalId, oldStatus, ProposalStatus.Cancelled, block.timestamp);
    }

    function setUnderReview(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.id == proposalId, "Invalid proposal");
        require(proposal.status == ProposalStatus.Open, "Not open");
        
        ProposalStatus oldStatus = proposal.status;
        proposal.status = ProposalStatus.UnderReview;
        
        emit ProposalStatusChanged(proposalId, oldStatus, ProposalStatus.UnderReview, block.timestamp);
    }

    receive() external payable {}
}
