// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockIdentityRegistry
 * @dev Mock ERC-8004 Identity Registry for testing
 */
contract MockIdentityRegistry {
    mapping(uint256 => address) public owners;
    mapping(uint256 => string) public uris;
    mapping(uint256 => address) public agentWallets;
    mapping(uint256 => bool) public isActive;
    mapping(address => bool) public isAgentAddress;
    uint256 public currentAgentId;

    function register(address owner_, string calldata uri) external returns (uint256 agentId) {
        currentAgentId++;
        agentId = currentAgentId;
        owners[agentId] = owner_;
        uris[agentId] = uri;
        agentWallets[agentId] = owner_;
        isActive[agentId] = true;
        isAgentAddress[owner_] = true;
    }

    function getAgent(uint256 agentId) external view returns (
        address owner,
        string memory agentURI,
        address agentWallet,
        bool _isActive
    ) {
        return (owners[agentId], uris[agentId], agentWallets[agentId], isActive[agentId]);
    }

    function isAgent(address agentAddress) external view returns (bool) {
        return isAgentAddress[agentAddress];
    }

    function getCurrentAgentId() external view returns (uint256) {
        return currentAgentId;
    }

    function ownerOf(uint256 tokenId) external view returns (address) {
        return owners[tokenId];
    }
}
