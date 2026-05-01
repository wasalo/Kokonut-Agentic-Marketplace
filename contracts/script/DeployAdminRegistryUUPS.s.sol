// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {AdminRegistry} from "../shared/AdminRegistry.sol";

/**
 * @title DeployAdminRegistryUUPS
 * @dev Deploys new UUPS AdminRegistry proxy and migrates all data from old direct deployment
 * 
 * Run: forge script contracts/script/DeployAdminRegistryUUPS.s.sol:DeployAdminRegistryUUPS --rpc-url sepolia --broadcast --verify --via-ir -vvvv
 */
contract DeployAdminRegistryUUPS is Script {
    
    // Old AdminRegistry (direct deployment)
    address constant OLD_ADMIN_REGISTRY = 0x9b4a7479E2609D1E6Dfc4232aD4CA493adF82c6e;
    
    // Sepolia references
    address constant IDENTITY_REGISTRY = 0x8004A818BFB912233c491871b3d84c89A494BD9e;
    
    // Consumer contracts to update
    address constant AGENTIC_COMMERCE = 0x4c592510e4FAbbEEA8D7142dE1f38d548b500e7f;
    address constant SERVICE_REGISTRY = 0x62E1eeEa1A2Ab987004F35bDA430457Ed6077201;
    address constant BIDDING_SYSTEM = 0x32c9d069a248a619d3EAc4D1FC76F2639AaBeF04;
    address constant AGENT_REVIEW = payable(0x5CDb592Fd37749bF87448FBf5725D1Cd986dd1Cb);
    address constant MILESTONE_ESCROW = 0xd4Fdc345b1c6aF1B4Cc84339bcB251B33527Eb45;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("========================================");
        console.log("Deploying AdminRegistry UUPS Proxy");
        console.log("Old Registry:", OLD_ADMIN_REGISTRY);
        console.log("========================================");
        console.log("Deployer:", deployer);

        vm.startBroadcast(deployerPrivateKey);

        // ============================================
        // 1. Deploy new AdminRegistry Implementation
        // ============================================
        console.log("[1/5] Deploying AdminRegistry Implementation...");
        AdminRegistry newImpl = new AdminRegistry();
        console.log("New Implementation:", address(newImpl));

        // ============================================
        // 2. Deploy ERC1967 Proxy
        // ============================================
        console.log("[2/5] Deploying UUPS Proxy...");
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(newImpl),
            abi.encodeWithSelector(AdminRegistry.initialize.selector)
        );
        AdminRegistry registry = AdminRegistry(address(proxy));
        console.log("New Proxy:", address(registry));
        
        // ============================================
        // 3. Set Identity Registry
        // ============================================
        console.log("[3/5] Setting Identity Registry...");
        registry.setIdentityRegistry(IDENTITY_REGISTRY);
        console.log("Identity Registry set:", IDENTITY_REGISTRY);

        // ============================================
        // 4. Migrate Data from Old Registry
        // ============================================
        console.log("[4/5] Migrating data from old registry...");
        
        AdminRegistry oldRegistry = AdminRegistry(OLD_ADMIN_REGISTRY);
        
        // Migrate halfLifeDays
        uint256 halfLife = oldRegistry.halfLifeDays();
        if (halfLife != 30) {
            registry.setHalfLifeDays(halfLife);
            console.log("Migrated halfLifeDays:", halfLife);
        }
        
        // Migrate slashManager
        address slashManager = oldRegistry.slashManager();
        if (slashManager != address(0)) {
            registry.setSlashManager(slashManager);
            console.log("Migrated slashManager:", slashManager);
        }
        
        // Migrate blacklisted agents
        uint256[] memory blacklistedAgents = oldRegistry.getAllBlacklistedAgents();
        console.log("Blacklisted agents to migrate:", blacklistedAgents.length);
        for (uint256 i = 0; i < blacklistedAgents.length; i++) {
            uint256 agentId = blacklistedAgents[i];
            (
                bool isBlacklisted,
                uint256 blacklistedAt,
                uint256 activationAt,
                string memory reason,
                address blacklistedBy,
                bool autoSlashed
            ) = oldRegistry.blacklistedAgents(agentId);
            
            if (isBlacklisted) {
                // Use the original reason, or "Migrated from old registry" if empty
                string memory migrationReason = bytes(reason).length > 0 ? reason : "Migrated from old registry";
                registry.blacklistAgent(agentId, migrationReason);
                console.log("  Migrated blacklisted agent:", agentId);
            }
        }
        
        // Migrate blacklisted wallets
        address[] memory blacklistedWallets = oldRegistry.getAllBlacklistedWallets();
        console.log("Blacklisted wallets to migrate:", blacklistedWallets.length);
        for (uint256 i = 0; i < blacklistedWallets.length; i++) {
            address wallet = blacklistedWallets[i];
            (
                bool isBlacklisted,
                ,
                ,
                string memory reason,
                ,
            ) = oldRegistry.blacklistedWallets(wallet);
            
            if (isBlacklisted) {
                string memory migrationReason = bytes(reason).length > 0 ? reason : "Migrated from old registry";
                registry.blacklistWallet(wallet, migrationReason);
                console.log("  Migrated blacklisted wallet:", wallet);
            }
        }
        
        // Migrate featured agents
        uint256[] memory featuredAgents = oldRegistry.getFeaturedAgents();
        console.log("Featured agents to migrate:", featuredAgents.length);
        for (uint256 i = 0; i < featuredAgents.length; i++) {
            uint256 agentId = featuredAgents[i];
            registry.setFeaturedAgent(agentId, true);
            console.log("  Migrated featured agent:", agentId);
        }
        
        // Migrate verification providers
        string[] memory providers = oldRegistry.getVerificationProviders();
        console.log("Verification providers to migrate:", providers.length);
        for (uint256 i = 0; i < providers.length; i++) {
            registry.setVerificationProvider(providers[i], true);
            console.log("  Migrated provider:", providers[i]);
        }
        
        console.log("Data migration complete");

        // ============================================
        // 5. Update Consumer Contracts
        // ============================================
        console.log("[5/5] Updating consumer contracts...");
        
        // Update AgenticCommerceV9
        try AgenticCommerceV9(AGENTIC_COMMERCE).setAdminRegistry(address(registry)) {
            console.log("Updated AgenticCommerceV9 admin registry");
        } catch {
            console.log("FAILED to update AgenticCommerceV9 (may not be owner)");
        }
        
        // Update ServiceRegistryV2
        try ServiceRegistryV2(SERVICE_REGISTRY).setAdminRegistry(address(registry)) {
            console.log("Updated ServiceRegistryV2 admin registry");
        } catch {
            console.log("FAILED to update ServiceRegistryV2 (may not be owner)");
        }
        
        // Update BiddingSystem
        try BiddingSystem(BIDDING_SYSTEM).setAdminRegistry(address(registry)) {
            console.log("Updated BiddingSystem admin registry");
        } catch {
            console.log("FAILED to update BiddingSystem (may not be owner)");
        }
        
        // Update AgentReviewV5
        try AgentReviewV5(AGENT_REVIEW).setAdminRegistry(address(registry)) {
            console.log("Updated AgentReviewV5 admin registry");
        } catch {
            console.log("FAILED to update AgentReviewV5 (may not be owner)");
        }
        
        // Update MilestoneEscrowV2 (if it uses adminRegistry)
        // Note: MilestoneEscrowV2 doesn't have setAdminRegistry, but it uses agenticCommerce
        
        vm.stopBroadcast();

        // ============================================
        // Summary
        // ============================================
        console.log("");
        console.log("========================================");
        console.log("ADMIN REGISTRY UUPS DEPLOYMENT COMPLETE");
        console.log("========================================");
        console.log("New Proxy:        ", address(registry));
        console.log("New Implementation:", address(newImpl));
        console.log("Old Registry:     ", OLD_ADMIN_REGISTRY);
        console.log("========================================");
        console.log("");
        console.log("ACTIONS REQUIRED:");
        console.log("1. Verify new proxy on Etherscan");
        console.log("2. Test blacklist functions on new proxy");
        console.log("3. Update frontend configs with new address:", address(registry));
        console.log("4. If any consumer contract updates failed, call setAdminRegistry() manually");
        console.log("5. Consider deprecating old registry after grace periods expire");
    }
}

// Minimal interfaces for consumer contracts
interface AgenticCommerceV9 {
    function setAdminRegistry(address _registry) external;
}

interface ServiceRegistryV2 {
    function setAdminRegistry(address _registry) external;
}

interface BiddingSystem {
    function setAdminRegistry(address _registry) external;
}

interface AgentReviewV5 {
    function setAdminRegistry(address _registry) external;
}
