# KOKONUT AGENTIC MARKETPLACE — SOLICITY AUDIT BUNDLE

## Specialty: periphery

## Section 1: In-scope source code

// FILE: contracts/proxies/AgenticCommerceProxy.sol

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";

/**
 * @title AgenticCommerceProxy
 * @dev Transparent Upgradeable Proxy for AgenticCommerceV5
 * 
 * This proxy allows:
 * - Upgradeable implementation via UUPS
 * - Separate admin for proxy admin operations
 * - Gas-efficient upgrades (UUPS)
 */
contract AgenticCommerceProxy is TransparentUpgradeableProxy {
    /**
     * @dev Constructor
     * @param _implementation The implementation address
     * @param _admin The proxy admin address
     * @param _initData The initialization data
     */
    constructor(
        address _implementation,
        address _admin,
        bytes memory _initData
    ) TransparentUpgradeableProxy(_implementation, _admin, _initData) {}
}

// FILE: contracts/shared/AdminRegistry.sol

// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {ERC1967Utils} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Utils.sol";

/**
 * @title AdminRegistry
 * @dev Owner-managed registry for curated state including featured agents,
 *      verification providers, skill rules, and reputation decay configuration.
 */
contract AdminRegistry is Ownable2StepUpgradeable, UUPSUpgradeable, PausableUpgradeable {
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

    // ============ Bad Actor Blacklist ============

    // Grace period before blacklist takes effect (1 hour = 3600 seconds)
    uint256 public constant BLACKLIST_GRACE_PERIOD = 1 hours;

    // Blacklist entry struct
    struct BlacklistEntry {
        bool isBlacklisted;
        uint256 blacklistedAt;      // When the ban was initiated
        uint256 activationAt;      // When the ban becomes active (after grace period)
        string reason;              // Reason for blacklisting
        address blacklistedBy;      // Who initiated the ban
        bool autoSlashed;           // If true, was auto-slashed via SlashManager
    }

    // Agent ID blacklist: agentId -> BlacklistEntry
    mapping(uint256 => BlacklistEntry) public blacklistedAgents;

    // Wallet address blacklist: wallet -> BlacklistEntry
    mapping(address => BlacklistEntry) public blacklistedWallets;

    // Track all blacklisted agent IDs for enumeration
    uint256[] public blacklistedAgentIds;
    uint256[] public blacklistedWalletIndices; // indices for wallet array

    // Wallet blacklist tracking
    mapping(address => uint256) public walletBlacklistIndex; // wallet -> index in array

    // Agent blacklist tracking
    mapping(uint256 => uint256) public agentBlacklistIndex; // agentId -> index in array

    // SlashManager address (only SlashManager can call slashAndBlacklistAgent)
    address public slashManager;
    
    // Optional: ERC-8004 Identity Registry for agent existence validation (A3-10)
    address public identityRegistry;

    // Lists of all blacklisted
    address[] public blacklistedWalletsList;

    // Events
    event FeaturedAgentUpdated(uint256 indexed agentId, bool isFeatured);
    event VerificationProviderUpdated(string provider, bool isActive);
    event SkillRuleUpdated(string skillName, uint256 minRating, bool isActive);
    event HalfLifeDaysUpdated(uint256 halfLifeDays);
    
    // Blacklist events
    event AgentBlacklisted(uint256 indexed agentId, address indexed by, string reason, uint256 activationAt);
    event AgentUnblacklisted(uint256 indexed agentId, address indexed by);
    event AgentBlacklistActivated(uint256 indexed agentId);
    event WalletBlacklisted(address indexed wallet, address indexed by, string reason, uint256 activationAt);
    event WalletUnblacklisted(address indexed wallet, address indexed by);
    event WalletBlacklistActivated(address indexed wallet);
    event SlashManagerSet(address indexed oldManager, address indexed newManager);
    
    // Errors
    error Unauthorized();
    error AgentNotFound();
    error ProviderNotActive();
    error SkillRuleNotFound();
    error AgentAlreadyBlacklisted();
    error AgentNotBlacklisted();
    error WalletAlreadyBlacklisted();
    error WalletNotBlacklisted();
    error BlacklistNotYetActive();
    error GracePeriodNotPassed();
    error NotSlashManager();
    error ZeroAddress();
    error HalfLifeMustBePositive();
    error AgentAlreadySlashed();

    modifier onlySlashManager() {
        if (msg.sender != slashManager) revert NotSlashManager();
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initialize the contract (called once during deployment)
     */
    function initialize() public initializer {
        __Ownable_init(msg.sender);
        __Pausable_init();
        
        // Set default verification providers
        verificationProviders["self.xyz"] = true;
        _addProviderName("self.xyz");
        
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

    // F8-06 FIX: Track active providers properly
    string[] private _providerNames;
    mapping(string => uint256) private _providerIndex;

    function getVerificationProviders() public view returns (string[] memory) {
        return _providerNames;
    }
    
    function _addProviderName(string memory provider) internal {
        if (_providerIndex[provider] == 0) {
            _providerNames.push(provider);
            _providerIndex[provider] = _providerNames.length;
        }
    }
    
    function _removeProviderName(string memory provider) internal {
        uint256 idx = _providerIndex[provider];
        if (idx > 0) {
            uint256 lastIdx = _providerNames.length;
            if (idx != lastIdx) {
                string memory last = _providerNames[lastIdx - 1];
                _providerNames[idx - 1] = last;
                _providerIndex[last] = idx;
            }
            _providerNames.pop();
            delete _providerIndex[provider];
        }
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
        if (_halfLifeDays == 0) revert HalfLifeMustBePositive();
        halfLifeDays = _halfLifeDays;
        emit HalfLifeDaysUpdated(_halfLifeDays);
    }

    /**
     * @dev Set the SlashManager address (only SlashManager can auto-blacklist)
     * @param _slashManager Address of the SlashManager contract
     */
    function setSlashManager(address _slashManager) public onlyOwner {
        if (_slashManager == address(0)) revert ZeroAddress();
        emit SlashManagerSet(slashManager, _slashManager);
        slashManager = _slashManager;
    }

    /**
     * @dev Set the IdentityRegistry address for agent existence validation (A3-10)
     * @param _identityRegistry Address of the ERC-8004 IdentityRegistry
     */
    function setIdentityRegistry(address _identityRegistry) public onlyOwner {
        identityRegistry = _identityRegistry;
    }

    /**
     * @dev Set verification provider status
     * @param provider Provider name
     * @param isActive Whether provider is active
     */
    function setVerificationProvider(string memory provider, bool isActive) public onlyOwner {
        bool wasActive = verificationProviders[provider];
        verificationProviders[provider] = isActive;
        
        // F8-06 FIX: Track active providers properly
        if (isActive && !wasActive) {
            _addProviderName(provider);
        } else if (!isActive && wasActive) {
            _removeProviderName(provider);
        }
        
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

    // F8-06 FIX: Track featured agents properly
    uint256[] private _featuredAgentIds;
    mapping(uint256 => uint256) private _featuredAgentIndex;
    
    function getFeaturedAgents() public view returns (uint256[] memory) {
        return _featuredAgentIds;
    }
    
    function setFeaturedAgent(uint256 agentId, bool isFeatured) public onlyOwner {
        featuredAgents[agentId].isFeatured = isFeatured;
        featuredAgents[agentId].updatedAt = block.timestamp;
        
        // F8-06 FIX: Track featured agents properly
        if (isFeatured && _featuredAgentIndex[agentId] == 0) {
            _featuredAgentIds.push(agentId);
            _featuredAgentIndex[agentId] = _featuredAgentIds.length;
        } else if (!isFeatured && _featuredAgentIndex[agentId] > 0) {
            uint256 idx = _featuredAgentIndex[agentId] - 1;
            uint256 lastIdx = _featuredAgentIds.length - 1;
            if (idx != lastIdx) {
                uint256 lastId = _featuredAgentIds[lastIdx];
                _featuredAgentIds[idx] = lastId;
                _featuredAgentIndex[lastId] = idx + 1;
            }
            _featuredAgentIds.pop();
            delete _featuredAgentIndex[agentId];
        }
        
        emit FeaturedAgentUpdated(agentId, isFeatured);
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
        if (timestamp > block.timestamp) return initialRating;
        
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

    // ============ Bad Actor Blacklist Functions ============

    /**
     * @dev Blacklist an agent ID (with grace period)
     * @param agentId Agent ID to blacklist
     * @param reason Reason for blacklisting
     */
    function blacklistAgent(uint256 agentId, string calldata reason) public onlyOwner {
        if (blacklistedAgents[agentId].isBlacklisted) revert AgentAlreadyBlacklisted();
        
        // A3-10 FIX: Check agent exists in identity registry (if configured)
        if (identityRegistry != address(0)) {
            (bool success, bytes memory data) = identityRegistry.staticcall(
                abi.encodeWithSignature("ownerOf(uint256)", agentId)
            );
            if (!success || data.length == 0) revert AgentNotFound();
            address owner = abi.decode(data, (address));
            if (owner == address(0)) revert AgentNotFound();
        }
        
        uint256 activationAt = block.timestamp + BLACKLIST_GRACE_PERIOD;
        
        blacklistedAgents[agentId] = BlacklistEntry({
            isBlacklisted: true,
            blacklistedAt: block.timestamp,
            activationAt: activationAt,
            reason: reason,
            blacklistedBy: msg.sender,
            autoSlashed: false
        });
        
        agentBlacklistIndex[agentId] = blacklistedAgentIds.length;
        blacklistedAgentIds.push(agentId);
        
        emit AgentBlacklisted(agentId, msg.sender, reason, activationAt);
    }

    /**
     * @dev Remove agent from blacklist
     * @param agentId Agent ID to unblacklist
     */
    function unblacklistAgent(uint256 agentId) public onlyOwner {
        if (!blacklistedAgents[agentId].isBlacklisted) revert AgentNotBlacklisted();
        
        delete blacklistedAgents[agentId];
        
        // Remove from array using swap-and-pop to prevent unbounded growth
        uint256 index = agentBlacklistIndex[agentId];
        uint256 lastIndex = blacklistedAgentIds.length - 1;
        if (index != lastIndex) {
            uint256 lastAgentId = blacklistedAgentIds[lastIndex];
            blacklistedAgentIds[index] = lastAgentId;
            agentBlacklistIndex[lastAgentId] = index;
        }
        blacklistedAgentIds.pop();
        delete agentBlacklistIndex[agentId];
        
        emit AgentUnblacklisted(agentId, msg.sender);
    }

    /**
     * @dev Blacklist a wallet address (with grace period)
     * @param wallet Wallet address to blacklist
     * @param reason Reason for blacklisting
     */
    function blacklistWallet(address wallet, string calldata reason) public onlyOwner {
        if (wallet == address(0)) revert ZeroAddress();
        if (blacklistedWallets[wallet].isBlacklisted) revert WalletAlreadyBlacklisted();
        
        uint256 activationAt = block.timestamp + BLACKLIST_GRACE_PERIOD;
        
        blacklistedWallets[wallet] = BlacklistEntry({
            isBlacklisted: true,
            blacklistedAt: block.timestamp,
            activationAt: activationAt,
            reason: reason,
            blacklistedBy: msg.sender,
            autoSlashed: false
        });
        
        blacklistedWalletsList.push(wallet);
        walletBlacklistIndex[wallet] = blacklistedWalletsList.length - 1;
        
        emit WalletBlacklisted(wallet, msg.sender, reason, activationAt);
    }

    /**
     * @dev Remove wallet from blacklist
     * @param wallet Wallet address to unblacklist
     */
    function unblacklistWallet(address wallet) public onlyOwner {
        if (!blacklistedWallets[wallet].isBlacklisted) revert WalletNotBlacklisted();
        
        delete blacklistedWallets[wallet];
        
        // Remove from array using swap-and-pop to prevent unbounded growth
        uint256 index = walletBlacklistIndex[wallet];
        uint256 lastIndex = blacklistedWalletsList.length - 1;
        if (index != lastIndex) {
            address lastWallet = blacklistedWalletsList[lastIndex];
            blacklistedWalletsList[index] = lastWallet;
            walletBlacklistIndex[lastWallet] = index;
        }
        blacklistedWalletsList.pop();
        delete walletBlacklistIndex[wallet];
        
        emit WalletUnblacklisted(wallet, msg.sender);
    }

    /**
     * @dev Auto-slash: Blacklist agent from SlashManager proposal
     * @param agentId Agent ID to blacklist
     * @param reason Reason for blacklisting (from slash proposal)
     */
    function slashAndBlacklistAgent(uint256 agentId, string calldata reason) external onlySlashManager {
        if (blacklistedAgents[agentId].isBlacklisted) revert AgentAlreadySlashed();

        uint256 activationAt = block.timestamp + BLACKLIST_GRACE_PERIOD;
        
        blacklistedAgents[agentId] = BlacklistEntry({
            isBlacklisted: true,
            blacklistedAt: block.timestamp,
            activationAt: activationAt,
            reason: reason,
            blacklistedBy: msg.sender,
            autoSlashed: true
        });
        
        agentBlacklistIndex[agentId] = blacklistedAgentIds.length;
        blacklistedAgentIds.push(agentId);
        
        emit AgentBlacklisted(agentId, msg.sender, reason, activationAt);
    }

    /**
     * @dev Check if agent is blacklisted AND active (grace period passed)
     * @param agentId Agent ID to check
     * @return bool True if agent is actively blacklisted
     */
    function isAgentBlacklistedActive(uint256 agentId) public view returns (bool) {
        BlacklistEntry memory entry = blacklistedAgents[agentId];
        return entry.isBlacklisted && block.timestamp >= entry.activationAt;
    }

    /**
     * @dev Check if wallet is blacklisted AND active (grace period passed)
     * @param wallet Wallet address to check
     * @return bool True if wallet is actively blacklisted
     */
    function isWalletBlacklistedActive(address wallet) public view returns (bool) {
        BlacklistEntry memory entry = blacklistedWallets[wallet];
        return entry.isBlacklisted && block.timestamp >= entry.activationAt;
    }

    /**
     * @dev Get blacklist entry for agent
     * @param agentId Agent ID
     * @return Blacklist entry
     */
    function getAgentBlacklistEntry(uint256 agentId) public view returns (BlacklistEntry memory) {
        return blacklistedAgents[agentId];
    }

    /**
     * @dev Get blacklist entry for wallet
     * @param wallet Wallet address
     * @return Blacklist entry
     */
    function getWalletBlacklistEntry(address wallet) public view returns (BlacklistEntry memory) {
        return blacklistedWallets[wallet];
    }

    /**
     * @dev Get all blacklisted agent IDs
     * @return Array of blacklisted agent IDs
     */
    function getAllBlacklistedAgents() public view returns (uint256[] memory) {
        return blacklistedAgentIds;
    }

    /**
     * @dev Get all blacklisted wallet addresses
     * @return Array of blacklisted wallet addresses
     */
    function getAllBlacklistedWallets() public view returns (address[] memory) {
        return blacklistedWalletsList;
    }

    /**
     * @dev Get count of blacklisted agents
     * @return Number of blacklisted agents
     */
    function getBlacklistedAgentCount() public view returns (uint256) {
        return blacklistedAgentIds.length;
    }

    /**
     * @dev Get count of blacklisted wallets
     * @return Number of blacklisted wallets
     */
    function getBlacklistedWalletCount() public view returns (uint256) {
        return blacklistedWalletsList.length;
    }

    /// @dev Storage gap for upgrade safety
    uint256[50] private __gap;
}

// FILE: contracts/shared/AgentSkillRegistryV2.sol

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
        bytes32 domainKey = keccak256(abi.encodePacked(domain));
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

// FILE: contracts/shared/AgenticCommerceV6.sol

// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IACPHook} from "./IACPHook.sol";
import {IAgenticCommerceV6} from "../interfaces/IAgenticCommerceV6.sol";

/**
 * @title AgenticCommerceV6
 * @dev UUPS Upgradeable Agentic Commerce Protocol V6
 * 
 * Key Features (V6):
 * - ERC-2771 Meta-Transactions for gasless transactions
 * - createJobFromService() for seamless service-to-escrow flow
 * - Evaluator fees (1%, optional, on top of budget)
 * - Loser stake withdrawal for bidding protection
 * - Native ETH and ERC20 support
 * - Pausable for emergency stops
 * 
 * Budget Limits:
 * - Min: 5 USD (expressed in token decimals)
 * - Max: 1,000,000 USD (expressed in token decimals)
 * 
 * Security fixes applied:
 * - M3: Token allowlist to prevent non-standard tokens
 * - I1: Pausable pattern for emergency stops
 * - Custom errors (L2): Consistent error handling
 */
contract AgenticCommerceV6 is 
    IAgenticCommerceV6, 
    ContextUpgradeable,
    Ownable2StepUpgradeable, 
    UUPSUpgradeable, 
    ReentrancyGuard,
    PausableUpgradeable
{
    using SafeERC20 for IERC20;

    /***********************************/
    /* Constants */
    /***********************************/
    
    uint256 public constant FEE_DENOMINATOR = 10000;
    uint256 public constant EVALUATOR_FEE_BP = 100; // 1% evaluator fee (on top of budget)
    
    // DoS Prevention
    uint256 public constant MAX_JOBS_PER_CLIENT = 100;
    uint256 public constant MAX_DESCRIPTION_LENGTH = 1000;
    uint256 public constant MIN_EXPIRY_DURATION = 5 minutes;
    uint256 public constant MAX_EXPIRY_DURATION = 365 days;
    
    // Budget limits (in USD terms - actual limits depend on token decimals)
    uint256 public constant MIN_BUDGET = 5e6;  // $5 (USDC decimals)
    uint256 public constant MAX_BUDGET = 1e12;  // $1,000,000 (USDC decimals)
    
    // Minimum ETH payment (dust threshold)
    uint256 public constant MIN_ETH_PAYMENT = 0.005 ether;
    
    // Configurable Dispute Window for timeout completion
    uint256 public constant DEFAULT_DISPUTE_WINDOW = 7 days;
    
    // Configurable Non-Responsiveness Slash Percentage (100 BP = 1%)
    uint256 public constant DEFAULT_NONRESPONSIVE_SLASH_BP = 100; // 1%

    /***********************************/
    /* Update Type Constants */
    /***********************************/
    
    bytes32 private constant _UPDATE_TYPE_PROVIDER = keccak256("provider");
    bytes32 private constant _UPDATE_TYPE_BUDGET = keccak256("budget");

    /***********************************/
    /* State Variables */
    /***********************************/
    
    address public platformTreasury;

    mapping(uint256 => Job) public jobs;
    uint256 public jobCounter;
    
    // DoS Prevention: Track job count per client
    mapping(address => uint256) public clientJobCount;
    mapping(uint256 => address) public jobClient;

    // Evaluator fee enabled per job
    mapping(uint256 => bool) public evaluatorFeeEnabled;
    
    // Configurable dispute window (per job)
    mapping(uint256 => uint256) public jobDisputeWindow;
    
    // Configurable non-responsiveness slash (per job)
    mapping(uint256 => uint256) public jobNonResponsiveSlashBP;
    
    // Job submission timestamp for timeout tracking
    mapping(uint256 => uint256) public jobSubmittedAt;

    // M3 Fix: Token allowlist for payment tokens
    mapping(address => bool) public allowedTokens;
    
    // M5 Fix: Evaluator registry for random selection
    address[] public evaluatorPool;
    mapping(address => bool) public isRegisteredEvaluator;
    
    // Minimum reputation score required to be an evaluator
    uint256 public constant MIN_EVALUATOR_REPUTATION = 50;

    /***********************************/
    /* Errors */
    /***********************************/
    
    error InvalidJob();
    error WrongStatus();
    error Unauthorized();
    error ZeroAddress();
    error ExpiryTooShort();
    error ExpiryTooLong();
    error ZeroBudget();
    error BudgetTooLow();
    error BudgetMismatch(uint256 expected, uint256 actual);
    error BudgetTooHigh();
    error ProviderNotSet();
    error InvalidHook();
    error MaxJobsPerClient(address client, uint256 current);
    error TokenNotAllowed(address token);
    
    // Security errors
    error RolesMustBeDistinct();

    /***********************************/
    /* Modifiers */
    /***********************************/
    
    modifier onlyClient(uint256 jobId) {
        if (jobs[jobId].client != _msgSender()) revert Unauthorized();
        _;
    }
    
    modifier onlyProvider(uint256 jobId) {
        if (jobs[jobId].provider != _msgSender()) revert Unauthorized();
        _;
    }
    
    modifier onlyEvaluator(uint256 jobId) {
        if (jobs[jobId].evaluator != _msgSender()) revert Unauthorized();
        _;
    }
    
    modifier onlyAllowedToken(address token) {
        if (!_isTokenAllowed(token)) revert TokenNotAllowed(token);
        _;
    }

    /***********************************/
    /* Initialize */
    /***********************************/
    
    constructor() {
        _disableInitializers();
    }

    function initialize(address treasury_, address initialOwner) public initializer {
        if (treasury_ == address(0)) revert ZeroAddress();
        __Context_init();
        __Ownable_init(initialOwner);
        __Pausable_init();
        platformTreasury = treasury_;
        
        // M3 Fix: Initialize default allowed tokens
        // Native ETH (address(0)) is always allowed
        // USDC is the primary allowed ERC20 token
        allowedTokens[address(0)] = true; // Native ETH
    }

    /***********************************/
    /* UUPS */
    /***********************************/
    
    function _authorizeUpgrade(address newImpl) internal override onlyOwner {}

    /***********************************/
    /* Pausable */
    /***********************************/
    
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /***********************************/
    /* Token Allowlist Management */
    /***********************************/
    
    /**
     * @dev M3 Fix: Set a token as allowed or not allowed
     * @param token Token address (address(0) for native ETH)
     * @param allowed Whether the token is allowed
     */
    function setAllowedToken(address token, bool allowed) external onlyOwner {
        allowedTokens[token] = allowed;
        emit TokenAllowlistUpdated(token, allowed);
    }
    
    /**
     * @dev Check if a token is allowed
     * @param token Token address (address(0) for native ETH)
     */
    function _isTokenAllowed(address token) internal view returns (bool) {
        // Native ETH is always allowed
        if (token == address(0)) return true;
        // Check allowlist for ERC20 tokens
        return allowedTokens[token];
    }

    /***********************************/
    /* Core Job Functions */
    /***********************************/
    
    /**
     * @dev Create a direct job with fixed provider
     * @param evaluatorFee Enable 1% evaluator fee on top of budget
     */
    function createJob(
        address provider,
        address evaluator,
        uint256 expiredAt,
        string calldata description,
        address hook,
        bool evaluatorFee
    ) external nonReentrant whenNotPaused returns (uint256 jobId) {
        _validateJobCreation(provider, evaluator, expiredAt, description, hook);
        
        if (clientJobCount[_msgSender()] >= MAX_JOBS_PER_CLIENT) {
            emit JobLimitExceeded(_msgSender(), clientJobCount[_msgSender()] + 1, MAX_JOBS_PER_CLIENT);
            revert MaxJobsPerClient(_msgSender(), clientJobCount[_msgSender()]);
        }

        jobId = ++jobCounter;
        jobs[jobId] = Job({
            id: jobId,
            client: _msgSender(),
            provider: provider,
            evaluator: evaluator,
            serviceId: 0,
            paymentToken: IERC20(address(0)), // Native ETH
            description: description,
            budget: 0,
            expiredAt: expiredAt,
            status: JobStatus.Open,
            hook: hook,
            deliverable: bytes32(0)
        });
        
        evaluatorFeeEnabled[jobId] = evaluatorFee;
        jobClient[jobId] = _msgSender();
        clientJobCount[_msgSender()]++;

        emit JobCreated(jobId, _msgSender(), provider, 0, expiredAt);
    }

    /**
     * @dev Create job from an existing service
     * NOTE: Temporarily disabled due to contract size
     */
    function createJobFromService(
        uint256,
        address,
        uint256,
        string calldata,
        address,
        bool
    ) external nonReentrant whenNotPaused returns (uint256) {
        revert("createJobFromService disabled");
    }

    /**
     * @dev Create an open job for bidding - DISABLED
     */
    function createOpenJob(
        uint256,
        address,
        uint256,
        string calldata,
        IERC20,
        bool
    ) external pure returns (uint256) {
        revert("Bidding disabled in V6.1");
    }

    /**
     * @dev Internal validation for job creation
     */
    function _validateJobCreation(
        address provider,
        address evaluator,
        uint256 expiredAt,
        string calldata description,
        address /* hook */
    ) internal view {
        if (provider == address(0)) revert ZeroAddress();
        if (evaluator == address(0)) revert ZeroAddress();
        if (_msgSender() == provider || _msgSender() == evaluator) revert RolesMustBeDistinct();
        if (provider == evaluator) revert RolesMustBeDistinct();
        if (expiredAt <= block.timestamp + MIN_EXPIRY_DURATION) revert ExpiryTooShort();
        if (expiredAt > block.timestamp + MAX_EXPIRY_DURATION) revert ExpiryTooLong();
        if (bytes(description).length == 0 || bytes(description).length > MAX_DESCRIPTION_LENGTH) revert InvalidJob();
    }

    function setProvider(uint256 jobId, address provider) external onlyClient(jobId) {
        Job storage job = jobs[jobId];
        if (job.id == 0) revert InvalidJob();
        if (uint256(job.status) != 0) revert WrongStatus();
        if (job.provider != address(0)) revert WrongStatus();
        if (provider == _msgSender() || provider == address(0)) revert InvalidJob();

        address oldProvider = job.provider;
        job.provider = provider;
        
        emit ProviderSet(jobId, provider, oldProvider);
        emit JobUpdated(jobId, _UPDATE_TYPE_PROVIDER, bytes32(uint256(uint160(oldProvider))), bytes32(uint256(uint160(provider))), block.timestamp);
    }

    function setBudget(uint256 jobId, uint256 amount) external nonReentrant onlyClient(jobId) {
        Job storage job = jobs[jobId];
        if (job.id == 0) revert InvalidJob();
        if (uint256(job.status) != 0) revert WrongStatus();
        if (amount == 0) revert ZeroBudget();

        uint256 oldBudget = job.budget;
        job.budget = amount;
        
        emit BudgetSet(jobId, oldBudget, amount);
        emit JobUpdated(jobId, _UPDATE_TYPE_BUDGET, bytes32(oldBudget), bytes32(amount), block.timestamp);
    }

    function fund(uint256 jobId, uint256 expectedBudget) external payable nonReentrant onlyClient(jobId) {
        Job storage job = jobs[jobId];
        _validateFund(job);

        uint256 cachedBudget = job.budget;

        // Front-running protection: ensure client gets the budget they expected
        if (expectedBudget != 0 && cachedBudget != expectedBudget) {
            revert BudgetMismatch(expectedBudget, cachedBudget);
        }

        // CEI Fix: Effects before Interactions - update status BEFORE hook call
        JobStatus oldStatus = job.status;
        job.status = JobStatus.Funded;
        
        // Interaction: Call hook AFTER status update (CEI pattern)
        if (job.hook != address(0)) {
            IACPHook(job.hook).beforeAction(jobId, this.fund.selector, "");
        }
        
        if (address(job.paymentToken) == address(0)) {
            if (msg.value < cachedBudget) revert BudgetTooLow();
            if (msg.value < MIN_ETH_PAYMENT) revert BudgetTooLow();
            
            // Refund excess ETH
            uint256 excess = msg.value - cachedBudget;
            if (excess > 0) {
                payable(_msgSender()).transfer(excess);
            }
        } else {
            if (msg.value != 0) revert InvalidJob();
            uint256 balanceBefore = job.paymentToken.balanceOf(address(this));
            job.paymentToken.safeTransferFrom(_msgSender(), address(this), cachedBudget);
            uint256 balanceAfter = job.paymentToken.balanceOf(address(this));
            if (balanceAfter - balanceBefore != cachedBudget) revert InvalidJob();
        }
        
        emit JobFunded(jobId, _msgSender(), cachedBudget);
        emit JobStatusChanged(jobId, oldStatus, JobStatus.Funded, _msgSender(), block.timestamp);
    }

    function _validateFund(Job storage job) internal view {
        if (job.id == 0) revert InvalidJob();
        if (job.status != JobStatus.Open) revert WrongStatus();
        if (job.provider == address(0)) revert ProviderNotSet();
        if (job.budget == 0) revert ZeroBudget();
        if (block.timestamp >= job.expiredAt) revert InvalidJob();
    }

    function submit(uint256 jobId, bytes32 deliverable) external nonReentrant onlyProvider(jobId) {
        Job storage job = jobs[jobId];
        if (job.id == 0) revert InvalidJob();
        if (job.status != JobStatus.Funded) revert WrongStatus();

        // CEI Fix: Effects before Interactions - update status BEFORE hook call
        JobStatus oldStatus = job.status;
        job.status = JobStatus.Submitted;
        job.deliverable = deliverable;
        jobSubmittedAt[jobId] = block.timestamp;
        
        // Interaction: Call hook AFTER status update (CEI pattern)
        if (job.hook != address(0)) {
            IACPHook(job.hook).beforeAction(jobId, this.submit.selector, abi.encode(deliverable));
        }
        
        emit JobSubmitted(jobId, _msgSender(), deliverable);
        emit JobStatusChanged(jobId, oldStatus, JobStatus.Submitted, _msgSender(), block.timestamp);
    }

    function complete(uint256 jobId, bytes32 reason) external nonReentrant onlyEvaluator(jobId) {
        Job storage job = jobs[jobId];
        if (job.id == 0) revert InvalidJob();
        if (job.status != JobStatus.Submitted) revert WrongStatus();

        uint256 amount = job.budget;
        uint256 platformFee = (amount * 100) / FEE_DENOMINATOR; // 1% platform fee
        uint256 net = amount - platformFee;
        address prov = job.provider;
        IERC20 paymentToken = job.paymentToken;

        uint256 evaluatorFee = 0;
        if (evaluatorFeeEnabled[jobId] && job.evaluator != address(0)) {
            evaluatorFee = (amount * EVALUATOR_FEE_BP) / FEE_DENOMINATOR;
            net -= evaluatorFee;
        }

        // CEI Fix: Effects before Interactions - update status BEFORE hook call
        job.budget = 0;
        job.status = JobStatus.Completed;
        
        _decrementJobCount(jobId);

        // Interaction: Call hook AFTER status update (CEI pattern)
        if (job.hook != address(0)) {
            IACPHook(job.hook).beforeAction(jobId, this.complete.selector, abi.encode(reason));
        }

        if (platformFee > 0) {
            _transferPayment(paymentToken, platformTreasury, platformFee);
        }
        if (evaluatorFee > 0) {
            _transferPayment(paymentToken, job.evaluator, evaluatorFee);
        }
        if (net > 0) {
            _transferPayment(paymentToken, prov, net);
        }

        emit JobCompleted(jobId, _msgSender(), job.provider, evaluatorFee);
        emit PaymentReleased(jobId, prov, net);
        emit JobStatusChanged(jobId, JobStatus.Submitted, JobStatus.Completed, _msgSender(), block.timestamp);
    }

    function completeAfterTimeout(uint256 jobId, bytes32 reason) external nonReentrant whenNotPaused {
        Job storage job = jobs[jobId];
        if (job.id == 0) revert InvalidJob();
        if (job.status != JobStatus.Submitted) revert WrongStatus();
        if (job.provider != _msgSender() && job.client != _msgSender()) revert Unauthorized();
        
        uint256 submittedAt = jobSubmittedAt[jobId];
        if (submittedAt == 0) revert InvalidJob();
        
        uint256 disputeWindow = jobDisputeWindow[jobId];
        if (disputeWindow == 0) disputeWindow = DEFAULT_DISPUTE_WINDOW;
        
        if (block.timestamp < submittedAt + disputeWindow) revert WrongStatus();
        
        uint256 amount = job.budget;
        uint256 platformFee = (amount * 100) / FEE_DENOMINATOR;
        uint256 slashAmount = 0;
        
        uint256 slashBP = jobNonResponsiveSlashBP[jobId];
        if (slashBP == 0) slashBP = DEFAULT_NONRESPONSIVE_SLASH_BP;
        
        slashAmount = (amount * slashBP) / FEE_DENOMINATOR;
        uint256 net = amount - platformFee - slashAmount;
        address prov = job.provider;
        IERC20 paymentToken = job.paymentToken;

        // CEI Fix: Effects before Interactions - update status BEFORE hook call
        job.budget = 0;
        job.status = JobStatus.Completed;
        
        _decrementJobCount(jobId);

        // Interaction: Call hook AFTER status update (CEI pattern)
        if (job.hook != address(0)) {
            IACPHook(job.hook).beforeAction(jobId, this.completeAfterTimeout.selector, abi.encode(reason));
        }

        if (platformFee > 0) {
            _transferPayment(paymentToken, platformTreasury, platformFee);
        }
        if (slashAmount > 0) {
            _transferPayment(paymentToken, platformTreasury, slashAmount);
        }
        if (net > 0) {
            _transferPayment(paymentToken, prov, net);
        }

        emit JobCompleted(jobId, _msgSender(), job.provider, 0);
        emit PaymentReleased(jobId, prov, net);
        emit EvaluatorSlashedForInactivity(jobId, job.evaluator, slashAmount);
        emit JobStatusChanged(jobId, JobStatus.Submitted, JobStatus.Completed, _msgSender(), block.timestamp);
    }

    function setDisputeWindow(uint256 jobId, uint256 window) external onlyClient(jobId) {
        if (jobs[jobId].status != JobStatus.Funded) revert WrongStatus();
        if (window < 1 days || window > 30 days) revert InvalidJob();
        jobDisputeWindow[jobId] = window;
        emit DisputeWindowSet(jobId, window);
    }

    function setNonResponsiveSlashBP(uint256 jobId, uint256 slashBP) external onlyClient(jobId) {
        if (jobs[jobId].status != JobStatus.Funded) revert WrongStatus();
        if (slashBP > 1000) revert BudgetTooHigh(); // Max 10%
        jobNonResponsiveSlashBP[jobId] = slashBP;
        emit NonResponsiveSlashSet(jobId, slashBP);
    }

    function reject(uint256 jobId, bytes32 reason) external nonReentrant {
        Job storage job = jobs[jobId];
        if (job.id == 0) revert InvalidJob();

        JobStatus oldStatus = job.status;
        
        if (job.status == JobStatus.Open) {
            if (job.client != _msgSender()) revert Unauthorized();
        } else if (job.status == JobStatus.Funded || job.status == JobStatus.Submitted) {
            if (job.evaluator != _msgSender()) revert Unauthorized();
        } else {
            revert WrongStatus();
        }

        uint256 refundAmount = job.budget;
        job.budget = 0;
        job.status = JobStatus.Rejected;
        
        _decrementJobCount(jobId);
        
        if (oldStatus == JobStatus.Funded || oldStatus == JobStatus.Submitted) {
            _transferPayment(job.paymentToken, job.client, refundAmount);
            emit Refunded(jobId, job.client, refundAmount);
        }

        emit JobRejected(jobId, _msgSender(), reason);
        emit JobStatusChanged(jobId, oldStatus, JobStatus.Rejected, _msgSender(), block.timestamp);
    }

    function claimRefund(uint256 jobId) external nonReentrant onlyClient(jobId) {
        Job storage job = jobs[jobId];
        if (job.id == 0) revert InvalidJob();
        if (job.status != JobStatus.Funded && job.status != JobStatus.Submitted) revert WrongStatus();
        if (block.timestamp < job.expiredAt) revert WrongStatus();

        JobStatus oldStatus = job.status;
        uint256 refundAmount = job.budget;
        job.budget = 0;
        job.status = JobStatus.Expired;
        
        _decrementJobCount(jobId);
        
        _transferPayment(job.paymentToken, _msgSender(), refundAmount);
        
        emit Refunded(jobId, _msgSender(), refundAmount);
        emit JobExpired(jobId);
        emit JobStatusChanged(jobId, oldStatus, JobStatus.Expired, _msgSender(), block.timestamp);
    }
    
    /**
     * @dev M5 Fix: Permissionless refund - anyone can trigger refund for expired jobs
     * Refund goes to original client, not the caller
     */
    function refundExpired(uint256 jobId) external nonReentrant {
        Job storage job = jobs[jobId];
        if (job.id == 0) revert InvalidJob();
        if (job.status != JobStatus.Funded && job.status != JobStatus.Submitted) revert WrongStatus();
        if (block.timestamp < job.expiredAt) revert WrongStatus();
        
        address client = job.client;
        require(client != address(0), "No client");

        JobStatus oldStatus = job.status;
        uint256 refundAmount = job.budget;
        job.budget = 0;
        job.status = JobStatus.Expired;
        
        _decrementJobCount(jobId);
        
        _transferPayment(job.paymentToken, client, refundAmount);
        
        emit PermissionlessRefund(jobId, client, _msgSender(), refundAmount);
        emit Refunded(jobId, client, refundAmount);
        emit JobExpired(jobId);
        emit JobStatusChanged(jobId, oldStatus, JobStatus.Expired, _msgSender(), block.timestamp);
    }

    /***********************************/
    /* Bidding Functions - DISABLED */
    /***********************************/
    
    function calculateStake(uint256) public pure returns (uint256) { revert("Bidding disabled"); }
    function commitBid(uint256, bytes32) external payable { revert("Bidding disabled"); }
    function revealBid(uint256, uint256, string calldata, bytes32) external { revert("Bidding disabled"); }
    function acceptBid(uint256, uint256) external { revert("Bidding disabled"); }
    function withdrawStake(uint256) external { revert("Bidding disabled"); }
    function getUserBid(uint256, address) external pure returns (Bid memory) {
        return Bid({bidId: 0, bidder: address(0), proposedAmount: 0, stake: 0, message: "", commitHash: bytes32(0), revealed: false, accepted: false, withdrawn: false, timestamp: 0});
    }

    /***********************************/
    /* Helper Functions */
    /***********************************/
    
    function _transferPayment(IERC20 token, address to, uint256 amount) internal {
        if (address(token) == address(0)) {
            payable(to).transfer(amount);
        } else {
            token.safeTransfer(to, amount);
        }
    }

    function _decrementJobCount(uint256 jobId) internal {
        address client = jobClient[jobId];
        if (client != address(0) && clientJobCount[client] > 0) {
            clientJobCount[client]--;
        }
    }

    /***********************************/
    /* View Functions */
    /***********************************/
    
    function getJob(uint256 jobId) external view returns (Job memory) {
        if (jobId == 0 || jobId > jobCounter) revert InvalidJob();
        return jobs[jobId];
    }
    
    function getClientJobCount(address client) external view returns (uint256) {
        return clientJobCount[client];
    }

    function isEvaluatorFeeEnabled(uint256 jobId) external view returns (bool) {
        return evaluatorFeeEnabled[jobId];
    }

    /***********************************/
    /* Admin Functions */
    /***********************************/
    
    function setPlatformTreasury(address treasury) external onlyOwner {
        if (treasury == address(0)) revert ZeroAddress();
        platformTreasury = treasury;
    }
    
    // M5 Fix: Register as evaluator
    function registerAsEvaluator() external {
        require(!isRegisteredEvaluator[msg.sender], "Already registered");
        evaluatorPool.push(msg.sender);
        isRegisteredEvaluator[msg.sender] = true;
        emit EvaluatorRegistered(msg.sender);
    }
    
    // M5 Fix: Unregister as evaluator
    function unregisterAsEvaluator() external {
        require(isRegisteredEvaluator[msg.sender], "Not registered");
        isRegisteredEvaluator[msg.sender] = false;
        emit EvaluatorUnregistered(msg.sender);
    }
    
    // M5 Fix: Random evaluator selection using block-based randomness
    function _selectRandomEvaluator() internal returns (address evaluator) {
        require(evaluatorPool.length > 0, "No evaluators available");
        uint256 randomIndex = uint256(keccak256(abi.encodePacked(
            blockhash(block.number - 1),
            block.timestamp,
            msg.sender
        ))) % evaluatorPool.length;
        return evaluatorPool[randomIndex];
    }
    
    /**
     * @dev Get evaluator pool size
     */
    function getEvaluatorPoolSize() external view returns (uint256) {
        return evaluatorPool.length;
    }
    
    // M5 Fix: Create job with random evaluator selection
    function createJobWithRandomEvaluator(
        address provider,
        uint256 expiredAt,
        string calldata description,
        address hook,
        bool evaluatorFee
    ) external nonReentrant whenNotPaused returns (uint256 jobId) {
        // First create the job with address(0) as evaluator placeholder
        _validateJobCreation(provider, address(0), expiredAt, description, hook);
        
        if (clientJobCount[_msgSender()] >= MAX_JOBS_PER_CLIENT) {
            emit JobLimitExceeded(_msgSender(), clientJobCount[_msgSender()] + 1, MAX_JOBS_PER_CLIENT);
            revert MaxJobsPerClient(_msgSender(), clientJobCount[_msgSender()]);
        }
        
        jobId = ++jobCounter;
        jobs[jobId] = Job({
            id: jobId,
            client: _msgSender(),
            provider: provider,
            evaluator: address(0), // Will be set randomly
            serviceId: 0,
            paymentToken: IERC20(address(0)),
            description: description,
            budget: 0,
            expiredAt: expiredAt,
            status: JobStatus.Open,
            hook: hook,
            deliverable: bytes32(0)
        });
        
        evaluatorFeeEnabled[jobId] = evaluatorFee;
        jobClient[jobId] = _msgSender();
        clientJobCount[_msgSender()]++;
        
        // Randomly select evaluator
        address randomEvaluator = _selectRandomEvaluator();
        jobs[jobId].evaluator = randomEvaluator;
        
        emit JobCreated(jobId, _msgSender(), provider, 0, expiredAt);
        emit EvaluatorRandomlySelected(jobId, randomEvaluator);
    }

    /***********************************/
    /* Events */
    /***********************************/
    
    event TokenAllowlistUpdated(address indexed token, bool allowed);
    event EvaluatorRegistered(address indexed evaluator);
    event EvaluatorUnregistered(address indexed evaluator);
    event EvaluatorRandomlySelected(uint256 indexed jobId, address indexed evaluator);

    /// @dev Storage gap for upgrade safety
    uint256[50] private __gap;
}

// FILE: contracts/shared/AgenticCommerceV9.sol

// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IACPHook} from "./IACPHook.sol";
import {IAgenticCommerceV9} from "../interfaces/IAgenticCommerceV9.sol";
import {IPriceOracleV2} from "../interfaces/IPriceOracleV2.sol";
import {AdminRegistry} from "./AdminRegistry.sol";

/**
 * @title AgenticCommerceV9
 * @dev UUPS Upgradeable Agentic Commerce Protocol V9
 * 
 * V9 Changes:
 * - Multi-token minimum budget support (configurable per token)
 * - Owner-changeable minBudgetUsd baseline
 * - Per-token minimum budget overrides
 * - Stablecoin detection for USD-denominated minimums
 * - Removed hardcoded MIN_BUDGET_USDC/MIN_BUDGET_ETH constants
 * - Removed redundant MIN_ETH_PAYMENT check
 */
contract AgenticCommerceV9 is 
    IAgenticCommerceV9, 
    ContextUpgradeable,
    Ownable2StepUpgradeable, 
    UUPSUpgradeable, 
    PausableUpgradeable,
    ReentrancyGuard
{
    using SafeERC20 for IERC20;

    /***********************************/
    /* Constants */
    /***********************************/
    
    uint256 public constant FEE_DENOMINATOR = 10000;
    uint256 public constant EVALUATOR_FEE_BP = 100; // 1%
    
    uint256 public constant MAX_JOBS_PER_CLIENT = 100;
    uint256 public constant MAX_DESCRIPTION_LENGTH = 1000;
    uint256 public constant MIN_EXPIRY_DURATION = 5 minutes;
    uint256 public constant MAX_EXPIRY_DURATION = 365 days;
    uint256 public constant DEFAULT_DISPUTE_WINDOW = 7 days;
    uint256 public constant DEFAULT_NONRESPONSIVE_SLASH_BP = 100;
    uint256 public constant MAX_BUDGET_USD = 1_000_000e6; // $1M USD (6 decimals)
    uint256 public constant EVALUATOR_REVEAL_DELAY = 6; // 6 blocks commit-reveal delay
    uint256 public constant MIN_PLATFORM_FEE = 1; // M2-01: Minimum 1 wei platform fee to prevent dust loss

    /***********************************/
    /* State Variables */
    /***********************************/
    
    // V9: Multi-token minimum budget configuration
    uint256 public minBudgetUsd; // Base minimum in 6-decimal USD terms ($5 = 5e6)
    uint256 public maxBudgetUsd; // Max budget in 6-decimal USD terms ($1M = 1_000_000e6)
    mapping(address => uint256) public minBudgetOverride; // Per-token override (0 = use default)
    mapping(address => bool) public isStablecoin; // True for stablecoins (1:1 with USD)
    
    address public platformTreasury;
    address public adminRegistry;
    IPriceOracleV2 public priceOracle; // V9: Price oracle for dynamic minimums

    mapping(uint256 => Job) public jobs;
    uint256 public jobCounter;
    
    mapping(address => uint256) public clientJobCount;
    mapping(uint256 => address) public jobClient;

    mapping(uint256 => bool) public evaluatorFeeEnabled;
    mapping(uint256 => bool) public requiresClientReview;
    mapping(uint256 => bool) public clientApproved;
    mapping(uint256 => uint256) public clientApprovedAt;
    mapping(uint256 => uint256) public jobDisputeWindow;
    mapping(uint256 => uint256) public jobNonResponsiveSlashBP;
    mapping(uint256 => uint256) public jobSubmittedAt;

    mapping(address => bool) public allowedTokens;
    
    // M-03: Track total ETH locked in escrow across all jobs
    uint256 public totalLockedETH;
    
    // Evaluator pool for random selection
    address[] public evaluatorPool;
    mapping(address => bool) public isRegisteredEvaluator;
    mapping(address => uint256) public evaluatorStakes; // A3-01: ETH stake per evaluator
    
    // Commit-reveal for random evaluator selection (A3-02/F8-01)
    struct EvaluatorCommit {
        bytes32 commitHash;
        uint256 commitBlock;
        bool revealed;
    }
    mapping(uint256 => EvaluatorCommit) public evaluatorCommits;
    mapping(uint256 => uint256) public jobCreationBlock;

    /***********************************/
    /* Errors */
    /***********************************/
    
    error InvalidJob();
    error WrongStatus();
    error Unauthorized();
    error OnlySlashManager();
    error SlashManagerNotSet();
    error ZeroAddress();
    error ExpiryTooShort();
    error ExpiryTooLong();
    error ZeroBudget();
    error BudgetTooLow();
    error BudgetMismatch(uint256 expected, uint256 actual);
    error BudgetTooHigh();
    error ProviderNotSet();
    error InvalidHook();

    error MaxJobsPerClient(address client, uint256 current);
    error TokenNotAllowed(address token);
    error TokenNotConfigured(address token);
    error ClientNotApproved();
    error InsufficientPayment();
    error RolesMustBeDistinct();
    error InvalidPrice();
    error EvaluatorAlreadyRegistered();
    error EvaluatorNotRegistered();
    error NoEvaluatorsAvailable();
    error InsufficientEvaluatorStake();
    error EvaluatorNotRevealed();
    error RevealTooEarly();
    error NoCommitFound();
    error InvalidCommit();
    error BlockhashUnavailable();
    error NoActiveEvaluators();
    error ClientBlacklisted();
    error ProviderBlacklisted();
    error EvaluatorBlacklisted();
    error JobNotExpired();
    error DisputeWindowTooShort();
    error DisputeWindowTooLong();
    error SlashBPTooHigh();
    error DecimalsQueryFailed(address token);
    error InvalidDecimals(address token, uint8 decimals);
    error EthTransferFailed();
    error RefundFailed();
    error StakeRefundFailed();
    error StakeTransferFailed();

    /***********************************/
    /* Modifiers */
    /***********************************/
    
    modifier onlyClient(uint256 jobId) {
        if (jobs[jobId].client != _msgSender()) revert Unauthorized();
        _;
    }
    
    modifier onlyProvider(uint256 jobId) {
        if (jobs[jobId].provider != _msgSender()) revert Unauthorized();
        _;
    }
    
    modifier onlyEvaluator(uint256 jobId) {
        if (jobs[jobId].evaluator != _msgSender()) revert Unauthorized();
        _;
    }
    
    modifier onlyAllowedToken(address token) {
        if (!_isTokenAllowed(token)) revert TokenNotAllowed(token);
        _;
    }

    /***********************************/
    /* Initialize */
    /***********************************/

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    function initialize(address _platformTreasury, address _adminRegistry, address _priceOracle) external initializer {
        if (_platformTreasury == address(0)) revert ZeroAddress();
        if (_priceOracle == address(0)) revert ZeroAddress();
        
        __Context_init();
        __Ownable_init(_msgSender());
        __Pausable_init();
        
        platformTreasury = _platformTreasury;
        adminRegistry = _adminRegistry;
        priceOracle = IPriceOracleV2(_priceOracle);
        
        // V9: Default minimum budget $5 USD, max $1M USD
        minBudgetUsd = 5e6;
        maxBudgetUsd = MAX_BUDGET_USD;

        // Default evaluator stake
        minEvaluatorStake = 0.01 ether;

        // Default allowed tokens
        allowedTokens[address(0)] = true; // Native ETH
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /***********************************/
    /* V9: Multi-Token Budget Minimums */
    /***********************************/
    
    /**
     * @dev Check if budget exceeds the maximum allowed in USD terms.
     * @param token The payment token address.
     * @param decimals The token's decimal places.
     * @param budget The budget amount in token's native units.
     */
    function _checkMaxBudget(address token, uint8 decimals, uint256 budget) internal view {
        if (maxBudgetUsd == 0) return;
        if (decimals < 6) decimals = 6;

        uint256 budgetInUsd;
        if (isStablecoin[token]) {
            budgetInUsd = budget / (10 ** (decimals - 6));
        } else if (token == address(0)) {
            int256 ethPrice = priceOracle.getUsdPriceOfToken(address(0));
            if (ethPrice <= 0) return;
            budgetInUsd = (budget * uint256(ethPrice)) / (10 ** decimals) / 100;
        } else {
            int256 tokenPrice = priceOracle.getUsdPriceOfToken(token);
            if (tokenPrice <= 0) return;
            budgetInUsd = (budget * uint256(tokenPrice)) / (10 ** decimals) / 100;
        }

        if (budgetInUsd > maxBudgetUsd) revert BudgetTooHigh();
    }

    /**
     * @dev Calculate the minimum budget for a specific token
     * @param token The payment token address (address(0) for ETH)
     * @param decimals The token's decimal places
     * @return The minimum budget amount in the token's native units
     */
    function getMinBudget(address token, uint8 decimals) public view returns (uint256) {
        if (minBudgetOverride[token] > 0) {
            return minBudgetOverride[token];
        }
        
        if (decimals < 6) decimals = 6;
        
        if (isStablecoin[token]) {
            return minBudgetUsd * (10 ** (decimals - 6));
        }
        
        if (token == address(0)) {
            int256 ethPrice = priceOracle.getUsdPriceOfToken(address(0));
            if (ethPrice <= 0) revert InvalidPrice();
            return (minBudgetUsd * (10 ** (decimals - 6)) * 1e8) / uint256(ethPrice);
        }
        
        int256 tokenPrice = priceOracle.getUsdPriceOfToken(token);
        if (tokenPrice > 0) {
            return (minBudgetUsd * (10 ** (decimals - 6)) * 1e8) / uint256(tokenPrice);
        }
        
        revert InvalidPrice();
    }
    
    /**
     * @dev Set the global minimum budget in USD (6 decimals).
     * @param newMin New minimum budget in USD (e.g., 5e6 for $5).
     */
    function setMinBudgetUsd(uint256 newMin) external onlyOwner {
        if (newMin < 1e6) revert InvalidJob();
        uint256 oldMin = minBudgetUsd;
        minBudgetUsd = newMin;
        emit MinBudgetChanged(address(0), oldMin, newMin);
    }

    /**
     * @dev Set the global maximum budget in USD (6 decimals).
     * @param newMax New maximum budget in USD (e.g., 1_000_000e6 for $1M).
     * Setting to 0 means no maximum (unlimited).
     */
    function setMaxBudgetUsd(uint256 newMax) external onlyOwner {
        if (newMax > 0 && newMax < minBudgetUsd) revert InvalidJob();
        uint256 oldMax = maxBudgetUsd;
        maxBudgetUsd = newMax;
        emit MaxBudgetChanged(oldMax, newMax);
    }

    /**
     * @dev Set a per-token minimum budget override.
     * @param token Token address.
     * @param minAmount Minimum amount in token's native units (0 = remove override).
     */
    function setMinBudgetOverride(address token, uint256 minAmount) external onlyOwner {
        minBudgetOverride[token] = minAmount;
        emit MinBudgetOverrideChanged(token, minAmount);
    }

    /**
     * @dev Mark a token as stablecoin (1:1 with USD) for minimum budget calculation.
     * @param token Token address.
     * @param isStable True if token is a stablecoin.
     */
    function setStablecoin(address token, bool isStable) external onlyOwner {
        isStablecoin[token] = isStable;
        emit StablecoinStatusChanged(token, isStable);
    }

    /***********************************/
    /* Token Management */
    /***********************************/
    
    /**
     * @dev Allow or disallow a payment token.
     * @param token Token address.
     * @param allowed True to allow, false to disallow.
     */
    function setAllowedToken(address token, bool allowed) external onlyOwner {
        allowedTokens[token] = allowed;
        emit TokenAllowlistUpdated(token, allowed);
    }

    /**
     * @dev Set the minimum evaluator stake. Owner-configurable per chain.
     * @param newStake New minimum stake in native currency wei
     */
    function setMinEvaluatorStake(uint256 newStake) external onlyOwner {
        uint256 oldStake = minEvaluatorStake;
        minEvaluatorStake = newStake;
        emit MinEvaluatorStakeChanged(oldStake, newStake);
    }

    function _isTokenAllowed(address token) internal view returns (bool) {
        if (token == address(0)) return true;
        return allowedTokens[token];
    }

    /***********************************/
    /* Core Job Functions - V9 Enhanced */
    /***********************************/
    
    /**
     * @dev V9: Create job with multi-token budget validation
     */
    function createJob(
        address provider,
        uint256 budget,
        address paymentToken,
        uint256 serviceId,
        uint256 expiredAt,
        string calldata description,
        address evaluator,
        address hook,
        bool evaluatorFee,
        bool clientReview_,
        bool fundNow,
        uint256 fundAmount
    ) external payable nonReentrant whenNotPaused returns (uint256 jobId) {
        return _createJob(
            _msgSender(),
            provider,
            budget,
            paymentToken,
            serviceId,
            expiredAt,
            description,
            evaluator,
            hook,
            evaluatorFee,
            clientReview_,
            fundNow,
            fundAmount
        );
    }

    function createJobForClient(
        address client,
        address provider,
        uint256 budget,
        address paymentToken,
        uint256 serviceId,
        uint256 expiredAt,
        string calldata description,
        address evaluator,
        address hook,
        bool evaluatorFee,
        bool clientReview_,
        bool fundNow,
        uint256 fundAmount
    ) external payable nonReentrant whenNotPaused returns (uint256 jobId) {
        return _createJob(
            client,
            provider,
            budget,
            paymentToken,
            serviceId,
            expiredAt,
            description,
            evaluator,
            hook,
            evaluatorFee,
            clientReview_,
            fundNow,
            fundAmount
        );
    }

    function _createJob(
        address client,
        address provider,
        uint256 budget,
        address paymentToken,
        uint256 serviceId,
        uint256 expiredAt,
        string calldata description,
        address evaluator,
        address hook,
        bool evaluatorFee,
        bool clientReview_,
        bool fundNow,
        uint256 fundAmount
    ) internal returns (uint256 jobId) {
        // Validate inputs
        _validateJobCreation(client, provider, evaluator, expiredAt, description, hook);
        if (_msgSender() != client && !authorizedJobCreators[_msgSender()]) revert Unauthorized();
        
        if (!_isTokenAllowed(paymentToken)) revert TokenNotAllowed(paymentToken);
        
        if (msg.value > 0 && !fundNow) revert InvalidJob();
        
        // Validate budget using multi-token minimum and maximum
        if (budget == 0) revert ZeroBudget();
        uint8 decimals = _getTokenDecimals(paymentToken);
        uint256 minBudget = getMinBudget(paymentToken, decimals);
        if (budget < minBudget) revert BudgetTooLow();
        _checkMaxBudget(paymentToken, decimals, budget);
        
        // Blacklist check with P7-01 try/catch
        if (adminRegistry != address(0)) {
            try AdminRegistry(adminRegistry).isWalletBlacklistedActive(client) returns (bool isBlacklisted) {
                if (isBlacklisted) revert ClientBlacklisted();
            } catch {
                emit BlacklistCheckFailed(adminRegistry);
                if (blacklistCheckRequired) revert();
            }
            try AdminRegistry(adminRegistry).isWalletBlacklistedActive(provider) returns (bool isBlacklisted) {
                if (isBlacklisted) revert ProviderBlacklisted();
            } catch {
                emit BlacklistCheckFailed(adminRegistry);
                if (blacklistCheckRequired) revert();
            }
            if (evaluator != address(0)) {
                try AdminRegistry(adminRegistry).isWalletBlacklistedActive(evaluator) returns (bool isBlacklisted) {
                    if (isBlacklisted) revert EvaluatorBlacklisted();
                } catch {
                    emit BlacklistCheckFailed(adminRegistry);
                    if (blacklistCheckRequired) revert();
                }
            }
        }

        if (clientJobCount[client] >= MAX_JOBS_PER_CLIENT) {
            revert MaxJobsPerClient(client, clientJobCount[client]);
        }

        jobId = ++jobCounter;

        // Determine evaluator - random or specified
        address finalEvaluator = evaluator;
        bool isRandomEvaluator = (evaluator == address(0));
        
        // A3-02/F8-01: Commit-reveal for random evaluator
        // H-02 FIX: Commit to (jobId, block.number) — entropy from blockhash at reveal time
        // block.prevrandao is unknowable until block is sealed, preventing precomputation
        if (isRandomEvaluator) {
            evaluatorCommits[jobId] = EvaluatorCommit({
                commitHash: keccak256(abi.encodePacked(jobId, block.number)),
                commitBlock: block.number,
                revealed: false
            });
            jobCreationBlock[jobId] = block.number;
            finalEvaluator = address(0); // Will be finalized after 6 blocks
        }

        // Set job status based on funding
        JobStatus initialStatus = fundNow ? JobStatus.Funded : JobStatus.Open;
        
        jobs[jobId] = Job({
            id: jobId,
            client: client,
            provider: provider,
            evaluator: finalEvaluator,
            serviceId: serviceId,
            paymentToken: IERC20(paymentToken),
            description: description,
            budget: budget,
            expiredAt: expiredAt,
            status: initialStatus,
            hook: hook,
            deliverable: bytes32(0)
        });
        
        evaluatorFeeEnabled[jobId] = evaluatorFee;
        requiresClientReview[jobId] = clientReview_;
        jobClient[jobId] = client;
        clientJobCount[client]++;
        
        // Handle immediate funding
        if (fundNow) {
            uint256 amountToFund = fundAmount > 0 ? fundAmount : budget;
            if (amountToFund == 0) revert ZeroBudget();
            
            if (paymentToken == address(0)) {
                // Native ETH
                if (msg.value < amountToFund) revert InsufficientPayment();
                
                uint256 excess = msg.value - amountToFund;
                if (excess > 0) {
                    (bool success, ) = payable(_msgSender()).call{value: excess}("");
                    if (!success) revert RefundFailed();
                }
                
                // M-03: Track locked ETH
                totalLockedETH += amountToFund;
            } else {
                // ERC20
                if (msg.value > 0) revert InvalidJob();
                
                IERC20 token = IERC20(paymentToken);
                uint256 allowance = token.allowance(_msgSender(), address(this));
                if (allowance < amountToFund) revert InsufficientPayment();
                
                uint256 balanceBefore = token.balanceOf(address(this));
                token.safeTransferFrom(_msgSender(), address(this), amountToFund);
                uint256 balanceAfter = token.balanceOf(address(this));
                if (balanceAfter - balanceBefore != amountToFund) revert InvalidJob();
            }
            
            emit JobFunded(jobId, _msgSender(), amountToFund);
        }
        
        emit JobCreated(jobId, client, provider, budget, expiredAt, evaluatorFee, clientReview_, isRandomEvaluator);
    }

    /**
     * @dev V7 backward-compatible createJob (no budget, no immediate funding)
     */
    function createJobV7(
        address provider,
        address evaluator,
        uint256 expiredAt,
        string calldata description,
        address hook,
        bool evaluatorFee,
        bool clientReview_
    ) external nonReentrant whenNotPaused returns (uint256 jobId) {
        _validateJobCreation(_msgSender(), provider, evaluator, expiredAt, description, hook);

        // Blacklist check with P7-01 try/catch
        if (adminRegistry != address(0)) {
            try AdminRegistry(adminRegistry).isWalletBlacklistedActive(_msgSender()) returns (bool isBlacklisted) {
                if (isBlacklisted) revert ClientBlacklisted();
            } catch {
                emit BlacklistCheckFailed(adminRegistry);
                if (blacklistCheckRequired) revert();
            }
            try AdminRegistry(adminRegistry).isWalletBlacklistedActive(provider) returns (bool isBlacklisted) {
                if (isBlacklisted) revert ProviderBlacklisted();
            } catch {
                emit BlacklistCheckFailed(adminRegistry);
                if (blacklistCheckRequired) revert();
            }
            if (evaluator != address(0)) {
                try AdminRegistry(adminRegistry).isWalletBlacklistedActive(evaluator) returns (bool isBlacklisted) {
                    if (isBlacklisted) revert EvaluatorBlacklisted();
                } catch {
                    emit BlacklistCheckFailed(adminRegistry);
                    if (blacklistCheckRequired) revert();
                }
            }
        }

        if (clientJobCount[_msgSender()] >= MAX_JOBS_PER_CLIENT) {
            revert MaxJobsPerClient(_msgSender(), clientJobCount[_msgSender()]);
        }

        jobId = ++jobCounter;

        address finalEvaluator = evaluator;
        bool isRandomEvaluator = (evaluator == address(0));
        if (isRandomEvaluator) {
            evaluatorCommits[jobId] = EvaluatorCommit({
                commitHash: keccak256(abi.encodePacked(jobId, block.number)),
                commitBlock: block.number,
                revealed: false
            });
            jobCreationBlock[jobId] = block.number;
            finalEvaluator = address(0);
        }

        jobs[jobId] = Job({
            id: jobId,
            client: _msgSender(),
            provider: provider,
            evaluator: finalEvaluator,
            serviceId: 0,
            paymentToken: IERC20(address(0)),
            description: description,
            budget: 0,
            expiredAt: expiredAt,
            status: JobStatus.Open,
            hook: hook,
            deliverable: bytes32(0)
        });
        
        evaluatorFeeEnabled[jobId] = evaluatorFee;
        requiresClientReview[jobId] = clientReview_;
        jobClient[jobId] = _msgSender();
        clientJobCount[_msgSender()]++;

        emit JobCreated(jobId, _msgSender(), provider, 0, expiredAt, evaluatorFee, clientReview_, isRandomEvaluator);
    }

    /***********************************/
    /* Job Management Functions */
    /***********************************/
    
    /**
     * @dev Set the budget for an Open job.
     * @param jobId The job ID.
     * @param amount New budget amount in token's native units.
     */
    function setBudget(uint256 jobId, uint256 amount) external nonReentrant onlyClient(jobId) {
        Job storage job = jobs[jobId];
        if (job.id == 0) revert InvalidJob();
        if (job.status != JobStatus.Open) revert WrongStatus();
        if (amount == 0) revert ZeroBudget();

        // V9: Validate against token-specific minimum and maximum
        address paymentToken = address(job.paymentToken);
        uint8 decimals = _getTokenDecimals(paymentToken);
        uint256 minBudget = getMinBudget(paymentToken, decimals);
        if (amount < minBudget) revert BudgetTooLow();
        _checkMaxBudget(paymentToken, decimals, amount);

        uint256 oldBudget = job.budget;
        job.budget = amount;

        emit JobBudgetUpdated(jobId, oldBudget, amount);
    }

    /**
     * @dev Change the payment token for an Open job.
     * @param jobId The job ID.
     * @param paymentToken New payment token address.
     */
    function setPaymentToken(uint256 jobId, address paymentToken) external onlyAllowedToken(paymentToken) onlyClient(jobId) {
        Job storage job = jobs[jobId];
        if (job.id == 0) revert InvalidJob();
        if (job.status != JobStatus.Open) revert WrongStatus();

        address oldToken = address(job.paymentToken);
        job.paymentToken = IERC20(paymentToken);

        emit JobPaymentTokenUpdated(jobId, oldToken, paymentToken);
    }

    /**
     * @dev Fund an Open job. Client transfers budget to contract.
     * @param jobId The job ID to fund.
     * @param expectedBudget Expected budget (front-running protection, 0 to skip).
     */
    function fund(uint256 jobId, uint256 expectedBudget) external payable nonReentrant onlyClient(jobId) {
        Job storage job = jobs[jobId];
        if (job.id == 0) revert InvalidJob();
        if (job.status != JobStatus.Open) revert WrongStatus();
        if (job.provider == address(0)) revert ProviderNotSet();
        if (job.budget == 0) revert ZeroBudget();
        if (block.timestamp >= job.expiredAt) revert InvalidJob();
        
        uint256 cachedBudget = job.budget;
        if (expectedBudget != 0 && cachedBudget != expectedBudget) {
            revert BudgetMismatch(expectedBudget, cachedBudget);
        }
        
        JobStatus oldStatus = job.status;
        job.status = JobStatus.Funded;
        
        if (job.hook != address(0)) {
            try IACPHook(job.hook).beforeAction(jobId, this.fund.selector, "") {
                // hook succeeded
            } catch {
                emit HookFailed(jobId, this.fund.selector);
            }
        }
        
        if (address(job.paymentToken) == address(0)) {
            if (msg.value < cachedBudget) revert BudgetTooLow();
            
            uint256 excess = msg.value - cachedBudget;
            if (excess > 0) {
                (bool successExcess, ) = payable(_msgSender()).call{value: excess}("");
                if (!successExcess) revert EthTransferFailed();
            }
            
            // M-03: Track locked ETH
            totalLockedETH += cachedBudget;
        } else {
            if (msg.value != 0) revert InvalidJob();
            uint256 balanceBefore = job.paymentToken.balanceOf(address(this));
            job.paymentToken.safeTransferFrom(_msgSender(), address(this), cachedBudget);
            uint256 balanceAfter = job.paymentToken.balanceOf(address(this));
            if (balanceAfter - balanceBefore != cachedBudget) revert InvalidJob();
        }
        
        emit JobFunded(jobId, _msgSender(), cachedBudget);
        emit JobStatusChanged(jobId, oldStatus, JobStatus.Funded, _msgSender(), block.timestamp);
    }

    /**
     * @dev Submit work deliverable for a Funded job.
     * @param jobId The job ID.
     * @param deliverable Hash of the deliverable.
     */
    function submit(uint256 jobId, bytes32 deliverable) external nonReentrant onlyProvider(jobId) {
        Job storage job = jobs[jobId];
        if (job.id == 0) revert InvalidJob();
        if (job.status != JobStatus.Funded) revert WrongStatus();

        JobStatus oldStatus = job.status;
        
        if (requiresClientReview[jobId]) {
            job.status = JobStatus.PendingClientApproval;
        } else {
            job.status = JobStatus.Submitted;
        }
        
        job.deliverable = deliverable;
        jobSubmittedAt[jobId] = block.timestamp;
        
        // Hook before any external calls
        if (job.hook != address(0)) {
            try IACPHook(job.hook).beforeAction(jobId, this.submit.selector, "") {
                // hook succeeded
            } catch {
                emit HookFailed(jobId, this.submit.selector);
            }
        }
        
        emit JobSubmitted(jobId, _msgSender(), deliverable);
        emit JobStatusChanged(jobId, oldStatus, job.status, _msgSender(), block.timestamp);
    }

    /**
     * @dev Approve submitted work by client (required when clientReview is enabled).
     * @param jobId The job ID to approve.
     */
    function approveByClient(uint256 jobId) external nonReentrant onlyClient(jobId) {
        Job storage job = jobs[jobId];
        if (job.id == 0) revert InvalidJob();
        if (job.status != JobStatus.PendingClientApproval) revert WrongStatus();
        if (!requiresClientReview[jobId]) revert ClientNotApproved(); // Explicit defense-in-depth

        clientApproved[jobId] = true;
        clientApprovedAt[jobId] = block.timestamp;
        job.status = JobStatus.Submitted;

        emit JobStatusChanged(jobId, JobStatus.PendingClientApproval, JobStatus.Submitted, _msgSender(), block.timestamp);
    }

    /**
     * @dev Finalize a Submitted job and release payment (evaluator only).
     * @param jobId The job ID.
     * @param reason Finalization reason.
     */
    function finalizeByEvaluator(uint256 jobId, bytes32 reason) external nonReentrant onlyEvaluator(jobId) {
        Job storage job = jobs[jobId];
        if (job.id == 0) revert InvalidJob();
        if (job.status != JobStatus.Submitted) revert WrongStatus();
        
        // If client review was required, verify it's approved
        if (requiresClientReview[jobId] && !clientApproved[jobId]) revert ClientNotApproved();
        
        _releasePayment(jobId, reason);
    }

    function _releasePayment(uint256 jobId, bytes32 /* reason */) internal {
        Job storage job = jobs[jobId];
        JobStatus oldStatus = job.status;
        job.status = JobStatus.Completed;

        uint256 amount = job.budget;
        job.budget = 0;

        // Decrement active job count for the client
        _decrementJobCount(jobId);

        // M-03: Decrement locked ETH if payment token is ETH
        if (address(job.paymentToken) == address(0)) {
            totalLockedETH -= amount;
        }

        // Calculate fees with M2-01 minimum fee floor
        uint256 platformFee = (amount * 100) / FEE_DENOMINATOR; // 1%
        if (platformFee > 0 && platformFee < MIN_PLATFORM_FEE) platformFee = MIN_PLATFORM_FEE;
        uint256 evaluatorFeeAmount = evaluatorFeeEnabled[jobId] ? (amount * EVALUATOR_FEE_BP) / FEE_DENOMINATOR : 0;
        uint256 providerPayment = amount - platformFee - evaluatorFeeAmount;

        // Hook before transfers (prevents reentrancy after state changes)
        if (job.hook != address(0)) {
            try IACPHook(job.hook).beforeAction(jobId, this.finalizeByEvaluator.selector, "") {
                // hook succeeded
            } catch {
                emit HookFailed(jobId, this.finalizeByEvaluator.selector);
            }
        }

        // Transfer payments
        _transferPayment(job.paymentToken, platformTreasury, platformFee);

        if (evaluatorFeeAmount > 0) {
            _transferPayment(job.paymentToken, job.evaluator, evaluatorFeeAmount);
        }

        _transferPayment(job.paymentToken, job.provider, providerPayment);

        // V2 Fix: Service bond is no longer auto-refunded on job completion.
        // Bonds are provider-controlled via ServiceRegistryV2.withdrawServiceBond() after deactivation + cooldown.

        emit PaymentReleased(jobId, providerPayment, platformFee, evaluatorFeeAmount);
        emit JobStatusChanged(jobId, oldStatus, JobStatus.Completed, _msgSender(), block.timestamp);
    }

    /**
     * @dev Decrement client's active job count.
     * @param jobId The job ID to decrement count for.
     */
    function _decrementJobCount(uint256 jobId) internal {
        address client = jobClient[jobId];
        if (client != address(0) && clientJobCount[client] > 0) {
            clientJobCount[client]--;
        }
    }

    function _transferPayment(IERC20 token, address to, uint256 amount) internal {
        if (amount == 0) return;
        if (to == address(0)) revert ZeroAddress();
        if (address(token) == address(0)) {
            (bool success, ) = payable(to).call{value: amount}("");
            if (!success) revert EthTransferFailed();
        } else {
            token.safeTransfer(to, amount);
        }
    }

    /***********************************/
    /* Job Recovery / Timeout Functions */
    /***********************************/

    /**
     * @dev Reject a job. Client can reject Open jobs; Evaluator can reject Funded/Submitted jobs.
     * @param jobId The job ID to reject.
     * @param reason Reason for rejection.
     */
    function reject(uint256 jobId, bytes32 reason) external nonReentrant whenNotPaused {
        Job storage job = jobs[jobId];
        if (job.id == 0) revert InvalidJob();

        JobStatus oldStatus = job.status;

        if (job.status == JobStatus.Open) {
            if (job.client != _msgSender()) revert Unauthorized();
        } else if (job.status == JobStatus.Funded || job.status == JobStatus.Submitted || job.status == JobStatus.PendingClientApproval) {
            if (job.evaluator != _msgSender()) revert Unauthorized();
        } else {
            revert WrongStatus();
        }

        uint256 refundAmount = job.budget;
        job.budget = 0;
        job.status = JobStatus.Rejected;

        _decrementJobCount(jobId);

        if (oldStatus == JobStatus.Funded || oldStatus == JobStatus.Submitted || oldStatus == JobStatus.PendingClientApproval) {
            // M-03: Decrement locked ETH if payment token is ETH
            if (address(job.paymentToken) == address(0)) {
                totalLockedETH -= refundAmount;
            }
            _transferPayment(job.paymentToken, job.client, refundAmount);
            emit Refunded(jobId, job.client, refundAmount);
        }

        emit JobRejected(jobId, _msgSender(), reason);
        emit JobStatusChanged(jobId, oldStatus, JobStatus.Rejected, _msgSender(), block.timestamp);
    }

    /**
     * @dev Claim refund for an expired job (client only).
     * @param jobId The job ID to claim refund for.
     */
    function claimRefund(uint256 jobId) external nonReentrant onlyClient(jobId) whenNotPaused {
        Job storage job = jobs[jobId];
        if (job.id == 0) revert InvalidJob();
        if (job.status != JobStatus.Funded && job.status != JobStatus.Submitted && job.status != JobStatus.PendingClientApproval) revert WrongStatus();
        if (block.timestamp < job.expiredAt) revert JobNotExpired();

        JobStatus oldStatus = job.status;
        uint256 refundAmount = job.budget;
        if (refundAmount == 0) revert ZeroBudget(); // I6-02: explicit budget check
        job.budget = 0;
        job.status = JobStatus.Expired;

        _decrementJobCount(jobId);

        // M-03: Decrement locked ETH if payment token is ETH
        if (address(job.paymentToken) == address(0)) {
            totalLockedETH -= refundAmount;
        }

        _transferPayment(job.paymentToken, _msgSender(), refundAmount);

        emit Refunded(jobId, _msgSender(), refundAmount);
        emit JobExpired(jobId);
        emit JobStatusChanged(jobId, oldStatus, JobStatus.Expired, _msgSender(), block.timestamp);
    }

    /**
     * @dev Permissionless refund for expired jobs. Anyone can trigger.
     * @param jobId The job ID to refund.
     */
    function refundExpired(uint256 jobId) external nonReentrant whenNotPaused {
        Job storage job = jobs[jobId];
        if (job.id == 0) revert InvalidJob();
        if (job.status != JobStatus.Funded && job.status != JobStatus.Submitted && job.status != JobStatus.PendingClientApproval) revert WrongStatus();
        if (block.timestamp < job.expiredAt) revert JobNotExpired();

        address client = job.client;
        if (client == address(0)) revert InvalidJob();

        JobStatus oldStatus = job.status;
        uint256 refundAmount = job.budget;
        job.budget = 0;
        job.status = JobStatus.Expired;

        _decrementJobCount(jobId);

        // M-03: Decrement locked ETH if payment token is ETH
        if (address(job.paymentToken) == address(0)) {
            totalLockedETH -= refundAmount;
        }

        _transferPayment(job.paymentToken, client, refundAmount);

        emit PermissionlessRefund(jobId, client, _msgSender(), refundAmount);
        emit Refunded(jobId, client, refundAmount);
        emit JobExpired(jobId);
        emit JobStatusChanged(jobId, oldStatus, JobStatus.Expired, _msgSender(), block.timestamp);
    }

    /**
     * @dev Complete job after evaluator timeout (dispute window passed).
     * Callable by provider or client after dispute window.
     * @param jobId The job ID.
     * @param reason Completion reason.
     */
    function completeAfterTimeout(uint256 jobId, bytes32 reason) external nonReentrant whenNotPaused {
        Job storage job = jobs[jobId];
        if (job.id == 0) revert InvalidJob();
        if (job.status != JobStatus.Submitted && job.status != JobStatus.PendingClientApproval) revert WrongStatus();
        if (job.provider != _msgSender() && job.client != _msgSender()) revert Unauthorized();

        uint256 submittedAt = jobSubmittedAt[jobId];
        if (submittedAt == 0) revert InvalidJob();

        uint256 disputeWindow = jobDisputeWindow[jobId];
        if (disputeWindow == 0) disputeWindow = DEFAULT_DISPUTE_WINDOW;

        if (block.timestamp < submittedAt + disputeWindow) revert WrongStatus();

        // If client review is pending, auto-approve after timeout
        if (job.status == JobStatus.PendingClientApproval) {
            clientApproved[jobId] = true;
        }

        uint256 amount = job.budget;
        uint256 platformFee = (amount * 100) / FEE_DENOMINATOR;
        uint256 slashBP = jobNonResponsiveSlashBP[jobId];
        if (slashBP == 0) slashBP = DEFAULT_NONRESPONSIVE_SLASH_BP;

        uint256 slashAmount = (amount * slashBP) / FEE_DENOMINATOR;
        uint256 net = amount - platformFee - slashAmount;
        address prov = job.provider;
        IERC20 paymentToken = job.paymentToken;

        // CEI: Effects before Interactions
        job.budget = 0;
        job.status = JobStatus.Completed;

        _decrementJobCount(jobId);

        // M-03: Decrement locked ETH if payment token is ETH
        if (address(job.paymentToken) == address(0)) {
            totalLockedETH -= amount;
        }

        if (job.hook != address(0)) {
            try IACPHook(job.hook).beforeAction(jobId, this.completeAfterTimeout.selector, abi.encode(reason)) {
                // hook succeeded
            } catch {
                emit HookFailed(jobId, this.completeAfterTimeout.selector);
            }
        }

        if (platformFee > 0) {
            _transferPayment(paymentToken, platformTreasury, platformFee);
        }
        if (slashAmount > 0) {
            _transferPayment(paymentToken, platformTreasury, slashAmount);
        }
        if (net > 0) {
            _transferPayment(paymentToken, prov, net);
        }

        // V2 Fix: Service bond is no longer auto-refunded on job completion.
        // Bonds are provider-controlled via ServiceRegistryV2.withdrawServiceBond() after deactivation + cooldown.

        emit JobCompleted(jobId, _msgSender(), job.provider, slashAmount);
        emit PaymentReleased(jobId, net, platformFee, slashAmount);
        emit EvaluatorSlashedForInactivity(jobId, job.evaluator, slashAmount);
        emit JobStatusChanged(jobId, JobStatus.Submitted, JobStatus.Completed, _msgSender(), block.timestamp);
    }

    /**
     * @dev Set custom dispute window for a job (client only, before submission).
     * @param jobId The job ID.
     * @param window Dispute window in seconds (min 1 day, max 30 days).
     */
    function setDisputeWindow(uint256 jobId, uint256 window) external onlyClient(jobId) {
        if (jobs[jobId].status != JobStatus.Funded) revert WrongStatus();
        if (window < 1 days || window > 30 days) revert InvalidJob();
        jobDisputeWindow[jobId] = window;
        emit DisputeWindowSet(jobId, window);
    }

    /**
     * @dev Set non-responsive slash basis points for a job (client only, before submission).
     * @param jobId The job ID.
     * @param slashBP Slash percentage in basis points (max 1000 = 10%).
     */
    function setNonResponsiveSlashBP(uint256 jobId, uint256 slashBP) external onlyClient(jobId) {
        if (jobs[jobId].status != JobStatus.Funded) revert WrongStatus();
        if (slashBP > 1000) revert SlashBPTooHigh(); // Max 10%
        jobNonResponsiveSlashBP[jobId] = slashBP;
        emit NonResponsiveSlashSet(jobId, slashBP);
    }

    /***********************************/
    /* Evaluator Pool Functions */
    /***********************************/
    
    /**
     * @dev Register as an evaluator in the random selection pool.
     * A3-01: Requires MIN_EVALUATOR_STAKE (0.01 ETH) to prevent spam.
     */
    function registerAsEvaluator() external payable {
        if (isRegisteredEvaluator[msg.sender]) revert EvaluatorAlreadyRegistered();
        if (msg.value < minEvaluatorStake) revert InsufficientEvaluatorStake();

        // Blacklist check with P7-01 try/catch
        if (adminRegistry != address(0)) {
            try AdminRegistry(adminRegistry).isWalletBlacklistedActive(msg.sender) returns (bool isBlacklisted) {
                if (isBlacklisted) revert EvaluatorBlacklisted();
            } catch {
                // Fail open to prevent DOS
            }
        }

        evaluatorPool.push(msg.sender);
        isRegisteredEvaluator[msg.sender] = true;
        evaluatorStakes[msg.sender] = msg.value;
        emit EvaluatorRegistered(msg.sender);
    }

    /**
     * @dev Unregister as an evaluator. Refunds staked ETH.
     */
    function unregisterAsEvaluator() external {
        if (!isRegisteredEvaluator[msg.sender]) revert EvaluatorNotRegistered();

        // Remove from pool
        for (uint256 i = 0; i < evaluatorPool.length; i++) {
            if (evaluatorPool[i] == msg.sender) {
                evaluatorPool[i] = evaluatorPool[evaluatorPool.length - 1];
                evaluatorPool.pop();
                break;
            }
        }

        isRegisteredEvaluator[msg.sender] = false;
        uint256 stake = evaluatorStakes[msg.sender];
        evaluatorStakes[msg.sender] = 0;
        
        if (stake > 0) {
            (bool success, ) = payable(msg.sender).call{value: stake}("");
            if (!success) revert StakeRefundFailed();
        }
        
        emit EvaluatorUnregistered(msg.sender);
    }
    
    /**
     * @dev Slash an evaluator's stake (owner only).
     * @param evaluator The evaluator to slash.
     * @param reason Reason for slashing.
     */
    function slashEvaluatorStake(address evaluator, string calldata reason) external nonReentrant onlyOwner {
        if (!isRegisteredEvaluator[evaluator]) revert EvaluatorNotRegistered();
        
        uint256 stake = evaluatorStakes[evaluator];
        if (stake == 0) revert InsufficientEvaluatorStake();
        
        // Remove from pool and clear registrations BEFORE external call
        for (uint256 i = 0; i < evaluatorPool.length; i++) {
            if (evaluatorPool[i] == evaluator) {
                evaluatorPool[i] = evaluatorPool[evaluatorPool.length - 1];
                evaluatorPool.pop();
                break;
            }
        }
        
        isRegisteredEvaluator[evaluator] = false;
        evaluatorStakes[evaluator] = 0;
        
        // Transfer slashed stake to platform treasury
        if (platformTreasury != address(0)) {
            (bool success, ) = payable(platformTreasury).call{value: stake}("");
            if (!success) revert StakeTransferFailed();
        }
        
        emit EvaluatorSlashed(evaluator, stake, reason);
    }

    /**
     * @dev Set the SlashManager contract address for governance-based slashing.
     * @param _slashManager Address of the SlashManager contract.
     */
    function setSlashManager(address _slashManager) external onlyOwner {
        if (_slashManager == address(0)) revert ZeroAddress();
        address old = slashManager;
        slashManager = _slashManager;
        emit SlashManagerSet(old, _slashManager);
    }

    /**
     * @dev Governance-based evaluator slashing, callable only by SlashManager multisig.
     * Performs the same action as slashEvaluatorStake but gated by SlashManager instead of owner.
     * @param evaluator Address of the evaluator to slash.
     * @param reason Reason for slashing.
     */
    function slashByGovernance(address evaluator, string calldata reason) external nonReentrant {
        if (msg.sender != slashManager) revert OnlySlashManager();
        if (!isRegisteredEvaluator[evaluator]) revert EvaluatorNotRegistered();

        uint256 stake = evaluatorStakes[evaluator];
        if (stake == 0) revert InsufficientEvaluatorStake();

        for (uint256 i = 0; i < evaluatorPool.length; i++) {
            if (evaluatorPool[i] == evaluator) {
                evaluatorPool[i] = evaluatorPool[evaluatorPool.length - 1];
                evaluatorPool.pop();
                break;
            }
        }

        isRegisteredEvaluator[evaluator] = false;
        evaluatorStakes[evaluator] = 0;

        if (platformTreasury != address(0)) {
            (bool success, ) = payable(platformTreasury).call{value: stake}("");
            if (!success) revert StakeTransferFailed();
        }

        emit EvaluatorSlashed(evaluator, stake, reason);
    }

    /**
     * @dev Permissionless cleanup of stale evaluators (blacklisted or unregistered).
     * Anyone can call to remove stale entries and keep the pool healthy.
     * @param maxIterations Maximum number of iterations to prevent OOG (0 = no limit).
     * @return removedCount Number of stale evaluators removed.
     */
    function cleanupStaleEvaluators(uint256 maxIterations) external returns (uint256 removedCount) {
        if (evaluatorPool.length == 0) return 0;

        uint256 iterations = 0;
        uint256 i = evaluatorPool.length;
        while (i > 0) {
            if (maxIterations > 0 && iterations >= maxIterations) break;

            address evalAddr = evaluatorPool[i - 1];
            bool isStale = !isRegisteredEvaluator[evalAddr];

            if (!isStale && adminRegistry != address(0)) {
                AdminRegistry registry = AdminRegistry(adminRegistry);
                if (registry.isWalletBlacklistedActive(evalAddr)) {
                    isStale = true;
                }
            }

            if (isStale) {
                evaluatorPool[i - 1] = evaluatorPool[evaluatorPool.length - 1];
                evaluatorPool.pop();
                removedCount++;
            }

            i--;
            iterations++;
        }

        if (removedCount > 0) {
            emit StaleEvaluatorsCleaned(removedCount);
        }
    }

    /**
     * @dev Get the current evaluator pool size.
     * @return Number of evaluators in the pool.
     */
    function getEvaluatorPoolSize() external view returns (uint256) {
        return evaluatorPool.length;
    }

    /**
     * @dev Select a random evaluator from the pool.
     * H-02 FIX: Uses blockhash(commitBlock) as entropy — unknowable until block was sealed.
     * @param jobId The job ID to select evaluator for.
     * @param entropy Pre-computed entropy (blockhash of commit block).
     */
    function _selectRandomEvaluator(uint256 jobId, bytes32 entropy) internal view returns (address evaluator) {
        uint256 poolLength = evaluatorPool.length;
        if (poolLength == 0) revert NoEvaluatorsAvailable();

        uint256 randomIndex = uint256(keccak256(abi.encodePacked(
            entropy,
            jobId,
            poolLength
        ))) % poolLength;

        evaluator = evaluatorPool[randomIndex];
        if (!isRegisteredEvaluator[evaluator]) {
            for (uint256 i = 0; i < poolLength; i++) {
                if (isRegisteredEvaluator[evaluatorPool[i]]) {
                    return evaluatorPool[i];
                }
            }
            revert NoActiveEvaluators();
        }
    }
    
    /**
     * @dev Finalize random evaluator selection after commit-reveal delay.
     * H-02 FIX: No user-provided salt needed — entropy is on-chain (block.prevrandao + blockhash).
     * Permissionless — anyone can call after 6 blocks.
     * @param jobId The job ID to finalize evaluator for.
     */
    function finalizeRandomEvaluator(uint256 jobId) external {
        Job storage job = jobs[jobId];
        if (job.id == 0) revert InvalidJob();
        if (job.evaluator != address(0)) revert EvaluatorAlreadyRegistered();
        
        EvaluatorCommit storage commit = evaluatorCommits[jobId];
        if (commit.commitBlock == 0) revert NoCommitFound();
        if (commit.revealed) revert EvaluatorAlreadyRegistered();
        if (block.number < commit.commitBlock + EVALUATOR_REVEAL_DELAY) revert RevealTooEarly();
        
        // Verify commitment: hash of (jobId, commitBlock) must match stored commitHash
        bytes32 expectedCommit = keccak256(abi.encodePacked(jobId, commit.commitBlock));
        if (commit.commitHash != expectedCommit) revert InvalidCommit();
        
        commit.revealed = true;
        
        // H-02: Use blockhash(commitBlock) as entropy — unknowable until block was sealed
        bytes32 entropy = blockhash(commit.commitBlock);
        if (entropy == bytes32(0)) {
            // Fallback if blockhash is unavailable (>256 blocks old)
            entropy = keccak256(abi.encodePacked(block.prevrandao, block.timestamp, jobId));
        }
        
        address finalEvaluator = _selectRandomEvaluator(jobId, entropy);
        job.evaluator = finalEvaluator;
        
        emit EvaluatorRandomlySelected(jobId, finalEvaluator);
    }

    /***********************************/
    /* Validation */
    /***********************************/
    
    function _validateJobCreation(
        address client,
        address provider,
        address evaluator,
        uint256 expiredAt,
        string calldata description,
        address hook
    ) internal view {
        if (client == address(0)) revert ZeroAddress();
        if (provider == address(0)) revert ZeroAddress();
        if (evaluator != address(0)) {
            if (client == evaluator) revert RolesMustBeDistinct();
            if (provider == evaluator) revert RolesMustBeDistinct();
        }
        // ToB H-01: Prevent provider == client scenario (address swap protection)
        if (provider == client) revert RolesMustBeDistinct();
        if (expiredAt <= block.timestamp + MIN_EXPIRY_DURATION) revert ExpiryTooShort();
        if (expiredAt > block.timestamp + MAX_EXPIRY_DURATION) revert ExpiryTooLong();
        if (bytes(description).length == 0 || bytes(description).length > MAX_DESCRIPTION_LENGTH) revert InvalidJob();
        
        // VULN-09/12 FIX: Validate hook is a deployed contract (not EOA or zero address)
        if (hook != address(0)) {
            uint256 size;
            assembly ("memory-safe") {
                size := extcodesize(hook)
            }
            if (size == 0) revert InvalidHook();
        }
    }
    
    /**
     * @dev Get token decimals. Uses IERC20Metadata if available, falls back to 18 for ETH.
     */
    function _getTokenDecimals(address token) internal view returns (uint8) {
        if (token == address(0)) return 18;
        
        (bool success, bytes memory data) = token.staticcall(abi.encodeWithSignature("decimals()"));
        if (!(success && data.length >= 32)) revert DecimalsQueryFailed(token);
        uint8 decimals = abi.decode(data, (uint8));
        if (!(decimals > 0)) revert InvalidDecimals(token, decimals);
        return decimals;
    }

    /***********************************/
    /* Admin Functions */
    /***********************************/
    
    /**
     * @dev Set the platform treasury address.
     * @param _treasury New treasury address.
     */
    function setPlatformTreasury(address _treasury) external onlyOwner {
        if (_treasury == address(0)) revert ZeroAddress();
        address oldTreasury = platformTreasury;
        platformTreasury = _treasury;
        emit PlatformTreasurySet(oldTreasury, _treasury);
    }

    /**
     * @dev Set the AdminRegistry address.
     * @param _registry New AdminRegistry address.
     */
    function setAdminRegistry(address _registry) external onlyOwner {
        if (_registry != address(0)) {
            uint256 size;
            assembly ("memory-safe") { size := extcodesize(_registry) }
            if (size == 0) revert InvalidHook(); // A3-03: validate is contract
        }
        address oldRegistry = adminRegistry;
        adminRegistry = _registry;
        emit AdminRegistrySet(oldRegistry, _registry);
    }

    /**
     * @dev Set the ServiceRegistry address.
     * @param _registry New ServiceRegistry address.
     */
    function setServiceRegistry(address _registry) external onlyOwner {
        if (_registry != address(0)) {
            uint256 size;
            assembly ("memory-safe") { size := extcodesize(_registry) }
            if (size == 0) revert InvalidHook();
        }
        address oldRegistry = serviceRegistry;
        serviceRegistry = _registry;
        emit ServiceRegistrySet(oldRegistry, _registry);
    }

    /**
     * @dev Authorize or revoke contracts that may create jobs on behalf of clients.
     */
    function setAuthorizedJobCreator(address creator, bool authorized) external onlyOwner {
        if (creator == address(0)) revert ZeroAddress();
        authorizedJobCreators[creator] = authorized;
        emit AuthorizedJobCreatorUpdated(creator, authorized);
    }

    /**
     * @dev Set the PriceOracle address.
     * @param _priceOracle New PriceOracle address.
     */
    function setPriceOracle(address _priceOracle) external onlyOwner {
        if (_priceOracle == address(0)) revert ZeroAddress();
        address oldOracle = address(priceOracle);
        priceOracle = IPriceOracleV2(_priceOracle);
        emit PriceOracleSet(oldOracle, _priceOracle);
    }
    
    /**
     * @dev Pause contract operations (owner only).
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause contract operations (owner only).
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /***********************************/
    /* Events */
    /***********************************/
    
    // V9 Events
    event MinBudgetChanged(address indexed token, uint256 oldMin, uint256 newMin);
    event MaxBudgetChanged(uint256 oldMax, uint256 newMax);
    event MinBudgetOverrideChanged(address indexed token, uint256 minAmount);
    event StablecoinStatusChanged(address indexed token, bool isStable);
    
    // V8 Events
    event TokenAllowlistUpdated(address indexed token, bool allowed);
    event EvaluatorRegistered(address indexed evaluator);
    event EvaluatorUnregistered(address indexed evaluator);
    event MinEvaluatorStakeChanged(uint256 oldStake, uint256 newStake);
    event EvaluatorRandomlySelected(uint256 indexed jobId, address indexed evaluator);
    event StaleEvaluatorsCleaned(uint256 removedCount);
    event EvaluatorSlashed(address indexed evaluator, uint256 stake, string reason);
    event JobBudgetUpdated(uint256 indexed jobId, uint256 oldBudget, uint256 newBudget);
    event JobPaymentTokenUpdated(uint256 indexed jobId, address oldToken, address newToken);
    event JobCreated(uint256 indexed jobId, address indexed client, address provider, uint256 budget, uint256 expiredAt, bool evaluatorFee, bool clientReview, bool randomEvaluator);
    event JobFunded(uint256 indexed jobId, address indexed client, uint256 amount);
    event JobSubmitted(uint256 indexed jobId, address indexed provider, bytes32 deliverable);
    event JobStatusChanged(uint256 indexed jobId, JobStatus oldStatus, JobStatus newStatus, address changedBy, uint256 timestamp);
    event PaymentReleased(uint256 indexed jobId, uint256 providerAmount, uint256 platformFee, uint256 evaluatorFee);

    // Admin Events
    event PlatformTreasurySet(address indexed oldTreasury, address indexed newTreasury);
    event AdminRegistrySet(address indexed oldRegistry, address indexed newRegistry);
    event ServiceRegistrySet(address indexed oldRegistry, address indexed newRegistry);
    event PriceOracleSet(address indexed oldOracle, address indexed newOracle);
    event AuthorizedJobCreatorUpdated(address indexed creator, bool authorized);

    // Job Lifecycle Events (ported from V6)
    event JobRejected(uint256 indexed jobId, address indexed rejector, bytes32 reason);
    event JobExpired(uint256 indexed jobId);
    event JobCompleted(uint256 indexed jobId, address indexed by, address indexed provider, uint256 evaluatorFee);
    event Refunded(uint256 indexed jobId, address indexed client, uint256 amount);
    event PermissionlessRefund(uint256 indexed jobId, address indexed client, address indexed caller, uint256 amount);
    event DisputeWindowSet(uint256 indexed jobId, uint256 window);
    event NonResponsiveSlashSet(uint256 indexed jobId, uint256 slashBP);
    event EvaluatorSlashedForInactivity(uint256 indexed jobId, address indexed evaluator, uint256 slashAmount);
    event BlacklistCheckFailed(address indexed adminRegistry);
    event HookFailed(uint256 indexed jobId, bytes4 indexed selector);
    event SlashManagerSet(address indexed oldManager, address indexed newManager);

    // C-01: Toggle — when true, blacklist check failures revert instead of failing open

    // C-01: Toggle — when true, blacklist check failures revert instead of failing open
    bool public blacklistCheckRequired;

    address public serviceRegistry;
    uint256 public minEvaluatorStake; // Configurable per chain; appended for upgrade safety
    mapping(address => bool) public authorizedJobCreators;

    // Phase 38: Governance slashing via SlashManager multisig
    address public slashManager;

    /// @dev Storage gap for upgrade safety
    uint256[45] private __gap;
}

// FILE: contracts/shared/BiddingSystem.sol

// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import "forge-std/console.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IAgenticCommerceV9} from "../interfaces/IAgenticCommerceV9.sol";
import {IBiddingSystem} from "../interfaces/IBiddingSystem.sol";
import {AdminRegistry} from "./AdminRegistry.sol";

/**
 * @title BiddingSystem
 * @dev Standalone upgradeable bidding contract for the Kokonut Agent Economy
 * 
 * Features:
 * - Commit-reveal bidding with ETH stakes (1% of max budget)
 * - Winner selection by job creator
 * - Integration with AgenticCommerceV6.1 for job creation and escrow
 * - Pull pattern for stake management (no automatic loss)
 * - ServiceRegistry integration for service linking
 * - ERC-8004 identity validation for bidders
 * 
 * Security:
 * - nonReentrant guards on all state-changing functions
 * - CEI pattern for all token transfers
 * - Access control via modifiers
 * - Input validation on all public functions
 */
contract BiddingSystem is
    Initializable,
    UUPSUpgradeable,
    Ownable2StepUpgradeable,
    ReentrancyGuard,
    PausableUpgradeable,
    IBiddingSystem
{
    using SafeERC20 for IERC20;
    error BiddingSystem__Already_committed();
    error BiddingSystem__Already_revealed();
    error BiddingSystem__Bid_already_accepted();
    error BiddingSystem__Bid_not_revealed();
    error BiddingSystem__Bidding_closed();
    error BiddingSystem__Cannot_cancel();
    error BiddingSystem__Cannot_cancel_bids_revealed();
    error BiddingSystem__Deadline_not_passed();
    error BiddingSystem__Duration_too_long();
    error BiddingSystem__Duration_too_short();
    error BiddingSystem__ETH_transfer_failed();
    error BiddingSystem__Evaluator_blacklisted();
    error BiddingSystem__Exceeds_max_budget();
    error BiddingSystem__Expiry_too_far();
    error BiddingSystem__Expiry_too_soon();
    error BiddingSystem__Insufficient_balance();
    error BiddingSystem__Insufficient_payment();
    error BiddingSystem__Insufficient_stake();
    error BiddingSystem__Insufficient_stake_for_session();
    error BiddingSystem__Invalid_bid();
    error BiddingSystem__Invalid_commitment();
    error BiddingSystem__Invalid_session();
    error BiddingSystem__Invalid_window();
    error BiddingSystem__Job_already_created();
    error BiddingSystem__Job_created();
    error BiddingSystem__Max_10_fee();
    error BiddingSystem__No_bid_found();
    error BiddingSystem__No_stake_to_claim();
    error BiddingSystem__No_stake_to_withdraw();
    error BiddingSystem__No_winner();
    error BiddingSystem__No_winner_selected();
    error BiddingSystem__Not_session_creator();
    error BiddingSystem__Not_the_winner();
    error BiddingSystem__Reveal_window_closed();
    error BiddingSystem__Reveal_window_already_closed();
    error BiddingSystem__Reveal_window_still_open();
    error BiddingSystem__Session_not_active();
    error BiddingSystem__Session_still_active();
    error BiddingSystem__Stake_already_withdrawn();
    error BiddingSystem__Wallet_blacklisted();
    error BiddingSystem__Winner_already_selected();
    error BiddingSystem__Winner_selected();
    error BiddingSystem__Wrong_session_status();
    error BiddingSystem__Wrong_status();
    error BiddingSystem__Zero_address();
    error BiddingSystem__Zero_budget();
    error BiddingSystem__Zero_commerce();
    error BiddingSystem__Zero_commitment();
    error BiddingSystem__Zero_evaluator();
    error BiddingSystem__Zero_owner();
    error BiddingSystem__Zero_treasury();
    error BiddingSystem__Extension_too_long();
    error BiddingSystem__No_show_not_eligible();   // Phase 45b O-3: bid is revealed, accepted, or already withdrawn
    error BiddingSystem__Already_settled();        // Phase 45b O-3: bid was already slashed
    error BiddingSystem__Reveal_window_not_ended();// Phase 45b O-3: slashNoShow called before reveal window ended
    error BiddingSystem__No_fees_to_withdraw();    // Phase 45b O-10: withdrawFees called with zero balance
    error BiddingSystem__Stake_below_min();        // Phase 45c O-4: createBiddingSession stake < minStake
    error BiddingSystem__Stake_above_max();        // Phase 45c O-4: createBiddingSession stake > maxStake
    error BiddingSystem__Invalid_stake_bounds();   // Phase 45c O-4: setStakeBounds with min > max
    error BiddingSystem__Sweep_too_early();        // Phase 45c O-9: sweepUnclaimedStakes before WITHDRAW_TIMEOUT
    /***********************************/
    /* Constants */
    /***********************************/
    
    uint256 public constant MIN_STAKE_BP = 100;      // 1% in basis points
    uint256 public constant FEE_DENOMINATOR = 10000;
    uint256 public constant DEFAULT_REVEAL_WINDOW = 1 hours;
    uint256 public constant MIN_SESSION_DURATION = 1 hours;   // Phase 45c O-5: tighter bound
    uint256 public constant MAX_SESSION_DURATION = 30 days;   // Phase 45c O-5
    uint256 public constant MIN_JOB_EXPIRY = 5 minutes;
    uint256 public constant MAX_JOB_EXPIRY = 365 days;
    uint256 public constant ETH_PLATFORM_FEE_BP = 100; // 1% platform fee
    uint256 public constant MAX_REVEAL_EXTENSION = 7 days;
    uint256 public constant NO_SHOW_SLASH_BP = 500;    // Phase 45b O-3: 5% slash for no-show bidders
    uint256 public constant DEFAULT_MIN_STAKE = 0.001 ether;  // Phase 45c O-4
    uint256 public constant DEFAULT_MAX_STAKE = 100 ether;   // Phase 45c O-4
    uint256 public constant PROTOCOL_VERSION = 2;            // Phase 45c O-8: bump from 1 (Phase 45b O-1) to 2
    uint256 public constant WITHDRAW_TIMEOUT = 30 days;       // Phase 45c O-9
    
    /***********************************/
    /* Storage */
    /***********************************/
    
    // These variables are placed to avoid storage collision
    // Reference: https://docs.openzeppelin.com/upgrades-plugins/writing-proxies#storage-collisions-avoided
    
    uint256 public sessionCounter;
    mapping(uint256 => Session) public sessions;
    mapping(uint256 => Bid[]) public sessionBids;
    mapping(uint256 => mapping(address => uint256)) public bidderToBidIndex;
    mapping(uint256 => mapping(bytes32 => bool)) public validCommits;
    mapping(uint256 => uint256) public totalStakesHeld;
    mapping(uint256 => uint256) public totalPlatformFees;
    
    // Integration addresses
    address public commerce;           // AgenticCommerceV9
    address public treasury;          // Platform treasury
    address public adminRegistry;     // Bad actor blacklist
    
    // Configuration
    uint256 public revealWindow = DEFAULT_REVEAL_WINDOW;
    uint256 public platformFeeBP = ETH_PLATFORM_FEE_BP;
    
    // Storage gap for upgradeability. Phase 45c has consumed 7 of the original 49 slots
    // (totalAccumulatedFees, creatorStakeWithdrawn, accumulatedFeesByToken from Phase 45b,
    // then minStake, maxStake, withdrawStakeClaimableAt, platformFeeBPByToken from 45c),
    // leaving 42 free slots for future upgrades.
    uint256[42] private __gap;

    // Running total of accrued platform fees (D-01 fix — replaces O(n) loop)
    uint256 public totalAccumulatedFees;
    mapping(uint256 => bool) public creatorStakeWithdrawn;

    // Phase 45b O-10: per-token accumulator for ERC-20 platform fees.
    // Tracks accumulated fees per paymentToken so withdrawFees(token) can pull
    // the full balance in one call. address(0) is native ETH, but the ETH
    // balance is also tracked by totalAccumulatedFees above for backward compat.
    mapping(address => uint256) public accumulatedFeesByToken;

    // Phase 45c O-4: min/max stake bounds (owner-settable). uint256 to allow ERC-20
    // denominated stakes in the future. Defaults: 0.001 ETH and 100 ETH.
    uint256 public minStake = DEFAULT_MIN_STAKE;
    uint256 public maxStake = DEFAULT_MAX_STAKE;

    // Phase 45c O-9: per-(session, bidder) timestamp after which the bidder can have
    // their unclaimed stake swept to the treasury. 0 means no pending claim.
    mapping(uint256 => mapping(address => uint256)) public withdrawStakeClaimableAt;

    // Phase 45c O-11: per-token platform fee in basis points. address(0) holds the
    // default override (mirrors the global `platformFeeBP` for consistency). When a
    // token-specific entry is unset, `getPlatformFeeBP(token)` returns the global
    // default `platformFeeBP()`.
    mapping(address => uint256) public platformFeeBPByToken;
    
    /***********************************/
    /* Modifiers */
    /***********************************/
    
    modifier onlySessionCreator(uint256 sessionId) {
        if (!(sessions[sessionId].creator == msg.sender)) revert BiddingSystem__Not_session_creator();
        _;
    }
    
    modifier onlySessionActive(uint256 sessionId) {
        if (!(sessions[sessionId].id != 0)) revert BiddingSystem__Invalid_session();
        if (!(sessions[sessionId].status == SessionStatus.Active)) revert BiddingSystem__Session_not_active();
        if (!(block.timestamp < sessions[sessionId].deadline)) revert BiddingSystem__Bidding_closed();
        _;
    }
    
    modifier onlyAfterDeadline(uint256 sessionId) {
        if (!(sessions[sessionId].id != 0)) revert BiddingSystem__Invalid_session();
        if (!(sessions[sessionId].status == SessionStatus.Active || sessions[sessionId].status == SessionStatus.BiddingClosed)) revert BiddingSystem__Wrong_session_status();
        if (!(block.timestamp >= sessions[sessionId].deadline)) revert BiddingSystem__Deadline_not_passed();
        _;
    }
    
    /***********************************/
    /* Initialize */
    /***********************************/
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    function initialize(address owner_, address commerce_, address treasury_) public initializer {
        if (!(owner_ != address(0))) revert BiddingSystem__Zero_owner();
        if (!(commerce_ != address(0))) revert BiddingSystem__Zero_commerce();
        if (!(treasury_ != address(0))) revert BiddingSystem__Zero_treasury();

        __Ownable_init(owner_);
        __Pausable_init();

        commerce = commerce_;
        treasury = treasury_;
        sessionCounter = 0;
        revealWindow = DEFAULT_REVEAL_WINDOW;
        platformFeeBP = ETH_PLATFORM_FEE_BP;
        // Phase 45c O-4: inline defaults are not applied to proxy storage; explicit
        // initialization is required for fresh deployments. For upgrades, the admin
        // must call setStakeBounds() post-upgrade to seed the bounds.
        minStake = DEFAULT_MIN_STAKE;
        maxStake = DEFAULT_MAX_STAKE;
    }
    
    /***********************************/
    /* UUPS */
    /***********************************/
    
    function _authorizeUpgrade(address) internal override onlyOwner {}

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /***********************************/
    /* Core Bidding Functions */
    /***********************************/

    function createBiddingSession(
        address evaluator,
        uint256 maxBudget,
        uint256 deadline,
        bytes calldata metadata,
        uint256 serviceId,
        address paymentToken,
        bool evaluatorFee,
        address hook
    ) external payable nonReentrant whenNotPaused returns (uint256 sessionId) {
        // Phase 39: Allow address(0) for random evaluator pool selection
        bool useRandomEvaluator = (evaluator == address(0));
        if (!(maxBudget > 0)) revert BiddingSystem__Zero_budget();
        // Phase 45c O-5: min 1h, max 30d deadline window
        if (!(deadline > block.timestamp + MIN_SESSION_DURATION)) revert BiddingSystem__Duration_too_short();
        if (!(deadline <= block.timestamp + MAX_SESSION_DURATION)) revert BiddingSystem__Duration_too_long();
        // Phase 45c O-7: hook must be zero or a contract with code. EOA is rejected to
        // avoid silent misconfiguration where a "webhook relay" is actually a wallet.
        if (hook != address(0)) {
            uint256 size;
            assembly ("memory-safe") { size := extcodesize(hook) }
            if (size == 0) revert BiddingSystem__Zero_address();
        }

        // Phase 40: Validate payment token and collect stake
        uint256 stakeAmount = calculateStake(maxBudget);
        // Phase 45c O-4: enforce min/max stake bounds. The bounds are interpreted
        // in paymentToken units, so for ETH they read 0.001-100 ETH directly; for
        // an ERC-20 (e.g. USDC with 6 decimals) the owner is expected to set the
        // bounds in the same units (raw 6-decimal integer). Defaults to 0.001 ether
        // and 100 ether which is fine for ETH but is advisory for ERC-20 — the
        // owner should set explicit bounds via setStakeBounds.
        if (!(stakeAmount >= minStake)) revert BiddingSystem__Stake_below_min();
        if (!(stakeAmount <= maxStake)) revert BiddingSystem__Stake_above_max();
        if (!(stakeAmount >= minStake)) revert BiddingSystem__Stake_below_min();
        if (!(stakeAmount <= maxStake)) revert BiddingSystem__Stake_above_max();
        _receiveToken(paymentToken, msg.sender, stakeAmount);

        // Refund excess for ETH payments
        if (paymentToken == address(0)) {
            _refundExcess(paymentToken, msg.sender, msg.value, stakeAmount);
        }

        // Bad Actor: Check if wallets are blacklisted (skip evaluator check for random)
        if (adminRegistry != address(0)) {
            AdminRegistry registry = AdminRegistry(adminRegistry);
            if (!(!registry.isWalletBlacklistedActive(msg.sender))) revert BiddingSystem__Wallet_blacklisted();
            if (!useRandomEvaluator && !(!registry.isWalletBlacklistedActive(evaluator))) revert BiddingSystem__Evaluator_blacklisted();
        }

        sessionId = ++sessionCounter;

        sessions[sessionId] = Session({
            id: sessionId,
            creator: msg.sender,
            evaluator: evaluator,
            maxBudget: maxBudget,
            deadline: deadline,
            revealWindowEnd: deadline + revealWindow,
            metadata: metadata,
            serviceId: serviceId,
            jobId: 0,
            winner: address(0),
            winningBidId: 0,
            jobCreated: false,
            status: SessionStatus.Active,
            useRandomEvaluator: useRandomEvaluator,
            paymentToken: paymentToken,
            evaluatorFee: evaluatorFee,
            hook: hook
        });

        totalStakesHeld[sessionId] += stakeAmount;

        emit BiddingSessionCreated(
            sessionId,
            msg.sender,
            evaluator,
            maxBudget,
            deadline,
            serviceId
        );
    }
    
    function commitBid(uint256 sessionId, bytes32 commitHash)
        external
        payable
        whenNotPaused
        nonReentrant
    {
        if (!(commitHash != bytes32(0))) revert BiddingSystem__Zero_commitment();

        Session storage session = sessions[sessionId];
        if (!(session.id != 0)) revert BiddingSystem__Invalid_session();
        if (!(session.status == SessionStatus.Active)) revert BiddingSystem__Session_not_active();
        if (!(block.timestamp < session.deadline)) revert BiddingSystem__Bidding_closed();

        // Bad Actor: Check if bidder is blacklisted
        if (adminRegistry != address(0)) {
            AdminRegistry registry = AdminRegistry(adminRegistry);
            if (!(!registry.isWalletBlacklistedActive(msg.sender))) revert BiddingSystem__Wallet_blacklisted();
        }

        // Check if bidder already has a bid
        if (bidderToBidIndex[sessionId][msg.sender] != 0) {
            revert BiddingSystem__Already_committed();
        }

        uint256 stakeAmount = calculateStake(session.maxBudget);
        
        // Phase 40: Collect stake in session's payment token
        _receiveToken(session.paymentToken, msg.sender, stakeAmount);
        
        // Refund excess for ETH payments
        if (session.paymentToken == address(0)) {
            _refundExcess(session.paymentToken, msg.sender, msg.value, stakeAmount);
        }
        
        // Create bid entry
        uint256 bidId = sessionBids[sessionId].length + 1;

        sessionBids[sessionId].push(Bid({
            bidId: bidId,
            bidder: msg.sender,
            proposedAmount: 0,
            stake: stakeAmount,
            message: "",
            commitHash: commitHash,
            revealed: false,
            accepted: false,
            rejected: false,
            stakeWithdrawn: false,
            timestamp: block.timestamp,
            status: BidStatus.Pending  // Phase 45c O-12: explicit state machine
        }));
        
        bidderToBidIndex[sessionId][msg.sender] = bidId;
        validCommits[sessionId][commitHash] = true;
        totalStakesHeld[sessionId] += stakeAmount;
        
        emit BidCommitted(sessionId, msg.sender, commitHash, stakeAmount);
    }
    
    function revealBid(
        uint256 sessionId,
        uint256 amount,
        string calldata message,
        bytes32 salt
    ) external nonReentrant whenNotPaused onlyAfterDeadline(sessionId) {
        Session storage session = sessions[sessionId];
        
        // Check reveal window
        if (block.timestamp >= session.revealWindowEnd) {
            revert BiddingSystem__Reveal_window_closed();
        }
        
        uint256 bidIndex = bidderToBidIndex[sessionId][msg.sender];
        if (!(bidIndex != 0)) revert BiddingSystem__No_bid_found();
        
        Bid storage bid = sessionBids[sessionId][bidIndex - 1];
        if (!(!bid.revealed)) revert BiddingSystem__Already_revealed();
        
        // Verify commitment
        // Phase 45b O-1: Hash binds to (sessionId, msg.sender, amount, message, salt)
        // to prevent cross-bidder hash collisions and cross-session replay attacks.
        // Phase 45c O-8: Hash also binds to PROTOCOL_VERSION to enable future hash
        // format upgrades without breaking commit history. v1 (Phase 45b) and v0
        // (Phase 40) reveals are invalidated by this version bump. Pre-upgrade
        // commits must reveal before the upgrade; post-upgrade commits use the new form.
        bytes32 expectedHash = keccak256(abi.encode(
            PROTOCOL_VERSION, sessionId, msg.sender, amount, message, salt
        ));
        if (!(validCommits[sessionId][expectedHash])) revert BiddingSystem__Invalid_commitment();

        // Verify amount doesn't exceed max budget
        if (!(amount <= session.maxBudget)) revert BiddingSystem__Exceeds_max_budget();

        // Update bid
        bid.proposedAmount = amount;
        bid.message = message;
        bid.revealed = true;
        bid.status = BidStatus.Revealed; // Phase 45c O-12

        emit BidRevealed(sessionId, msg.sender, amount, message);
    }
    
    function acceptBid(uint256 sessionId, uint256 bidId)
        external
        whenNotPaused
        nonReentrant
    {
        Session storage session = sessions[sessionId];

        if (!(session.creator == msg.sender)) revert BiddingSystem__Not_session_creator();
        if (!(session.status == SessionStatus.Active || session.status == SessionStatus.BiddingClosed)) revert BiddingSystem__Wrong_status();
        if (!(session.winner == address(0))) revert BiddingSystem__Winner_already_selected();
        if (!(!session.jobCreated)) revert BiddingSystem__Job_already_created();
        
        if (!(bidId > 0 && bidId <= sessionBids[sessionId].length)) revert BiddingSystem__Invalid_bid();
        
        Bid storage bid = sessionBids[sessionId][bidId - 1];
        if (!(bid.revealed)) revert BiddingSystem__Bid_not_revealed();
        if (!(!bid.accepted)) revert BiddingSystem__Bid_already_accepted();
        
        // Accept this bid
        bid.accepted = true;
        bid.status = BidStatus.Accepted; // Phase 45c O-12
        session.winner = bid.bidder;
        session.winningBidId = bidId;
        session.status = SessionStatus.WinnerSelected;

        // Phase 45c O-9: start the 30-day withdraw clock for all other bidders.
        // Winner has their stake returned synchronously below. After WITHDRAW_TIMEOUT
        // (30 days) any un-withdrawn stakes can be swept to the treasury.
        _startWithdrawClockForNonWinners(sessionId, bidId);
        
        // Return winner's stake
        uint256 stake = bid.stake;
        bid.stake = 0;
        totalStakesHeld[sessionId] -= stake;
        
        // Phase 40: Refund in session's payment token
        _sendToken(session.paymentToken, bid.bidder, stake);
        
        emit BidAccepted(sessionId, bid.bidder, bid.proposedAmount, bidId);
        emit StakeClaimed(sessionId, bid.bidder, stake);
    }
    
    function rejectBid(uint256 sessionId, uint256 bidId, string calldata reason) 
        external 
        nonReentrant 
        onlySessionCreator(sessionId) 
    {
        Session storage session = sessions[sessionId];
        
        if (!(session.status == SessionStatus.Active || session.status == SessionStatus.BiddingClosed)) revert BiddingSystem__Wrong_status();
        if (!(bidId > 0 && bidId <= sessionBids[sessionId].length)) revert BiddingSystem__Invalid_bid();
        
        Bid storage bid = sessionBids[sessionId][bidId - 1];
        if (!(bid.revealed)) revert BiddingSystem__Bid_not_revealed();
        if (!(!bid.accepted)) revert BiddingSystem__Bid_already_accepted();
        if (!(bid.rejected == false)) revert BiddingSystem__Bid_already_accepted();
        
        // Mark as rejected and return stake
        bid.rejected = true;
        bid.status = BidStatus.Rejected; // Phase 45c O-12
        uint256 stake = bid.stake;
        bid.stake = 0;
        totalStakesHeld[sessionId] -= stake;
        
        // Phase 40: Refund in session's payment token
        _sendToken(session.paymentToken, bid.bidder, stake);
        
        emit BidRejected(sessionId, bidId, bid.bidder, reason);
    }
    
    /***********************************/
    /* Stake Management (Pull Pattern) */
    /***********************************/
    
    function withdrawStake(uint256 sessionId) external nonReentrant {
        Session storage session = sessions[sessionId];

        if (!(session.id != 0)) revert BiddingSystem__Invalid_session();
        // Phase 45b O-2: include BiddingClosed so non-revealing bidders can pull
        // their stake once the full reveal window has elapsed and the session is
        // closed. Bidders who never revealed should prefer slashNoShow (which
        // slashes 5%) — withdrawStake returns the full stake if the bid is
        // unrevealed and the reveal window has ended.
        if (!(session.status == SessionStatus.BiddingClosed || session.status == SessionStatus.WinnerSelected || session.status == SessionStatus.Completed || session.status == SessionStatus.Cancelled)) revert BiddingSystem__Session_still_active();
        
        uint256 bidIndex = bidderToBidIndex[sessionId][msg.sender];
        if (!(bidIndex != 0)) revert BiddingSystem__No_bid_found();
        
        Bid storage bid = sessionBids[sessionId][bidIndex - 1];
        
        if (!(bid.stake > 0)) revert BiddingSystem__No_stake_to_withdraw();
        if (!(!bid.stakeWithdrawn)) revert BiddingSystem__Stake_already_withdrawn();
        if (!(bid.accepted == false)) revert BiddingSystem__No_stake_to_withdraw();
        if (!(bid.rejected == false)) revert BiddingSystem__No_stake_to_withdraw();
        
        // Check reveal window closed
        if (session.status == SessionStatus.Active || session.status == SessionStatus.BiddingClosed) {
            if (!(block.timestamp >= session.revealWindowEnd)) revert BiddingSystem__Reveal_window_still_open();
        }
        
        uint256 amount = bid.stake;
        bid.stake = 0;
        bid.stakeWithdrawn = true;
        bid.status = BidStatus.Withdrawn; // Phase 45c O-12
        totalStakesHeld[sessionId] -= amount;

        // Phase 45c O-9: clear any pending sweep timestamp for this bidder.
        // The bidder is withdrawing legitimately so there is nothing to sweep.
        withdrawStakeClaimableAt[sessionId][msg.sender] = 0;

        // Phase 40: Refund in session's payment token
        _sendToken(session.paymentToken, msg.sender, amount);
        
        emit StakeWithdrawn(sessionId, msg.sender, amount);
    }
    
    /**
     * @dev Withdraw the session creator's stake after job creation or cancellation (as fallback/safety mechanism).
     */
    function withdrawCreatorStake(uint256 sessionId) external nonReentrant onlySessionCreator(sessionId) {
        Session storage session = sessions[sessionId];
        if (!(session.id != 0)) revert BiddingSystem__Invalid_session();

        // Creator stake is synchronously refunded in cancelSession/createJobAndFund.
        // Keeping this fallback withdraw path lets terminal sessions drain pooled bidder stakes.
        revert BiddingSystem__Stake_already_withdrawn();
    }

    /// @notice Phase 45c O-9: Permissionlessly sweep un-withdrawn bidder stakes to the
    ///         treasury once WITHDRAW_TIMEOUT has elapsed since the session was settled
    ///         (winner accepted, cancelled, or completed). Idempotent: bidders who have
    ///         already withdrawn are skipped. Returns the number of stakes swept.
    ///         Note: a session with no bidder past the 30-day deadline is a no-op
    ///         (sweptCount = 0) and does NOT revert.
    function sweepUnclaimedStakes(uint256 sessionId) external nonReentrant returns (uint256 sweptCount) {
        Session storage session = sessions[sessionId];
        if (!(session.id != 0)) revert BiddingSystem__Invalid_session();

        Bid[] storage bids = sessionBids[sessionId];
        uint256 len = bids.length;
        for (uint256 i = 0; i < len; i++) {
            Bid storage bid = bids[i];
            if (bid.stake == 0) continue;
            if (bid.stakeWithdrawn) continue;
            uint256 deadline = withdrawStakeClaimableAt[sessionId][bid.bidder];
            if (deadline == 0) continue;
            if (block.timestamp < deadline) revert BiddingSystem__Sweep_too_early();

            uint256 amount = bid.stake;
            bid.stake = 0;
            bid.stakeWithdrawn = true;
            bid.status = BidStatus.Withdrawn; // terminal — but stake went to treasury
            totalStakesHeld[sessionId] -= amount;
            withdrawStakeClaimableAt[sessionId][bid.bidder] = 0;
            _sendToken(session.paymentToken, treasury, amount);
            unchecked { sweptCount++; }
        }
    }

    /// @notice Phase 45b O-3: Slash a bidder who committed but never revealed after the
    ///         full reveal window elapsed. Callable only by the session creator. Slashes
    ///         NO_SHOW_SLASH_BP (5%) of the bidder's stake to the treasury and refunds
    ///         the remainder. The bid is marked rejected + stakeWithdrawn so it cannot be
    ///         accepted or slashed again. Reverts on invalid session, un-ended reveal
    ///         window, missing bid, revealed/accepted/already-settled bid, or zero stake.
    function slashNoShow(uint256 sessionId, address bidder) external nonReentrant onlySessionCreator(sessionId) {
        Session storage session = sessions[sessionId];
        if (!(session.id != 0)) revert BiddingSystem__Invalid_session();
        if (!(block.timestamp >= session.revealWindowEnd)) revert BiddingSystem__Reveal_window_not_ended();
        if (!(bidder != address(0))) revert BiddingSystem__Zero_address();

        uint256 bidIndex = bidderToBidIndex[sessionId][bidder];
        if (!(bidIndex != 0)) revert BiddingSystem__No_bid_found();

        Bid storage bid = sessionBids[sessionId][bidIndex - 1];
        if (bid.revealed) revert BiddingSystem__No_show_not_eligible();
        if (bid.accepted) revert BiddingSystem__Bid_already_accepted();
        if (bid.rejected) revert BiddingSystem__Already_settled();
        if (bid.stakeWithdrawn) revert BiddingSystem__Stake_already_withdrawn();

        uint256 totalStake = bid.stake;
        if (!(totalStake > 0)) revert BiddingSystem__No_stake_to_withdraw();

        uint256 slashAmount = (totalStake * NO_SHOW_SLASH_BP) / FEE_DENOMINATOR;
        uint256 refundAmount = totalStake - slashAmount;

        // Effects (CEI): zero out the bid and reduce tracked stake before external calls
        bid.stake = 0;
        bid.stakeWithdrawn = true;
        bid.rejected = true;
        totalStakesHeld[sessionId] -= totalStake;

        // Interactions: slash goes to treasury, remainder refunded to bidder.
        if (slashAmount > 0) {
            _sendToken(session.paymentToken, treasury, slashAmount);
        }
        if (refundAmount > 0) {
            _sendToken(session.paymentToken, bidder, refundAmount);
        }

        emit BidderSlashed(sessionId, bidder, slashAmount, refundAmount);
    }
    
    /***********************************/
    /* Job Creation & Integration */
    /***********************************/
    
    function createJobAndFund(
        uint256 sessionId,
        uint256 jobExpiredAt,
        string calldata description
    ) external payable nonReentrant onlySessionCreator(sessionId) returns (uint256 jobId) {
        Session storage session = sessions[sessionId];
        
        if (!(session.status == SessionStatus.WinnerSelected)) revert BiddingSystem__No_winner_selected();
        if (!(!session.jobCreated)) revert BiddingSystem__Job_already_created();
        
        if (!(jobExpiredAt > block.timestamp + MIN_JOB_EXPIRY)) revert BiddingSystem__Expiry_too_soon();
        if (!(jobExpiredAt <= block.timestamp + MAX_JOB_EXPIRY)) revert BiddingSystem__Expiry_too_far();
        
        // Get winning bid amount
        uint256 bidAmount = sessionBids[sessionId][session.winningBidId - 1].proposedAmount;
        // Phase 45c O-11: use the per-token fee (or global default) at job-funding time.
        uint256 feeBP = getPlatformFeeBP(session.paymentToken);
        uint256 totalPayment = bidAmount + (bidAmount * feeBP) / FEE_DENOMINATOR;
        
        // Phase 40: Collect payment in session's token
        _receiveToken(session.paymentToken, msg.sender, totalPayment);
        
        // Set guard flags BEFORE external call to prevent reentrancy
        session.jobCreated = true;
        session.status = SessionStatus.JobCreated;
        
        // Create job in AgenticCommerceV9 with budget at creation for the session creator (client)
        // Phase 39: Pass address(0) when useRandomEvaluator is true to trigger random selection
        // Phase 40: Pass session.paymentToken
        // Phase 45b: Only forward `value: bidAmount` for native ETH sessions. ERC-20 sessions
        // pull the payment via _receiveToken above and must not send native value (would revert
        // with OutOfFunds on the downstream call when the BiddingSystem has no ETH balance).
        address jobEvaluator = session.useRandomEvaluator ? address(0) : session.evaluator;
        uint256 ethValue = session.paymentToken == address(0) ? bidAmount : 0;
        jobId = IAgenticCommerceV9(commerce).createJobForClient{value: ethValue}(
            msg.sender,           // client (session creator)
            session.winner,       // provider
            bidAmount,            // budget
            session.paymentToken, // paymentToken (Phase 40: from session)
            session.serviceId,    // serviceId
            jobExpiredAt,         // expiredAt
            description,          // description
            jobEvaluator,         // evaluator (address(0) for random, specific address otherwise)
            address(0),           // hook: none
            false,                // evaluatorFee: no
            false,                // clientReview_: no
            true,                 // fundNow: yes
            bidAmount             // fundAmount
        );
        
        // Store jobId after external call (depends on return value)
        session.jobId = jobId;

        // Pay platform fee (tracked for accounting; actual transfer happens via job creation)
        uint256 fee = (bidAmount * feeBP) / FEE_DENOMINATOR;
        if (fee > 0) {
            // Phase 45b O-10: track per-token fees so withdrawFees(token) can pull
            // the full balance in one call. Native ETH continues to use the
            // totalAccumulatedFees counter for backward compat with withdrawPlatformFees.
            if (session.paymentToken == address(0)) {
                totalAccumulatedFees += fee;
            } else {
                accumulatedFeesByToken[session.paymentToken] += fee;
            }
        }

        // Phase 45b O-13: emit EvaluatorFinalized at the moment the session transitions
        // to JobCreated and the evaluator is locked in. address(0) is valid and means
        // the AgenticCommerce pool will select one at random.
        emit EvaluatorFinalized(sessionId, jobEvaluator, block.timestamp);
        
        // Return winner's stake
        uint256 winStake = sessionBids[sessionId][session.winningBidId - 1].stake;
        if (winStake > 0) {
            sessionBids[sessionId][session.winningBidId - 1].stake = 0;
            totalStakesHeld[sessionId] -= winStake;
            _sendToken(session.paymentToken, session.winner, winStake);
        }

        // Return creator's session stake
        uint256 creatorStake = calculateStake(session.maxBudget);
        if (creatorStake > 0 && totalStakesHeld[sessionId] >= creatorStake) {
            creatorStakeWithdrawn[sessionId] = true;
            totalStakesHeld[sessionId] -= creatorStake;
            _sendToken(session.paymentToken, session.creator, creatorStake);
        }
        
        emit JobCreatedFromSession(sessionId, jobId, session.winner, bidAmount);
    }
    
    /***********************************/
    /* Session Management */
    /***********************************/
    
    function cancelSession(uint256 sessionId) external nonReentrant onlySessionCreator(sessionId) {
        Session storage session = sessions[sessionId];

        if (!(session.id != 0)) revert BiddingSystem__Invalid_session();
        // Phase 45b O-2: allow cancellation while status is BiddingClosed too, as
        // long as no revealed bids and no winner. Lets the creator give up after
        // the deadline arrives but before reveals.
        if (!(session.status == SessionStatus.Active || session.status == SessionStatus.BiddingClosed)) revert BiddingSystem__Cannot_cancel();
        if (!(session.winner == address(0))) revert BiddingSystem__Winner_selected();
        if (!(!session.jobCreated)) revert BiddingSystem__Job_created();

        // Check if any bids are revealed
        bool hasRevealedBids = false;
        for (uint256 i = 0; i < sessionBids[sessionId].length; i++) {
            if (sessionBids[sessionId][i].revealed) {
                hasRevealedBids = true;
                break;
            }
        }
        if (!(!hasRevealedBids)) revert BiddingSystem__Cannot_cancel_bids_revealed();

        // Effects before external call
        session.status = SessionStatus.Cancelled;

        // Return creator's session stake
        uint256 creatorStake = calculateStake(session.maxBudget);
        if (creatorStake > 0 && totalStakesHeld[sessionId] >= creatorStake) {
            creatorStakeWithdrawn[sessionId] = true;
            totalStakesHeld[sessionId] -= creatorStake;
        }
        // Phase 40: Refund in session's payment token
        _sendToken(session.paymentToken, msg.sender, creatorStake);

        // Phase 45c O-9: start the 30-day withdraw clock for every committed bidder.
        // cancelSession has no winner, so all bidders are "non-winners" and the
        // winningBidId parameter is 0 (which never matches any bidId).
        _startWithdrawClockForNonWinners(sessionId, 0);

        emit SessionCancelled(sessionId, msg.sender);
    }

    /// @notice Phase 45b O-2: Permissionlessly close bidding once the deadline has passed.
    ///         Transitions the session from Active to BiddingClosed and emits BiddingClosed.
    ///         Reverts if the session is not Active, the deadline has not passed, or the
    ///         session id is invalid. Anyone (including the creator) can call.
    function closeBidding(uint256 sessionId) external nonReentrant {
        Session storage session = sessions[sessionId];
        if (!(session.id != 0)) revert BiddingSystem__Invalid_session();
        if (session.status != SessionStatus.Active) revert BiddingSystem__Wrong_session_status();
        if (!(block.timestamp >= session.deadline)) revert BiddingSystem__Deadline_not_passed();

        session.status = SessionStatus.BiddingClosed;
        emit BiddingClosed(sessionId, msg.sender, block.timestamp);
    }
    
    function completeSession(uint256 sessionId) external nonReentrant {
        Session storage session = sessions[sessionId];

        if (!(session.id != 0)) revert BiddingSystem__Invalid_session();
        if (!(session.status == SessionStatus.JobCreated)) revert BiddingSystem__Wrong_status();

        session.status = SessionStatus.Completed;

        // Phase 45c O-9: start the 30-day withdraw clock for any bidder that
        // did not win (the winner's stake was already refunded in createJobAndFund).
        _startWithdrawClockForNonWinners(sessionId, session.winningBidId);

        emit SessionCompleted(sessionId);
    }
    
    function extendRevealWindow(uint256 sessionId, uint256 additionalSeconds) 
        external 
        onlySessionCreator(sessionId) 
    {
        Session storage session = sessions[sessionId];
        
        if (!(session.id != 0)) revert BiddingSystem__Invalid_session();
        if (!(block.timestamp >= session.deadline)) revert BiddingSystem__Deadline_not_passed();
        if (!(block.timestamp < session.revealWindowEnd)) revert BiddingSystem__Reveal_window_already_closed();
        if (!(additionalSeconds <= MAX_REVEAL_EXTENSION)) revert BiddingSystem__Extension_too_long();
        
        session.revealWindowEnd += additionalSeconds;
        
        emit RevealWindowExtended(sessionId, session.revealWindowEnd);
    }
    
    /***********************************/
    /* View Functions */
    /***********************************/
    
    function getSession(uint256 sessionId) external view returns (Session memory) {
        return sessions[sessionId];
    }
    
    function getBid(uint256 sessionId, uint256 bidId) external view returns (Bid memory) {
        if (!(bidId > 0 && bidId <= sessionBids[sessionId].length)) revert BiddingSystem__Invalid_bid();
        return sessionBids[sessionId][bidId - 1];
    }
    
    function getUserBid(uint256 sessionId, address user) external view returns (Bid memory) {
        uint256 bidIndex = bidderToBidIndex[sessionId][user];
        if (bidIndex == 0) {
            return Bid({
                bidId: 0,
                bidder: address(0),
                proposedAmount: 0,
                stake: 0,
                message: "",
                commitHash: bytes32(0),
                revealed: false,
                accepted: false,
                rejected: false,
                stakeWithdrawn: false,
                timestamp: 0,
                status: BidStatus.None
            });
        }
        return sessionBids[sessionId][bidIndex - 1];
    }

    /// @notice Phase 45c O-12: explicit BidStatus lookup. Returns BidStatus.None for
    ///         unknown bidders. Avoids the offchain dance of joining the
    ///         (revealed, accepted, rejected, stakeWithdrawn) booleans.
    function getBidStatus(uint256 sessionId, address bidder) external view returns (BidStatus) {
        uint256 bidIndex = bidderToBidIndex[sessionId][bidder];
        if (bidIndex == 0) return BidStatus.None;
        return sessionBids[sessionId][bidIndex - 1].status;
    }
    
    function getRevealedBids(uint256 sessionId) external view returns (Bid[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < sessionBids[sessionId].length; i++) {
            if (sessionBids[sessionId][i].revealed) {
                count++;
            }
        }
        
        Bid[] memory revealed = new Bid[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < sessionBids[sessionId].length; i++) {
            if (sessionBids[sessionId][i].revealed) {
                revealed[index] = sessionBids[sessionId][i];
                index++;
            }
        }
        
        return revealed;
    }
    
    function getSessionCount() external view returns (uint256) {
        return sessionCounter;
    }
    
    function calculateStake(uint256 maxBudget) public view returns (uint256) {
        return (maxBudget * MIN_STAKE_BP) / FEE_DENOMINATOR;
    }
    
    /***********************************/
    /* Admin Functions */
    /***********************************/
    
    function setCommerce(address commerce_) external onlyOwner {
        if (!(commerce_ != address(0))) revert BiddingSystem__Zero_commerce();
        emit CommerceUpdated(commerce, commerce_);
        commerce = commerce_;
    }
    
    function setTreasury(address treasury_) external onlyOwner {
        if (!(treasury_ != address(0))) revert BiddingSystem__Zero_treasury();
        emit TreasuryUpdated(treasury, treasury_);
        treasury = treasury_;
    }

    function setAdminRegistry(address _adminRegistry) external onlyOwner {
        if (!(_adminRegistry != address(0))) revert BiddingSystem__Zero_address();
        uint256 size;
        assembly ("memory-safe") { size := extcodesize(_adminRegistry) }
        if (size == 0) revert BiddingSystem__Zero_address();
        emit AdminRegistryUpdated(adminRegistry, _adminRegistry);
        adminRegistry = _adminRegistry;
    }
    
    function setRevealWindow(uint256 window_) external onlyOwner {
        if (!(window_ >= 15 minutes && window_ <= 24 hours)) revert BiddingSystem__Invalid_window();
        emit RevealWindowUpdated(revealWindow, window_);
        revealWindow = window_;
    }
    
    function setPlatformFeeBP(uint256 basisPoints_) external onlyOwner {
        if (!(basisPoints_ <= 1000)) revert BiddingSystem__Max_10_fee(); // Max 10%
        emit PlatformFeeUpdated(platformFeeBP, basisPoints_);
        platformFeeBP = basisPoints_;
    }

    /// @notice Phase 45c O-11: per-token platform fee override. Use address(0) to
    ///         update the global default (equivalent to setPlatformFeeBP).
    function setPlatformFeeBPForToken(address token, uint256 basisPoints_) external onlyOwner {
        if (!(basisPoints_ <= 1000)) revert BiddingSystem__Max_10_fee(); // Max 10%
        if (token == address(0)) {
            // Update the global default so that getPlatformFeeBP(address(0)) returns it.
            emit PlatformFeeUpdated(platformFeeBP, basisPoints_);
            platformFeeBP = basisPoints_;
        } else {
            platformFeeBPByToken[token] = basisPoints_;
        }
    }

    /// @notice Phase 45c O-11: per-token platform-fee resolver. Returns the
    ///         explicit override for `token` if set, otherwise the global default.
    function getPlatformFeeBP(address token) public view returns (uint256) {
        if (token != address(0)) {
            uint256 override_ = platformFeeBPByToken[token];
            if (override_ != 0) return override_;
        }
        return platformFeeBP;
    }

    /// @notice Phase 45c O-4: update the lower bound for `calculateStake(maxBudget)`.
    function setMinStake(uint256 newMin) external onlyOwner {
        if (!(newMin <= maxStake)) revert BiddingSystem__Invalid_stake_bounds();
        minStake = newMin;
    }

    /// @notice Phase 45c O-4: update the upper bound for `calculateStake(maxBudget)`.
    function setMaxStake(uint256 newMax) external onlyOwner {
        if (!(minStake <= newMax)) revert BiddingSystem__Invalid_stake_bounds();
        maxStake = newMax;
    }

    /// @notice Phase 45c O-4: atomically set both bounds. Useful for ERC-20 tokens
    ///         where the owner wants to set a single (min, max) pair in raw token units.
    function setStakeBounds(uint256 newMin, uint256 newMax) external onlyOwner {
        if (!(newMin <= newMax)) revert BiddingSystem__Invalid_stake_bounds();
        minStake = newMin;
        maxStake = newMax;
    }
    
    function withdrawPlatformFees(address payable to, uint256 amount) external onlyOwner {
        if (!(to != address(0))) revert BiddingSystem__Zero_address();
        if (!(amount <= totalAccumulatedFees)) revert BiddingSystem__Insufficient_balance();
        totalAccumulatedFees -= amount;
        _sendEth(to, amount);
    }

    /// @notice Phase 45b O-10: Withdraw the full accumulated platform-fee balance for
    ///         a given token to the treasury. Use address(0) for native ETH.
    ///         For ERC-20 tokens the entire `accumulatedFeesByToken[token]` balance is
    ///         transferred; for ETH the `totalAccumulatedFees` counter is decremented and
    ///         the equivalent wei balance is sent.
    function withdrawFees(address token) external onlyOwner nonReentrant {
        if (token == address(0)) {
            uint256 amount = totalAccumulatedFees;
            if (!(amount > 0)) revert BiddingSystem__No_fees_to_withdraw();
            totalAccumulatedFees = 0;
            _sendEth(treasury, amount);
            emit FeesWithdrawn(address(0), treasury, amount);
        } else {
            uint256 amount = accumulatedFeesByToken[token];
            if (!(amount > 0)) revert BiddingSystem__No_fees_to_withdraw();
            accumulatedFeesByToken[token] = 0;
            IERC20(token).safeTransfer(treasury, amount);
            emit FeesWithdrawn(token, treasury, amount);
        }
    }
    
    /***********************************/
    /* Receive / Fallback */
    /***********************************/
    
    receive() external payable {}

    /***********************************/
    /* Internal Helpers */
    /***********************************/
    
    function _sendEth(address to, uint256 amount) internal {
        if (amount == 0) return;
        (bool success, ) = payable(to).call{value: amount}("");
        if (!success) revert BiddingSystem__ETH_transfer_failed();
    }

    function _sendToken(address token, address to, uint256 amount) internal {
        if (amount == 0) return;
        if (token == address(0)) {
            _sendEth(to, amount);
        } else {
            IERC20(token).safeTransfer(to, amount);
        }
    }

    /// @dev Phase 45c O-9: write a `block.timestamp + WITHDRAW_TIMEOUT` deadline
    ///      for every non-winning bid that still has a stake. Idempotent — only
    ///      sets the timestamp if it is currently 0 (never rewinds).
    function _startWithdrawClockForNonWinners(uint256 sessionId, uint256 winningBidId) private {
        Bid[] storage bids = sessionBids[sessionId];
        uint256 len = bids.length;
        uint256 deadline = block.timestamp + WITHDRAW_TIMEOUT;
        for (uint256 i = 0; i < len; i++) {
            Bid storage b = bids[i];
            if (b.bidId == winningBidId) continue;
            if (b.stake == 0) continue;
            if (withdrawStakeClaimableAt[sessionId][b.bidder] != 0) continue;
            withdrawStakeClaimableAt[sessionId][b.bidder] = deadline;
        }
    }

    function _receiveToken(address token, address from, uint256 amount) internal {
        if (amount == 0) return;
        if (token == address(0)) {
            if (msg.value < amount) revert BiddingSystem__Insufficient_stake();
        } else {
            IERC20(token).safeTransferFrom(from, address(this), amount);
        }
    }

    function _refundExcess(address token, address from, uint256 received, uint256 required) internal {
        uint256 excess = received - required;
        if (excess > 0) {
            _sendToken(token, from, excess);
        }
    }
}

// FILE: contracts/shared/CommitReveal.sol

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

// FILE: contracts/shared/IACPHook.sol

// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import "@openzeppelin/contracts/utils/introspection/IERC165.sol";

/**
 * @title IACPHook
 * @dev Interface for Agentic Commerce Protocol hooks (ERC-8183)
 * 
 * Hooks extend the core ACP protocol without modifying it.
 * They are called before and after core functions.
 */
interface IACPHook is IERC165 {
    /**
     * @dev Called before a core action executes
     * @param jobId The job ID
     * @param selector The function selector being called
     * @param data Encoded function parameters
     */
    function beforeAction(
        uint256 jobId, 
        bytes4 selector, 
        bytes calldata data
    ) external;
    
    /**
     * @dev Called after a core action executes
     * @param jobId The job ID
     * @param selector The function selector that was called
     * @param data Encoded function parameters
     */
    function afterAction(
        uint256 jobId, 
        bytes4 selector, 
        bytes calldata data
    ) external;
}

// FILE: contracts/shared/MilestoneEscrow.sol

// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title MilestoneEscrow
 * @dev UUPS Upgradeable contract for milestone-based payments and dispute resolution
 * 
 * Features:
 * - Milestone-based payment release
 * - Arbiter pool for dispute resolution
 * - 0.01 ETH arbiter stake requirement
 * - 7-day auto-release timeout
 */
contract MilestoneEscrow is 
    ContextUpgradeable,
    Ownable2StepUpgradeable, 
    UUPSUpgradeable, 
    ReentrancyGuard,
    PausableUpgradeable
{
    using SafeERC20 for IERC20;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /***********************************/
    /* Constants */
    /***********************************/
    
    uint256 public constant ARBITER_STAKE = 0.01 ether;
    uint256 public constant ARBITER_FEE = 0.001 ether;
    uint256 public constant SLASH_PERCENT = 5000; // 50%
    uint256 public constant MAX_MILESTONES_PER_JOB = 10;
    uint256 public constant ARBITER_RESPONSE_WINDOW = 7 days;
    uint256 public constant MIN_EVALUATOR_REPUTATION = 50;
    
    /***********************************/
    /* Data Structures */
    /***********************************/
    
    struct Milestone {
        string description;
        uint256 amount;
        uint256 dueDate;
        bool completed;
        bool released;
        bytes32 proofHash;
    }
    
    struct Dispute {
        uint256 jobId;
        address flaggler;
        address arbiter;
        uint256 flaggedAt;
        bool resolved;
        bool releaseToProvider;
    }
    
    struct JobMilestones {
        address client;
        address provider;
        address paymentToken;
        uint256 totalBudget;
        bool usesMilestones;
        Milestone[] milestones;
    }

    /***********************************/
    /* State Variables */
    /***********************************/
    
    // Job milestone data
    mapping(uint256 => JobMilestones) public jobMilestones;
    
    // Arbiter system
    address[] public arbiterPool;
    mapping(address => uint256) public arbiterStakes;
    mapping(address => bool) public isRegisteredArbiter;
    
    // Dispute system
    mapping(uint256 => Dispute) public disputes;
    uint256[] public activeDisputeIds;
    
    // Reference to AgenticCommerce (for budget lookup)
    address public agenticCommerce;
    
    /***********************************/
    /* Errors */
    /***********************************/
    
    error ZeroAddress();
    error InvalidJob();
    error MilestonesNotEnabled();
    error TooManyMilestones();
    error MilestoneIndexOutOfBounds();
    error MilestoneAlreadyCompleted();
    error MilestoneAlreadyReleased();
    error MilestoneNotCompleted();
    error MilestoneAmountExceedsBudget();
    error MilestoneDueDatePassed();
    error OnlyArbiterCanRelease();
    error NotRegisteredArbiter();
    error ArbiterAlreadyRegistered();
    error InsufficientArbiterStake();
    error ArbiterHasActiveDisputes();
    error DisputeAlreadyExists();
    error DisputeNotActive();
    error DisputeAlreadyResolved();
    error OnlyArbiterOrParty();
    error Unauthorized();

    /***********************************/
    /* Events */
    /***********************************/
    
    event MilestoneEnabled(uint256 indexed jobId);
    event MilestoneAdded(uint256 indexed jobId, uint256 indexed milestoneIndex, string description, uint256 amount);
    event MilestoneCompleted(uint256 indexed jobId, uint256 indexed milestoneIndex, bytes32 proofHash);
    event MilestoneReleased(uint256 indexed jobId, uint256 indexed milestoneIndex, uint256 amount);
    event MilestoneAutoReleased(uint256 indexed jobId, uint256 indexed milestoneIndex, uint256 amount);
    
    event ArbiterRegistered(address indexed arbiter, uint256 stake);
    event ArbiterUnregistered(address indexed arbiter, uint256 refundedStake);
    event DisputeFlagged(uint256 indexed jobId, address indexed flaggler, uint256 fee);
    event EvidenceSubmitted(uint256 indexed jobId, address indexed submitter, bytes32 evidenceHash);
    event DisputeResolved(uint256 indexed jobId, bool releasedToProvider, address indexed arbiter, uint256 arbiterFee);
    event ArbiterSlashed(address indexed arbiter, uint256 slashedAmount, string reason);
    event ArbiterAssigned(uint256 indexed jobId, address indexed arbiter);
    
    event AgenticCommerceSet(address indexed oldAddress, address indexed newAddress);

    /***********************************/
    /* Initialization */
    /***********************************/
    
    function initialize(address initialOwner, address _agenticCommerce) public initializer {
        if (initialOwner == address(0)) revert ZeroAddress();
        if (_agenticCommerce == address(0)) revert ZeroAddress();
        __Context_init();
        __Ownable_init(initialOwner);
        __Pausable_init();

        agenticCommerce = _agenticCommerce;

        emit AgenticCommerceSet(address(0), _agenticCommerce);
    }

    /***********************************/
    /* UUPS */
    /***********************************/
    
    function _authorizeUpgrade(address newImpl) internal override onlyOwner {}

    /***********************************/
    /* Admin Functions */
    /***********************************/

    function setAgenticCommerce(address _agenticCommerce) external onlyOwner {
        if (_agenticCommerce == address(0)) revert ZeroAddress();
        emit AgenticCommerceSet(agenticCommerce, _agenticCommerce);
        agenticCommerce = _agenticCommerce;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /***********************************/
    /* Milestone Functions */
    /***********************************/
    
    /**
     * @dev Enable milestones for a job (called by client via AgenticCommerce)
     * @param jobId The job ID
     * @param client The job client
     * @param provider The job provider
     * @param paymentToken The payment token address
     * @param totalBudget Total job budget
     */
    function enableMilestones(
        uint256 jobId,
        address client,
        address provider,
        address paymentToken,
        uint256 totalBudget
    ) external whenNotPaused {
        // Allow either agenticCommerce OR the client to call
        if (_msgSender() != agenticCommerce && _msgSender() != client) revert Unauthorized();
        
        jobMilestones[jobId].client = client;
        jobMilestones[jobId].provider = provider;
        jobMilestones[jobId].paymentToken = paymentToken;
        jobMilestones[jobId].totalBudget = totalBudget;
        jobMilestones[jobId].usesMilestones = true;
        
        emit MilestoneEnabled(jobId);
    }
    
    /**
     * @dev Add a milestone to a job
     * @param jobId The job ID
     * @param description Milestone description
     * @param amount Milestone amount
     * @param dueDate Unix timestamp for due date
     */
    function addMilestone(
        uint256 jobId,
        string calldata description,
        uint256 amount,
        uint256 dueDate
    ) external whenNotPaused {
        JobMilestones storage jm = jobMilestones[jobId];
        if (jm.client == address(0)) revert InvalidJob();
        if (_msgSender() != jm.client) revert Unauthorized();
        
        uint256 count = jm.milestones.length;
        if (count >= MAX_MILESTONES_PER_JOB) revert TooManyMilestones();
        
        // Validate total doesn't exceed budget
        uint256 totalAmount = amount;
        for (uint256 i = 0; i < count; i++) {
            totalAmount += jm.milestones[i].amount;
        }
        if (totalAmount > jm.totalBudget) revert MilestoneAmountExceedsBudget();
        
        jm.milestones.push(Milestone({
            description: description,
            amount: amount,
            dueDate: dueDate,
            completed: false,
            released: false,
            proofHash: bytes32(0)
        }));
        
        emit MilestoneAdded(jobId, count, description, amount);
    }
    
    /**
     * @dev Mark a milestone as completed
     * @param jobId The job ID
     * @param milestoneIndex The milestone index
     * @param proofHash Hash of completion proof
     */
    function completeMilestone(
        uint256 jobId,
        uint256 milestoneIndex,
        bytes32 proofHash
    ) external whenNotPaused {
        JobMilestones storage jm = jobMilestones[jobId];
        if (jm.provider == address(0)) revert InvalidJob();
        if (_msgSender() != jm.provider) revert Unauthorized();
        
        uint256 count = jm.milestones.length;
        if (milestoneIndex >= count) revert MilestoneIndexOutOfBounds();
        
        Milestone storage milestone = jm.milestones[milestoneIndex];
        if (milestone.completed) revert MilestoneAlreadyCompleted();
        if (milestone.released) revert MilestoneAlreadyReleased();
        
        milestone.completed = true;
        milestone.proofHash = proofHash;
        
        emit MilestoneCompleted(jobId, milestoneIndex, proofHash);
    }
    
    /**
     * @dev Release a completed milestone (arbiter or auto-release)
     * @param jobId The job ID
     * @param milestoneIndex The milestone index
     */
    function releaseMilestone(uint256 jobId, uint256 milestoneIndex)
        external
        nonReentrant
        whenNotPaused
    {
        JobMilestones storage jm = jobMilestones[jobId];
        if (jm.provider == address(0)) revert InvalidJob();
        
        uint256 count = jm.milestones.length;
        if (milestoneIndex >= count) revert MilestoneIndexOutOfBounds();
        
        Milestone storage milestone = jm.milestones[milestoneIndex];
        if (!milestone.completed) revert MilestoneNotCompleted();
        if (milestone.released) revert MilestoneAlreadyReleased();
        
        // Check arbiter or auto-release
        Dispute storage dispute = disputes[jobId];
        bool arbiterCanRelease = dispute.arbiter == _msgSender() && dispute.jobId == jobId && !dispute.resolved;
        bool canAutoRelease = block.timestamp > dispute.flaggedAt + ARBITER_RESPONSE_WINDOW;
        
        if (!arbiterCanRelease && !canAutoRelease && dispute.flaggedAt != 0) revert OnlyArbiterCanRelease();
        
        milestone.released = true;
        
        // Transfer payment
        IERC20(jm.paymentToken).safeTransfer(jm.provider, milestone.amount);
        emit MilestoneReleased(jobId, milestoneIndex, milestone.amount);
        
        if (canAutoRelease && !milestone.released) {
            emit MilestoneAutoReleased(jobId, milestoneIndex, milestone.amount);
        }
    }
    
    /**
     * @dev Get milestones for a job
     * @param jobId The job ID
     * @return Array of milestones
     */
    function getJobMilestones(uint256 jobId) external view returns (Milestone[] memory) {
        return jobMilestones[jobId].milestones;
    }
    
    /**
     * @dev Get milestone count
     * @param jobId The job ID
     * @return Number of milestones
     */
    function getMilestoneCount(uint256 jobId) external view returns (uint256) {
        return jobMilestones[jobId].milestones.length;
    }

    /***********************************/
    /* Arbiter Functions */
    /***********************************/
    
    /**
     * @dev Register as an arbiter
     */
    function registerAsArbiter() external payable {
        if (isRegisteredArbiter[_msgSender()]) revert ArbiterAlreadyRegistered();
        if (msg.value < ARBITER_STAKE) revert InsufficientArbiterStake();
        
        arbiterStakes[_msgSender()] = msg.value;
        isRegisteredArbiter[_msgSender()] = true;
        arbiterPool.push(_msgSender());
        
        emit ArbiterRegistered(_msgSender(), msg.value);
    }
    
    /**
     * @dev Unregister as an arbiter
     */
    function unregisterAsArbiter() external {
        if (!isRegisteredArbiter[_msgSender()]) revert NotRegisteredArbiter();
        
        // Check no active disputes
        for (uint256 i = 0; i < activeDisputeIds.length; i++) {
            Dispute storage d = disputes[activeDisputeIds[i]];
            if (!d.resolved && d.arbiter == _msgSender()) {
                revert ArbiterHasActiveDisputes();
            }
        }
        
        uint256 stake = arbiterStakes[_msgSender()];
        arbiterStakes[_msgSender()] = 0;
        isRegisteredArbiter[_msgSender()] = false;
        
        // Remove from pool
        for (uint256 i = 0; i < arbiterPool.length; i++) {
            if (arbiterPool[i] == _msgSender()) {
                arbiterPool[i] = arbiterPool[arbiterPool.length - 1];
                arbiterPool.pop();
                break;
            }
        }
        
        payable(_msgSender()).transfer(stake);
        
        emit ArbiterUnregistered(_msgSender(), stake);
    }
    
    /**
     * @dev Get arbiter stake
     * @param arbiter Arbiter address
     * @return Stake amount
     */
    function getArbiterStake(address arbiter) external view returns (uint256) {
        return arbiterStakes[arbiter];
    }
    
    /**
     * @dev Check if address is registered arbiter
     * @param account Address to check
     * @return True if registered
     */
    function isArbiter(address account) external view returns (bool) {
        return isRegisteredArbiter[account];
    }

    /***********************************/
    /* Dispute Functions */
    /***********************************/
    
    /**
     * @dev Flag a dispute for a job
     * @param jobId The job ID
     */
    function flagDispute(uint256 jobId) external payable nonReentrant {
        JobMilestones storage jm = jobMilestones[jobId];
        if (jm.client == address(0)) revert InvalidJob();
        
        if (_msgSender() != jm.client && _msgSender() != jm.provider) revert Unauthorized();
        if (msg.value < ARBITER_FEE) revert InsufficientArbiterStake();
        
        if (disputes[jobId].flaggedAt != 0) revert DisputeAlreadyExists();
        
        // Assign random arbiter
        if (arbiterPool.length == 0) revert NotRegisteredArbiter();
        
        uint256 randomIndex = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            jobId,
            _msgSender()
        ))) % arbiterPool.length;
        
        address assignedArbiter = arbiterPool[randomIndex];
        
        disputes[jobId] = Dispute({
            jobId: jobId,
            flaggler: _msgSender(),
            arbiter: assignedArbiter,
            flaggedAt: block.timestamp,
            resolved: false,
            releaseToProvider: false
        });
        
        activeDisputeIds.push(jobId);
        
        emit DisputeFlagged(jobId, _msgSender(), msg.value);
        emit ArbiterAssigned(jobId, assignedArbiter);
    }
    
    /**
     * @dev Submit evidence for a dispute
     * @param jobId The job ID
     * @param evidenceHash Hash of evidence
     */
    function submitEvidence(uint256 jobId, bytes32 evidenceHash) external whenNotPaused {
        Dispute storage dispute = disputes[jobId];
        if (dispute.flaggedAt == 0) revert DisputeNotActive();
        if (dispute.resolved) revert DisputeAlreadyResolved();
        
        JobMilestones storage jm = jobMilestones[jobId];
        if (_msgSender() != jm.client && _msgSender() != jm.provider) revert Unauthorized();
        
        emit EvidenceSubmitted(jobId, _msgSender(), evidenceHash);
    }
    
    /**
     * @dev Resolve a dispute
     * @param jobId The job ID
     * @param releaseToProvider True to release, false to refund
     */
    function resolveDispute(uint256 jobId, bool releaseToProvider)
        external
        nonReentrant
        whenNotPaused
    {
        Dispute storage dispute = disputes[jobId];
        if (dispute.arbiter != _msgSender()) revert OnlyArbiterOrParty();
        if (dispute.resolved) revert DisputeAlreadyResolved();
        
        dispute.resolved = true;
        dispute.releaseToProvider = releaseToProvider;
        
        JobMilestones storage jm = jobMilestones[jobId];
        
        if (releaseToProvider) {
            // Release all unreleased milestones to provider
            for (uint256 i = 0; i < jm.milestones.length; i++) {
                if (!jm.milestones[i].released) {
                    jm.milestones[i].released = true;
                    IERC20(jm.paymentToken).safeTransfer(jm.provider, jm.milestones[i].amount);
                    emit MilestoneReleased(jobId, i, jm.milestones[i].amount);
                }
            }
        } else {
            // Refund all to client
            for (uint256 i = 0; i < jm.milestones.length; i++) {
                if (!jm.milestones[i].released && jm.milestones[i].completed) {
                    jm.milestones[i].released = true;
                    IERC20(jm.paymentToken).safeTransfer(jm.client, jm.milestones[i].amount);
                }
            }
        }
        
        // Pay arbiter
        IERC20(jm.paymentToken).safeTransfer(dispute.arbiter, ARBITER_FEE);
        
        emit DisputeResolved(jobId, releaseToProvider, dispute.arbiter, ARBITER_FEE);
    }
    
    /**
     * @dev Get dispute details
     * @param jobId The job ID
     * @return Dispute struct
     */
    function getDispute(uint256 jobId) external view returns (Dispute memory) {
        return disputes[jobId];
    }
    
    /**
     * @dev Get active disputes
     * @return Array of active dispute job IDs
     */
    function getActiveDisputes() external view returns (uint256[] memory) {
        return activeDisputeIds;
    }
    
    /**
     * @dev Get arbiter count
     * @return Number of registered arbiters
     */
    function getArbiterCount() external view returns (uint256) {
        return arbiterPool.length;
    }

    /// @dev Storage gap for upgrade safety
    uint256[50] private __gap;
}
// FILE: contracts/shared/MilestoneEscrowV2.sol

// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IAgenticCommerceJobView {
    function jobs(uint256 jobId) external view returns (
        uint256 id,
        address client,
        address provider,
        address evaluator,
        uint256 serviceId,
        address paymentToken,
        string memory description,
        uint256 budget,
        uint256 expiredAt,
        uint8 status,
        address hook,
        bytes32 deliverable
    );
}

/**
 * @title MilestoneEscrowV2
 * @dev UUPS Upgradeable contract for milestone-based payments and dispute resolution
 * 
 * V2 Changes:
 * - Per-token arbiter fees (not hardcoded ETH)
 * - Per-token arbiter stakes (supports USDC, USDT, etc.)
 * - Dispute flagging uses job's paymentToken instead of ETH
 * - Removed critical $1T USDC transfer bug
 */
contract MilestoneEscrowV2 is 
    ContextUpgradeable,
    Ownable2StepUpgradeable, 
    UUPSUpgradeable, 
    ReentrancyGuard,
    PausableUpgradeable
{
    using SafeERC20 for IERC20;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /***********************************/
    /* Constants */
    /***********************************/
    
    uint256 public constant SLASH_PERCENT = 5000; // 50%
    uint256 public constant MAX_MILESTONES_PER_JOB = 10;
    uint256 public constant ARBITER_RESPONSE_WINDOW = 7 days;
    uint256 public constant MIN_EVALUATOR_REPUTATION = 50;
    
    /***********************************/
    /* Data Structures */
    /***********************************/
    
    struct Milestone {
        string description;
        uint256 amount;
        uint256 dueDate;
        bool completed;
        bool released;
        bytes32 proofHash;
    }
    
    struct Dispute {
        uint256 jobId;
        address flagger;
        address arbiter;
        uint256 flaggedAt;
        bool resolved;
        bool releaseToProvider;
        uint256 feePaid; // Amount of fee paid in paymentToken
        uint256 milestoneIndex; // Index of the disputed milestone (VULN-11 fix)
    }
    
    struct JobMilestones {
        address client;
        address provider;
        address paymentToken;
        uint256 totalBudget;
        bool usesMilestones;
        Milestone[] milestones;
    }

    /***********************************/
    /* State Variables */
    /***********************************/
    
    // V2: Per-token configuration
    mapping(address => uint256) public arbiterFeePerToken; // Fee to flag dispute
    mapping(address => uint256) public arbiterStakePerToken; // Stake to register as arbiter
    mapping(address => bool) public supportedTokens;
    
    // Job milestone data
    mapping(uint256 => JobMilestones) public jobMilestones;
    mapping(uint256 => uint256) public milestoneTotalAmount; // I6-04: Running total for O(1) budget checks
    
    // Arbiter system
    address[] public arbiterPool;
    mapping(address => uint256) public arbiterStakes;
    mapping(address => address) public arbiterStakeToken; // Token used for stake
    mapping(address => bool) public isRegisteredArbiter;
    
    // Dispute system
    mapping(uint256 => Dispute) public disputes;
    uint256[] public activeDisputeIds;
    
    // Reference to AgenticCommerce (for budget lookup)
    address public agenticCommerce;

    // Funds reserved for milestone releases, isolated per job.
    mapping(uint256 => uint256) public milestoneEscrowBalance;
    
    /***********************************/
    /* Errors */
    /***********************************/
    
    error ZeroAddress();
    error InvalidJob();
    error MilestonesNotEnabled();
    error TooManyMilestones();
    error MilestoneIndexOutOfBounds();
    error MilestoneAlreadyCompleted();
    error MilestoneAlreadyReleased();
    error MilestoneNotCompleted();
    error MilestoneAmountExceedsBudget();
    error MilestoneDueDatePassed();
    error OnlyArbiterCanRelease();
    error NotRegisteredArbiter();
    error ArbiterAlreadyRegistered();
    error InsufficientArbiterStake();
    error InsufficientArbiterFee();
    error ArbiterHasActiveDisputes();
    error DisputeAlreadyExists();
    error DisputeNotActive();
    error DisputeAlreadyResolved();
    error OnlyArbiterOrParty();
    error Unauthorized();
    error TokenNotSupported();
    error InvalidTokenAmount();
    error EthTransferFailed();
    error InsufficientMilestoneBalance();

    /***********************************/
    /* Events */
    /***********************************/
    
    event MilestoneEnabled(uint256 indexed jobId);
    event MilestoneFunded(uint256 indexed jobId, address indexed funder, address token, uint256 amount);
    event MilestoneAdded(uint256 indexed jobId, uint256 indexed milestoneIndex, string description, uint256 amount);
    event MilestoneCompleted(uint256 indexed jobId, uint256 indexed milestoneIndex, bytes32 proofHash);
    event MilestoneReleased(uint256 indexed jobId, uint256 indexed milestoneIndex, uint256 amount);
    event MilestoneNotReleased(uint256 indexed jobId, uint256 indexed milestoneIndex, string reason);
    
    event ArbiterRegistered(address indexed arbiter, address token, uint256 stake);
    event ArbiterUnregistered(address indexed arbiter, address token, uint256 refundedStake);
    event DisputeFlagged(uint256 indexed jobId, address indexed flagger, address token, uint256 fee);
    event EvidenceSubmitted(uint256 indexed jobId, address indexed submitter, bytes32 evidenceHash);
    event DisputeResolved(uint256 indexed jobId, bool releasedToProvider, address indexed arbiter, address token, uint256 arbiterFee);
    event ArbiterSlashed(address indexed arbiter, uint256 slashedAmount, string reason);
    event ArbiterAssigned(uint256 indexed jobId, address indexed arbiter);
    
    event ArbiterFeeUpdated(address indexed token, uint256 newFee);
    event ArbiterStakeUpdated(address indexed token, uint256 newStake);
    event TokenSupportUpdated(address indexed token, bool supported);
    event AgenticCommerceSet(address indexed oldAddress, address indexed newAddress);

    /***********************************/
    /* Internal Helpers */
    /***********************************/

    /**
     * @dev Safely transfer either native ETH or ERC-20 tokens.
     * Used by releaseMilestone, resolveDispute, and unregisterAsArbiter.
     * @param token address(0) for native, otherwise ERC-20 address
     * @param to Recipient address
     * @param amount Amount to transfer
     */
    function _safeTransfer(address token, address to, uint256 amount) internal {
        if (token == address(0)) {
            (bool success, ) = payable(to).call{value: amount}("");
            if (!success) revert EthTransferFailed();
        } else {
            IERC20(token).safeTransfer(to, amount);
        }
    }

    function _validateLinkedJob(
        uint256 jobId,
        address client,
        address provider,
        address paymentToken,
        uint256 totalBudget
    ) internal view {
        // Unit tests and local isolated deployments can leave agenticCommerce unset.
        if (agenticCommerce == address(0)) return;

        (
            uint256 id,
            address jobClient,
            address jobProvider,
            ,
            ,
            address jobPaymentToken,
            ,
            uint256 jobBudget,
            ,
            ,
            ,

        ) = IAgenticCommerceJobView(agenticCommerce).jobs(jobId);

        if (id != jobId) revert InvalidJob();
        if (jobClient != client || jobProvider != provider) revert InvalidJob();
        if (jobPaymentToken != paymentToken || jobBudget != totalBudget) revert InvalidJob();
    }

    function _spendMilestoneBalance(uint256 jobId, uint256 amount) internal {
        uint256 balance = milestoneEscrowBalance[jobId];
        if (balance < amount) revert InsufficientMilestoneBalance();
        milestoneEscrowBalance[jobId] = balance - amount;
    }

    /***********************************/
    /* Initialization */
    /***********************************/
    
    function initialize(address initialOwner, address _agenticCommerce) public initializer {
        if (initialOwner == address(0)) revert ZeroAddress();
        __Context_init();
        __Ownable_init(initialOwner);
        __Pausable_init();

        // P7-04 FIX: Validate agenticCommerce is a contract
        if (_agenticCommerce != address(0)) {
            uint256 size;
            assembly ("memory-safe") { size := extcodesize(_agenticCommerce) }
            if (size == 0) revert InvalidJob();
        }

        agenticCommerce = _agenticCommerce;

        emit AgenticCommerceSet(address(0), _agenticCommerce);
    }

    /***********************************/
    /* UUPS */
    /***********************************/
    
    function _authorizeUpgrade(address newImpl) internal override onlyOwner {}

    /***********************************/
    /* Admin Functions */
    /***********************************/

    function setAgenticCommerce(address _agenticCommerce) external onlyOwner {
        // A3-04 FIX: Validate is contract
        if (_agenticCommerce != address(0)) {
            uint256 size;
            assembly ("memory-safe") { size := extcodesize(_agenticCommerce) }
            if (size == 0) revert InvalidJob();
        }
        emit AgenticCommerceSet(agenticCommerce, _agenticCommerce);
        agenticCommerce = _agenticCommerce;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Set arbiter fee for a specific token
     * @param token The payment token address
     * @param fee The fee amount in token's native units
     */
    function setArbiterFee(address token, uint256 fee) external onlyOwner {
        arbiterFeePerToken[token] = fee;
        emit ArbiterFeeUpdated(token, fee);
    }
    
    /**
     * @dev Set arbiter stake requirement for a specific token
     * @param token The staking token address
     * @param stake The stake amount in token's native units
     */
    function setArbiterStake(address token, uint256 stake) external onlyOwner {
        arbiterStakePerToken[token] = stake;
        emit ArbiterStakeUpdated(token, stake);
    }
    
    /**
     * @dev Set token support status
     * @param token The token address
     * @param supported Whether the token is supported
     */
    function setSupportedToken(address token, bool supported) external onlyOwner {
        supportedTokens[token] = supported;
        emit TokenSupportUpdated(token, supported);
    }

    /***********************************/
    /* Milestone Functions */
    /***********************************/
    
    /**
     * @dev Enable milestones for a job.
     * A3-06 NOTE: Both agenticCommerce AND client can enable milestones.
     * This allows clients to self-enable milestones for direct jobs,
     * but agenticCommerce can also enable them as part of job creation flow.
     */
    function enableMilestones(
        uint256 jobId,
        address client,
        address provider,
        address paymentToken,
        uint256 totalBudget
    ) external whenNotPaused {
        if (_msgSender() != agenticCommerce && _msgSender() != client) revert Unauthorized();
        if (client == address(0) || provider == address(0)) revert ZeroAddress();
        if (client == provider) revert InvalidJob();
        if (!supportedTokens[paymentToken]) revert TokenNotSupported();
        _validateLinkedJob(jobId, client, provider, paymentToken, totalBudget);
        
        jobMilestones[jobId].client = client;
        jobMilestones[jobId].provider = provider;
        jobMilestones[jobId].paymentToken = paymentToken;
        jobMilestones[jobId].totalBudget = totalBudget;
        jobMilestones[jobId].usesMilestones = true;
        
        emit MilestoneEnabled(jobId);
    }

    /**
     * @dev Fund milestone escrow for a job. Balances are isolated per job so
     * milestone releases cannot draw from arbiter stakes, dispute fees, or other jobs.
     */
    function fundMilestones(uint256 jobId, uint256 amount) external payable nonReentrant whenNotPaused {
        JobMilestones storage jm = jobMilestones[jobId];
        if (jm.client == address(0)) revert InvalidJob();
        if (_msgSender() != jm.client) revert Unauthorized();
        if (amount == 0) revert InvalidTokenAmount();

        address paymentToken = jm.paymentToken;
        if (paymentToken == address(0)) {
            if (msg.value != amount) revert InvalidTokenAmount();
        } else {
            if (msg.value != 0) revert InvalidTokenAmount();
            uint256 balanceBefore = IERC20(paymentToken).balanceOf(address(this));
            IERC20(paymentToken).safeTransferFrom(_msgSender(), address(this), amount);
            uint256 balanceAfter = IERC20(paymentToken).balanceOf(address(this));
            if (balanceAfter - balanceBefore != amount) revert InvalidTokenAmount();
        }

        milestoneEscrowBalance[jobId] += amount;
        emit MilestoneFunded(jobId, _msgSender(), paymentToken, amount);
    }
    
    /**
     * @dev Add a milestone to a job
     */
    function addMilestone(
        uint256 jobId,
        uint256 amount,
        string calldata description,
        uint256 dueDate
    ) external whenNotPaused {
        JobMilestones storage jm = jobMilestones[jobId];
        if (jm.client == address(0)) revert InvalidJob();
        if (_msgSender() != jm.client) revert Unauthorized();
        if (!jm.usesMilestones) revert MilestonesNotEnabled();
        if (jm.milestones.length >= MAX_MILESTONES_PER_JOB) revert TooManyMilestones();
        if (amount == 0) revert InvalidTokenAmount();
        
        // I6-04 FIX: Use running total for O(1) budget check
        uint256 currentTotal = milestoneTotalAmount[jobId];
        if (currentTotal + amount > jm.totalBudget) revert MilestoneAmountExceedsBudget();
        
        jm.milestones.push(Milestone({
            description: description,
            amount: amount,
            dueDate: dueDate,
            completed: false,
            released: false,
            proofHash: bytes32(0)
        }));
        
        // I6-04 FIX: Update running total
        milestoneTotalAmount[jobId] = currentTotal + amount;
        
        emit MilestoneAdded(jobId, jm.milestones.length - 1, description, amount);
    }
    
    /**
     * @dev Submit milestone completion
     */
    function submitMilestone(
        uint256 jobId,
        uint256 milestoneIndex,
        bytes32 proofHash
    ) external whenNotPaused {
        JobMilestones storage jm = jobMilestones[jobId];
        if (jm.provider == address(0)) revert InvalidJob();
        if (_msgSender() != jm.provider) revert Unauthorized();
        if (milestoneIndex >= jm.milestones.length) revert MilestoneIndexOutOfBounds();
        
        Milestone storage milestone = jm.milestones[milestoneIndex];
        if (milestone.completed) revert MilestoneAlreadyCompleted();
        
        milestone.completed = true;
        milestone.proofHash = proofHash;
        
        emit MilestoneCompleted(jobId, milestoneIndex, proofHash);
    }
    
    /**
     * @dev Release milestone payment
     */
    function releaseMilestone(
        uint256 jobId,
        uint256 milestoneIndex
    ) external nonReentrant whenNotPaused {
        JobMilestones storage jm = jobMilestones[jobId];
        if (jm.client == address(0)) revert InvalidJob();
        if (_msgSender() != jm.client) revert Unauthorized();
        if (milestoneIndex >= jm.milestones.length) revert MilestoneIndexOutOfBounds();
        
        Milestone storage milestone = jm.milestones[milestoneIndex];
        if (!milestone.completed) revert MilestoneNotCompleted();
        if (milestone.released) revert MilestoneAlreadyReleased();
        
        milestone.released = true;
        _spendMilestoneBalance(jobId, milestone.amount);

        // Transfer payment token to provider (native or ERC-20)
        _safeTransfer(jm.paymentToken, jm.provider, milestone.amount);

        emit MilestoneReleased(jobId, milestoneIndex, milestone.amount);
    }

    /***********************************/
    /* Dispute Functions */
    /***********************************/
    
    /**
     * @dev Flag a dispute for a job. Fee is paid in the job's paymentToken.
     * @param jobId The job ID
     */
    function flagDispute(uint256 jobId, uint256 milestoneIndex) external payable nonReentrant {
        JobMilestones storage jm = jobMilestones[jobId];
        if (jm.client == address(0)) revert InvalidJob();
        if (_msgSender() != jm.client && _msgSender() != jm.provider) revert Unauthorized();
        if (milestoneIndex >= jm.milestones.length) revert MilestoneIndexOutOfBounds();
        if (disputes[jobId].flaggedAt != 0) revert DisputeAlreadyExists();
        if (arbiterPool.length == 0) revert NotRegisteredArbiter();
        
        address paymentToken = jm.paymentToken;
        uint256 fee = arbiterFeePerToken[paymentToken];
        if (fee == 0) revert InsufficientArbiterFee();
        
        // Assign random arbiter using blockhash for verifiable randomness
        uint256 randomIndex = uint256(keccak256(abi.encodePacked(
            blockhash(block.number - 1),
            block.prevrandao,
            jobId,
            _msgSender()
        ))) % arbiterPool.length;
        
        address assignedArbiter = arbiterPool[randomIndex];
        
        // Effects: Write state before external call
        disputes[jobId] = Dispute({
            jobId: jobId,
            flagger: _msgSender(),
            arbiter: assignedArbiter,
            flaggedAt: block.timestamp,
            resolved: false,
            releaseToProvider: false,
            feePaid: fee,
            milestoneIndex: milestoneIndex
        });
        
        activeDisputeIds.push(jobId);
        
        // Interaction: Transfer fee (native or ERC-20)
        if (paymentToken == address(0)) {
            if (msg.value != fee) revert InsufficientArbiterFee();
        } else {
            if (msg.value != 0) revert InvalidTokenAmount();
            uint256 balanceBefore = IERC20(paymentToken).balanceOf(address(this));
            IERC20(paymentToken).safeTransferFrom(_msgSender(), address(this), fee);
            uint256 balanceAfter = IERC20(paymentToken).balanceOf(address(this));
            if (balanceAfter - balanceBefore != fee) revert InvalidTokenAmount();
        }
        
        emit DisputeFlagged(jobId, _msgSender(), paymentToken, fee);
        emit ArbiterAssigned(jobId, assignedArbiter);
    }
    
    /**
     * @dev Submit evidence for a dispute
     */
    function submitEvidence(uint256 jobId, bytes32 evidenceHash) external whenNotPaused {
        Dispute storage dispute = disputes[jobId];
        if (dispute.flaggedAt == 0) revert DisputeNotActive();
        if (dispute.resolved) revert DisputeAlreadyResolved();
        
        JobMilestones storage jm = jobMilestones[jobId];
        if (_msgSender() != jm.client && _msgSender() != jm.provider) revert Unauthorized();
        
        emit EvidenceSubmitted(jobId, _msgSender(), evidenceHash);
    }
    
    /**
     * @dev Resolve a dispute. Arbiter fee is paid from the fee collected during flagging.
     * Removes the dispute from activeDisputeIds immediately.
     */
    function resolveDispute(uint256 jobId, bool releaseToProvider)
        external
        whenNotPaused
        nonReentrant
    {
        Dispute storage dispute = disputes[jobId];
        if (dispute.arbiter != _msgSender()) revert OnlyArbiterOrParty();
        if (dispute.resolved) revert DisputeAlreadyResolved();

        dispute.resolved = true;
        dispute.releaseToProvider = releaseToProvider;

        JobMilestones storage jm = jobMilestones[jobId];
        uint256 mi = dispute.milestoneIndex;

        // VULN-11 FIX: Only resolve the specific disputed milestone, not all milestones
        if (mi < jm.milestones.length && !jm.milestones[mi].released) {
            if (releaseToProvider) {
                jm.milestones[mi].released = true;
                _spendMilestoneBalance(jobId, jm.milestones[mi].amount);
                _safeTransfer(jm.paymentToken, jm.provider, jm.milestones[mi].amount);
                emit MilestoneReleased(jobId, mi, jm.milestones[mi].amount);
            } else {
                // Only refund completed milestones to client
                if (jm.milestones[mi].completed) {
                    jm.milestones[mi].released = true;
                    _spendMilestoneBalance(jobId, jm.milestones[mi].amount);
                    _safeTransfer(jm.paymentToken, jm.client, jm.milestones[mi].amount);
                    emit MilestoneReleased(jobId, mi, jm.milestones[mi].amount);
                } else {
                    emit MilestoneNotReleased(jobId, mi, "Milestone not completed");
                }
            }
        }

        // Remove from activeDisputeIds immediately (swap-and-pop)
        _removeActiveDispute(jobId);

        // E4-06 FIX: Ensure contract holds enough payment token before transfer
        uint256 arbiterFee = dispute.feePaid;
        if (arbiterFee > 0) {
            if (jm.paymentToken != address(0)) {
                uint256 contractBalance = IERC20(jm.paymentToken).balanceOf(address(this));
                if (contractBalance < arbiterFee) revert InsufficientArbiterFee();
            }
            _safeTransfer(jm.paymentToken, dispute.arbiter, arbiterFee);
        }

        emit DisputeResolved(jobId, releaseToProvider, dispute.arbiter, jm.paymentToken, arbiterFee);
    }

    /**
     * @dev Remove a resolved dispute from activeDisputeIds using swap-and-pop.
     */
    function _removeActiveDispute(uint256 jobId) internal {
        uint256 length = activeDisputeIds.length;
        for (uint256 i = 0; i < length; i++) {
            if (activeDisputeIds[i] == jobId) {
                if (i != length - 1) {
                    activeDisputeIds[i] = activeDisputeIds[length - 1];
                }
                activeDisputeIds.pop();
                break;
            }
        }
    }
    
    /**
     * @dev Get dispute details
     */
    function getDispute(uint256 jobId) external view returns (Dispute memory) {
        return disputes[jobId];
    }
    
    /**
     * @dev Get active disputes
     */
    function getActiveDisputes() external view returns (uint256[] memory) {
        return activeDisputeIds;
    }
    
    /**
     * @dev Slash an arbiter
     */
    function slashArbiter(address arbiter, string calldata reason) external onlyOwner {
        if (!isRegisteredArbiter[arbiter]) revert NotRegisteredArbiter();
        
        uint256 stake = arbiterStakes[arbiter];
        uint256 slashAmount = (stake * SLASH_PERCENT) / 10000;
        
        arbiterStakes[arbiter] = stake - slashAmount;
        
        if (slashAmount > 0) {
            address token = arbiterStakeToken[arbiter];
            _safeTransfer(token, owner(), slashAmount);
        }
        
        emit ArbiterSlashed(arbiter, slashAmount, reason);
    }
    
    /**
     * @dev Withdraw accidentally sent tokens or accumulated slashed funds (owner only).
     * @param token The token address to withdraw.
     * @param amount The amount to withdraw.
     */
    function withdrawToken(address token, uint256 amount) external onlyOwner {
        if (amount == 0) revert InvalidTokenAmount();
        _safeTransfer(token, msg.sender, amount);
    }

    /***********************************/
    /* Arbiter Functions */
    /***********************************/
    
    /**
     * @dev Register as an arbiter with token stake
     * @param token The token to stake (must be supported)
     * @param amount The amount to stake
     */
    function registerAsArbiter(address token, uint256 amount) external payable nonReentrant {
        if (isRegisteredArbiter[_msgSender()]) revert ArbiterAlreadyRegistered();
        if (!supportedTokens[token]) revert TokenNotSupported();

        uint256 requiredStake = arbiterStakePerToken[token];
        if (requiredStake == 0) revert InsufficientArbiterStake();
        if (amount < requiredStake) revert InsufficientArbiterStake();

        // Effects: Write state before external call
        arbiterStakes[_msgSender()] = amount;
        arbiterStakeToken[_msgSender()] = token;
        isRegisteredArbiter[_msgSender()] = true;
        arbiterPool.push(_msgSender());

        // Interaction: Transfer stake
        if (token == address(0)) {
            if (msg.value != amount) revert InsufficientArbiterStake();
        } else {
            if (msg.value != 0) revert InvalidTokenAmount();
            uint256 balanceBefore = IERC20(token).balanceOf(address(this));
            IERC20(token).safeTransferFrom(_msgSender(), address(this), amount);
            uint256 balanceAfter = IERC20(token).balanceOf(address(this));
            if (balanceAfter - balanceBefore != amount) revert InvalidTokenAmount();
        }

        emit ArbiterRegistered(_msgSender(), token, amount);
    }
    
    /**
     * @dev Unregister as an arbiter
     */
    function unregisterAsArbiter() external nonReentrant {
        if (!isRegisteredArbiter[_msgSender()]) revert NotRegisteredArbiter();
        
        // Check no active disputes
        for (uint256 i = 0; i < activeDisputeIds.length; i++) {
            Dispute storage d = disputes[activeDisputeIds[i]];
            if (!d.resolved && d.arbiter == _msgSender()) {
                revert ArbiterHasActiveDisputes();
            }
        }
        
        uint256 stake = arbiterStakes[_msgSender()];
        address token = arbiterStakeToken[_msgSender()];
        arbiterStakes[_msgSender()] = 0;
        arbiterStakeToken[_msgSender()] = address(0);
        isRegisteredArbiter[_msgSender()] = false;
        
        // Remove from pool
        for (uint256 i = 0; i < arbiterPool.length; i++) {
            if (arbiterPool[i] == _msgSender()) {
                arbiterPool[i] = arbiterPool[arbiterPool.length - 1];
                arbiterPool.pop();
                break;
            }
        }
        
        // Return staked tokens (native or ERC-20)
        if (stake > 0) {
            _safeTransfer(token, _msgSender(), stake);
        }

        emit ArbiterUnregistered(_msgSender(), token, stake);
    }
    
    /**
     * @dev Get arbiter stake
     */
    function getArbiterStake(address arbiter) external view returns (uint256) {
        return arbiterStakes[arbiter];
    }
    
    /**
     * @dev Get arbiter stake token
     */
    function getArbiterStakeToken(address arbiter) external view returns (address) {
        return arbiterStakeToken[arbiter];
    }
    
    /**
     * @dev Get all arbiters
     */
    function getArbiters() external view returns (address[] memory) {
        return arbiterPool;
    }
    
    /**
     * @dev Get milestones for a job
     */
    function getJobMilestones(uint256 jobId) external view returns (Milestone[] memory) {
        return jobMilestones[jobId].milestones;
    }

    /// @dev Storage gap for upgrade safety
    uint256[49] private __gap;
}

// FILE: contracts/shared/PriceOracle.sol

// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

/**
 * @title AggregatorV3Interface
 * @dev Minimal interface for Chainlink price feeds
 */
interface AggregatorV3Interface {
    function decimals() external view returns (uint8);
    function description() external view returns (string memory);
    function version() external view returns (uint256);
    function getRoundData(uint80 _roundId) external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    );
    function latestRoundData() external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    );
}

/**
 * @title PriceOracle
 * @dev Unified price oracle that auto-detects network and uses Chainlink or fixed prices
 * 
 * Security features:
 * - Staleness checks to prevent stale data usage
 * - Zero/negative price validation
 * - Decimal handling for different token precisions
 * 
 * Note: On testnet, returns fixed $1 price. On mainnet, uses Chainlink feeds.
 */
contract PriceOracle {
    // Chain IDs
    uint256 public constant ETHEREUM_MAINNET = 1;
    uint256 public constant SEPOLIA = 11155111;

    // Sepolia price feeds (Chainlink) - verified addresses
    address public constant SEPOLIA_ETH_USD = 0x694AA1769357215DE4FAC081bf1f309aDC325306;
    address public constant SEPOLIA_USDC_USD = 0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43;

    // Max staleness period (1 hour)
    uint256 public constant MAX_STALENESS = 1 hours;

    // 1 USD in terms of 8 decimals (Chainlink format)
    int256 public constant ONE_USD = 100000000; // 1e8

    // Events
    event PriceUpdated(address indexed token, int256 price, uint256 timestamp);
    event NetworkDetected(uint256 chainId);
    event FallbackPriceUsed(address indexed token, int256 price);

    /**
     * @dev Get the USD price of a token
     * @param token Token address
     * @return price USD price with 8 decimals
     */
    function getUsdPriceOfToken(address token) external view returns (int256 price) {
        require(token != address(0), "Zero address");
        
        uint256 chainId = block.chainid;

        // On Sepolia, use Chainlink price feeds
        if (chainId == SEPOLIA) {
            return _getChainlinkPriceForSepolia(token);
        }

        // On mainnet, use Chainlink if available
        if (chainId == ETHEREUM_MAINNET) {
            return _getChainlinkPriceForMainnet(token);
        }

        // On unknown networks, use fixed $1 price
        return ONE_USD;
    }

    /**
     * @dev Get Chainlink price on Sepolia
     */
    function _getChainlinkPriceForSepolia(address token) internal view returns (int256) {
        address feed = token == address(0) ? SEPOLIA_ETH_USD : SEPOLIA_USDC_USD;
        
        if (feed == address(0)) {
            return ONE_USD;
        }
        
        AggregatorV3Interface aggregator = AggregatorV3Interface(feed);
        (, int256 answer,, uint256 updatedAt,) = aggregator.latestRoundData();
        
        // Check staleness
        if (block.timestamp - updatedAt > MAX_STALENESS) {
            return ONE_USD; // Fallback to $1 if stale
        }
        
        require(answer > 0, "Invalid price");
        return answer;
    }

    /**
     * @dev Get the amount of tokens for a given USD amount
     * @param usdAmount USD amount (with 6 decimals for USDC)
     * @param token Token address
     * @return tokenAmount Token amount
     */
    function getTokenAmountForUsd(uint256 usdAmount, address token) external view returns (uint256 tokenAmount) {
        require(token != address(0), "Zero address");
        require(usdAmount > 0, "Zero amount");

        int256 price = _getUsdPriceOfToken(token);
        require(price > 0, "Invalid price");

        uint8 tokenDecimals = _getTokenDecimals();
        
        // Normalize to 18 decimals for calculation
        uint256 normalizedUsd = usdAmount * 1e12; // USDC 6 + 12 = 18 decimals
        
        // Calculate token amount
        tokenAmount = (normalizedUsd * 1e8) / uint256(price);
        
        // Adjust for token decimals
        if (tokenDecimals < 18) {
            tokenAmount = tokenAmount / (10 ** (18 - tokenDecimals));
        } else if (tokenDecimals > 18) {
            tokenAmount = tokenAmount * (10 ** (tokenDecimals - 18));
        }
    }

    /**
     * @dev Internal helper to get USD price of token
     */
    function _getUsdPriceOfToken(address token) internal view returns (int256 price) {
        uint256 chainId = block.chainid;

        // On Sepolia or unknown networks, use fixed $1 price
        if (chainId != ETHEREUM_MAINNET) {
            return ONE_USD;
        }

        // On mainnet, use Chainlink if available
        return _getChainlinkPriceForMainnet(token);
    }

    /**
     * @dev Get Chainlink price on mainnet (placeholder)
     */
    function _getChainlinkPriceForMainnet(address) internal pure returns (int256) {
        // TODO: Replace with actual Chainlink feeds for mainnet
        return ONE_USD;
    }

    /**
     * @dev Get price from Chainlink aggregator with staleness check
     */
    function getChainlinkPrice(address feedAddress) external view returns (int256 price) {
        require(feedAddress != address(0), "Zero feed address");
        
        AggregatorV3Interface feed = AggregatorV3Interface(feedAddress);
        
        (, int256 answer,, uint256 updatedAt,) = feed.latestRoundData();

        // Validate price
        require(answer > 0, "Invalid price");

        // Check staleness
        require(block.timestamp - updatedAt <= MAX_STALENESS, "Stale price");
        
        return answer;
    }

    /**
     * @dev Get token decimals (simplified - assumes 18)
     */
    function _getTokenDecimals() internal pure returns (uint8) {
        return 18;
    }

    /**
     * @dev Get price feed address for a token
     */
    function getPriceFeedAddress(address token) external view returns (address feed) {
        uint256 chainId = block.chainid;
        
        if (chainId == SEPOLIA) {
            if (token == address(0)) return SEPOLIA_ETH_USD;
            return SEPOLIA_USDC_USD;
        }
        
        return address(0);
    }

    /**
     * @dev Get USDC price in USD (for SDK compatibility)
     */
    function getUSDCPrice() external view returns (uint256) {
        int256 price = _getUsdPriceOfToken(0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43); // USDC on Sepolia
        return uint256(price);
    }

    /**
     * @dev Get ETH rate in USD (for SDK compatibility)
     */
    function getETHRate() external view returns (uint256) {
        int256 price = _getUsdPriceOfToken(address(0)); // ETH
        return uint256(price);
    }

    /**
     * @dev Check if price is stale
     */
    function isStale() external view returns (bool) {
        address feed = SEPOLIA_ETH_USD;
        AggregatorV3Interface aggregator = AggregatorV3Interface(feed);
        (, int256 answer,, uint256 updatedAt,) = aggregator.latestRoundData();
        
        if (answer <= 0) return true;
        return (block.timestamp - updatedAt) > MAX_STALENESS;
    }
}

// FILE: contracts/shared/PriceOracleV2.sol

// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title AggregatorV3Interface
 * @dev Minimal interface for Chainlink price feeds
 */
interface AggregatorV3Interface {
    function decimals() external view returns (uint8);
    function latestRoundData() external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    );
}

