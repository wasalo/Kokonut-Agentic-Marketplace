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

    /**
     * @dev Initialize the contract (called once during deployment)
     */
    function initialize() public initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
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
}
