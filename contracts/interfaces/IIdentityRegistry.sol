// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IIdentityRegistry
 * @dev Interface for ERC-8004 compliant Identity Registry
 * 
 * This interface matches the official ERC-8004 registry at:
 * Sepolia: 0x8004A818BFB912233c491871b3d84c89A494BD9e
 */
interface IIdentityRegistry {
    function getAgent(uint256 agentId) external view returns (
        address owner, 
        string memory agentURI, 
        address agentWallet, 
        bool isActive
    );
    
    function isAgent(address agentAddress) external view returns (bool);
    
    function getCurrentAgentId() external view returns (uint256);
}
