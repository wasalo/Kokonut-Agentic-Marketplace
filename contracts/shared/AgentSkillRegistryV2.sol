// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
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
    Ownable2StepUpgradeable, 
    UUPSUpgradeable
{
    error AgentSkillRegistryV2_Already_inactive();
    error AgentSkillRegistryV2_Invalid_address();
    error AgentSkillRegistryV2_Invalid_agent();
    error AgentSkillRegistryV2_Invalid_identity_registry();
    error AgentSkillRegistryV2_Invalid_skillId();
    error AgentSkillRegistryV2_Name_required();
    error AgentSkillRegistryV2_Not_agent_owner();
    error AgentSkillRegistryV2_Not_registered_by_caller();
    error AgentSkillRegistryV2_Skill_is_inactive();
    error AgentSkillRegistryV2_Version_required();
    
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
    mapping(bytes32 => uint256[]) private _domainToSkills;
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
    function initialize(address _identityRegistry) external initializer {
        if (!(_identityRegistry != address(0))) revert AgentSkillRegistryV2_Invalid_identity_registry();
        
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
        if (!(_identityRegistry != address(0))) revert AgentSkillRegistryV2_Invalid_address();
        identityRegistry = IERC721(_identityRegistry);
        emit IdentityRegistryUpdated(_identityRegistry);
    }
    
    /**
     * @dev Verify agent ownership using IERC721.ownerOf()
     * FIXED: Uses ownerOf() which exists in ERC-8004 instead of non-existent getAgent()
     */
    function _verifyAgentOwnership(uint256 agentId) internal view returns (address) {
        try identityRegistry.ownerOf(agentId) returns (address owner) {
            if (!(owner != address(0))) revert AgentSkillRegistryV2_Invalid_agent();
            return owner;
        } catch {
            revert("Agent does not exist");
        }
    }
    
    /**
     * @dev Register a skill for an agent.
     * FIXED: Uses IERC721.ownerOf() instead of non-existent getAgent()
     * M1 Fix: Also indexes skill by domain for O(1) findSkillsByDomain lookups
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
        if (!(bytes(name).length > 0)) revert AgentSkillRegistryV2_Name_required();
        if (!(bytes(version).length > 0)) revert AgentSkillRegistryV2_Version_required();
        
        // FIXED: Use ownerOf() instead of getAgent()
        address agentOwner = _verifyAgentOwnership(agentId);
        if (!(agentOwner == msg.sender)) revert AgentSkillRegistryV2_Not_agent_owner();
        
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
        
        // M1 Fix: Index skill by each domain for O(1) lookup
        _indexSkillByDomains(skillId, domains);
        
        emit SkillRegistered(agentId, skillId, name, version, msg.sender);
        
        return skillId;
    }
    
    /**
     * @dev M1 Fix: Index skill by domains
     */
    function _indexSkillByDomains(uint256 skillId, string[] memory domains) internal {
        for (uint256 i = 0; i < domains.length; i++) {
            bytes32 domainKey = keccak256(abi.encode(domains[i]));
            _domainToSkills[domainKey].push(skillId);
        }
    }

    function _unindexSkillByDomains(uint256 skillId, string[] memory domains) internal {
        for (uint256 i = 0; i < domains.length; i++) {
            bytes32 domainKey = keccak256(abi.encode(domains[i]));
            uint256[] storage skillList = _domainToSkills[domainKey];
            for (uint256 j = 0; j < skillList.length; j++) {
                if (skillList[j] == skillId) {
                    skillList[j] = skillList[skillList.length - 1];
                    skillList.pop();
                    break;
                }
            }
        }
    }
    
    /**
     * @dev Update an existing skill
     * M1 Fix: Updates domain indexes for O(1) lookup
     */
    function updateSkill(
        uint256 skillId,
        string calldata name,
        string calldata version,
        string calldata description,
        string calldata endpoint,
        string[] memory domains
    ) external override {
        if (!(skillId < _skillCounter)) revert AgentSkillRegistryV2_Invalid_skillId();
        if (!(_skills[skillId].registeredBy == msg.sender)) revert AgentSkillRegistryV2_Not_registered_by_caller();
        if (!(_skills[skillId].isActive)) revert AgentSkillRegistryV2_Skill_is_inactive();
        if (!(bytes(name).length > 0)) revert AgentSkillRegistryV2_Name_required();
        if (!(bytes(version).length > 0)) revert AgentSkillRegistryV2_Version_required();
        
        SkillData storage skill = _skills[skillId];
        
        // M1 Fix: Update domain indexes
        _unindexSkillByDomains(skillId, skill.domains);
        skill.domains = domains;
        _indexSkillByDomains(skillId, domains);
        
        skill.name = name;
        skill.version = version;
        skill.description = description;
        skill.endpoint = endpoint;
        skill.updatedAt = block.timestamp;
        
        emit SkillUpdated(skillId);
    }
    
    function getAgentSkills(uint256 agentId) external view override returns (uint256[] memory) {
        return _agentSkills[agentId];
    }
    
    function getSkill(uint256 skillId) external view override returns (Skill memory) {
        if (!(skillId < _skillCounter)) revert AgentSkillRegistryV2_Invalid_skillId();
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
        if (!(skillId < _skillCounter)) revert AgentSkillRegistryV2_Invalid_skillId();
        if (!(_skills[skillId].registeredBy == msg.sender)) revert AgentSkillRegistryV2_Not_registered_by_caller();
        if (!(_skills[skillId].isActive)) revert AgentSkillRegistryV2_Already_inactive();
        
        // M1 Fix: Remove from domain indexes
        _unindexSkillByDomains(skillId, _skills[skillId].domains);
        
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
    
    /**
     * @dev M1 Fix: O(1) lookup by domain using pre-indexed mapping
     * Before: O(n*m) - iterate all skills, all domains
     * After: O(1) - direct mapping lookup
     */
    function findSkillsByDomain(string calldata domain) external view override returns (uint256[] memory) {
        bytes32 domainKey = keccak256(abi.encode(domain));
        uint256[] storage skillIds = _domainToSkills[domainKey];
        
        // Filter to only active skills
        uint256 matchCount = 0;
        uint256[] memory tempResults = new uint256[](skillIds.length);
        
        for (uint256 i = 0; i < skillIds.length; i++) {
            if (_skills[skillIds[i]].isActive) {
                tempResults[matchCount] = skillIds[i];
                matchCount++;
            }
        }
        
        uint256[] memory results = new uint256[](matchCount);
        for (uint256 i = 0; i < matchCount; i++) {
            results[i] = tempResults[i];
        }
        
        return results;
    }
}
