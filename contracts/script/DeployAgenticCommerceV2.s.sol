// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../shared/AgenticCommerce.sol";

/**
 * @title DeployAgenticCommerceV2
 * @dev Deployment script for AgenticCommerce with zero address checks
 * 
 * Usage:
 *   forge script script/DeployAgenticCommerceV2.s.sol --rpc-url sepolia --broadcast --verify
 */
contract DeployAgenticCommerceV2 is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        address treasury = deployer; // Using deployer as treasury
        
        console.log("========================================");
        console.log("Deploying AgenticCommerce V2");
        console.log("Features: Zero address checks + Security fixes");
        console.log("Deployer:", deployer);
        console.log("Treasury:", treasury);
        console.log("Chain ID:", block.chainid);
        console.log("========================================\n");
        
        vm.startBroadcast(deployerPrivateKey);
        
        AgenticCommerce agenticCommerce = new AgenticCommerce(treasury);
        
        vm.stopBroadcast();
        
        console.log("\n========================================");
        console.log("AgenticCommerce V2 Deployed Successfully!");
        console.log("Address:", address(agenticCommerce));
        console.log("========================================");
        console.log("\n=== Environment Variables ===");
        console.log("NEXT_PUBLIC_AGENTIC_COMMERCE_ADDRESS=", vm.toString(address(agenticCommerce)));
        console.log("\n=== Security Features ===");
        console.log("[OK] Zero address check on createJob() provider parameter");
        console.log("[OK] Zero address check on createJobFromService() service provider");
        console.log("[OK] Removed afterAction hooks (reentrancy protection)");
        console.log("[OK] All security fixes from March 2026");
        console.log("\n=== Next Steps ===");
        console.log("1. Call setServiceRegistry() with:", address(0x62E1eeEa1A2Ab987004F35bDA430457Ed6077201));
        console.log("2. Call setPlatformFee() to configure fees");
        console.log("3. Update frontend config");
    }
}
