// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
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
    OwnableUpgradeable,
    UUPSUpgradeable,
    PausableUpgradeable
{
    
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
    
    // M3 Fix: Service listing bond (in native token/ETH)
    uint256 public constant SERVICE_BOND_AMOUNT = 0.01 ether;
    
    // Events are defined in the IServiceRegistryV2 interface
    event DependencyUpdated(string name, address newAddress);
    event IdentityRegistryUpdated(address newRegistry);
    event AgentServicesDeactivated(uint256 indexed agentId, uint256[] serviceIds);
    event ServiceBondDeposited(uint256 indexed serviceId, address indexed provider, uint256 amount);
    event ServiceBondRefunded(uint256 indexed serviceId, address indexed provider, uint256 amount);

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
     * @dev Verify agent ownership and active status using IIdentityRegistry.getAgent()
     * M2 Fix: Now checks isActive status - deactivated agents cannot create services
     */
    function _verifyAgentOwnership(uint256 agentId) internal view returns (address) {
        (address owner, , , bool isActive) = identityRegistry.getAgent(agentId);
        require(owner != address(0), "Invalid agent");
        require(isActive, "Agent inactive"); // M2 Fix: Check active status
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
        require(bytes(name).length > 0, "Name required");
        require(bytes(description).length > 0, "Description required");
        require(price > 0, "Price must be greater than 0");
        require(paymentToken != address(0), "Invalid payment token");
        require(msg.value >= SERVICE_BOND_AMOUNT, "Bond required"); // M3 Fix

        // Bad Actor: Check if agent or wallet is blacklisted
        if (adminRegistry != address(0)) {
            AdminRegistry registry = AdminRegistry(adminRegistry);
            require(!registry.isAgentBlacklistedActive(agentId), "Agent blacklisted");
            require(!registry.isWalletBlacklistedActive(msg.sender), "Wallet blacklisted");
        }

        address agentOwner = _verifyAgentOwnership(agentId);
        require(agentOwner == msg.sender, "Not agent owner");

        // paymentAddress defaults to provider if not set
        if (paymentAddress == address(0)) {
            paymentAddress = msg.sender;
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
    function deactivateService(uint256 serviceId) external whenNotPaused {
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
    function activateService(uint256 serviceId) external whenNotPaused {
        require(serviceId < _serviceCounter, "Invalid serviceId");
        require(_services[serviceId].provider == msg.sender, "Not owner");
        require(!_services[serviceId].isActive, "Already active");

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
        require(serviceId < _serviceCounter, "Invalid serviceId");
        require(_services[serviceId].provider == msg.sender, "Not owner");
        require(paymentAddress != address(0), "Invalid payment address");

        _services[serviceId].paymentAddress = paymentAddress;

        emit ServiceUpdated(serviceId);
    }

    /**
     * @dev Deactivate all services when agent is deactivated (callback from IdentityRegistry)
     * M2 Fix: Called when agent's identity is deactivated
     */
    function deactivateAgentServices(uint256 agentId) external {
        require(msg.sender == address(identityRegistry), "Not identity registry");
        
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
        require(msg.sender == agenticCommerce, "Not agentic commerce");
        require(serviceId < _serviceCounter, "Invalid serviceId");
        require(_serviceBonds[serviceId] > 0, "No bond");
        
        address provider = _services[serviceId].provider;
        uint256 bondAmount = _serviceBonds[serviceId];
        _serviceBonds[serviceId] = 0;
        
        (bool success, ) = provider.call{value: bondAmount}("");
        require(success, "Bond refund failed");
        
        emit ServiceBondRefunded(serviceId, provider, bondAmount);
    }
    
    /**
     * @dev Get service bond amount
     */
    function getServiceBond(uint256 serviceId) external view returns (uint256) {
        return _serviceBonds[serviceId];
    }
    
    // ============ View Functions ============
    
    function getService(uint256 serviceId) external view override returns (Service memory) {
        require(serviceId < _serviceCounter, "Invalid serviceId");
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
        require(_identityRegistry != address(0), "Invalid address");
        identityRegistry = IIdentityRegistry(_identityRegistry);
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

    function setAdminRegistry(address _adminRegistry) external onlyOwner {
        require(_adminRegistry != address(0), "Invalid address");
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
