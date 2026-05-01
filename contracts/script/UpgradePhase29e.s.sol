// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AdminRegistry} from "../shared/AdminRegistry.sol";
import {AgenticCommerceV9} from "../shared/AgenticCommerceV9.sol";
import {MilestoneEscrowV2} from "../shared/MilestoneEscrowV2.sol";
import {AgentReviewV5} from "../shared/AgentReviewV5.sol";
import {ServiceRegistryV2} from "../shared/ServiceRegistryV2.sol";
import {BiddingSystem} from "../shared/BiddingSystem.sol";

/**
 * @title DeployAdminRegistryProxy
 * @dev Deploys new UUPS AdminRegistry proxy (old one was direct deploy)
 */
contract DeployAdminRegistryProxy is Script {
    
    // Sepolia references
    address constant IDENTITY_REGISTRY = 0x8004A818BFB912233c491871b3d84c89A494BD9e;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("========================================");
        console.log("Deploying AdminRegistry UUPS Proxy");
        console.log("========================================");
        console.log("Deployer:", deployer);

        vm.startBroadcast(deployerPrivateKey);

        AdminRegistry adminRegistryImpl = new AdminRegistry();
        console.log("AdminRegistry Implementation:", address(adminRegistryImpl));
        
        ERC1967Proxy adminRegistryProxy = new ERC1967Proxy(
            address(adminRegistryImpl),
            abi.encodeWithSelector(AdminRegistry.initialize.selector)
        );
        console.log("AdminRegistry Proxy:", address(adminRegistryProxy));
        
        AdminRegistry adminRegistry = AdminRegistry(address(adminRegistryProxy));
        
        // Set identity registry for agent existence validation
        adminRegistry.setIdentityRegistry(IDENTITY_REGISTRY);
        console.log("Identity registry set:", IDENTITY_REGISTRY);

        vm.stopBroadcast();

        console.log("");
        console.log("========================================");
        console.log("ADMIN REGISTRY DEPLOYED");
        console.log("========================================");
        console.log("Proxy:    ", address(adminRegistryProxy));
        console.log("Impl:     ", address(adminRegistryImpl));
        console.log("========================================");
    }
}

/**
 * @title UpgradeContractsPhase29e
 * @dev Upgrades all UUPS proxies with Phase 29e fixes
 */
