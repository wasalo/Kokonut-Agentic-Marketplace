// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../shared/AgentReview.sol";
import "../shared/AgenticCommerce.sol";

/**
 * @title DeployCriticalFixes
 * @dev Deployment script for security fixes (AgentReview & AgenticCommerce)
 * 
 * Usage:
 *   forge script script/DeployCriticalFixes.s.sol --rpc-url sepolia --broadcast --verify
 */
contract DeployAgentReview is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("========================================");
        console.log("Deploying AgentReview (Security Fixed)");
        console.log("Deployer:", deployer);
        console.log("Chain ID:", block.chainid);
        console.log("========================================\n");
        
        vm.startBroadcast(deployerPrivateKey);
        
        AgentReview agentReview = new AgentReview();
        
        vm.stopBroadcast();
        
        console.log("\n========================================");
        console.log("AgentReview Deployed Successfully!");
        console.log("Address:", address(agentReview));
        console.log("========================================");
        console.log("\n=== Environment Variables ===");
        console.log("NEXT_PUBLIC_AGENT_REVIEW_ADDRESS=", vm.toString(address(agentReview)));
    }
}

contract DeployAgenticCommerce is Script {
    function run(address treasury) external {
        require(treasury != address(0), "Treasury address required");
        
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("========================================");
        console.log("Deploying AgenticCommerce (Security Fixed)");
        console.log("Deployer:", deployer);
        console.log("Treasury:", treasury);
        console.log("Chain ID:", block.chainid);
        console.log("========================================\n");
        
        vm.startBroadcast(deployerPrivateKey);
        
        AgenticCommerce agenticCommerce = new AgenticCommerce(treasury);
        
        vm.stopBroadcast();
        
        console.log("\n========================================");
        console.log("AgenticCommerce Deployed Successfully!");
        console.log("Address:", address(agenticCommerce));
        console.log("========================================");
        console.log("\n=== Environment Variables ===");
        console.log("NEXT_PUBLIC_AGENTIC_COMMERCE_ADDRESS=", vm.toString(address(agenticCommerce)));
        console.log("\n=== Next Steps ===");
        console.log("1. Call setServiceRegistry() with new ServiceRegistry address");
        console.log("2. Call setPlatformFee() to configure fees");
        console.log("3. Update frontend config with new address");
    }
}
