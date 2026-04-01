// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title IAgentReviewV4
 * @dev Interface for Agent Review Contract V4 (Comprehensive Events)
 */
interface IAgentReviewV4 {
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

    // Errors
    error TooManyEvaluators(uint256 proposalId);
    error AlreadyEvaluated(uint256 proposalId, address evaluator);
    error MaxEvaluatorsReached();
    error InvalidScore();

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
}

/**
 * @title AgentReviewV4
 * @dev PRD 3 - Agent Review & Coordination Contract V4
 * 
 * Phase 3 Features:
 * - Comprehensive event system for better tracking
 * - All Phase 2 DoS prevention features preserved
 */
contract AgentReviewV4 is IAgentReviewV4, Ownable, ReentrancyGuard {
    // DoS Prevention: Maximum evaluators per proposal
    uint256 public constant MAX_EVALUATORS_PER_PROPOSAL = 5;
    
    uint256 public constant MIN_STAKE = 0.001 ether;
    uint256 public constant SLASH_PERCENTAGE = 5000;
    uint256 public constant FEE_DENOMINATOR = 10000;

    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => address[]) public proposalEvaluators;
    mapping(uint256 => mapping(address => Evaluation)) public evaluations;
    mapping(uint256 => mapping(address => bool)) public hasEvaluated;

    uint256 private _proposalCounter;

    constructor() Ownable(msg.sender) {}

    receive() external payable {}

    function createProposal(
        string calldata title,
        string calldata description,
        string calldata criteriaURI,
        uint256 reward,
        uint256 decisionDeadline
    ) external payable nonReentrant returns (uint256 proposalId) {
        require(bytes(title).length > 0, "Empty title");
        require(bytes(description).length > 0, "Empty description");
        require(decisionDeadline > block.timestamp + 1 days, "Deadline too soon");
        require(msg.value >= reward, "Insufficient payment");

        proposalId = _proposalCounter++;
        
        proposals[proposalId] = Proposal({
            id: proposalId,
            proposer: msg.sender,
            title: title,
            description: description,
            criteriaURI: criteriaURI,
            reward: reward,
            status: ProposalStatus.Open,
            createdAt: block.timestamp,
            decisionDeadline: decisionDeadline,
            winningEvaluator: address(0)
        });

        emit ProposalCreated(proposalId, msg.sender, title, reward);
    }

    function submitEvaluation(
        uint256 proposalId,
        int256 confidenceScore,
        string calldata reasoningURI
    ) external payable nonReentrant {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.id == proposalId, "Invalid proposal");
        require(proposal.status == ProposalStatus.Open || proposal.status == ProposalStatus.UnderReview, "Not open");
        require(block.timestamp < proposal.decisionDeadline, "Deadline passed");
        require(msg.value >= MIN_STAKE, "Min stake");
        require(!hasEvaluated[proposalId][msg.sender], "Already evaluated");
        require(confidenceScore >= -1000 && confidenceScore <= 1000, "Invalid score");
        
        // Check evaluator limit BEFORE adding
        if (proposalEvaluators[proposalId].length >= MAX_EVALUATORS_PER_PROPOSAL) {
            emit EvaluatorLimitReached(proposalId, proposalEvaluators[proposalId].length, MAX_EVALUATORS_PER_PROPOSAL);
            revert("Max evaluators reached");
        }

        ProposalStatus oldStatus = proposal.status;
        proposal.status = ProposalStatus.UnderReview;

        evaluations[proposalId][msg.sender] = Evaluation({
            proposalId: proposalId,
            evaluator: msg.sender,
            confidenceScore: confidenceScore,
            reasoningURI: reasoningURI,
            stakeAmount: msg.value,
            isFinal: false,
            rewardClaimed: false,
            stakeReleased: false,
            submittedAt: block.timestamp
        });

        uint256 evaluatorIndex = proposalEvaluators[proposalId].length;
        proposalEvaluators[proposalId].push(msg.sender);
        hasEvaluated[proposalId][msg.sender] = true;

        emit EvaluationSubmitted(proposalId, msg.sender, confidenceScore, msg.value);
        emit EvaluatorRegistered(proposalId, msg.sender, evaluatorIndex);
        
        if (oldStatus != ProposalStatus.UnderReview) {
            emit ProposalStatusChanged(proposalId, oldStatus, ProposalStatus.UnderReview, block.timestamp);
        }
    }

    function attestDecision(uint256 proposalId, address winningEvaluator) external nonReentrant {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.id == proposalId, "Invalid proposal");
        require(proposal.proposer == msg.sender, "Not proposer");
        require(proposal.status == ProposalStatus.UnderReview, "Not under review");
        require(evaluations[proposalId][winningEvaluator].submittedAt > 0, "Not an evaluator");
        require(block.timestamp >= proposal.decisionDeadline, "Deadline not passed");

        ProposalStatus oldStatus = proposal.status;
        proposal.status = ProposalStatus.Decided;
        proposal.winningEvaluator = winningEvaluator;

        Evaluation storage winningEval = evaluations[proposalId][winningEvaluator];
        
        require(!winningEval.rewardClaimed, "Reward already claimed");
        
        winningEval.isFinal = true;
        winningEval.rewardClaimed = true;
        winningEval.stakeReleased = true;

        uint256 stake = winningEval.stakeAmount;
        winningEval.stakeAmount = 0;
        uint256 totalReward = stake + proposal.reward;

        if (totalReward > 0) {
            (bool success, ) = winningEvaluator.call{value: totalReward}("");
            if (!success) {
                emit RewardDistributionFailed(proposalId, winningEvaluator, totalReward, "");
                revert("Transfer failed");
            }
        }

        // Mark all other evaluators as finalized (non-winners)
        for (uint256 i = 0; i < proposalEvaluators[proposalId].length; i++) {
            address evalAddr = proposalEvaluators[proposalId][i];
            if (evalAddr != winningEvaluator) {
                Evaluation storage eval = evaluations[proposalId][evalAddr];
                eval.isFinal = true;
                emit EvaluationFinalized(proposalId, evalAddr, false);
            }
        }

        emit EvaluationFinalized(proposalId, winningEvaluator, true);
        emit DecisionAttested(proposalId, msg.sender, winningEvaluator);
        emit ProposalStatusChanged(proposalId, oldStatus, ProposalStatus.Decided, block.timestamp);
    }

    function slashEvaluator(address evaluator, uint256 proposalId, string calldata reason) external onlyOwner {
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
        require(proposal.winningEvaluator == msg.sender, "Not winner");

        Evaluation storage eval = evaluations[proposalId][msg.sender];
        require(eval.stakeAmount > 0, "Already claimed");
        require(!eval.rewardClaimed, "Reward already claimed");

        uint256 amount = eval.stakeAmount;
        eval.stakeAmount = 0;
        eval.rewardClaimed = true;
        eval.stakeReleased = true;

        (bool success, ) = msg.sender.call{value: amount}("");
        if (!success) {
            emit RewardDistributionFailed(proposalId, msg.sender, amount, "");
            revert("Transfer failed");
        }

        emit RewardClaimed(proposalId, msg.sender, amount);
    }

    function releaseStake(uint256 proposalId) external nonReentrant {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.id == proposalId, "Invalid proposal");
        require(
            proposal.status == ProposalStatus.Decided || 
            proposal.status == ProposalStatus.Cancelled,
            "Proposal not finalized"
        );
        
        Evaluation storage eval = evaluations[proposalId][msg.sender];
        require(eval.submittedAt > 0, "Not an evaluator");
        require(eval.stakeAmount > 0, "No stake to release");
        require(!eval.stakeReleased, "Stake already released");
        require(msg.sender != proposal.winningEvaluator, "Winner uses claimReward");

        uint256 amount = eval.stakeAmount;
        eval.stakeAmount = 0;
        eval.stakeReleased = true;

        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");

        emit StakeReleased(proposalId, msg.sender, amount);
    }

    /**
     * @dev Cancel proposal by proposer (before any evaluations)
     */
    function cancelProposal(uint256 proposalId) external nonReentrant {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.id == proposalId, "Invalid proposal");
        require(proposal.proposer == msg.sender, "Not proposer");
        require(proposal.status == ProposalStatus.Open, "Not open");
        require(proposalEvaluators[proposalId].length == 0, "Evaluations exist");

        ProposalStatus oldStatus = proposal.status;
        proposal.status = ProposalStatus.Cancelled;

        uint256 refundAmount = proposal.reward;
        
        (bool success, ) = msg.sender.call{value: refundAmount}("");
        require(success, "Refund failed");

        emit ProposalCancelledByProposer(proposalId, msg.sender, refundAmount);
        emit ProposalStatusChanged(proposalId, oldStatus, ProposalStatus.Cancelled, block.timestamp);
    }

    function getProposal(uint256 proposalId) external view returns (Proposal memory) {
        require(proposalId < _proposalCounter, "Invalid proposal");
        return proposals[proposalId];
    }

    function getEvaluation(uint256 proposalId, address evaluator) external view returns (Evaluation memory) {
        return evaluations[proposalId][evaluator];
    }

    function getProposalEvaluators(uint256 proposalId) external view returns (address[] memory) {
        return proposalEvaluators[proposalId];
    }

    function getProposalCount() external view returns (uint256) {
        return _proposalCounter;
    }

    function getEvaluatorCount(uint256 proposalId) external view returns (uint256) {
        return proposalEvaluators[proposalId].length;
    }

    function withdrawETH(address payable to, uint256 amount) external onlyOwner {
        require(to != address(0), "Zero address");
        require(amount <= address(this).balance, "Insufficient balance");
        (bool success, ) = to.call{value: amount}("");
        require(success, "Transfer failed");
    }
}