/**
 * @title PriceOracleV2
 * @dev UUPS Upgradeable unified price oracle with per-token feed support
 * 
 * V2 Changes:
 * - UUPS Upgradeable for future modifications
 * - Per-token price feed registration via mapping
 * - Dynamic token decimal querying
 * - Support for arbitrary ERC20 tokens
 * - Removed hardcoded Sepolia addresses
 */
contract PriceOracleV2 is Ownable2StepUpgradeable, UUPSUpgradeable {
    error PriceOracleV2_Decimals_query_failed();
    error PriceOracleV2_Feed_not_a_contract();
    error PriceOracleV2_Invalid_decimals();
    error PriceOracleV2_Invalid_price();
    error PriceOracleV2_Length_mismatch();
    error PriceOracleV2_Round_not_complete();
    error PriceOracleV2_Stale_price();
    error PriceOracleV2_Stale_round();
    error PriceOracleV2_Zero_amount();
    error PriceOracleV2_Zero_token_address();
    error PriceOracleV2_Invalid_token_feed();

    
    // Max staleness period (1 hour)
    uint256 public constant MAX_STALENESS = 1 hours;
    
    // 1 USD in terms of 8 decimals (Chainlink format)
    int256 public constant ONE_USD = 100000000; // 1e8
    
    // V2: Per-token price feed mapping
    mapping(address => address) public priceFeeds;
    mapping(address => uint8) public feedDecimals;
    mapping(address => bool) public isStablecoin;
    
    address public ethPriceFeed;
    uint8 public ethFeedDecimals;
    
    // Events
    event PriceUpdated(address indexed token, int256 price, uint256 timestamp);
    event PriceFeedRegistered(address indexed token, address indexed feed, uint8 decimals);
    event PriceFeedRemoved(address indexed token);
    event StablecoinStatusChanged(address indexed token, bool isStable);
    event FallbackPriceUsed(address indexed token, int256 price);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address initialOwner) external initializer {
        __Ownable_init(initialOwner);
    }
    
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /**
     * @dev Register a price feed for a token
     * @param token The token address
     * @param feed The Chainlink price feed address
     * @param decimals The token's decimal places
     */
    function setPriceFeed(address token, address feed, uint8 decimals) external onlyOwner {
        if (!(token != address(0))) revert PriceOracleV2_Zero_token_address();
        if (!(feed.code.length > 0)) revert PriceOracleV2_Feed_not_a_contract();
        if (!(token != feed)) revert PriceOracleV2_Invalid_token_feed();
        priceFeeds[token] = feed;
        feedDecimals[token] = decimals;
        emit PriceFeedRegistered(token, feed, decimals);
    }
    
    /**
     * @dev Remove a price feed
     */
    function removePriceFeed(address token) external onlyOwner {
        delete priceFeeds[token];
        delete feedDecimals[token];
        emit PriceFeedRemoved(token);
    }
    
    /**
     * @dev Set stablecoin status (no oracle needed, $1 peg)
     */
    function setStablecoin(address token, bool isStable) external onlyOwner {
        isStablecoin[token] = isStable;
        emit StablecoinStatusChanged(token, isStable);
    }
    
    /**
     * @dev Set ETH price feed (special case since address(0) is ETH)
     * @param feed The Chainlink ETH/USD price feed address
     * @param decimals The ETH decimal places (18)
     */
    function setEthPriceFeed(address feed, uint8 decimals) external onlyOwner {
        if (!(feed.code.length > 0)) revert PriceOracleV2_Feed_not_a_contract();
        ethPriceFeed = feed;
        ethFeedDecimals = decimals;
        emit PriceFeedRegistered(address(0), feed, decimals);
    }

    /**
     * @dev Get the USD price of a token
     * @param token Token address (address(0) for ETH)
 * @return price USD price with 8 decimals
     */
    function getUsdPriceOfToken(address token) external view returns (int256 price) {
        // Stablecoins return $1
        if (isStablecoin[token]) {
            return ONE_USD;
        }
        
        // ETH special case
        if (token == address(0)) {
            if (ethPriceFeed != address(0)) {
                return _getChainlinkPrice(ethPriceFeed);
            }
            return ONE_USD; // Fallback only if no ETH feed set
        }
        
        // Check if feed is registered
        address feed = priceFeeds[token];
        if (feed != address(0)) {
            return _getChainlinkPrice(feed);
        }
        
        // Fallback to $1 for unknown tokens
        return ONE_USD;
    }
    
    /**
     * @dev Internal: Get price from Chainlink feed
     */
    function _getChainlinkPrice(address feed) internal view returns (int256) {
        AggregatorV3Interface aggregator = AggregatorV3Interface(feed);
        (uint80 roundId, int256 answer,, uint256 updatedAt, uint80 answeredInRound) = aggregator.latestRoundData();
        
        if (!(answeredInRound >= roundId)) revert PriceOracleV2_Stale_round();
        if (!(updatedAt > 0)) revert PriceOracleV2_Round_not_complete();
        if (!(block.timestamp - updatedAt <= MAX_STALENESS)) revert PriceOracleV2_Stale_price();
        if (!(answer > 0)) revert PriceOracleV2_Invalid_price();
        return answer;
    }

    /**
     * @dev Get the amount of tokens for a given USD amount
     * @param usdAmount USD amount (with 6 decimals)
     * @param token Token address
     * @return tokenAmount Token amount in token's native units
     */
    function getTokenAmountForUsd(uint256 usdAmount, address token) external view returns (uint256 tokenAmount) {
        if (!(usdAmount > 0)) revert PriceOracleV2_Zero_amount();

        int256 price = this.getUsdPriceOfToken(token);
        if (!(price > 0)) revert PriceOracleV2_Invalid_price();

        uint8 decimals = _getTokenDecimals(token);
        
        // USD amount is in 6 decimals, price is in 8 decimals
        // Formula: tokenAmount = (usdAmount * 10^decimals) / (price / 10^8)
        // = (usdAmount * 10^decimals * 10^8) / price
        tokenAmount = (usdAmount * (10 ** decimals) * 1e8) / uint256(price);
    }
    
    /**
     * @dev Get USD amount for a given token amount
     * @param tokenAmount Token amount in token's native units
     * @param token Token address
     * @return usdAmount USD amount (with 6 decimals)
     */
    function getUsdAmountForTokens(uint256 tokenAmount, address token) external view returns (uint256 usdAmount) {
        if (!(tokenAmount > 0)) revert PriceOracleV2_Zero_amount();

        int256 price = this.getUsdPriceOfToken(token);
        if (!(price > 0)) revert PriceOracleV2_Invalid_price();

        uint8 decimals = _getTokenDecimals(token);
        
        // Formula: usdAmount = (tokenAmount * price) / (10^decimals * 10^8)
        // Result in 6 decimals
        usdAmount = (tokenAmount * uint256(price)) / (10 ** decimals) / 1e8;
    }

    /**
     * @dev Get token decimals (uses registered value, falls back to contract call)
     */
    function _getTokenDecimals(address token) internal view returns (uint8) {
        if (token == address(0)) return 18;
        
        // Use registered decimals if available
        if (feedDecimals[token] > 0) {
            return feedDecimals[token];
        }
        
        // Try to call decimals() on the token
        (bool success, bytes memory data) = token.staticcall(abi.encodeWithSignature("decimals()"));
        if (!(success && data.length >= 32)) revert PriceOracleV2_Decimals_query_failed();
        uint8 decimals = abi.decode(data, (uint8));
        if (!(decimals > 0)) revert PriceOracleV2_Invalid_decimals();
        return decimals;
    }
    
    /**
     * @dev Get registered price feed for a token
     */
    function getPriceFeed(address token) external view returns (address) {
        return priceFeeds[token];
    }
    
    /**
     * @dev Get all price feed info for a token
     */
    function getTokenInfo(address token) external view returns (
        address feed,
        uint8 decimals,
        bool stable
    ) {
        return (priceFeeds[token], _getTokenDecimals(token), isStablecoin[token]);
    }

    /**
     * @dev Check if price is stale for a specific token
     */
    function isStale(address token) external view returns (bool) {
        address feed;
        if (token == address(0)) {
            feed = ethPriceFeed;
        } else {
            feed = priceFeeds[token];
        }
        if (feed == address(0)) return false;
        
        AggregatorV3Interface aggregator = AggregatorV3Interface(feed);
        (uint80 roundId, int256 answer,, uint256 updatedAt, uint80 answeredInRound) = aggregator.latestRoundData();
        
        if (answeredInRound < roundId) return true;
        if (updatedAt == 0) return true;
        if (answer <= 0) return true;
        return (block.timestamp - updatedAt) > MAX_STALENESS;
    }
    
    /**
     * @dev Batch register multiple feeds
     */
    function batchSetPriceFeeds(
        address[] calldata tokens,
        address[] calldata feeds,
        uint8[] calldata decimals_
    ) external onlyOwner {
        if (!(tokens.length == feeds.length && feeds.length == decimals_.length)) revert PriceOracleV2_Length_mismatch();
        for (uint256 i = 0; i < tokens.length; i++) {
            if (!(feeds[i].code.length > 0)) revert PriceOracleV2_Feed_not_a_contract();
            priceFeeds[tokens[i]] = feeds[i];
            feedDecimals[tokens[i]] = decimals_[i];
            emit PriceFeedRegistered(tokens[i], feeds[i], decimals_[i]);
        }
    }

    /// @dev Storage gap for upgrade safety
    uint256[50] private __gap;
}
// FILE: contracts/shared/ServiceRegistryV2.sol

// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {ERC1967Utils} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Utils.sol";
import {IIdentityRegistry} from "../interfaces/IIdentityRegistry.sol";
import {AdminRegistry} from "./AdminRegistry.sol";

/**
 * @title IServiceRegistryV2
 * @dev Interface for Service Registry V2
 */
interface IServiceRegistryV2 {
    struct Service {
        uint256 id;
        address provider;
        address paymentAddress;
        uint256 agentId;
        string name;
        string description;
        string metadataURI;
        uint256 price;
        address paymentToken;
        bool isActive;
        uint256 createdAt;
    }

    function createService(
        uint256 agentId,
        string calldata name,
        string calldata description,
        string calldata metadataURI,
        uint256 price,
        address paymentToken,
        address paymentAddress
    ) external payable returns (uint256 serviceId);
    
    function updateService(
        uint256 serviceId,
        string calldata name,
        string calldata description,
        string calldata metadataURI,
        uint256 price
    ) external;
    
    function deactivateService(uint256 serviceId) external;
    function activateService(uint256 serviceId) external;
    function setPaymentAddress(uint256 serviceId, address paymentAddress) external;
    function getService(uint256 serviceId) external view returns (Service memory);
    function getProviderServices(address provider) external view returns (uint256[] memory);
    function getServicesByAgent(uint256 agentId) external view returns (uint256[] memory);
    function getActiveServiceCount() external view returns (uint256);
    function getServices(uint256 start, uint256 count) external view returns (uint256[] memory);
    function refundServiceBond(uint256 serviceId) external;
    function withdrawServiceBond(uint256 serviceId) external;
    function getServiceBond(uint256 serviceId) external view returns (uint256);
    function deactivatedAt(uint256 serviceId) external view returns (uint256);

