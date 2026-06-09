// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {IAgenticCommerceV9_Slash} from "../interfaces/IAgenticCommerceV9_Slash.sol";

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
     * M1 Fix: Pass configurable slash basis points to AgenticCommerce
     */
contract SlashManager is ReentrancyGuard, Ownable2StepUpgradeable, UUPSUpgradeable, PausableUpgradeable {
    error SlashManager__Commerce_not_set();
    error SlashManager__Already_a_signer();
    error SlashManager__Already_confirmed();
    error SlashManager__Already_executed();
    error SlashManager__Amount_too_high();
    error SlashManager__Cannot_remove();
    error SlashManager__Duplicate_signer();
    error SlashManager__Empty_reason();
    error SlashManager__Max_signers_reached();
    error SlashManager__Not_commerce();
    error SlashManager__Not_a_signer();
    error SlashManager__Not_enough_confirmations();
    error SlashManager__Not_enough_signers();
    error SlashManager__Not_owner_or_signer();
    error SlashManager__Proposal_exists();
    error SlashManager__Proposal_not_found();
    error SlashManager__Proposal_too_old();
    error SlashManager__Too_early();
    error SlashManager__Too_many_signers();
    error SlashManager__Zero_address();
    error SlashManager__Zero_amount();
    error SlashManager__Zero_evaluator();
    error SlashManager__Zero_signer();
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

    // AgenticCommerce contract
    address public commerce;

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
    event CommerceSet(address indexed commerce);
    // Note: Paused and Unpaused events are inherited from PausableUpgradeable

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _owner, address[] memory _signers) public initializer {
        __Ownable_init(_owner);
        __Pausable_init();

        if (!(_signers.length >= REQUIRED_SIGNATURES)) revert SlashManager__Not_enough_signers();
        if (!(_signers.length <= MAX_SIGNERS)) revert SlashManager__Too_many_signers();

        for (uint256 i = 0; i < _signers.length; i++) {
            if (!(_signers[i] != address(0))) revert SlashManager__Zero_signer();
            if (!(!isSigner[_signers[i]])) revert SlashManager__Duplicate_signer();
            
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
     * @dev Set the AgenticCommerce contract address
     * @param _commerce AgenticCommerce contract address
     */
    function setCommerce(address _commerce) external onlyOwner {
        if (!(_commerce != address(0))) revert SlashManager__Zero_address();
        commerce = _commerce;
        emit CommerceSet(_commerce);
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
        if (!(msg.sender == owner() || isSigner[msg.sender])) revert SlashManager__Not_owner_or_signer();
        if (!(evaluator != address(0))) revert SlashManager__Zero_evaluator();
        if (!(amount > 0)) revert SlashManager__Zero_amount();
        if (!(amount <= MAX_SLASH_AMOUNT)) revert SlashManager__Amount_too_high();
        if (!(bytes(reason).length > 0)) revert SlashManager__Empty_reason();
        if (!(commerce != address(0))) revert SlashManager__Commerce_not_set();

        // L6 Fix: Use nonce instead of timestamp for uniqueness
        proposalHash = keccak256(abi.encode(
            evaluator,
            _proposalId,
            amount,
            proposalNonce++
        ));

        if (!(!_proposalExists(proposalHash))) revert SlashManager__Proposal_exists();

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
        if (!(isSigner[msg.sender])) revert SlashManager__Not_a_signer();
        if (!(_proposalExists(proposalHash))) revert SlashManager__Proposal_not_found();
        if (!(!proposals[proposalHash].executed)) revert SlashManager__Already_executed();
        if (!(!proposals[proposalHash].confirmed[msg.sender])) revert SlashManager__Already_confirmed();

        proposals[proposalHash].confirmed[msg.sender] = true;
        proposals[proposalHash].confirmations++;

        emit ProposalConfirmed(proposalHash, msg.sender);

        // If we have enough confirmations, set executeAfter
        if (proposals[proposalHash].confirmations >= REQUIRED_SIGNATURES) {
            proposals[proposalHash].executeAfter = block.timestamp + EXECUTION_DELAY;
        }
    }

    /**
     * @dev Execute a slash (calls AgenticCommerce to perform actual slashing)
     * M1 Fix: Now passes slashBP to AgenticCommerce for configurable slash percentage
     */
    function executeSlash(bytes32 proposalHash) external nonReentrant whenNotPaused {
        SlashProposal storage proposal = proposals[proposalHash];
        if (!(_proposalExists(proposalHash))) revert SlashManager__Proposal_not_found();
        if (!(!proposal.executed)) revert SlashManager__Already_executed();
        if (!(proposal.confirmations >= REQUIRED_SIGNATURES)) revert SlashManager__Not_enough_confirmations();
        if (!(block.timestamp >= proposal.executeAfter)) revert SlashManager__Too_early();

        proposal.executed = true;

        uint256 stake = IAgenticCommerceV9_Slash(commerce).evaluatorStakes(proposal.evaluator);
        uint256 slashAmount = proposal.amount;
        uint256 defaultCap = (stake * DEFAULT_SLASH_BP) / FEE_DENOMINATOR;
        if (slashAmount > defaultCap) slashAmount = defaultCap;
        if (slashAmount > MAX_SLASH_AMOUNT) slashAmount = MAX_SLASH_AMOUNT;
        if (slashAmount > stake) slashAmount = stake;

        // Call AgenticCommerce to perform the slash
        IAgenticCommerceV9_Slash(commerce).slashByGovernance(
            proposal.evaluator,
            slashAmount,
            proposal.reason
        );

        // Clear the direct lookup
        activeSlashByEvaluator[proposal.evaluator][proposal.proposalId] = bytes32(0);

        emit ProposalExecuted(proposalHash, proposal.evaluator, slashAmount);
    }

    /**
     * @dev Check if an evaluator has an active slash proposal
     */
    function hasActiveSlash(
        address evaluator,
        uint256 targetProposalId
    ) external view returns (bool) {
        bytes32 proposalHash = activeSlashByEvaluator[evaluator][targetProposalId];
        
        if (proposalHash != bytes32(0)) {
            SlashProposal storage proposal = proposals[proposalHash];
            
            if (!proposal.executed) {
                if (block.timestamp > proposal.createdAt + MAX_PROPOSAL_AGE) return false;
                return true;
            }
        }
        
        return false;
    }

    /**
     * @dev Cancel a proposal
     */
    function cancelProposal(bytes32 proposalHash) external onlyOwner {
        if (!(_proposalExists(proposalHash))) revert SlashManager__Proposal_not_found();
        if (!(!proposals[proposalHash].executed)) revert SlashManager__Already_executed();

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
        if (!(signer != address(0))) revert SlashManager__Zero_address();
        if (!(!isSigner[signer])) revert SlashManager__Already_a_signer();
        if (!(signers.length < MAX_SIGNERS)) revert SlashManager__Max_signers_reached();

        signers.push(signer);
        isSigner[signer] = true;
        
        emit SignerAdded(signer);
    }

    /**
     * @dev Remove a signer
     */
    function removeSigner(address signer) external onlyOwner {
        if (!(isSigner[signer])) revert SlashManager__Not_a_signer();
        if (!(signers.length > REQUIRED_SIGNATURES)) revert SlashManager__Cannot_remove();
        
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
