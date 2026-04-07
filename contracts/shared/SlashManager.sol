// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IAgentReviewV5} from "./AgentReviewV5.sol";

/**
 * @title SlashManager
 * @dev Governance-based slashing with 3-of-5 multisig
 * 
 * Security features:
 * - 3-of-5 multisig requirement for slashing
 * - Timelock delay before execution
 * - ReentrancyGuard on execute
 * - CEI pattern
 * - Input validation
 * - Role-based access control
 */
contract SlashManager is ReentrancyGuard, Ownable {
    // Multisig configuration
    uint256 public constant REQUIRED_SIGNATURES = 3;
    uint256 public constant MAX_SIGNERS = 5;  // Reduced from 10 for tighter security

    // Signers (multisig owners)
    address[] public signers;
    mapping(address => bool) public isSigner;

    // Slash proposal structure
    struct SlashProposal {
        address evaluator;
        uint256 proposalId;
        uint256 amount; // Amount to slash
        string reason;
        uint256 createdAt;
        uint256 executeAfter; // Timestamp when execution is allowed
        uint256 confirmations;
        bool executed;
        mapping(address => bool) confirmed;
    }

    // Proposals
    mapping(bytes32 => SlashProposal) public proposals;
    bytes32[] public proposalIds;

    // Execution delay (1 hour after enough confirmations)
    uint256 public constant EXECUTION_DELAY = 1 hours;

    // Maximum slash amount (to prevent accidents)
    uint256 public constant MAX_SLASH_AMOUNT = 100 ether;
    
    // Maximum age of a slash proposal (30 days) - prevents stale proposals
    uint256 public constant MAX_PROPOSAL_AGE = 30 days;

    // AgentReview contract (the contract that can call verifySlash)
    address public agentReview;

    // Events
    event SignerAdded(address indexed signer);
    event SignerRemoved(address indexed signer);
    event ProposalCreated(
        bytes32 indexed proposalHash,
        address indexed evaluator,
        uint256 indexed targetProposalId,
        uint256 amount,
        string reason
    );
    event ProposalConfirmed(bytes32 indexed proposalHash, address indexed signer);
    event ProposalExecuted(bytes32 indexed proposalHash, address indexed evaluator, uint256 amount);
    event ProposalCancelled(bytes32 indexed proposalHash);
    event AgentReviewSet(address indexed agentReview);

    /**
     * @dev Constructor
     * @param _owner Initial owner (can add/remove signers)
     * @param _signers Initial multisig signers
     */
    constructor(address _owner, address[] memory _signers) Ownable(_owner) {
        require(_signers.length >= REQUIRED_SIGNATURES, "Not enough signers");
        require(_signers.length <= MAX_SIGNERS, "Too many signers");

        for (uint256 i = 0; i < _signers.length; i++) {
            require(_signers[i] != address(0), "Zero signer");
            require(!isSigner[_signers[i]], "Duplicate signer");
            
            signers.push(_signers[i]);
            isSigner[_signers[i]] = true;
            
            emit SignerAdded(_signers[i]);
        }
    }

    /**
     * @dev Set the AgentReview contract address
     * @param _agentReview AgentReview contract address
     */
    function setAgentReview(address _agentReview) external onlyOwner {
        require(_agentReview != address(0), "Zero address");
        agentReview = _agentReview;
        emit AgentReviewSet(_agentReview);
    }

    /**
     * @dev Create a slash proposal
     * @param evaluator The evaluator to slash
     * @param _proposalId The proposal ID from AgentReview
     * @param amount Amount to slash (in ETH)
     * @param reason Reason for slashing
     * @return proposalId Unique proposal ID
     */
    function createProposal(
        address evaluator,
        uint256 _proposalId,
        uint256 amount,
        string calldata reason
    ) external onlyOwner returns (bytes32 proposalId) {
        require(evaluator != address(0), "Zero evaluator");
        require(amount > 0, "Zero amount");
        require(amount <= MAX_SLASH_AMOUNT, "Amount too high");
        require(bytes(reason).length > 0, "Empty reason");
        require(agentReview != address(0), "AgentReview not set");

        proposalId = keccak256(abi.encode(
            evaluator,
            _proposalId,
            amount,
            block.timestamp
        ));

        // Check if proposal already exists
        require(!_proposalExists(proposalId), "Proposal exists");

        // Create proposal
        SlashProposal storage proposal = proposals[proposalId];
        proposal.evaluator = evaluator;
        proposal.proposalId = _proposalId;
        proposal.amount = amount;
        proposal.reason = reason;
        proposal.createdAt = block.timestamp;
        proposal.executeAfter = type(uint256).max; // Not executable yet
        proposal.confirmations = 0;
        proposal.executed = false;

        proposalIds.push(proposalId);

        emit ProposalCreated(proposalId, evaluator, _proposalId, amount, reason);
    }

    /**
     * @dev Confirm a proposal (signer calls this)
     * @param proposalId The proposal ID
     */
    function confirmProposal(bytes32 proposalId) external {
        require(isSigner[msg.sender], "Not a signer");
        require(_proposalExists(proposalId), "Proposal not found");
        require(!proposals[proposalId].executed, "Already executed");

        SlashProposal storage proposal = proposals[proposalId];
        
        require(!proposal.confirmed[msg.sender], "Already confirmed");

        // Add confirmation
        proposal.confirmed[msg.sender] = true;
        proposal.confirmations++;

        emit ProposalConfirmed(proposalId, msg.sender);

        // If we have enough confirmations, set execution time
        if (proposal.confirmations >= REQUIRED_SIGNATURES) {
            proposal.executeAfter = block.timestamp + EXECUTION_DELAY;
        }
    }

    /**
     * @dev Execute a slash proposal
     * @param proposalId The proposal ID
     */
    function executeProposal(bytes32 proposalId) external nonReentrant {
        require(_proposalExists(proposalId), "Proposal not found");

        SlashProposal storage proposal = proposals[proposalId];
        
        require(proposal.confirmations >= REQUIRED_SIGNATURES, "Not enough confirmations");
        require(proposal.executeAfter <= block.timestamp, "Timelock not passed");
        require(!proposal.executed, "Already executed");

        // Mark as executed BEFORE external call (CEI pattern)
        proposal.executed = true;

        // Call AgentReviewV5 to perform the slash
        IAgentReviewV5(agentReview).slashEvaluator(
            proposal.evaluator,
            proposal.proposalId,
            proposal.reason
        );

        emit ProposalExecuted(proposalId, proposal.evaluator, proposal.amount);
    }

    /**
     * @dev Cancel a proposal
     * @param proposalId The proposal ID
     */
    function cancelProposal(bytes32 proposalId) external onlyOwner {
        require(_proposalExists(proposalId), "Proposal not found");
        require(!proposals[proposalId].executed, "Already executed");

        proposals[proposalId].executed = true; // Mark as cancelled
        emit ProposalCancelled(proposalId);
    }

    /**
     * @dev Verify slash (called by AgentReview)
     * @param evaluator The evaluator address
     * @param targetProposalId The proposal ID
     * @return Whether slash is approved
     */
    function verifySlash(
        address evaluator,
        uint256 targetProposalId
    ) external view returns (bool) {
        require(msg.sender == agentReview, "Not AgentReview");

        // Find matching proposal
        for (uint256 i = 0; i < proposalIds.length; i++) {
            bytes32 id = proposalIds[i];
            SlashProposal storage proposal = proposals[id];
            
            if (proposal.evaluator == evaluator &&
                proposal.proposalId == targetProposalId &&
                !proposal.executed) {
                // Check proposal is not too old (prevent stale slashes)
                require(
                    block.timestamp <= proposal.createdAt + MAX_PROPOSAL_AGE,
                    "Proposal too old"
                );
                return true;
            }
        }
        
        return false;
    }

    /**
     * @dev Add a new signer
     * @param signer New signer address
     */
    function addSigner(address signer) external onlyOwner {
        require(signer != address(0), "Zero address");
        require(!isSigner[signer], "Already a signer");
        require(signers.length < MAX_SIGNERS, "Max signers reached");

        signers.push(signer);
        isSigner[signer] = true;
        
        emit SignerAdded(signer);
    }

    /**
     * @dev Remove a signer
     * @param signer Signer to remove
     */
    function removeSigner(address signer) external onlyOwner {
        require(isSigner[signer], "Not a signer");
        require(signers.length > REQUIRED_SIGNATURES, "Cannot remove");
        
        isSigner[signer] = false;
        
        // Remove from array
        for (uint256 i = 0; i < signers.length; i++) {
            if (signers[i] == signer) {
                signers[i] = signers[signers.length - 1];
                signers.pop();
                break;
            }
        }
        
        emit SignerRemoved(signer);
    }

    /**
     * @dev Get all signers
     * @return Array of signer addresses
     */
    function getSigners() external view returns (address[] memory) {
        return signers;
    }

    /**
     * @dev Get proposal details
     * @param proposalId The proposal ID
     * @return evaluator The evaluator address
     * @return amount The slash amount
     * @return reason The reason for slashing
     * @return confirmations Number of confirmations
     * @return execAfter Timestamp when execution is allowed
     * @return isExecuted Whether the proposal was executed
     */
    function getProposal(bytes32 proposalId) external view returns (
        address evaluator,
        uint256 amount,
        string memory reason,
        uint256 confirmations,
        uint256 execAfter,
        bool isExecuted
    ) {
        SlashProposal storage proposal = proposals[proposalId];
        return (
            proposal.evaluator,
            proposal.amount,
            proposal.reason,
            proposal.confirmations,
            proposal.executeAfter,
            proposal.executed
        );
    }

    /**
     * @dev Get the target proposal ID for a slash proposal
     * @param proposalId The proposal ID
     * @return targetProposalId The proposal ID from AgentReview
     */
    function getTargetProposalId(bytes32 proposalId) external view returns (uint256) {
        return proposals[proposalId].proposalId;
    }

    /**
     * @dev Check if a signer has confirmed a proposal
     */
    function hasConfirmed(bytes32 proposalId, address signer) external view returns (bool) {
        return proposals[proposalId].confirmed[signer];
    }

    /**
     * @dev Internal helper to check if proposal exists
     */
    function _proposalExists(bytes32 proposalId) internal view returns (bool) {
        return proposals[proposalId].createdAt != 0;
    }
}
