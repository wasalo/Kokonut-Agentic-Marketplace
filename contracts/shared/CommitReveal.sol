// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CommitReveal
 * @dev Commit-reveal pattern for preventing front-running in service purchases.
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
contract CommitReveal is ReentrancyGuard, Ownable {

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

    constructor(address _serviceRegistry, address _owner) Ownable(_owner) {
        require(_serviceRegistry != address(0), "Zero service registry");
        serviceRegistry = _serviceRegistry;
    }

    function updateServiceRegistry(address _serviceRegistry) external onlyOwner {
        require(_serviceRegistry != address(0), "Zero service registry");
        serviceRegistry = _serviceRegistry;
    }

    /**
     * @dev Create a commitment. The commitmentHash is pre-computed by the client.
     * @param commitmentHash keccak256(abi.encode(msg.sender, secret, serviceId))
     */
    function commit(bytes32 commitmentHash) external returns (bytes32) {
        require(commitmentHash != bytes32(0), "Zero commitment");
        require(!_exists(commitmentHash), "Commitment exists");

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
        require(_exists(commitmentHash), "Commitment not found");
        require(!c.revealed, "Already revealed");
        require(!c.cancelled, "Cancelled");
        require(!c.executed, "Already executed");

        // Verify the reveal delay has passed
        require(block.number >= c.commitBlock + REVEAL_DELAY_BLOCKS, "Reveal delay not passed");

        // Verify the secret matches the commitment
        require(
            keccak256(abi.encode(msg.sender, secret, serviceId)) == commitmentHash,
            "Invalid reveal"
        );

        // Verify caller is the original committer
        require(c.user == msg.sender, "Not committer");

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
        require(_exists(commitmentHash), "Commitment not found");
        require(c.revealed, "Not revealed");
        require(!c.executed, "Already executed");
        require(!c.cancelled, "Cancelled");
        require(c.user == msg.sender, "Not committer");

        c.executed = true;

        emit Executed(msg.sender, commitmentHash, c.serviceId, block.number);
        return true;
    }

    function cancel(bytes32 commitmentHash) external {
        Commitment storage c = commitments[commitmentHash];
        require(_exists(commitmentHash), "Commitment not found");
        require(!c.revealed, "Already revealed");
        require(!c.executed, "Already executed");
        require(!c.cancelled, "Already cancelled");
        require(c.user == msg.sender, "Not committer");
        require(block.number <= c.commitBlock + MAX_COMMITMENT_AGE, "Commitment expired");

        c.cancelled = true;
        emit Cancelled(msg.sender, commitmentHash, block.number);
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
}
