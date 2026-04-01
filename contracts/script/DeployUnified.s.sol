// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../shared/AgentSkillRegistry.sol";
import "../shared/ServiceRegistry.sol";
import "../shared/AgenticCommerce.sol";
import "../shared/AgentReview.sol";
import "../shared/PriceOracle.sol";
import "../shared/CommitReveal.sol";
import "../shared/SlashManager.sol";

/**
 * @title DeployUnifiedScript
 * @dev Deploys the entire unified Kokonut Agent Economy Stack.
 * 
 * Prerequisites:
 * - Official ERC-8004 Identity Registry deployed at known address
 * - USDC token address for target network
 */
contract DeployUnifiedScript is Script {
    function run(address identityRegistry) external {
        require(identityRegistry != address(0), "Identity registry required");
        
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying Unified Kokonut Agent Economy Stack...");
        console.log("Deployer:", deployer);
        console.log("Chain ID:", block.chainid);
        console.log("Identity Registry:", identityRegistry);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // 1. Deploy AgentSkillRegistry (wired to official ERC-8004 identity)
        console.log("Deploying AgentSkillRegistry...");
        AgentSkillRegistry skillRegistry = new AgentSkillRegistry(identityRegistry);
        console.log("AgentSkillRegistry:", address(skillRegistry));
        
        // 2. Deploy ServiceRegistry (wired to official ERC-8004 identity)
        console.log("Deploying ServiceRegistry...");
        ServiceRegistry serviceRegistry = new ServiceRegistry(identityRegistry);
        console.log("ServiceRegistry:", address(serviceRegistry));
        
        // 3. Deploy AgentReview (standalone)
        console.log("Deploying AgentReview...");
        AgentReview agentReview = new AgentReview();
        console.log("AgentReview:", address(agentReview));
        
        // 4. Deploy AgenticCommerce (wired to treasury)
        console.log("Deploying AgenticCommerce...");
        AgenticCommerce agenticCommerce = new AgenticCommerce(deployer);
        console.log("AgenticCommerce:", address(agenticCommerce));
        
        // 5. Deploy PriceOracle (standalone)
        console.log("Deploying PriceOracle...");
        PriceOracle priceOracle = new PriceOracle();
        console.log("PriceOracle:", address(priceOracle));
        
        // 6. Deploy CommitReveal (wired to service registry)
        console.log("Deploying CommitReveal...");
        CommitReveal commitReveal = new CommitReveal(address(serviceRegistry), deployer);
        console.log("CommitReveal:", address(commitReveal));
        
        // 7. Deploy SlashManager (3-of-5 multisig)
        console.log("Deploying SlashManager...");
        address[] memory initialSigners = new address[](5);
        initialSigners[0] = deployer;
        initialSigners[1] = address(0x1);
        initialSigners[2] = address(0x2);
        initialSigners[3] = address(0x3);
        initialSigners[4] = address(0x4);
        SlashManager slashManager = new SlashManager(deployer, initialSigners);
        console.log("SlashManager:", address(slashManager));
        
        // === Cross-contract wiring ===
        console.log("\nWiring contracts...");
        
        // Wire AgenticCommerce -> ServiceRegistry
        agenticCommerce.setServiceRegistry(address(serviceRegistry));
        console.log("AgenticCommerce -> ServiceRegistry: OK");
        
        // Wire SlashManager -> AgentReview
        slashManager.setAgentReview(address(agentReview));
        console.log("SlashManager -> AgentReview: OK");
        
        vm.stopBroadcast();
        
        console.log("\n=== Deployment Summary ===");
        console.log("AgentSkillRegistry:", address(skillRegistry));
        console.log("ServiceRegistry:", address(serviceRegistry));
        console.log("AgentReview:", address(agentReview));
        console.log("AgenticCommerce:", address(agenticCommerce));
        console.log("PriceOracle:", address(priceOracle));
        console.log("CommitReveal:", address(commitReveal));
        console.log("SlashManager:", address(slashManager));
        
        console.log("\n=== .env.local values ===");
        console.log("NEXT_PUBLIC_SKILL_REGISTRY_ADDRESS=", vm.toString(address(skillRegistry)));
        console.log("NEXT_PUBLIC_SERVICE_REGISTRY_ADDRESS=", vm.toString(address(serviceRegistry)));
        console.log("NEXT_PUBLIC_AGENT_REVIEW_ADDRESS=", vm.toString(address(agentReview)));
        console.log("NEXT_PUBLIC_AGENTIC_COMMERCE_ADDRESS=", vm.toString(address(agenticCommerce)));
        console.log("NEXT_PUBLIC_PRICE_ORACLE_ADDRESS=", vm.toString(address(priceOracle)));
        console.log("NEXT_PUBLIC_COMMIT_REVEAL_ADDRESS=", vm.toString(address(commitReveal)));
        console.log("NEXT_PUBLIC_SLASH_MANAGER_ADDRESS=", vm.toString(address(slashManager)));
    }
}