contract UpgradeContractsPhase29e is Script {

    // Sepolia Proxy Addresses
    address constant AGENTIC_COMMERCE_PROXY = 0x4c592510e4FAbbEEA8D7142dE1f38d548b500e7f;
    address constant MILESTONE_ESCROW_PROXY = 0xd4Fdc345b1c6aF1B4Cc84339bcB251B33527Eb45;
    address constant AGENT_REVIEW_PROXY = payable(0x5CDb592Fd37749bF87448FBf5725D1Cd986dd1Cb);
    address constant SERVICE_REGISTRY_PROXY = 0x62E1eeEa1A2Ab987004F35bDA430457Ed6077201;
    address constant BIDDING_SYSTEM_PROXY = 0x32c9d069a248a619d3EAc4D1FC76F2639AaBeF04;
    
    // New AdminRegistry UUPS proxy (Phase 29e)
    address constant ADMIN_REGISTRY_PROXY = 0xC81C864CEAb6231ad764cf9867e031D8b6dee41d;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("========================================");
        console.log("Phase 29e: Security Hardening Upgrade");
        console.log("========================================");
        console.log("Deployer:", deployer);

        vm.startBroadcast(deployerPrivateKey);

        // ============================================
        // 1. Deploy AgenticCommerceV9 Implementation
        // ============================================
        console.log("[1/5] Deploying AgenticCommerceV9 Implementation...");
        AgenticCommerceV9 commerceImpl = new AgenticCommerceV9();
        console.log("AgenticCommerceV9 Implementation:", address(commerceImpl));
        
        UUPSUpgradeable(AGENTIC_COMMERCE_PROXY).upgradeToAndCall(address(commerceImpl), "");
        console.log("AgenticCommerceV9 upgraded successfully");
        
        // ============================================
        // 2. Deploy MilestoneEscrowV2 Implementation
        // ============================================
        console.log("[2/5] Deploying MilestoneEscrowV2 Implementation...");
        MilestoneEscrowV2 escrowImpl = new MilestoneEscrowV2();
        console.log("MilestoneEscrowV2 Implementation:", address(escrowImpl));
        
        UUPSUpgradeable(MILESTONE_ESCROW_PROXY).upgradeToAndCall(address(escrowImpl), "");
        console.log("MilestoneEscrowV2 upgraded successfully");

        // ============================================
        // 3. Deploy AgentReviewV5 Implementation
        // ============================================
        console.log("[3/5] Deploying AgentReviewV5 Implementation...");
        AgentReviewV5 reviewImpl = new AgentReviewV5();
        console.log("AgentReviewV5 Implementation:", address(reviewImpl));
        
        UUPSUpgradeable(address(AGENT_REVIEW_PROXY)).upgradeToAndCall(address(reviewImpl), "");
        console.log("AgentReviewV5 upgraded successfully");
        
        AgentReviewV5(payable(address(AGENT_REVIEW_PROXY))).setAdminRegistry(ADMIN_REGISTRY_PROXY);
        console.log("AgentReviewV5 admin registry set");

        // ============================================
        // 4. Deploy ServiceRegistryV2 Implementation
        // ============================================
        console.log("[4/5] Deploying ServiceRegistryV2 Implementation...");
        ServiceRegistryV2 serviceImpl = new ServiceRegistryV2();
        console.log("ServiceRegistryV2 Implementation:", address(serviceImpl));
        
        UUPSUpgradeable(SERVICE_REGISTRY_PROXY).upgradeToAndCall(address(serviceImpl), "");
        console.log("ServiceRegistryV2 upgraded successfully");

        // ============================================
        // 5. Deploy BiddingSystem Implementation
        // ============================================
        console.log("[5/5] Deploying BiddingSystem Implementation...");
        BiddingSystem biddingImpl = new BiddingSystem();
        console.log("BiddingSystem Implementation:", address(biddingImpl));
        
        UUPSUpgradeable(BIDDING_SYSTEM_PROXY).upgradeToAndCall(address(biddingImpl), "");
        console.log("BiddingSystem upgraded successfully");

        vm.stopBroadcast();

        // ============================================
        // Summary
        // ============================================
        console.log("");
        console.log("========================================");
        console.log("PHASE 29e UPGRADE COMPLETE");
        console.log("========================================");
        console.log("New Implementations:");
        console.log("AgenticCommerceV9:", address(commerceImpl));
        console.log("MilestoneEscrowV2:", address(escrowImpl));
        console.log("AgentReviewV5:    ", address(reviewImpl));
        console.log("ServiceRegistryV2:", address(serviceImpl));
        console.log("BiddingSystem:    ", address(biddingImpl));
        console.log("========================================");
    }
}

/**
 * @title VerifyPhase29e
 * @dev Verifies all implementations on Etherscan
 */
contract VerifyPhase29e is Script {
    function run() external view {
        console.log("========================================");
        console.log("Phase 29e Verification");
        console.log("========================================");
        console.log("Verify implementations on Sepolia Etherscan:");
        console.log("");
        console.log("AdminRegistry:     https://sepolia.etherscan.io/address/0x5Ea686514c3eEf533cfeC1f34d69582FA4850136#code");
        console.log("AgenticCommerceV9: https://sepolia.etherscan.io/address/0x9634280fb2416061124aa6474F1BcF692473bEF4#code");
        console.log("MilestoneEscrowV2: https://sepolia.etherscan.io/address/0xfb764A5c740aC47721bC9802596395CdF2DC4CdB#code");
        console.log("AgentReviewV5:     https://sepolia.etherscan.io/address/0xB93A8Ef6DBD364A4e936bE53061099864465B678#code");
        console.log("ServiceRegistryV2: https://sepolia.etherscan.io/address/0xb75B02D4523171ABdB6f5bcB9D60903ed3e30fAD#code");
        console.log("BiddingSystem:     https://sepolia.etherscan.io/address/0x0eE5E780bbbBA610D0B1926a3993A2aa0B1B9812#code");
        console.log("");
        console.log("Or run forge verify-contract for each implementation");
    }
}
