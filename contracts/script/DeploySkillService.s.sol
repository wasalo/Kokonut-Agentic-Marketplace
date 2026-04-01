// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../shared/AgentSkillRegistry.sol";
import "../shared/ServiceRegistry.sol";

/**
 * @title DeploySkillServiceScript
 * @dev Redeploys SkillRegistry and ServiceRegistry pointing to the
 *      OFFICIAL ERC-8004 identity registry on Sepolia.
 *
 * Official ERC-8004 Identity: 0x8004A818BFB912233c491871b3d84c89A494BD9e
 */
contract DeploySkillServiceScript is Script {
    // Official ERC-8004 Identity Registry on Sepolia
    address constant OFFICIAL_ERC8004_IDENTITY = 0x8004A818BFB912233c491871b3d84c89A494BD9e;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deploying SkillRegistry + ServiceRegistry (wired to Official ERC-8004)...");
        console.log("Deployer:", deployer);
        console.log("Identity Registry:", OFFICIAL_ERC8004_IDENTITY);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy AgentSkillRegistry wired to official ERC-8004
        console.log("Deploying AgentSkillRegistry...");
        AgentSkillRegistry skillRegistry = new AgentSkillRegistry(OFFICIAL_ERC8004_IDENTITY);
        console.log("AgentSkillRegistry:", address(skillRegistry));

        // 2. Deploy ServiceRegistry wired to official ERC-8004
        console.log("Deploying ServiceRegistry...");
        ServiceRegistry serviceRegistry = new ServiceRegistry(OFFICIAL_ERC8004_IDENTITY);
        console.log("ServiceRegistry:", address(serviceRegistry));

        vm.stopBroadcast();

        console.log("\n=== Deployment Summary ===");
        console.log("AgentSkillRegistry:", address(skillRegistry));
        console.log("ServiceRegistry:", address(serviceRegistry));
        console.log("Identity Registry (official):", OFFICIAL_ERC8004_IDENTITY);

        console.log("\n=== .env.local updates ===");
        console.log("NEXT_PUBLIC_SKILL_REGISTRY_ADDRESS=", vm.toString(address(skillRegistry)));
        console.log("NEXT_PUBLIC_SERVICE_REGISTRY_ADDRESS=", vm.toString(address(serviceRegistry)));
    }
}
