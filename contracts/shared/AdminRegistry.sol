// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {ERC1967Utils} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Utils.sol";

/**
 * @title AdminRegistry
 * @dev Owner-managed registry for curated state including featured agents,
 *      verification providers, skill rules, and reputation decay configuration.
 */
contract AdminRegistry is OwnableUpgradeable, UUPSUpgradeable, PausableUpgradeable {
    struct VerificationConfig {
        string provider;      // e.g., "self.xyz"
        uint256 verifiedAt;   // timestamp
        string proof;         // optional proof data
        bool isVerified;
    }

    struct SkillRule {
        string skillName;
        uint256 minRating;    // minimum rating required
        bool isActive;
    }

    struct AgentInfo {
        string name;
        string description;
        string[] capabilities;
        uint256 halfLifeDays; // for reputation decay
        bool isFeatured;
        VerificationConfig verification;
        SkillRule[] skillRules;
        uint256 createdAt;
        uint256 updatedAt;
    }

    // Featured agents mapping: agentId -> AgentInfo
    mapping(uint256 => AgentInfo) public featuredAgents;
    
    // Verification providers mapping: providerName -> isActive
    mapping(string => bool) public verificationProviders;
    
    // Skill rules mapping: skillName -> SkillRule
    mapping(string => SkillRule) public skillRules;
    
    // Half-life days for decay (global default)
    uint256 public halfLifeDays = 30; // default 30 days

    // Events
    event FeaturedAgentUpdated(uint256 indexed agentId, bool isFeatured);
    event VerificationProviderUpdated(string provider, bool isActive);
    event SkillRuleUpdated(string skillName, uint256 minRating, bool isActive);
    event HalfLifeDaysUpdated(uint256 halfLifeDays);
    
    // Errors
    error Unauthorized();
    error AgentNotFound();
    error ProviderNotActive();
    error SkillRuleNotFound();

    /**
     * @dev Initialize the contract (called once during deployment)
     */
    function initialize() public initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        __Pausable_init();
        
        // Set default verification providers
        verificationProviders["self.xyz"] = true;
        
        // Set default half-life
        halfLifeDays = 30;
    }

    /**
     * @dev Get half-life days for reputation decay
     * @return Number of days for half-life decay
     */
    function getHalfLifeDays() public view returns (uint256) {
        return halfLifeDays;
    }

    /**
     * @dev Get all verification providers mapping
     * @return Array of provider names that are active
     */
    function getVerificationProviders() public view returns (string[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < 100; i++) { // Check max 100 providers
            // This is simplified - in practice you'd maintain a list of provider names
            // For now, we'll return a placeholder
        }
        string[] memory providers = new string[](1);
        providers[0] = "self.xyz";
        return providers;
    }

    /**
     * @dev Check if a provider is active
     * @param provider Provider name to check
     * @return bool True if provider is active
     */
    function isVerificationProviderActive(string memory provider) public view returns (bool) {
        return verificationProviders[provider];
    }

    /**
     * @dev Internal upgrade authorization (only owner)
     */
    function _authorizeUpgrade(address newImplementation) 
        internal 
        override 
        onlyOwner 
    {
        // Additional authorization logic if needed
    }

    /**
     * @dev Pause contract operations (owner only)
     */
    function pause() public onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause contract operations (owner only)
     */
    function unpause() public onlyOwner {
        _unpause();
    }

    /**
     * @dev Set half-life days for reputation decay
     * @param _halfLifeDays Number of days for half-life decay
     */
    function setHalfLifeDays(uint256 _halfLifeDays) public onlyOwner {
        require(_halfLifeDays > 0, "Half-life must be positive");
        halfLifeDays = _halfLifeDays;
        emit HalfLifeDaysUpdated(_halfLifeDays);
    }

    /**
     * @dev Update featured agent status
     * @param agentId Agent ID to update
     * @param isFeatured Whether the agent should be featured
     */
    function setFeaturedAgent(uint256 agentId, bool isFeatured) public onlyOwner {
        featuredAgents[agentId].isFeatured = isFeatured;
        featuredAgents[agentId].updatedAt = block.timestamp;
        emit FeaturedAgentUpdated(agentId, isFeatured);
    }

    /**
     * @dev Set verification provider status
     * @param provider Provider name
     * @param isActive Whether provider is active
     */
    function setVerificationProvider(string memory provider, bool isActive) public onlyOwner {
        verificationProviders[provider] = isActive;
        emit VerificationProviderUpdated(provider, isActive);
    }

    /**
     * @dev Set skill rule for a specific skill
     * @param skillName Name of the skill
     * @param minRating Minimum rating required for the skill
     * @param isActive Whether the skill rule is active
     */
    function setSkillRule(
        string memory skillName, 
        uint256 minRating, 
        bool isActive
    ) public onlyOwner {
        skillRules[skillName] = SkillRule({
            skillName: skillName,
            minRating: minRating,
            isActive: isActive
        });
        emit SkillRuleUpdated(skillName, minRating, isActive);
    }

    /**
     * @dev Get featured agents list
     * @return Array of featured agent IDs
     */
    function getFeaturedAgents() public view returns (uint256[] memory) {
        // This is a simplified implementation - in practice you'd maintain a list
        // For now, we return a dynamic array that would need to be populated
        uint256 count = 0;
        for (uint256 i = 0; i < 100; i++) { // Assume max 100 featured agents
            if (featuredAgents[i].isFeatured) {
                count++;
            }
        }
        
        uint256[] memory result = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < 100; i++) {
            if (featuredAgents[i].isFeatured) {
                result[index] = i;
                index++;
            }
        }
        return result;
    }

    /**
     * @dev Check if an agent is verified by a specific provider
     * @param agentId Agent ID to check
     * @param provider Provider name
     * @return bool True if verified
     */
    function isAgentVerified(uint256 agentId, string memory provider) 
        public 
        view 
        returns (bool) 
    {
        return featuredAgents[agentId].verification.isVerified && 
               keccak256(bytes(featuredAgents[agentId].verification.provider)) == 
               keccak256(bytes(provider));
    }

    /**
     * @dev Calculate decayed reputation score
     * @param initialRating Initial rating
     * @param timestamp Timestamp of the rating
     * @return Decayed rating
     */
    function calculateDecayedRating(uint256 initialRating, uint256 timestamp) 
        public 
        view 
        returns (uint256) 
    {
        if (initialRating == 0) return 0;
        
        uint256 daysElapsed = (block.timestamp - timestamp) / 1 days;
        uint256 decayFactor = daysElapsed * 100 / halfLifeDays; // percentage
        
        if (decayFactor >= 100) return 0;
        
        return initialRating * (100 - decayFactor) / 100;
    }

    /**
     * @dev Get verification config for an agent
     * @param agentId Agent ID
     * @return Verification configuration
     */
    function getVerificationConfig(uint256 agentId) 
        public 
        view 
        returns (VerificationConfig memory) 
    {
        return featuredAgents[agentId].verification;
    }

    /**
     * @dev Get featured agent info
     * @param agentId Agent ID
     * @return name Agent name
     * @return description Agent description
     * @return isFeatured Whether agent is featured
     */
    function getFeaturedAgent(uint256 agentId) public view returns (string memory name, string memory description, bool isFeatured) {
        AgentInfo storage agent = featuredAgents[agentId];
        return (agent.name, agent.description, agent.isFeatured);
    }

    /**
     * @dev Get skill criteria for a specific skill
     * @param skillName Skill name
     * @return Skill rule
     */
    function getSkillCriteria(string memory skillName) 
        public 
        view 
        returns (SkillRule memory) 
    {
        return skillRules[skillName];
    }
}
