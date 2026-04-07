// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {TestFixtures} from "./TestFixtures.sol";
import {ServiceRegistryV2} from "../shared/ServiceRegistryV2.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title ServiceRegistryV2Test
 * @dev Comprehensive test suite for ServiceRegistryV2
 * Target: 90%+ coverage
 */
contract ServiceRegistryV2Test is TestFixtures {
    // Event definitions for testing
    event ServiceCreated(uint256 indexed serviceId, address indexed provider, uint256 indexed agentId, string name, uint256 price);
    event ServiceUpdated(uint256 indexed serviceId);
    event ServiceDeactivated(uint256 indexed serviceId);
    event ServiceActivated(uint256 indexed serviceId);
    event IdentityRegistryUpdated(address newRegistry);
    
    // Mock ERC721 for agent registry
    MockERC721 public mockAgentRegistry;
    
    function setUp() public override {
        super.setUp();
        
        // Deploy mock agent registry
        mockAgentRegistry = new MockERC721("Agent", "AGENT");
        
        // Mint agent NFT to provider
        mockAgentRegistry.mint(provider, 1);
        
        // Set agent registry in service registry
        vm.prank(owner);
        serviceRegistry.setIdentityRegistry(address(mockAgentRegistry));
    }
    
    // =====================================================
    // SERVICE CREATION TESTS
    // =====================================================
    
    function test_CreateService_Success() public {
        uint256 price = 100_000_000; // 100 USDC
        
        vm.prank(provider);
        uint256 serviceId = serviceRegistry.createService{value: 0.01 ether}(
            1, // agentId
            "Test Service",
            "Test description",
            "metadata",
            price,
            address(usdc)
        );
        
        assertEq(serviceId, 0);
        
        ServiceRegistryV2.Service memory service = serviceRegistry.getService(serviceId);
        assertEq(service.provider, provider);
        assertEq(service.agentId, 1);
        assertEq(service.name, "Test Service");
        assertEq(service.price, price);
        assertEq(service.paymentToken, address(usdc));
        assertTrue(service.isActive);
    }
    
    function test_CreateService_EmitsEvent() public {
        vm.prank(provider);
        vm.expectEmit(true, true, true, true);
        emit ServiceCreated(0, provider, 1, "Test Service", 100_000_000);
        serviceRegistry.createService{value: 0.01 ether}(1, "Test Service", "Test description", "metadata", 100_000_000, address(usdc));
    }
    
    function test_CreateService_UpdatesActiveCount() public {
        uint256 countBefore = serviceRegistry.getActiveServiceCount();
        
        vm.prank(provider);
        serviceRegistry.createService{value: 0.01 ether}(1, "Service 1", "Desc", "", 100, address(usdc));
        
        assertEq(serviceRegistry.getActiveServiceCount(), countBefore + 1);
    }
    
    function test_CreateService_NotAgentOwner_Reverts() public {
        vm.prank(client); // client doesn't own agent 1
        vm.expectRevert("Not agent owner");
        serviceRegistry.createService{value: 0.01 ether}(1, "Service", "Desc", "", 100, address(usdc));
    }
    
    function test_CreateService_EmptyName_Reverts() public {
        vm.prank(provider);
        vm.expectRevert("Name required");
        serviceRegistry.createService{value: 0.01 ether}(1, "", "Desc", "", 100, address(usdc));
    }

    function test_CreateService_ZeroPrice_Reverts() public {
        vm.prank(provider);
        vm.expectRevert("Price must be greater than 0");
        serviceRegistry.createService{value: 0.01 ether}(1, "Service", "Desc", "", 0, address(usdc));
    }

    function test_CreateService_ZeroPaymentToken_Reverts() public {
        vm.prank(provider);
        vm.expectRevert("Invalid payment token");
        serviceRegistry.createService{value: 0.01 ether}(1, "Service", "Desc", "", 100, address(0));
    }
    
    // =====================================================
    // SERVICE UPDATE TESTS
    // =====================================================
    
    function test_UpdateService_Success() public {
        vm.prank(provider);
        uint256 serviceId = serviceRegistry.createService{value: 0.01 ether}(1, "Original", "Desc", "", 100, address(usdc));
        
        vm.prank(provider);
        serviceRegistry.updateService(serviceId, "Updated", "New desc", "new metadata", 200);
        
        ServiceRegistryV2.Service memory service = serviceRegistry.getService(serviceId);
        assertEq(service.name, "Updated");
        assertEq(service.description, "New desc");
        assertEq(service.metadataURI, "new metadata");
        assertEq(service.price, 200);
    }
    
    function test_UpdateService_EmitsEvent() public {
        vm.prank(provider);
        uint256 serviceId = serviceRegistry.createService{value: 0.01 ether}(1, "Original", "Desc", "", 100, address(usdc));
        
        vm.prank(provider);
        vm.expectEmit(true, false, false, false);
        emit ServiceUpdated(serviceId);
        serviceRegistry.updateService(serviceId, "Updated", "New desc", "", 200);
    }
    
    function test_UpdateService_NotProvider_Reverts() public {
        vm.prank(provider);
        uint256 serviceId = serviceRegistry.createService{value: 0.01 ether}(1, "Service", "Desc", "", 100, address(usdc));

        vm.prank(client);
        vm.expectRevert("Not owner");
        serviceRegistry.updateService(serviceId, "Updated", "Desc", "", 200);
    }

    function test_UpdateService_NotActive_Reverts() public {
        vm.prank(provider);
        uint256 serviceId = serviceRegistry.createService{value: 0.01 ether}(1, "Service", "Desc", "", 100, address(usdc));

        vm.prank(provider);
        serviceRegistry.deactivateService(serviceId);

        vm.prank(provider);
        vm.expectRevert("Service inactive");
        serviceRegistry.updateService(serviceId, "Updated", "Desc", "", 200);
    }

    function test_UpdateService_EmptyName_Reverts() public {
        vm.prank(provider);
        uint256 serviceId = serviceRegistry.createService{value: 0.01 ether}(1, "Service", "Desc", "", 100, address(usdc));

        vm.prank(provider);
        vm.expectRevert("Name required");
        serviceRegistry.updateService(serviceId, "", "Desc", "", 200);
    }

    function test_UpdateService_ZeroPrice_Reverts() public {
        vm.prank(provider);
        uint256 serviceId = serviceRegistry.createService{value: 0.01 ether}(1, "Service", "Desc", "", 100, address(usdc));

        vm.prank(provider);
        vm.expectRevert("Price required");
        serviceRegistry.updateService(serviceId, "Updated", "Desc", "", 0);
    }
    
    // =====================================================
    // SERVICE DEACTIVATION TESTS
    // =====================================================
    
    function test_DeactivateService_Success() public {
        vm.prank(provider);
        uint256 serviceId = serviceRegistry.createService{value: 0.01 ether}(1, "Service", "Desc", "", 100, address(usdc));
        
        uint256 countBefore = serviceRegistry.getActiveServiceCount();
        
        vm.prank(provider);
        serviceRegistry.deactivateService(serviceId);
        
        ServiceRegistryV2.Service memory service = serviceRegistry.getService(serviceId);
        assertFalse(service.isActive);
        assertEq(serviceRegistry.getActiveServiceCount(), countBefore - 1);
    }
    
    function test_DeactivateService_EmitsEvent() public {
        vm.prank(provider);
        uint256 serviceId = serviceRegistry.createService{value: 0.01 ether}(1, "Service", "Desc", "", 100, address(usdc));
        
        vm.prank(provider);
        vm.expectEmit(true, false, false, false);
        emit ServiceDeactivated(serviceId);
        serviceRegistry.deactivateService(serviceId);
    }
    
    function test_DeactivateService_NotProvider_Reverts() public {
        vm.prank(provider);
        uint256 serviceId = serviceRegistry.createService{value: 0.01 ether}(1, "Service", "Desc", "", 100, address(usdc));

        vm.prank(client);
        vm.expectRevert("Not owner");
        serviceRegistry.deactivateService(serviceId);
    }
    
    function test_DeactivateService_AlreadyInactive_Reverts() public {
        vm.prank(provider);
        uint256 serviceId = serviceRegistry.createService{value: 0.01 ether}(1, "Service", "Desc", "", 100, address(usdc));
        
        vm.prank(provider);
        serviceRegistry.deactivateService(serviceId);
        
        vm.prank(provider);
        vm.expectRevert("Already inactive");
        serviceRegistry.deactivateService(serviceId);
    }
    
    // =====================================================
    // ACTIVATE SERVICE TESTS
    // =====================================================
    
    function test_ActivateService_Success() public {
        vm.prank(provider);
        uint256 serviceId = serviceRegistry.createService{value: 0.01 ether}(1, "Service", "Desc", "", 100, address(usdc));
        
        // Deactivate first
        vm.prank(provider);
        serviceRegistry.deactivateService(serviceId);
        
        // Verify inactive
        ServiceRegistryV2.Service memory service = serviceRegistry.getService(serviceId);
        assertFalse(service.isActive);
        
        // Activate
        vm.prank(provider);
        serviceRegistry.activateService(serviceId);
        
        // Verify active again
        service = serviceRegistry.getService(serviceId);
        assertTrue(service.isActive);
    }
    
    function test_ActivateService_UpdatesActiveCount() public {
        vm.prank(provider);
        uint256 serviceId = serviceRegistry.createService{value: 0.01 ether}(1, "Service", "Desc", "", 100, address(usdc));
        
        assertEq(serviceRegistry.getActiveServiceCount(), 1);
        
        vm.prank(provider);
        serviceRegistry.deactivateService(serviceId);
        
        assertEq(serviceRegistry.getActiveServiceCount(), 0);
        
        vm.prank(provider);
        serviceRegistry.activateService(serviceId);
        
        assertEq(serviceRegistry.getActiveServiceCount(), 1);
    }
    
    function test_ActivateService_EmitsEvent() public {
        vm.prank(provider);
        uint256 serviceId = serviceRegistry.createService{value: 0.01 ether}(1, "Service", "Desc", "", 100, address(usdc));
        
        vm.prank(provider);
        serviceRegistry.deactivateService(serviceId);
        
        vm.prank(provider);
        vm.expectEmit(true, true, true, true);
        emit ServiceActivated(serviceId);
        serviceRegistry.activateService(serviceId);
    }
    
    function test_ActivateService_NotProvider_Reverts() public {
        vm.prank(provider);
        uint256 serviceId = serviceRegistry.createService{value: 0.01 ether}(1, "Service", "Desc", "", 100, address(usdc));
        
        vm.prank(provider);
        serviceRegistry.deactivateService(serviceId);
        
        vm.prank(client);
        vm.expectRevert("Not owner");
        serviceRegistry.activateService(serviceId);
    }
    
    function test_ActivateService_AlreadyActive_Reverts() public {
        vm.prank(provider);
        uint256 serviceId = serviceRegistry.createService{value: 0.01 ether}(1, "Service", "Desc", "", 100, address(usdc));
        
        vm.prank(provider);
        vm.expectRevert("Already active");
        serviceRegistry.activateService(serviceId);
    }
    
    function test_ActivateService_InvalidServiceId_Reverts() public {
        vm.prank(provider);
        vm.expectRevert();
        serviceRegistry.activateService(999);
    }
    
    // =====================================================
    // QUERY FUNCTION TESTS
    // =====================================================
    
    function test_GetService_Success() public {
        vm.prank(provider);
        uint256 serviceId = serviceRegistry.createService{value: 0.01 ether}(1, "Service", "Desc", "metadata", 100, address(usdc));
        
        ServiceRegistryV2.Service memory service = serviceRegistry.getService(serviceId);
        assertEq(service.id, serviceId);
        assertEq(service.provider, provider);
        assertEq(service.agentId, 1);
        assertEq(service.name, "Service");
        assertEq(service.description, "Desc");
        assertEq(service.metadataURI, "metadata");
        assertEq(service.price, 100);
        assertEq(service.paymentToken, address(usdc));
        assertTrue(service.isActive);
    }
    
    function test_GetProviderServices_Success() public {
        vm.startPrank(provider);
        uint256 s1 = serviceRegistry.createService{value: 0.01 ether}(1, "Service 1", "Desc", "", 100, address(usdc));
        uint256 s2 = serviceRegistry.createService{value: 0.01 ether}(1, "Service 2", "Desc", "", 200, address(usdc));
        vm.stopPrank();
        
        uint256[] memory services = serviceRegistry.getProviderServices(provider);
        assertEq(services.length, 2);
        assertEq(services[0], s1);
        assertEq(services[1], s2);
    }
    
    function test_GetServicesByAgent_Success() public {
        // Create another agent NFT for provider
        mockAgentRegistry.mint(provider, 2);
        
        vm.startPrank(provider);
        uint256 s1 = serviceRegistry.createService{value: 0.01 ether}(1, "Agent 1 Service", "Desc", "", 100, address(usdc));
        uint256 s2 = serviceRegistry.createService{value: 0.01 ether}(2, "Agent 2 Service", "Desc", "", 200, address(usdc));
        vm.stopPrank();
        
        uint256[] memory agent1Services = serviceRegistry.getServicesByAgent(1);
        assertEq(agent1Services.length, 1);
        assertEq(agent1Services[0], s1);
        
        uint256[] memory agent2Services = serviceRegistry.getServicesByAgent(2);
        assertEq(agent2Services.length, 1);
        assertEq(agent2Services[0], s2);
    }
    
    function test_GetActiveServiceCount_O1() public {
        // Create multiple services
        for (uint i = 0; i < 10; i++) {
            address p = makeAddr(string.concat("provider", vm.toString(i)));
            mockAgentRegistry.mint(p, i + 2);
            vm.deal(p, 1 ether);
            vm.prank(p);
            serviceRegistry.createService{value: 0.01 ether}(i + 2, string.concat("Service ", vm.toString(i)), "Desc", "", 100, address(usdc));
        }
        
        // Should be O(1) regardless of service count
        uint256 gasBefore = gasleft();
        uint256 count = serviceRegistry.getActiveServiceCount();
        uint256 gasUsed = gasBefore - gasleft();
        
        assertEq(count, 10);
        assertLt(gasUsed, 5000); // O(1) should use minimal gas
    }
    
    function test_GetServices_Pagination() public {
        // Create 5 services
        for (uint i = 0; i < 5; i++) {
            address p = makeAddr(string.concat("p", vm.toString(i)));
            mockAgentRegistry.mint(p, i + 2);
            vm.deal(p, 1 ether);
            vm.prank(p);
            serviceRegistry.createService{value: 0.01 ether}(i + 2, string.concat("S", vm.toString(i)), "Desc", "", 100, address(usdc));
        }
        
        uint256[] memory services = serviceRegistry.getServices(0, 3);
        assertEq(services.length, 3);
        
        uint256[] memory services2 = serviceRegistry.getServices(3, 3);
        assertEq(services2.length, 2);
    }
    
    // =====================================================
    // SETTER FUNCTION TESTS
    // =====================================================
    
    function test_SetIdentityRegistry_Success() public {
        address newRegistry = makeAddr("newRegistry");
        
        vm.prank(owner);
        serviceRegistry.setIdentityRegistry(newRegistry);
        
        assertEq(address(serviceRegistry.identityRegistry()), newRegistry);
    }
    
    function test_SetIdentityRegistry_EmitsEvent() public {
        address newRegistry = makeAddr("newRegistry");

        vm.prank(owner);
        vm.expectEmit(true, false, false, false);
        emit IdentityRegistryUpdated(newRegistry);
        serviceRegistry.setIdentityRegistry(newRegistry);
    }
    
    function test_SetIdentityRegistry_NotOwner_Reverts() public {
        vm.prank(client);
        vm.expectRevert();
        serviceRegistry.setIdentityRegistry(makeAddr("newRegistry"));
    }
    
    function test_SetAgenticCommerce_Success() public {
        address newCommerce = makeAddr("newCommerce");
        
        vm.prank(owner);
        serviceRegistry.setAgenticCommerce(newCommerce);
        
        assertEq(address(serviceRegistry.agenticCommerce()), newCommerce);
    }
    
    // =====================================================
    // PROXY UPGRADE TESTS
    // =====================================================
    
    function test_ProxyUpgrade_Success() public {
        // Deploy new implementation
        ServiceRegistryV2 newImpl = new ServiceRegistryV2();
        
        // Upgrade
        vm.prank(owner);
        serviceRegistry.upgradeToAndCall(address(newImpl), "");
        
        // Verify still works
        mockAgentRegistry.mint(client, 99);
        vm.prank(client);
        uint256 serviceId = serviceRegistry.createService{value: 0.01 ether}(99, "Test", "Desc", "", 100, address(usdc));
        assertEq(serviceId, 0);
    }
    
    function test_ProxyUpgrade_NotOwner_Reverts() public {
        ServiceRegistryV2 newImpl = new ServiceRegistryV2();
        
        vm.prank(client);
        vm.expectRevert();
        serviceRegistry.upgradeToAndCall(address(newImpl), "");
    }
    
    // =====================================================
    // O(1) OPTIMIZATION TESTS
    // =====================================================
    
    function test_ActiveServiceCount_O1_AfterDeactivation() public {
        // Create 100 services
        for (uint i = 0; i < 100; i++) {
            address p = makeAddr(string.concat("p", vm.toString(i)));
            mockAgentRegistry.mint(p, i + 2);
            vm.deal(p, 2 ether);
            vm.prank(p);
            serviceRegistry.createService{value: 0.01 ether}(i + 2, string.concat("S", vm.toString(i)), "Desc", "", 100, address(usdc));
        }
        
        // Deactivate 50 services
        for (uint i = 0; i < 50; i++) {
            address p = makeAddr(string.concat("p", vm.toString(i)));
            vm.prank(p);
            serviceRegistry.deactivateService(i);
        }
        
        // Count should still be O(1)
        uint256 gasBefore = gasleft();
        uint256 count = serviceRegistry.getActiveServiceCount();
        uint256 gasUsed = gasBefore - gasleft();
        
        assertEq(count, 50);
        assertLt(gasUsed, 5000);
    }
}

/**
 * @title MockERC721
 * @dev Simple ERC721 mock for testing agent registry with IIdentityRegistry interface
 */
contract MockERC721 {
    string public name;
    string public symbol;
    
    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => bool) private _activeStatus;
    uint256 private _tokenIdCounter;
    
    constructor(string memory _name, string memory _symbol) {
        name = _name;
        symbol = _symbol;
    }
    
    function mint(address to, uint256 tokenId) external {
        _owners[tokenId] = to;
        _balances[to]++;
        _activeStatus[tokenId] = true;
    }
    
    function ownerOf(uint256 tokenId) external view returns (address) {
        return _owners[tokenId];
    }
    
    function balanceOf(address owner) external view returns (uint256) {
        return _balances[owner];
    }
    
    function setActiveStatus(uint256 tokenId, bool status) external {
        _activeStatus[tokenId] = status;
    }
    
    function getAgent(uint256 agentId) external view returns (
        address owner, 
        string memory, 
        address, 
        bool isActive
    ) {
        return (_owners[agentId], "", address(0), _activeStatus[agentId]);
    }
}
