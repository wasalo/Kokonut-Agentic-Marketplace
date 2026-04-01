// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/**
 * @title IAgentSkillRegistryV2
 * @dev Interface for Skill Registry V2
 */
interface IAgentSkillRegistryV2 {
    struct Skill {
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
    
    function registerSkill(
        uint256 agentId,
        string calldata name,
        string calldata version,
        string calldata description,
        string calldata endpoint,
        string[] memory domains
    ) external returns (uint256 skillId);
    
    function updateSkill(
        uint256 skillId,
        string calldata name,
        string calldata version,
        string calldata description,
        string calldata endpoint,
        string[] memory domains
    ) external;
    
    function getAgentSkills(uint256 agentId) external view returns (uint256[] memory);
    function getSkill(uint256 skillId) external view returns (Skill memory);
    function getSkillData(uint256 skillId) external view returns (Skill memory);
    function deactivateSkill(uint256 skillId) external;
    function getTotalSkillCount() external view returns (uint256);
    function getAgentSkillCount(uint256 agentId) external view returns (uint256);
    function findSkillsByDomain(string calldata domain) external view returns (uint256[] memory);
    
    event SkillRegistered(
        uint256 indexed agentId,
        uint256 indexed skillId,
        string name,
        string version,
        address indexed registeredBy
    );
    
    event SkillDeactivated(uint256 indexed skillId, address indexed deactivatedBy);
    event SkillUpdated(uint256 indexed skillId);
}

/**
 * @title AgentSkillRegistryV2
 * @dev Upgradeable skill registry for agents compatible with ERC-8004 IdentityRegistry.
 * 
 * FIXED: Uses IERC721.ownerOf() instead of non-existent getAgent() function.
 * Uses UUPS proxy pattern for upgradeability.
 */
contract AgentSkillRegistryV2 is 
    IAgentSkillRegistryV2, 
    OwnableUpgradeable, 
    UUPSUpgradeable
{
    
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
        uint256 updatedAt;
    }
    
    // Use IERC721 interface for ERC-8004 compatibility
    IERC721 public identityRegistry;
    
    mapping(uint256 => SkillData) private _skills;
    mapping(uint256 => uint256[]) private _agentSkills;
    uint256 private _skillCounter;
    
    // Gap for future storage variables (upgradeability best practice)
    uint256[50] private __gap;
    
    event IdentityRegistryUpdated(address newRegistry);
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @dev Initialize the contract (replaces constructor for upgradeable contracts)
     * @param _identityRegistry Address of the ERC-8004 IdentityRegistry
     */
    function initialize(address _identityRegistry) public initializer {
        require(_identityRegistry != address(0), "Invalid identity registry");
        
        __Ownable_init(msg.sender);
        
        identityRegistry = IERC721(_identityRegistry);
        _skillCounter = 0;
    }
    
    /**
     * @dev Authorize upgrades (only owner can upgrade)
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
    
    /**
     * @dev Update identity registry address (for flexibility)
     */
    function setIdentityRegistry(address _identityRegistry) external onlyOwner {
        require(_identityRegistry != address(0), "Invalid address");
        identityRegistry = IERC721(_identityRegistry);
        emit IdentityRegistryUpdated(_identityRegistry);
    }
    
    /**
     * @dev Verify agent ownership using IERC721.ownerOf()
     * FIXED: Uses ownerOf() which exists in ERC-8004 instead of non-existent getAgent()
     */
    function _verifyAgentOwnership(uint256 agentId) internal view returns (address) {
        try identityRegistry.ownerOf(agentId) returns (address owner) {
            require(owner != address(0), "Invalid agent");
            return owner;
        } catch {
            revert("Agent does not exist");
        }
    }
    
    /**
     * @dev Register a skill for an agent.
     * FIXED: Uses IERC721.ownerOf() instead of non-existent getAgent()
     */
    function registerSkill(
        uint256 agentId,
        string calldata name,
        string calldata version,
        string calldata description,
        string calldata endpoint,
        string[] memory domains
    ) 
        external 
        override
        returns (uint256 skillId) 
    {
        require(bytes(name).length > 0, "Name required");
        require(bytes(version).length > 0, "Version required");
        
        // FIXED: Use ownerOf() instead of getAgent()
        address agentOwner = _verifyAgentOwnership(agentId);
        require(agentOwner == msg.sender, "Not agent owner");
        
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
            registeredAt: block.timestamp,
            updatedAt: block.timestamp
        });
        
        _agentSkills[agentId].push(skillId);
        
        emit SkillRegistered(agentId, skillId, name, version, msg.sender);
        
        return skillId;
    }
    
    /**
     * @dev Update an existing skill
     */
    function updateSkill(
        uint256 skillId,
        string calldata name,
        string calldata version,
        string calldata description,
        string calldata endpoint,
        string[] memory domains
    ) external override {
        require(skillId < _skillCounter, "Invalid skillId");
        require(_skills[skillId].registeredBy == msg.sender, "Not registered by caller");
        require(_skills[skillId].isActive, "Skill is inactive");
        require(bytes(name).length > 0, "Name required");
        require(bytes(version).length > 0, "Version required");
        
        SkillData storage skill = _skills[skillId];
        skill.name = name;
        skill.version = version;
        skill.description = description;
        skill.endpoint = endpoint;
        skill.domains = domains;
        skill.updatedAt = block.timestamp;
        
        emit SkillUpdated(skillId);
    }
    
    function getAgentSkills(uint256 agentId) external view override returns (uint256[] memory) {
        return _agentSkills[agentId];
    }
    
    function getSkill(uint256 skillId) external view override returns (Skill memory) {
        require(skillId < _skillCounter, "Invalid skillId");
        SkillData storage data = _skills[skillId];
        return Skill({
            agentId: data.agentId,
            name: data.name,
            version: data.version,
            description: data.description,
            endpoint: data.endpoint,
            domains: data.domains,
            isActive: data.isActive,
            registeredBy: data.registeredBy,
            registeredAt: data.registeredAt
        });
    }
    
    function getSkillData(uint256 skillId) external view override returns (Skill memory) {
        return this.getSkill(skillId);
    }
    
    function deactivateSkill(uint256 skillId) external override {
        require(skillId < _skillCounter, "Invalid skillId");
        require(_skills[skillId].registeredBy == msg.sender, "Not registered by caller");
        require(_skills[skillId].isActive, "Already inactive");
        
        _skills[skillId].isActive = false;
        
        emit SkillDeactivated(skillId, msg.sender);
    }
    
    function getTotalSkillCount() external view override returns (uint256) {
        return _skillCounter;
    }
    
    function getAgentSkillCount(uint256 agentId) external view override returns (uint256) {
        uint256[] storage skillIds = _agentSkills[agentId];
        uint256 count = 0;
        for (uint256 i = 0; i < skillIds.length; i++) {
            if (_skills[skillIds[i]].isActive) {
                count++;
            }
        }
        return count;
    }
    
    function findSkillsByDomain(string calldata domain) external view override returns (uint256[] memory) {
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
