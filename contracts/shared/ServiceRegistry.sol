// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IIdentityRegistry} from "../interfaces/IIdentityRegistry.sol";

/**
 * @title IServiceRegistry
 * @dev Interface for Service Registry
 */
interface IServiceRegistry {
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
    
    function getService(uint256 serviceId) external view returns (Service memory);
    
    function getProviderServices(address provider) external view returns (uint256[] memory);
    
    function getServicesByAgent(uint256 agentId) external view returns (uint256[] memory);
    
    event ServiceCreated(
        uint256 indexed serviceId,
        address indexed provider,
        uint256 indexed agentId,
        string name,
        uint256 price
    );
    
    event ServiceUpdated(uint256 indexed serviceId);
    
    event ServiceDeactivated(uint256 indexed serviceId);
}

/**
 * @title ServiceRegistry
 * @dev Marketplace service listings linked to agent identities.
 *
 * Every service is tied to an agent identity via agentId. The provider
 * must be a registered agent on the IdentityRegistry.
 */
contract ServiceRegistry is IServiceRegistry, Ownable, ReentrancyGuard {
    
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
    
    IIdentityRegistry public immutable identityRegistry;
    
    mapping(uint256 => ServiceData) private _services;
    mapping(address => uint256[]) private _providerServices;
    mapping(uint256 => uint256[]) private _agentServices;
    uint256 private _serviceCounter;
    
    constructor(address _identityRegistry) Ownable(msg.sender) {
        require(_identityRegistry != address(0), "Invalid identity registry");
        identityRegistry = IIdentityRegistry(_identityRegistry);
    }
    
    /**
     * @dev Create a new service listing. Caller must own the agent identity.
     */
    function createService(
        uint256 agentId,
        string calldata name,
        string calldata description,
        string calldata metadataURI,
        uint256 price,
        address paymentToken
    ) external nonReentrant returns (uint256 serviceId) {
        require(bytes(name).length > 0, "Name required");
        require(bytes(description).length > 0, "Description required");
        require(price > 0, "Price required");
        
        // Validate caller owns this agent identity
        (address owner,,, bool isActive) = identityRegistry.getAgent(agentId);
        require(isActive, "Agent not active");
        require(owner == msg.sender, "Not agent owner");
        
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
        
        emit ServiceCreated(serviceId, msg.sender, agentId, name, price);
    }
    
    function updateService(
        uint256 serviceId,
        string calldata name,
        string calldata description,
        string calldata metadataURI,
        uint256 price
    ) external nonReentrant {
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
    
    function deactivateService(uint256 serviceId) external nonReentrant {
        require(serviceId < _serviceCounter, "Invalid serviceId");
        require(_services[serviceId].provider == msg.sender, "Not owner");
        require(_services[serviceId].isActive, "Already inactive");
        
        _services[serviceId].isActive = false;
        
        emit ServiceDeactivated(serviceId);
    }
    
    function getService(uint256 serviceId) external view returns (Service memory) {
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
        uint256 count = 0;
        for (uint256 i = 0; i < _serviceCounter; i++) {
            if (_services[i].isActive) {
                count++;
            }
        }
        return count;
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
}