    event ServiceCreated(
        uint256 indexed serviceId,
        address indexed provider,
        uint256 indexed agentId,
        string name,
        uint256 price
    );
    event ServiceUpdated(uint256 indexed serviceId);
    event ServiceDeactivated(uint256 indexed serviceId);
    event ServiceActivated(uint256 indexed serviceId);
}

/**
 * @title ServiceRegistryV2
 * @dev Upgradeable marketplace service listings compatible with ERC-8004 IdentityRegistry.
 * 
 * Features:
 * - Uses IIdentityRegistry.getAgent() for ERC-8004 compatibility (includes isActive check)
 * - UUPS proxy pattern for upgradeability
 * - O(1) active service count caching
 * - Storage slot fix for _activeServiceCount
 * 
 * Security fixes:
 * - M1: initializeActiveServiceCount() can only be called once
 * - L7: Uses OZ _getImplementation() instead of inline assembly
 * - M2: Uses IIdentityRegistry.getAgent() to check isActive status (Phase 13)
 */
contract ServiceRegistryV2 is
    IServiceRegistryV2,
    Ownable2StepUpgradeable,
    UUPSUpgradeable,
    PausableUpgradeable
{
    error ServiceRegistryV2__Agent_blacklisted();
    error ServiceRegistryV2__Already_active();
    error ServiceRegistryV2__Already_inactive();
    error ServiceRegistryV2__Already_initialized();
    error ServiceRegistryV2__Bond_refund_failed();
    error ServiceRegistryV2__Bond_required();
    error ServiceRegistryV2__Cooldown_not_passed();
    error ServiceRegistryV2__No_bond_to_withdraw();
    error ServiceRegistryV2__Service_still_active();
    error ServiceRegistryV2__Description_required();
    error ServiceRegistryV2__Invalid_address();
    error ServiceRegistryV2__Invalid_agent();
    error ServiceRegistryV2__Invalid_identity_registry();
    error ServiceRegistryV2__Invalid_payment_address();
    error ServiceRegistryV2__Invalid_payment_token();
    error ServiceRegistryV2__Invalid_serviceId();
    error ServiceRegistryV2__Name_required();
    error ServiceRegistryV2__No_bond();
    error ServiceRegistryV2__Not_agent_owner();
    error ServiceRegistryV2__Not_agentic_commerce();
    error ServiceRegistryV2__Not_identity_registry();
    error ServiceRegistryV2__Not_owner();
    error ServiceRegistryV2__Price_must_be_greater_than_0();
    error ServiceRegistryV2__Price_required();
    error ServiceRegistryV2__Service_inactive();
    error ServiceRegistryV2__Wallet_blacklisted();
    error ServiceRegistryV2__Eth_transfer_failed();
    
    struct ServiceData {
        address provider;
        address paymentAddress;
        uint256 agentId;
        string name;
        string description;
        string metadataURI;
        uint256 price;
        address paymentToken;
        bool isActive;
        uint256 createdAt;
    }
    
    // Use IIdentityRegistry for ERC-8004 compatibility (includes isActive check)
    IIdentityRegistry public identityRegistry;
    
    mapping(uint256 => ServiceData) private _services;
    mapping(address => uint256[]) private _providerServices;
    mapping(uint256 => uint256[]) private _agentServices;
    uint256 private _serviceCounter;
    
    // M3 Fix: Track service bonds for refund on completion
    mapping(uint256 => uint256) private _serviceBonds;
    
    // L3 Fix: Moved _activeServiceCount before __gap to maintain proper storage layout
    /// @notice Cached count of active services (O(1) vs O(n))
    uint256 private _activeServiceCount;
    
    // M1 Fix: Guard to prevent multiple initialization
    bool private _activeCountInitialized;
    
    // Contract addresses that can be updated
    address public agenticCommerce;
    address public slashManager;
    address public adminRegistry;

    // V2 Fix: Track when a service was deactivated for bond withdrawal cooldown
    mapping(uint256 => uint256) public deactivatedAt;

    // M3 Fix: Service listing bond (in native token/ETH)
    uint256 public constant SERVICE_BOND_AMOUNT = 0.01 ether;
    
    // Events are defined in the IServiceRegistryV2 interface
    event DependencyUpdated(string name, address newAddress);
    event IdentityRegistryUpdated(address newRegistry);
    event AgentServicesDeactivated(uint256 indexed agentId, uint256[] serviceIds);
    event ServiceBondDeposited(uint256 indexed serviceId, address indexed provider, uint256 amount);
    event ServiceBondRefunded(uint256 indexed serviceId, address indexed provider, uint256 amount);
    event ServiceBondWithdrawn(uint256 indexed serviceId, address indexed provider, uint256 amount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @dev Initialize the contract (replaces constructor for upgradeable contracts)
     * @param _identityRegistry Address of the ERC-8004 IdentityRegistry
     * @param initialOwner Owner address for Ownable
     */
    function initialize(address _identityRegistry, address initialOwner) public initializer {
        if (!(_identityRegistry != address(0))) revert ServiceRegistryV2__Invalid_identity_registry();

        __Ownable_init(initialOwner);
        __Pausable_init();

        identityRegistry = IIdentityRegistry(_identityRegistry);
        _serviceCounter = 0;
        _activeServiceCount = 0;
        _activeCountInitialized = false;
    }
    
    /**
     * @dev Authorize upgrades (only owner can upgrade)
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Verify agent ownership using standard ERC-721 ownerOf()
     * Uses ownerOf() instead of getAgent() for compatibility with ERC-721 registry
     */
    function _verifyAgentOwnership(uint256 agentId) internal view returns (address) {
        // Use ownerOf() instead of getAgent() for compatibility with ERC-721 registry
        address owner = identityRegistry.ownerOf(agentId);
        if (!(owner != address(0))) revert ServiceRegistryV2__Invalid_agent();
        return owner;
    }
    
    /**
     * @dev Create a new service listing.
     * M3 Fix: Requires SERVICE_BOND_AMOUNT ETH deposit, refunded on service completion
     */
    function createService(
        uint256 agentId,
        string calldata name,
        string calldata description,
        string calldata metadataURI,
        uint256 price,
        address paymentToken,
        address paymentAddress
    ) external payable whenNotPaused returns (uint256 serviceId) {
        if (!(bytes(name).length > 0)) revert ServiceRegistryV2__Name_required();
        if (!(bytes(description).length > 0)) revert ServiceRegistryV2__Description_required();
        if (!(price > 0)) revert ServiceRegistryV2__Price_must_be_greater_than_0();
        if (!(msg.value >= SERVICE_BOND_AMOUNT)) revert ServiceRegistryV2__Bond_required(); // M3 Fix

        // Bad Actor: Check if agent or wallet is blacklisted
        if (adminRegistry != address(0)) {
            AdminRegistry registry = AdminRegistry(adminRegistry);
            if (!(!registry.isAgentBlacklistedActive(agentId))) revert ServiceRegistryV2__Agent_blacklisted();
            if (!(!registry.isWalletBlacklistedActive(msg.sender))) revert ServiceRegistryV2__Wallet_blacklisted();
        }

        address agentOwner = _verifyAgentOwnership(agentId);
        if (!(agentOwner == msg.sender)) revert ServiceRegistryV2__Not_agent_owner();

        // paymentAddress defaults to provider if not set
        if (paymentAddress == address(0)) {
            paymentAddress = msg.sender;
        }
        if (paymentAddress == paymentToken && paymentToken != address(0)) {
            revert ServiceRegistryV2__Invalid_payment_address();
        }

        serviceId = _serviceCounter++;

        _services[serviceId] = ServiceData({
            provider: msg.sender,
            paymentAddress: paymentAddress,
            agentId: agentId,
            name: name,
            description: description,
            metadataURI: metadataURI,
            price: price,
            paymentToken: paymentToken,
            isActive: true,
            createdAt: block.timestamp
        });
        
        // M3 Fix: Track bond
        _serviceBonds[serviceId] = msg.value;
        
        _providerServices[msg.sender].push(serviceId);
        _agentServices[agentId].push(serviceId);
        
        // O(1) update: increment active service count
        _activeServiceCount++;
        
        emit ServiceCreated(serviceId, msg.sender, agentId, name, price);
        emit ServiceBondDeposited(serviceId, msg.sender, msg.value);
    }
    
    /**
     * @dev Update existing service
     */
    function updateService(
        uint256 serviceId,
        string calldata name,
        string calldata description,
        string calldata metadataURI,
        uint256 price
    ) external whenNotPaused {
        if (!(serviceId < _serviceCounter)) revert ServiceRegistryV2__Invalid_serviceId();
        if (!(_services[serviceId].provider == msg.sender)) revert ServiceRegistryV2__Not_owner();
        if (!(_services[serviceId].isActive)) revert ServiceRegistryV2__Service_inactive();
        if (!(bytes(name).length > 0)) revert ServiceRegistryV2__Name_required();
        if (!(price > 0)) revert ServiceRegistryV2__Price_required();

        _services[serviceId].name = name;
        _services[serviceId].description = description;
        _services[serviceId].metadataURI = metadataURI;
        _services[serviceId].price = price;

        emit ServiceUpdated(serviceId);
    }
    
    /**
     * @dev Deactivate service (soft delete)
     */
    function deactivateService(uint256 serviceId) external whenNotPaused {
        if (!(serviceId < _serviceCounter)) revert ServiceRegistryV2__Invalid_serviceId();
        if (!(_services[serviceId].provider == msg.sender)) revert ServiceRegistryV2__Not_owner();
        if (!(_services[serviceId].isActive)) revert ServiceRegistryV2__Already_inactive();

        _services[serviceId].isActive = false;
        deactivatedAt[serviceId] = block.timestamp;

        // O(1) update: decrement active service count
        _activeServiceCount--;

        emit ServiceDeactivated(serviceId);
    }
    
    /**
     * @dev Activate a previously deactivated service
     */
    function activateService(uint256 serviceId) external whenNotPaused {
        if (!(serviceId < _serviceCounter)) revert ServiceRegistryV2__Invalid_serviceId();
        if (!(_services[serviceId].provider == msg.sender)) revert ServiceRegistryV2__Not_owner();
        if (!(!_services[serviceId].isActive)) revert ServiceRegistryV2__Already_active();

        // Bad Actor: Re-check blacklist on reactivation
        if (adminRegistry != address(0)) {
            AdminRegistry registry = AdminRegistry(adminRegistry);
            if (!(!registry.isWalletBlacklistedActive(msg.sender))) revert ServiceRegistryV2__Wallet_blacklisted();
        }

        _services[serviceId].isActive = true;
        
        // O(1) update: increment active service count
        _activeServiceCount++;

        emit ServiceActivated(serviceId);
    }

    /**
     * @dev Set payment address for a service
     * @param serviceId The service ID
     * @param paymentAddress The address to receive payments
     */
    function setPaymentAddress(uint256 serviceId, address paymentAddress) external whenNotPaused {
        if (!(serviceId < _serviceCounter)) revert ServiceRegistryV2__Invalid_serviceId();
        if (!(_services[serviceId].provider == msg.sender)) revert ServiceRegistryV2__Not_owner();
        if (!(paymentAddress != address(0))) revert ServiceRegistryV2__Invalid_payment_address();

        _services[serviceId].paymentAddress = paymentAddress;

        emit ServiceUpdated(serviceId);
    }

    /**
     * @dev Deactivate all services when agent is deactivated (callback from IdentityRegistry)
     * M2 Fix: Called when agent's identity is deactivated
     */
    function deactivateAgentServices(uint256 agentId) external {
        if (!(msg.sender == address(identityRegistry))) revert ServiceRegistryV2__Not_identity_registry();
        
        uint256[] storage services = _agentServices[agentId];
        uint256[] memory deactivatedIds = new uint256[](services.length);
        uint256 deactivatedCount = 0;
        
        for (uint256 i = 0; i < services.length; i++) {
            uint256 serviceId = services[i];
            if (_services[serviceId].isActive) {
                _services[serviceId].isActive = false;
                _activeServiceCount--;
                deactivatedIds[deactivatedCount++] = serviceId;
            }
        }
        
        emit AgentServicesDeactivated(agentId, deactivatedIds);
    }
    
    /**
     * @dev Refund bond when service is completed (called by AgenticCommerce)
     * M3 Fix: Returns bond to provider after successful job completion
     */
    function refundServiceBond(uint256 serviceId) external {
        if (!(msg.sender == agenticCommerce)) revert ServiceRegistryV2__Not_agentic_commerce();
        if (!(serviceId < _serviceCounter)) revert ServiceRegistryV2__Invalid_serviceId();
        if (!(_serviceBonds[serviceId] > 0)) revert ServiceRegistryV2__No_bond();

        address provider = _services[serviceId].provider;
        uint256 bondAmount = _serviceBonds[serviceId];
        _serviceBonds[serviceId] = 0;

        _sendEth(provider, bondAmount);

        emit ServiceBondRefunded(serviceId, provider, bondAmount);
    }

    /**
     * @dev Withdraw service bond after deactivation + 7-day cooldown
     * V2 Fix: Provider-controlled bond withdrawal. Bond stays locked while service is active.
     */
    function withdrawServiceBond(uint256 serviceId) external whenNotPaused {
        if (!(serviceId < _serviceCounter)) revert ServiceRegistryV2__Invalid_serviceId();
        if (!(_services[serviceId].provider == msg.sender)) revert ServiceRegistryV2__Not_owner();
        if (_services[serviceId].isActive) revert ServiceRegistryV2__Service_still_active();
        if (!(block.timestamp >= deactivatedAt[serviceId] + 7 days)) revert ServiceRegistryV2__Cooldown_not_passed();
        if (!(_serviceBonds[serviceId] > 0)) revert ServiceRegistryV2__No_bond_to_withdraw();

        uint256 bondAmount = _serviceBonds[serviceId];
        _serviceBonds[serviceId] = 0;
        deactivatedAt[serviceId] = 0;

        _sendEth(msg.sender, bondAmount);

        emit ServiceBondWithdrawn(serviceId, msg.sender, bondAmount);
    }

    /**
     * @dev Get the remaining bond for a service
     */
    function getServiceBond(uint256 serviceId) external view returns (uint256) {
        return _serviceBonds[serviceId];
    }

    // ============ View Functions ============
    
    function getService(uint256 serviceId) external view override returns (Service memory) {
        if (!(serviceId < _serviceCounter)) revert ServiceRegistryV2__Invalid_serviceId();
        ServiceData storage data = _services[serviceId];
        return Service({
            id: serviceId,
            provider: data.provider,
            paymentAddress: data.paymentAddress,
            agentId: data.agentId,
            name: data.name,
            description: data.description,
            metadataURI: data.metadataURI,
            price: data.price,
            paymentToken: data.paymentToken,
            isActive: data.isActive,
            createdAt: data.createdAt
        });
    }
    
    function getProviderServices(address provider) external view returns (uint256[] memory) {
        return _providerServices[provider];
    }
    
    function getServicesByAgent(uint256 agentId) external view returns (uint256[] memory) {
        return _agentServices[agentId];
    }
    
    function getActiveServiceCount() external view returns (uint256) {
        return _activeServiceCount;
    }
    
    function getServices(uint256 start, uint256 count) external view returns (uint256[] memory) {
        uint256 end = start + count;
        if (end > _serviceCounter) {
            end = _serviceCounter;
        }
        if (start >= end) {
            return new uint256[](0);
        }
        
        uint256[] memory result = new uint256[](end - start);
        for (uint256 i = start; i < end; i++) {
            result[i - start] = i;
        }
        return result;
    }
    
    // ============ Upgradeable Dependency Management ============
    
    /**
     * @dev Update IdentityRegistry address (in case it changes)
     */
    function setIdentityRegistry(address _identityRegistry) external onlyOwner {
        if (!(_identityRegistry != address(0))) revert ServiceRegistryV2__Invalid_address();
        identityRegistry = IIdentityRegistry(_identityRegistry);
        emit IdentityRegistryUpdated(_identityRegistry);
    }
    
    function setAgenticCommerce(address _agenticCommerce) external onlyOwner {
        if (!(_agenticCommerce != address(0))) revert ServiceRegistryV2__Invalid_address();
        agenticCommerce = _agenticCommerce;
        emit DependencyUpdated("agenticCommerce", _agenticCommerce);
    }
    
    function setSlashManager(address _slashManager) external onlyOwner {
        if (!(_slashManager != address(0))) revert ServiceRegistryV2__Invalid_address();
        slashManager = _slashManager;
        emit DependencyUpdated("slashManager", _slashManager);
    }

    function setAdminRegistry(address _adminRegistry) external onlyOwner {
        if (!(_adminRegistry != address(0))) revert ServiceRegistryV2__Invalid_address();
        uint256 size;
        assembly ("memory-safe") { size := extcodesize(_adminRegistry) }
        if (size == 0) revert ServiceRegistryV2__Invalid_address();
        adminRegistry = _adminRegistry;
        emit DependencyUpdated("adminRegistry", _adminRegistry);
    }
    
    /**
     * @dev Get current implementation address
     * L7 Fix: Uses ERC1967 storage slot directly instead of inline assembly
     */
    function getImplementation() external view returns (address) {
        return ERC1967Utils.getImplementation();
    }
    
    /**
     * @dev Get service counter (total services created)
     */
    function getServiceCounter() external view returns (uint256) {
        return _serviceCounter;
    }
    
    // ============ Migration Functions ============
    
    /**
     * @dev Recalculate and initialize the _activeServiceCount variable
     * M1 Fix: Can only be called once by the owner
     */
    function initializeActiveServiceCount() external onlyOwner {
        if (!(!_activeCountInitialized)) revert ServiceRegistryV2__Already_initialized();
        
        uint256 count = 0;
        for (uint256 i = 1; i <= _serviceCounter; i++) {
            if (_services[i].isActive) {
                count++;
            }
        }
        _activeServiceCount = count;
        _activeCountInitialized = true;
        
        emit ActiveServiceCountInitialized(count);
    }
    
    event ActiveServiceCountInitialized(uint256 count);

    /// @dev Storage gap for upgrade safety
    uint256[49] private __gap;

    /***********************************/
    /* Internal Helpers */
    /***********************************/
    
    function _sendEth(address to, uint256 amount) internal {
        if (amount == 0) return;
        (bool success, ) = payable(to).call{value: amount}("");
        if (!success) revert ServiceRegistryV2__Eth_transfer_failed();
    }
}

// FILE: contracts/shared/SlashManager.sol

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

        // Call AgenticCommerce to perform the slash
        IAgenticCommerceV9_Slash(commerce).slashByGovernance(
            proposal.evaluator,
            proposal.reason
        );

        // Clear the direct lookup
        activeSlashByEvaluator[proposal.evaluator][proposal.proposalId] = bytes32(0);

        emit ProposalExecuted(proposalHash, proposal.evaluator, proposal.amount);
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
                if (!(block.timestamp <= proposal.createdAt + MAX_PROPOSAL_AGE)) revert SlashManager__Proposal_too_old();
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


## Section 2: senior-auditor-sop.md (HOW to think)

# Senior Auditor's Mindset

This is how a senior auditor thinks. Pattern-matching catches the obvious bugs — your specialty file teaches that. The high-value bugs, the ones everyone else misses, come from HOW you reason about code, not from WHAT bugs you know.

The senior auditor's edge is not "knowing more bug patterns" — it is having internalized mental tools they reach for instinctively when something feels off, when a path seems clean, or when a conclusion comes too quickly.

This file gives you three tools. They are not steps. You reach for the right one the moment the trigger fires — see `shared-rules.md` for the binding trigger→tool protocol. Use them. Trust your discomfort.

A finding is not real until you've traced the attack with concrete values. You are an attacker, not a defender — when you find a bug, deepen the attack; never argue yourself out of one.

---

## 1. The Feynman test (FIRST — use it before anything else)

**This is the first tool. Apply it the moment you open any new function or contract — before you reason about anything else.** Code you have not Feynman'd is code you have not actually understood.

When you read code, STOP and ask: "Can I explain what this function does to someone who doesn't know Solidity?"

Try it. In plain words. The places where your explanation gets fuzzy — where you reach for Solidity jargon instead of plain meaning — are where you're papering over an assumption. That's where bugs hide.

Example: you read `_handleFeeTransfer(zrc20, fee)` and your explanation comes out as "it transfers the fee." That's not Feynman. Feynman is: "it picks up the protocol's commission off the user's payment and moves it to the treasury wallet." Now keep going: what if the payment is in ETH and the function uses an ERC20 method? Your plain-English explanation breaks. Bug.

A senior auditor doesn't trust their understanding until they can explain it without the safety net of technical vocabulary.

---

## 2. Socratic questioning

For every line of code, ask: why is this here? What does it assume? What happens if the assumption breaks?

Don't accept "because that's how it's written" as an answer. Don't accept "the function name says so" as an answer. Drill until you reach the implicit belief the code rests on. The first answer is usually a restatement. The actual assumption is two or three "whys" deeper.

Example: `if (zrc20 != _ETH_ADDRESS_) IERC20(zrc20).transferFrom(msg.sender, address(this), amount);`
- Why is `zrc20 != _ETH_ADDRESS_` checked? → because ETH isn't transferable via transferFrom.
- Why is there no else branch? → because the developer assumed ETH arrives via `msg.value`.
- Where is `msg.value` enforced to equal `amount` for the ETH path? → **nowhere**. Bug.

A senior auditor accepts no "because" without examining it.

---

## 3. Inversion

Every clean path gets a backward pass. After you understand what the code IS supposed to do, ask: how would I make it NOT do that?

Same code, attacker's eye instead of developer's eye. The developer asks "does this work?" The attacker asks "how do I break this?" Read every check and ask "what value slips past it?" Read every state update and ask "what state am I in just before this?"

A senior auditor never reads code only forward.

---

## When to reach for which tool

You don't apply these in order — except Feynman, which is always first. You reach for what the moment calls for:

- Opening any new function or contract → **Feynman** (always — before anything else)
- Trying to understand a line you don't yet → **Socratic**
- Something looks too clean → **Inversion**
- You reached a "bug" conclusion → amplify the attack (chain it, find more victims, lower the precondition cost — do NOT refute it)

The tools are how you keep yourself honest. Without them, you fall into the trap of every junior auditor: trusting your first read, accepting code that "looks right," moving on when something feels off.

Trust your discomfort. Reach for the tool. Don't stop until the discomfort has a name.

## Section 3: periphery-agent.md (WHAT to look for)

# Periphery Agent

You are an attacker that exploits the code nobody else is looking at — libraries, helpers, encoders, utilities, base contracts. Core contracts trust this code implicitly. One bug in a 20-line library compromises every caller.

## Prioritization

Target the smallest contracts first. Libraries, helpers, encoders/decoders, provider wrappers, and abstract bases are your primary attack surface.

## Attack surfaces

For every public/external function in target contracts:

- **Exploit unvalidated inputs.** Find inputs accepted without validation and trace what a caller blindly trusts. If the core contract assumes the helper validates — verify it actually does.
- **Corrupt return values.** Return zero when non-zero is expected, truncated addresses, mismatched lengths. Every caller trusting this return value inherits the bug.
- **Exploit hidden state side effects.** Find storage writes, approval changes, balance updates that callers don't account for.
- **Break edge cases.** Find partial interface implementations that work on the happy path. Trigger the edge case that breaks them.
- **Exploit assembly byte-width bugs.** `mload` reads 32 bytes — corrupt adjacent packed fields when the actual value is narrower.
- **Spoof existence detection.** Balance checks at computed addresses are not valid existence proofs. Exploit false positives.
- **Brick via gas complexity.** Find loops in utility contracts whose worst-case gas bricks critical protocol functions.
- **Race provider swaps.** Exploit provider wrappers where the underlying provider is swapped while requests are still pending from the old one.
- **Truncate cross-encoded recipients.** Encoders packing a long sender (`bytes32` non-EVM address, full address + extra) into a narrower output (`bytes20`) silently truncate; refunds and callbacks route to the truncated value. Trace every encoder/decoder for length mismatches.
- **Read library under wrong storage context.** A library or helper calling a getter assumes it reads the caller's storage; when called from a contract using its own slot 0 (NFTManager, Facet, wrapper), it reads the helper's storage instead — getter returns zero-init values.
- **Skip ERC165 dispatch in decoder fallbacks.** Encoders or wrappers using `supportsInterface` to choose dispatch branches default-fallback when the wrapped contract omits ERC165; downstream consumers proceed under the wrong interface assumption.
- **Hardcode magic IDs in helper lookups.** Library helpers using a hardcoded constant ID for storage keys silently fail when no real entry was ever written under that key; lookups return zero. Walk every magic-number storage key.
- **Read oracle in same block as deposit.** Lending or vault wrappers reading an external oracle in the same block as a write are stale; an attacker manipulates the oracle in the prior block and the wrapper accepts the manipulated value.
- **Manipulate single-block oracles.** Wrappers reading a spot price (`slot0`, single-source feed) in the same transaction as a deposit/liquidation accept attacker-set values; the wrapper appears to validate but the validation is itself single-block.
- **Trust divergence-check dead code.** A "safety check" comparing two values uses unreachable comparators (divergence threshold > max possible divergence); the gate is dead code masquerading as protection.

## Section 4: shared-rules.md (output format, dedup tags, mental tools)

# Shared Scan Rules

## Bundle contents

Your bundle is four concatenated files: all in-scope source code, the SOP (HOW to think), your specialty agent (WHAT to look for), and these shared rules (output format, dedup tags, AND mandatory mental tool protocol).

Read the whole bundle once at the start. The bundle contains all in-scope source. Use Read/Grep only for cross-file searches or out-of-scope context (interfaces/, lib/, mocks/, test/) — do not re-read in-scope files for the initial scan.

**The protocol below applies continuously during source reading — not just before it.** The "read source" phase does not turn off the protocol; every trigger condition fires the moment it occurs, throughout your entire review.

When matching function names, check both `functionName` and `_functionName` (Solidity convention).

## Mental tool protocol — MANDATORY

The three tools in `senior-auditor-sop.md` are NOT optional. Each tool has a specific trigger. **When the trigger fires, you MUST emit the corresponding marker in your output stream BEFORE continuing.** No skipping. The markers live in your working text — they do NOT go into the FINDING/LEAD output blocks.

### Triggers → required markers

| Trigger (the condition) | Marker (required immediately, literal `[Tool: ...]` syntax) | Content |
|---|---|---|
| You open a new function or contract to read | `[Feynman: <name>]` | Explain what it does in plain English — no Solidity jargon, no `mload`/`assembly`/`mstore`/`safeTransfer`/etc. Use as many sentences as you need until the explanation is solid. If your wording slips back to jargon, you're papering over an assumption — keep going. Wherever your plain-English explanation gets fuzzy or you have to reach for a Solidity term to keep it accurate, mark that spot — that is where bugs hide. |
| You stop on a line whose purpose isn't immediately clear | `[Socratic: <file:line> — why?]` | A one-line question that drills past "because that's how it's written." If your first answer is a restatement of the code, ask again. Stop when the answer exposes the implicit belief the code rests on — don't pad with extra steps just to hit a quota. |
| A code path reads as clean / a check looks sufficient / a guard looks correct | `[Inversion: <function>]` | Three concrete attacker moves that attempt to defeat the path. Specific addresses/values/states, not abstractions. |

### Rules

1. **Triggers are not optional.** If the condition fires, the marker follows. Always. No skipping.
2. **Use the literal `[Tool: ...]` syntax.** The orchestrator greps your output for these tags after the run.
3. **You may emit a marker without a trigger.** Extra Feynman / Inversion markers are fine. You may NOT skip a marker after its trigger fired.
4. **The protocol applies to reasoning depth, not output volume.** Heavy use of these tools is what produces the audit work. Skipping them = surface-level scanning, which is the failure mode of every junior auditor.

The orchestrator verifies marker counts after every run. Skipped markers downgrade the value of your findings and are recorded as workflow violations.

## Cross-contract patterns

When you find a bug in one contract, **weaponize that pattern across every other contract in the bundle.** Search by function name AND by code pattern. Finding native/ERC20 confusion in `ContractA.onRevert` means you check every other contract's `onRevert` — missing a repeat instance is an audit failure.

After scanning: escalate every finding to its worst exploitable variant (DoS may hide fund theft). Then revisit every function where you found something and attack the other branches.

## Do not report

Admin-only functions doing admin things. Standard DeFi tradeoffs (MEV, rounding dust, first-depositor with MINIMUM_LIQUIDITY). Self-harm-only bugs. "Admin can rug" without a concrete mechanism.

## Output

Return findings as structured blocks:

FINDINGs have concrete, unguarded, exploitable attack paths. LEADs have real code smells with partial paths — default to LEAD over dropping.

**Every FINDING must have a `proof:` field** — concrete values, traces, or state sequences from the actual code. No proof = LEAD, no exceptions.

**One vulnerability per item.** Same root cause = one item. Different fixes needed = separate items.

```
FINDING | contract: Name | function: func | bug_class: kebab-tag | group_key: Contract | function | bug-class
path: caller → function → state change → impact
proof: concrete values/trace demonstrating the bug
description: one sentence
fix: one-sentence suggestion

LEAD | contract: Name | function: func | bug_class: kebab-tag | group_key: Contract | function | bug-class
code_smells: what you found
description: one sentence explaining trail and what remains unverified
```

The `group_key` enables deduplication: `ContractName | functionName | bug_class`. Agents may add custom fields.
