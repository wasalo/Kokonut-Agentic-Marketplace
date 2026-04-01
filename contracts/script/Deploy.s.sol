// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../shared/AgentSkillRegistry.sol";
import "../shared/ServiceRegistryV2.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../shared/AgenticCommerce.sol";
import "../shared/AgentReview.sol";
import "../shared/PriceOracle.sol";
import "../shared/CommitReveal.sol";
import "../shared/SlashManager.sol";

/**
 * @title DeployScript
 * @dev Modular deployment script for Kokonut Agent Economy Stack.
 * 
 * Official ERC-8004 Identity Registry (Sepolia):
 * 0x8004A818BFB912233c491871b3d84c89A494BD9e
 */
contract DeployCoreScript is Script {
    function run(address identityRegistry) external {
        require(identityRegistry != address(0), "Identity registry required");
        
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying Kokonut Agent Economy Stack - Core Contracts...");
        console.log("Deployer:", deployer);
        console.log("Chain ID:", block.chainid);
        console.log("Identity Registry:", identityRegistry);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // 1. Deploy AgentSkillRegistry (wired to official ERC-8004 identity)
        console.log("Deploying AgentSkillRegistry...");
        AgentSkillRegistry skillRegistry = new AgentSkillRegistry(identityRegistry);
        console.log("AgentSkillRegistry deployed at:", address(skillRegistry));
        
        // 2. Deploy ServiceRegistryV2 (UUPS Proxy pattern)
        console.log("Deploying ServiceRegistryV2 (UUPS Proxy)...");
        
        // Deploy implementation
        ServiceRegistryV2 serviceRegistryImpl = new ServiceRegistryV2();
        console.log("ServiceRegistryV2 Implementation:", address(serviceRegistryImpl));
        
        // Deploy proxy
        bytes memory initData = abi.encodeWithSelector(
            ServiceRegistryV2.initialize.selector,
            identityRegistry
        );
        ERC1967Proxy serviceRegistryProxy = new ERC1967Proxy(
            address(serviceRegistryImpl),
            initData
        );
        console.log("ServiceRegistryV2 Proxy:", address(serviceRegistryProxy));
        
        // Create interface to proxy
        ServiceRegistryV2 serviceRegistry = ServiceRegistryV2(address(serviceRegistryProxy));
        
        // 3. Deploy AgentReview (standalone)
        console.log("Deploying AgentReview...");
        AgentReview agentReview = new AgentReview();
        console.log("AgentReview deployed at:", address(agentReview));
        
        vm.stopBroadcast();
        
        console.log("\n=== Deployment Summary ===");
        console.log("AgentSkillRegistry:", address(skillRegistry));
        console.log("ServiceRegistryV2 Proxy (USE THIS):", address(serviceRegistry));
        console.log("ServiceRegistryV2 Implementation:", address(serviceRegistryImpl));
        console.log("AgentReview:", address(agentReview));
        console.log("AgenticCommerce: SKIPPED (deploy separately with treasury)");
        
        console.log("\n=== .env.local values ===");
        console.log("NEXT_PUBLIC_SKILL_REGISTRY_ADDRESS=", vm.toString(address(skillRegistry)));
        console.log("NEXT_PUBLIC_SERVICE_REGISTRY_ADDRESS=", vm.toString(address(serviceRegistry)));
        console.log("NEXT_PUBLIC_AGENT_REVIEW_ADDRESS=", vm.toString(address(agentReview)));
        console.log("\nIMPORTANT: Use the Proxy address for ServiceRegistryV2, not the Implementation!");
    }
}

contract DeployCommerceScript is Script {
    function run(address treasury) external {
        require(treasury != address(0), "Treasury address required");
        
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying AgenticCommerce...");
        console.log("Treasury:", treasury);
        
        vm.startBroadcast(deployerPrivateKey);
        
        AgenticCommerce agenticCommerce = new AgenticCommerce(treasury);
        
        vm.stopBroadcast();
        
        console.log("AgenticCommerce deployed at:", address(agenticCommerce));
        console.log("NEXT_PUBLIC_AGENTIC_COMMERCE_ADDRESS=", vm.toString(address(agenticCommerce)));
    }
}

contract DeployPhase2Script is Script {
    function run(address serviceRegistry) external {
        require(serviceRegistry != address(0), "Service registry address required");
        
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying Phase 2 Contracts...");
        console.log("Deployer:", deployer);
        console.log("Chain ID:", block.chainid);
        console.log("ServiceRegistry:", serviceRegistry);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // 1. Deploy PriceOracle
        console.log("Deploying PriceOracle...");
        PriceOracle priceOracle = new PriceOracle();
        console.log("PriceOracle deployed at:", address(priceOracle));
        
        // 2. Deploy CommitReveal
        console.log("Deploying CommitReveal...");
        CommitReveal commitReveal = new CommitReveal(serviceRegistry, deployer);
        console.log("CommitReveal deployed at:", address(commitReveal));
        
        // 3. Deploy SlashManager with 5 initial signers (3 of 5 multisig)
        console.log("Deploying SlashManager...");
        address[] memory initialSigners = new address[](5);
        initialSigners[0] = deployer;
        initialSigners[1] = address(0x1);
        initialSigners[2] = address(0x2);
        initialSigners[3] = address(0x3);
        initialSigners[4] = address(0x4);
        
        SlashManager slashManager = new SlashManager(deployer, initialSigners);
        console.log("SlashManager deployed at:", address(slashManager));
        
        vm.stopBroadcast();
        
        console.log("\n=== Phase 2 Deployment Summary ===");
        console.log("PriceOracle:", address(priceOracle));
        console.log("CommitReveal:", address(commitReveal));
        console.log("SlashManager:", address(slashManager));
        
        console.log("\n=== .env.local values ===");
        console.log("NEXT_PUBLIC_PRICE_ORACLE_ADDRESS=", vm.toString(address(priceOracle)));
        console.log("NEXT_PUBLIC_COMMIT_REVEAL_ADDRESS=", vm.toString(address(commitReveal)));
        console.log("NEXT_PUBLIC_SLASH_MANAGER_ADDRESS=", vm.toString(address(slashManager)));
    }
}
