// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
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
     * - UUPS Upgradeable for future fixes
     * - Pausable for emergency stops
     * 
     * M1 Fix: Pass configurable slash basis points to AgentReviewV5
     */
contract SlashManager is ReentrancyGuard, OwnableUpgradeable, UUPSUpgradeable, PausableUpgradeable {
    // Multisig configuration
    uint256 public constant REQUIRED_SIGNATURES = 3;
    uint256 public constant MAX_SIGNERS = 5;

    // Signers (multisig owners)
    address[] public signers;
    mapping(address => bool) public isSigner;

    // Slash proposal structure
    struct SlashProposal {
        address evaluator;
        uint256 proposalId;
        uint256 amount;
        string reason;
        uint256 createdAt;
        uint256 executeAfter;
        uint256 confirmations;
        bool executed;
        mapping(address => bool) confirmed;
    }

    // Proposals
    mapping(bytes32 => SlashProposal) public proposals;
    bytes32[] public proposalIds;

    // M2 Fix: Direct lookup mapping for O(1) verifySlash
    mapping(address => mapping(uint256 => bytes32)) public activeSlashByEvaluator;

    // L6 Fix: Nonce for unique proposal hashes
    uint256 public proposalNonce;

    // Execution delay (1 hour after enough confirmations)
    uint256 public constant EXECUTION_DELAY = 1 hours;

    // Maximum slash amount (to prevent accidents)
    uint256 public constant MAX_SLASH_AMOUNT = 100 ether;
    
    // Maximum age of a slash proposal (30 days)
    uint256 public constant MAX_PROPOSAL_AGE = 30 days;
    
    // M1 Fix: Configurable slash percentages (basis points)
    uint256 public constant DEFAULT_SLASH_BP = 5000; // 50%
    uint256 public constant MIN_SLASH_BP = 2500;      // 25%
    uint256 public constant FEE_DENOMINATOR = 10000;  // 100%

    // AgentReview contract
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
    event ProposalCancelled(bytes32 indexed proposalHash, string reason);
    event AgentReviewSet(address indexed agentReview);
    // Note: Paused and Unpaused events are inherited from PausableUpgradeable

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _owner, address[] memory _signers) public initializer {
        __Ownable_init(_owner);
        __Pausable_init();

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

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

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
     * L6 Fix: Uses nonce instead of block.timestamp for unique hash
     * M2 Fix: Sets up direct lookup mapping
     * M5 Fix: Allows both owner and signers to create proposals
     */
    function createProposal(
        address evaluator,
        uint256 _proposalId,
        uint256 amount,
        string calldata reason
    ) external whenNotPaused returns (bytes32 proposalHash) {
        // M5 Fix: Allow both owner and signers to create proposals
        require(msg.sender == owner() || isSigner[msg.sender], "Not owner or signer");
        require(evaluator != address(0), "Zero evaluator");
        require(amount > 0, "Zero amount");
        require(amount <= MAX_SLASH_AMOUNT, "Amount too high");
        require(bytes(reason).length > 0, "Empty reason");
        require(agentReview != address(0), "AgentReview not set");

        // L6 Fix: Use nonce instead of timestamp for uniqueness
        proposalHash = keccak256(abi.encode(
            evaluator,
            _proposalId,
            amount,
            proposalNonce++
        ));

        require(!_proposalExists(proposalHash), "Proposal exists");

        SlashProposal storage proposal = proposals[proposalHash];
        proposal.evaluator = evaluator;
        proposal.proposalId = _proposalId;
        proposal.amount = amount;
        proposal.reason = reason;
        proposal.createdAt = block.timestamp;
        proposal.executeAfter = type(uint256).max;
        proposal.confirmations = 0;
        proposal.executed = false;

        proposalIds.push(proposalHash);

        // M2 Fix: Set up direct lookup
        activeSlashByEvaluator[evaluator][_proposalId] = proposalHash;

        emit ProposalCreated(proposalHash, evaluator, _proposalId, amount, reason);
    }

    /**
     * @dev Confirm a proposal (signer calls this)
     */
    function confirmProposal(bytes32 proposalHash) external {
        require(isSigner[msg.sender], "Not a signer");
        require(_proposalExists(proposalHash), "Proposal not found");
        require(!proposals[proposalHash].executed, "Already executed");
        require(!proposals[proposalHash].confirmed[msg.sender], "Already confirmed");

        proposals[proposalHash].confirmed[msg.sender] = true;
        proposals[proposalHash].confirmations++;

        emit ProposalConfirmed(proposalHash, msg.sender);

        // If we have enough confirmations, set executeAfter
        if (proposals[proposalHash].confirmations >= REQUIRED_SIGNATURES) {
            proposals[proposalHash].executeAfter = block.timestamp + EXECUTION_DELAY;
        }
    }

    /**
     * @dev Execute a slash (calls AgentReview to perform actual slashing)
     * M1 Fix: Now passes slashBP to AgentReviewV5 for configurable slash percentage
     */
    function executeSlash(bytes32 proposalHash) external nonReentrant whenNotPaused {
        SlashProposal storage proposal = proposals[proposalHash];
        require(_proposalExists(proposalHash), "Proposal not found");
        require(!proposal.executed, "Already executed");
        require(proposal.confirmations >= REQUIRED_SIGNATURES, "Not enough confirmations");
        require(block.timestamp >= proposal.executeAfter, "Too early");

        proposal.executed = true;

        // M1 Fix: Calculate slash BP from amount vs max, default to 50%
        uint256 slashBP = DEFAULT_SLASH_BP;
        if (proposal.amount > 0 && proposal.amount <= MAX_SLASH_AMOUNT) {
            // Scale slash BP based on proposal amount (higher amount = higher slash %)
            slashBP = (proposal.amount * FEE_DENOMINATOR) / MAX_SLASH_AMOUNT;
            if (slashBP < MIN_SLASH_BP) slashBP = MIN_SLASH_BP;
        }

        // Call AgentReview to perform the slash with configurable BP
        IAgentReviewV5(agentReview).slashEvaluator(
            proposal.evaluator,
            proposal.proposalId,
            slashBP,
            proposal.reason
        );

        // M2 Fix: Clear the direct lookup
        activeSlashByEvaluator[proposal.evaluator][proposal.proposalId] = bytes32(0);

        emit ProposalExecuted(proposalHash, proposal.evaluator, proposal.amount);
    }

    /**
     * @dev Verify slash (called by AgentReview)
     * M2 Fix: O(1) lookup instead of O(n) iteration
     */
    function verifySlash(
        address evaluator,
        uint256 targetProposalId
    ) external view returns (bool) {
        require(msg.sender == agentReview, "Not AgentReview");

        // M2 Fix: Direct lookup
        bytes32 proposalHash = activeSlashByEvaluator[evaluator][targetProposalId];
        
        if (proposalHash != bytes32(0)) {
            SlashProposal storage proposal = proposals[proposalHash];
            
            if (!proposal.executed) {
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
     * @dev Cancel a proposal
     */
    function cancelProposal(bytes32 proposalHash) external onlyOwner {
        require(_proposalExists(proposalHash), "Proposal not found");
        require(!proposals[proposalHash].executed, "Already executed");

        address evaluator = proposals[proposalHash].evaluator;
        uint256 targetProposalId = proposals[proposalHash].proposalId;

        proposals[proposalHash].executed = true;

        // M2 Fix: Clear the direct lookup
        activeSlashByEvaluator[evaluator][targetProposalId] = bytes32(0);

        emit ProposalCancelled(proposalHash, "Cancelled by owner");
    }

    /**
     * @dev Add a new signer
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
     */
    function removeSigner(address signer) external onlyOwner {
        require(isSigner[signer], "Not a signer");
        require(signers.length > REQUIRED_SIGNATURES, "Cannot remove");
        
        isSigner[signer] = false;
        
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
     * @dev Get proposal details
     */
    function getProposal(bytes32 proposalHash) external view returns (
        address evaluator,
        uint256 proposalId,
        uint256 amount,
        string memory reason,
        uint256 createdAt,
        uint256 executeAfter,
        uint256 confirmations,
        bool executed
    ) {
        SlashProposal storage proposal = proposals[proposalHash];
        return (
            proposal.evaluator,
            proposal.proposalId,
            proposal.amount,
            proposal.reason,
            proposal.createdAt,
            proposal.executeAfter,
            proposal.confirmations,
            proposal.executed
        );
    }

    /**
     * @dev Check if a signer has confirmed a proposal
     */
    function hasConfirmed(bytes32 proposalHash, address signer) external view returns (bool) {
        return proposals[proposalHash].confirmed[signer];
    }

    function _proposalExists(bytes32 proposalHash) internal view returns (bool) {
        return proposals[proposalHash].createdAt != 0;
    }

    /// @dev Storage gap for upgrade safety
    uint256[50] private __gap;
}
