// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

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
 * FIXED: Uses IERC721.ownerOf() instead of non-existent getAgent() function.
 * Uses UUPS proxy pattern for upgradeability.
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
    
    /// @notice Cached count of active services (O(1) vs O(n))
    uint256 private _activeServiceCount;
    
    // Contract addresses that can be updated
    address public agenticCommerce;
    address public slashManager;
    
    // Gap for future storage variables (upgradeability best practice)
    uint256[50] private __gap;

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
     */
    function initialize(address _identityRegistry) public initializer {
        require(_identityRegistry != address(0), "Invalid identity registry");
        
        __Ownable_init(msg.sender);
        
        identityRegistry = IERC721(_identityRegistry);
        _serviceCounter = 0;
    }
    
    /**
     * @dev Authorize upgrades (only owner can upgrade)
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
    
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
     * @dev Create a new service listing. 
     * FIXED: Uses IERC721.ownerOf() instead of non-existent getAgent()
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
        
        // FIXED: Use ownerOf() instead of getAgent()
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
        // O(1) - uses cached value instead of O(n) loop
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
     * @dev Get current implementation address (for verification)
     * Note: This would require ERC1967Proxy storage slot access
     */
    function getImplementation() external view returns (address) {
        // Implementation address is stored at ERC1967 implementation slot
        bytes32 slot = 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;
        address implementation;
        assembly {
            implementation := sload(slot)
        }
        return implementation;
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
     * This is needed after upgrading from V1 to V2 to fix the storage slot issue
     * where _activeServiceCount shows garbage data
     * Can only be called once by the owner
     */
    function initializeActiveServiceCount() external onlyOwner {
        uint256 count = 0;
        // Iterate through all services and count active ones
        for (uint256 i = 1; i <= _serviceCounter; i++) {
            if (_services[i].isActive) {
                count++;
            }
        }
        _activeServiceCount = count;
        emit ActiveServiceCountInitialized(count);
    }
    
    event ActiveServiceCountInitialized(uint256 count);
}
