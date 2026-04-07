// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {ERC1967Utils} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Utils.sol";

/**
 * @title IServiceRegistryV2
 * @dev Interface for Service Registry V2
 */
interface IServiceRegistryV2 {
    struct Service {
        uint256 id;
        address provider;
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
        address paymentToken
    ) external returns (uint256 serviceId);
    
    function updateService(
        uint256 serviceId,
        string calldata name,
        string calldata description,
        string calldata metadataURI,
        uint256 price
    ) external;
    
    function deactivateService(uint256 serviceId) external;
    function activateService(uint256 serviceId) external;
    function getService(uint256 serviceId) external view returns (Service memory);
    function getProviderServices(address provider) external view returns (uint256[] memory);
    function getServicesByAgent(uint256 agentId) external view returns (uint256[] memory);
    function getActiveServiceCount() external view returns (uint256);
    function getServices(uint256 start, uint256 count) external view returns (uint256[] memory);
    
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
 * - Uses IERC721.ownerOf() for ERC-8004 compatibility
 * - UUPS proxy pattern for upgradeability
 * - O(1) active service count caching
 * - Storage slot fix for _activeServiceCount
 * 
 * Security fixes:
 * - M1: initializeActiveServiceCount() can only be called once
 * - L7: Uses OZ _getImplementation() instead of inline assembly
 */
contract ServiceRegistryV2 is 
    IServiceRegistryV2, 
    OwnableUpgradeable, 
    UUPSUpgradeable
{
    
    struct ServiceData {
        address provider;
        uint256 agentId;
        string name;
        string description;
        string metadataURI;
        uint256 price;
        address paymentToken;
        bool isActive;
        uint256 createdAt;
    }
    
    // Use IERC721 interface for ERC-8004 compatibility
    IERC721 public identityRegistry;
    
    mapping(uint256 => ServiceData) private _services;
    mapping(address => uint256[]) private _providerServices;
    mapping(uint256 => uint256[]) private _agentServices;
    uint256 private _serviceCounter;
    
    // L3 Fix: Moved _activeServiceCount before __gap to maintain proper storage layout
    /// @notice Cached count of active services (O(1) vs O(n))
    uint256 private _activeServiceCount;
    
    // M1 Fix: Guard to prevent multiple initialization
    bool private _activeCountInitialized;
    
    // Contract addresses that can be updated
    address public agenticCommerce;
    address public slashManager;
    
    // Events are defined in the IServiceRegistryV2 interface
    event DependencyUpdated(string name, address newAddress);
    event IdentityRegistryUpdated(address newRegistry);

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
        require(_identityRegistry != address(0), "Invalid identity registry");
        
        __Ownable_init(initialOwner);
        
        identityRegistry = IERC721(_identityRegistry);
        _serviceCounter = 0;
        _activeServiceCount = 0;
        _activeCountInitialized = false;
    }
    
    /**
     * @dev Authorize upgrades (only owner can upgrade)
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
    
    /**
     * @dev Verify agent ownership using IERC721.ownerOf()
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
     * @dev Create a new service listing. 
     */
    function createService(
        uint256 agentId,
        string calldata name,
        string calldata description,
        string calldata metadataURI,
        uint256 price,
        address paymentToken
    ) external returns (uint256 serviceId) {
        require(bytes(name).length > 0, "Name required");
        require(bytes(description).length > 0, "Description required");
        require(price > 0, "Price must be greater than 0");
        require(paymentToken != address(0), "Invalid payment token");
        
        address agentOwner = _verifyAgentOwnership(agentId);
        require(agentOwner == msg.sender, "Not agent owner");
        
        serviceId = _serviceCounter++;
        
        _services[serviceId] = ServiceData({
            provider: msg.sender,
            agentId: agentId,
            name: name,
            description: description,
            metadataURI: metadataURI,
            price: price,
            paymentToken: paymentToken,
            isActive: true,
            createdAt: block.timestamp
        });
        
        _providerServices[msg.sender].push(serviceId);
        _agentServices[agentId].push(serviceId);
        
        // O(1) update: increment active service count
        _activeServiceCount++;
        
        emit ServiceCreated(serviceId, msg.sender, agentId, name, price);
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
    ) external {
        require(serviceId < _serviceCounter, "Invalid serviceId");
        require(_services[serviceId].provider == msg.sender, "Not owner");
        require(_services[serviceId].isActive, "Service inactive");
        require(bytes(name).length > 0, "Name required");
        require(price > 0, "Price required");

        _services[serviceId].name = name;
        _services[serviceId].description = description;
        _services[serviceId].metadataURI = metadataURI;
        _services[serviceId].price = price;

        emit ServiceUpdated(serviceId);
    }
    
    /**
     * @dev Deactivate service (soft delete)
     */
    function deactivateService(uint256 serviceId) external {
        require(serviceId < _serviceCounter, "Invalid serviceId");
        require(_services[serviceId].provider == msg.sender, "Not owner");
        require(_services[serviceId].isActive, "Already inactive");

        _services[serviceId].isActive = false;
        
        // O(1) update: decrement active service count
        _activeServiceCount--;

        emit ServiceDeactivated(serviceId);
    }
    
    /**
     * @dev Activate a previously deactivated service
     */
    function activateService(uint256 serviceId) external {
        require(serviceId < _serviceCounter, "Invalid serviceId");
        require(_services[serviceId].provider == msg.sender, "Not owner");
        require(!_services[serviceId].isActive, "Already active");

        _services[serviceId].isActive = true;
        
        // O(1) update: increment active service count
        _activeServiceCount++;

        emit ServiceActivated(serviceId);
    }
    
    // ============ View Functions ============
    
    function getService(uint256 serviceId) external view override returns (Service memory) {
        require(serviceId < _serviceCounter, "Invalid serviceId");
        ServiceData storage data = _services[serviceId];
        return Service({
            id: serviceId,
            provider: data.provider,
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
        require(_identityRegistry != address(0), "Invalid address");
        identityRegistry = IERC721(_identityRegistry);
        emit IdentityRegistryUpdated(_identityRegistry);
    }
    
    function setAgenticCommerce(address _agenticCommerce) external onlyOwner {
        require(_agenticCommerce != address(0), "Invalid address");
        agenticCommerce = _agenticCommerce;
        emit DependencyUpdated("agenticCommerce", _agenticCommerce);
    }
    
    function setSlashManager(address _slashManager) external onlyOwner {
        require(_slashManager != address(0), "Invalid address");
        slashManager = _slashManager;
        emit DependencyUpdated("slashManager", _slashManager);
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
        require(!_activeCountInitialized, "Already initialized");
        
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
}
