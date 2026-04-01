// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IIdentityRegistry} from "../interfaces/IIdentityRegistry.sol";

/**
 * @title IAgentSkillRegistry
 * @dev Interface for the Skill Registry
 */
interface IAgentSkillRegistry {
    struct Skill {
        string name;
        string version;
        string description;
        string endpoint;
        string[] domains;
        bool isActive;
    }
    
    function registerSkill(
        uint256 agentId,
        string calldata name,
        string calldata version,
        string calldata description,
        string calldata endpoint,
        string[] calldata domains
    ) external returns (uint256 skillId);
    
    function getAgentSkills(uint256 agentId) external view returns (uint256[] memory);
    
    function getSkill(uint256 skillId) external view returns (Skill memory);
    
    function deactivateSkill(uint256 skillId) external;
    
    event SkillRegistered(
        uint256 indexed agentId,
        uint256 indexed skillId,
        string name,
        string version,
        address indexed registeredBy
    );
    
    event SkillDeactivated(uint256 indexed skillId, address indexed deactivatedBy);
}

/**
 * @title AgentSkillRegistry
 * @dev Skill registry for agents with identity validation.
 *
 * Agents can register skills/capabilities. Each registration is validated
 * against the IdentityRegistry to ensure the caller owns the agent identity.
 */
contract AgentSkillRegistry is IAgentSkillRegistry, Ownable, ReentrancyGuard {
    
    struct SkillData {
        uint256 agentId;
        string name;
        string version;
        string description;
        string endpoint;
        string[] domains;
        bool isActive;
        address registeredBy;
        uint256 registeredAt;
    }
    
    IIdentityRegistry public immutable identityRegistry;
    
    mapping(uint256 => SkillData) private _skills;
    mapping(uint256 => uint256[]) private _agentSkills;
    uint256 private _skillCounter;
    
    constructor(address _identityRegistry) Ownable(msg.sender) {
        require(_identityRegistry != address(0), "Invalid identity registry");
        identityRegistry = IIdentityRegistry(_identityRegistry);
    }
    
    /**
     * @dev Register a skill for an agent. Caller must own the agent identity.
     */
    function registerSkill(
        uint256 agentId,
        string calldata name,
        string calldata version,
        string calldata description,
        string calldata endpoint,
        string[] calldata domains
    ) 
        external 
        nonReentrant 
        returns (uint256 skillId) 
    {
        require(bytes(name).length > 0, "Name required");
        require(bytes(version).length > 0, "Version required");
        
        // Validate caller owns this agent identity
        {
            (address agentOwner,,, bool agentActive) = identityRegistry.getAgent(agentId);
            require(agentActive, "Agent not active");
            require(agentOwner == msg.sender, "Not agent owner");
        }
        
        skillId = _skillCounter++;
        
        _skills[skillId] = SkillData({
            agentId: agentId,
            name: name,
            version: version,
            description: description,
            endpoint: endpoint,
            domains: domains,
            isActive: true,
            registeredBy: msg.sender,
            registeredAt: block.timestamp
        });
        
        _agentSkills[agentId].push(skillId);
        
        emit SkillRegistered(agentId, skillId, name, version, msg.sender);
        
        return skillId;
    }
    
    function getAgentSkills(uint256 agentId) external view returns (uint256[] memory) {
        return _agentSkills[agentId];
    }
    
    function getSkill(uint256 skillId) external view returns (Skill memory) {
        require(skillId < _skillCounter, "Invalid skillId");
        SkillData storage data = _skills[skillId];
        return Skill({
            name: data.name,
            version: data.version,
            description: data.description,
            endpoint: data.endpoint,
            domains: data.domains,
            isActive: data.isActive
        });
    }
    
    function getSkillData(uint256 skillId) external view returns (SkillData memory) {
        require(skillId < _skillCounter, "Invalid skillId");
        return _skills[skillId];
    }
    
    function deactivateSkill(uint256 skillId) external nonReentrant {
        require(skillId < _skillCounter, "Invalid skillId");
        require(_skills[skillId].registeredBy == msg.sender, "Not registered by caller");
        require(_skills[skillId].isActive, "Already inactive");
        
        _skills[skillId].isActive = false;
        
        emit SkillDeactivated(skillId, msg.sender);
    }
    
    function getTotalSkillCount() external view returns (uint256) {
        return _skillCounter;
    }
    
    function getAgentSkillCount(uint256 agentId) external view returns (uint256) {
        uint256[] storage skillIds = _agentSkills[agentId];
        uint256 count = 0;
        for (uint256 i = 0; i < skillIds.length; i++) {
            if (_skills[skillIds[i]].isActive) {
                count++;
            }
        }
        return count;
    }
    
    function findSkillsByDomain(string calldata domain) external view returns (uint256[] memory) {
        uint256 matchCount = 0;
        uint256[] memory tempResults = new uint256[](_skillCounter);
        
        for (uint256 i = 0; i < _skillCounter; i++) {
            if (_skills[i].isActive) {
                for (uint256 j = 0; j < _skills[i].domains.length; j++) {
                    if (keccak256(abi.encodePacked(_skills[i].domains[j])) == 
                        keccak256(abi.encodePacked(domain))) {
                        tempResults[matchCount] = i;
                        matchCount++;
                        break;
                    }
                }
            }
        }
        
        uint256[] memory results = new uint256[](matchCount);
        for (uint256 i = 0; i < matchCount; i++) {
            results[i] = tempResults[i];
        }
        
        return results;
    }
}
