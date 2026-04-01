// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {AgentReviewV4} from "../shared/AgentReviewV4.sol";
import {AgenticCommerceV4} from "../shared/AgenticCommerceV4.sol";
import {ServiceRegistryV2} from "../shared/ServiceRegistryV2.sol";

/**
 * @title DeployPhase3Complete
 * @dev Complete Phase 3 deployment script
 * 
 * Deploys:
 * 1. Upgrades ServiceRegistryV2 with enhanced events (UUPS proxy)
 * 2. Deploys AgentReviewV4 (new contract with comprehensive events)
 * 3. Deploys AgenticCommerceV4 (new contract with comprehensive events)
 * 
 * Run with:
 * forge script script/DeployPhase3Complete.s.sol --rpc-url $SEPOLIA_RPC --broadcast -vvvv
 */
contract DeployPhase3Complete is Script {
    // Sepolia contract addresses (current)
    address public constant SERVICE_REGISTRY_V2_PROXY = 0x62E1eeEa1A2Ab987004F35bDA430457Ed6077201;
    address public constant TREASURY = 0x3394C45b5938127EB56603A6051dF26CFAF08C26; // Deployer address
    
    // New V4 addresses (will be populated after deployment)
    address public agentReviewV4;
    address public agenticCommerceV4;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("=============================================");
        console.log("Phase 3: Comprehensive Events Deployment");
        console.log("=============================================");
        console.log("Deployer:", deployer);
        console.log("Chain:", block.chainid);
        console.log("");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // ============ 1. Deploy AgentReviewV4 ============
        console.log("[1/3] Deploying AgentReviewV4...");
        
        AgentReviewV4 agentReview = new AgentReviewV4();
        agentReviewV4 = address(agentReview);
        
        console.log("    Deployed at:", agentReviewV4);
        console.log("    Features:");
        console.log("      - Comprehensive event system");
        console.log("      - Proposal status change tracking");
        console.log("      - Evaluator registration events");
        console.log("      - Reward distribution failure tracking");
        console.log("");
        
        // ============ 2. Deploy AgenticCommerceV4 ============
        console.log("[2/3] Deploying AgenticCommerceV4...");
        
        AgenticCommerceV4 commerce = new AgenticCommerceV4(TREASURY);
        agenticCommerceV4 = address(commerce);
        
        console.log("    Deployed at:", agenticCommerceV4);
        console.log("    Features:");
        console.log("      - Job status change events");
        console.log("      - Update tracking (provider, budget, token)");
        console.log("      - Platform fee change events");
        console.log("      - Emergency refund capability");
        console.log("      - Job limit exceeded warnings");
        console.log("");
        
        // ============ 3. Upgrade ServiceRegistryV2 ============
        console.log("[3/3] Upgrading ServiceRegistryV2 with enhanced events...");
        console.log("    Proxy:", SERVICE_REGISTRY_V2_PROXY);
        
        ServiceRegistryV2 newImplementation = new ServiceRegistryV2();
        console.log("    New Implementation:", address(newImplementation));
        
        // Upgrade via proxy (using UUPS pattern)
        ServiceRegistryV2 proxy = ServiceRegistryV2(SERVICE_REGISTRY_V2_PROXY);
        proxy.upgradeToAndCall(address(newImplementation), "");
        
        console.log("    Upgrade complete!");
        console.log("");
        
        vm.stopBroadcast();
        
        // ============ Summary ============
        console.log("");
        console.log("=============================================");
        console.log("Phase 3 Deployment Complete!");
        console.log("=============================================");
        console.log("");
        console.log("NEW CONTRACT ADDRESSES (Sepolia):");
        console.log("----------------------------------------------");
        console.log("AgentReviewV4:", agentReviewV4);
        console.log("AgenticCommerceV4:", agenticCommerceV4);
        console.log("");
        console.log("UPGRADED CONTRACT:");
        console.log("----------------------------------------------");
        console.log("ServiceRegistryV2 (Proxy):", SERVICE_REGISTRY_V2_PROXY);
        console.log("ServiceRegistryV2 (New Impl):", address(newImplementation));
        console.log("");
        console.log("IMPORTANT: Update these addresses in:");
        console.log("  - .env");
        console.log("  - apps/web/.env.local");
        console.log("  - apps/web/lib/contracts/config.ts");
        console.log("  - sdk/typescript/types.ts");
        console.log("  - AGENTS.md");
        console.log("  - Documentation");
        console.log("");
        console.log("=============================================");
    }
}
