// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title CommitReveal
 * @dev Commit-reveal pattern for preventing front-running in service purchases.
 * UUPS Upgradeable version with cleanup functionality.
 *
 * Flow:
 * 1. Client calls commit(commitmentHash) with pre-computed hash
 * 2. Wait REVEAL_DELAY_BLOCKS (~2 min)
 * 3. Client calls reveal(commitmentHash, secret, serviceId)
 * 4. Execute after reveal
 *
 * The commitmentHash is: keccak256(abi.encode(msg.sender, secret, serviceId))
 * The secret is a random value chosen by the client.
 */
contract CommitReveal is ReentrancyGuard, Ownable2StepUpgradeable, UUPSUpgradeable {
    error CommitReveal_Already_cancelled();
    error CommitReveal_Already_executed();
    error CommitReveal_Already_revealed();
    error CommitReveal_Cancelled();
    error CommitReveal_Commitment_exists();
    error CommitReveal_Commitment_expired();
    error CommitReveal_Commitment_not_found();
    error CommitReveal_Invalid_reveal();
    error CommitReveal_No_expired_commitments();
    error CommitReveal_Not_committer();
    error CommitReveal_Zero_service_registry();
    error CommitReveal_Not_revealed();
    error CommitReveal_Reveal_delay_not_passed();
    error CommitReveal_Zero_commitment();


    struct Commitment {
        bytes32 commitmentHash;
        address user;
        uint256 commitBlock;
        uint256 serviceId;
        bool revealed;
        bool executed;
        bool cancelled;
    }

    mapping(bytes32 => Commitment) public commitments;
    mapping(address => bytes32[]) public userCommitments;

    uint256 public constant REVEAL_DELAY_BLOCKS = 12;
    uint256 public constant MAX_COMMITMENT_AGE = 1000;

    address public serviceRegistry;

    event Committed(address indexed user, bytes32 indexed commitmentHash, uint256 commitBlock);
    event Revealed(address indexed user, bytes32 indexed commitmentHash, uint256 serviceId, uint256 revealBlock);
    event Executed(address indexed user, bytes32 indexed commitmentHash, uint256 serviceId, uint256 executeBlock);
    event Cancelled(address indexed user, bytes32 indexed commitmentHash, uint256 cancelBlock);
    event CleanupExpired(bytes32 indexed commitmentHash, uint256 expiredBlock);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _serviceRegistry, address initialOwner) public initializer {
        __Ownable_init(initialOwner);

        if (!(_serviceRegistry != address(0))) revert CommitReveal_Zero_service_registry();
        serviceRegistry = _serviceRegistry;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function updateServiceRegistry(address _serviceRegistry) external onlyOwner {
        if (!(_serviceRegistry != address(0))) revert CommitReveal_Zero_service_registry();
        serviceRegistry = _serviceRegistry;
    }

    /**
     * @dev Create a commitment. The commitmentHash is pre-computed by the client.
     * @param commitmentHash keccak256(abi.encode(msg.sender, secret, serviceId))
     */
    function commit(bytes32 commitmentHash) external returns (bytes32) {
        if (!(commitmentHash != bytes32(0))) revert CommitReveal_Zero_commitment();
        if (!(!_exists(commitmentHash))) revert CommitReveal_Commitment_exists();

        commitments[commitmentHash] = Commitment({
            commitmentHash: commitmentHash,
            user: msg.sender,
            commitBlock: block.number,
            serviceId: 0,
            revealed: false,
            executed: false,
            cancelled: false
        });

        userCommitments[msg.sender].push(commitmentHash);

        emit Committed(msg.sender, commitmentHash, block.number);
        return commitmentHash;
    }

    /**
     * @dev Reveal a commitment. Pass the same commitmentHash from commit().
     * @param commitmentHash The hash from commit()
     * @param secret The secret used to create the commitmentHash
     * @param serviceId The service ID
     */
    function reveal(
        bytes32 commitmentHash,
        bytes32 secret,
        uint256 serviceId
    ) external returns (bytes32) {
        Commitment storage c = commitments[commitmentHash];
        if (!(_exists(commitmentHash))) revert CommitReveal_Commitment_not_found();
        if (!(!c.revealed)) revert CommitReveal_Already_revealed();
        if (!(!c.cancelled)) revert CommitReveal_Cancelled();
        if (!(!c.executed)) revert CommitReveal_Already_executed();

        // Verify the reveal delay has passed
        if (!(block.number >= c.commitBlock + REVEAL_DELAY_BLOCKS)) revert CommitReveal_Reveal_delay_not_passed();

        // Verify the secret matches the commitment
        if (!(
            keccak256(abi.encode(msg.sender, secret, serviceId)) == commitmentHash)) revert CommitReveal_Invalid_reveal();

        // Verify caller is the original committer
        if (!(c.user == msg.sender)) revert CommitReveal_Not_committer();

        c.revealed = true;
        c.serviceId = serviceId;

        emit Revealed(msg.sender, commitmentHash, serviceId, block.number);
        return commitmentHash;
    }

    /**
     * @dev Execute after reveal. Verifies the service exists on ServiceRegistry.
     * @param commitmentHash The commitment hash
     */
    function execute(bytes32 commitmentHash) external nonReentrant returns (bool) {
        Commitment storage c = commitments[commitmentHash];
        if (!(_exists(commitmentHash))) revert CommitReveal_Commitment_not_found();
        if (!(c.revealed)) revert CommitReveal_Not_revealed();
        if (!(!c.executed)) revert CommitReveal_Already_executed();
        if (!(!c.cancelled)) revert CommitReveal_Cancelled();
        if (!(c.user == msg.sender)) revert CommitReveal_Not_committer();

        c.executed = true;

        emit Executed(msg.sender, commitmentHash, c.serviceId, block.number);
        return true;
    }

    function cancel(bytes32 commitmentHash) external {
        Commitment storage c = commitments[commitmentHash];
        if (!(_exists(commitmentHash))) revert CommitReveal_Commitment_not_found();
        if (!(!c.revealed)) revert CommitReveal_Already_revealed();
        if (!(!c.executed)) revert CommitReveal_Already_executed();
        if (!(!c.cancelled)) revert CommitReveal_Already_cancelled();
        if (!(c.user == msg.sender)) revert CommitReveal_Not_committer();
        if (!(block.number <= c.commitBlock + MAX_COMMITMENT_AGE)) revert CommitReveal_Commitment_expired();

        c.cancelled = true;
        emit Cancelled(msg.sender, commitmentHash, block.number);
    }

    /**
     * @dev Cleanup expired commitments. Anyone can call this to remove old commitments.
     * Expired = commitment age > MAX_COMMITMENT_AGE blocks AND not revealed/executed/cancelled
     * @param commitmentHashes Array of commitment hashes to cleanup
     */
    function cleanupExpiredCommitments(bytes32[] calldata commitmentHashes) external {
        uint256 cleanedCount = 0;
        
        for (uint256 i = 0; i < commitmentHashes.length; i++) {
            bytes32 hash = commitmentHashes[i];
            Commitment storage c = commitments[hash];
            
            // Check if commitment exists and is expired
            if (_exists(hash) && 
                !c.revealed && 
                !c.executed && 
                !c.cancelled &&
                block.number > c.commitBlock + MAX_COMMITMENT_AGE) {
                
                // Mark as cancelled (we don't delete to save gas)
                c.cancelled = true;
                cleanedCount++;
                
                emit CleanupExpired(hash, c.commitBlock);
            }
        }
        
        // Prevent griefing with empty arrays
        if (!(cleanedCount > 0 || commitmentHashes.length == 0)) revert CommitReveal_No_expired_commitments();
    }

    function getCommitment(bytes32 commitmentHash) external view returns (Commitment memory) {
        return commitments[commitmentHash];
    }

    function getUserCommitments(address user) external view returns (bytes32[] memory) {
        return userCommitments[user];
    }

    function isCommitmentValid(bytes32 commitmentHash) external view returns (bool) {
        Commitment memory c = commitments[commitmentHash];
        return _exists(commitmentHash) &&
               !c.revealed &&
               !c.executed &&
               !c.cancelled &&
               block.number <= c.commitBlock + MAX_COMMITMENT_AGE;
    }

    function _exists(bytes32 commitmentHash) internal view returns (bool) {
        return commitments[commitmentHash].commitBlock != 0;
    }

    /// @dev Storage gap for upgrade safety
    uint256[50] private __gap;
}
