// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {AdminRegistry} from "../shared/AdminRegistry.sol";

/**
 * @title DeployAdminRegistry
 * @dev Direct deployment of AdminRegistry (not via proxy)
 */
contract DeployAdminRegistry is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("=============================================");
        console.log("AdminRegistry Direct Deployment - VULN-01 + VULN-08");
        console.log("=============================================");
        console.log("Deployer:", deployer);
        
        vm.startBroadcast(deployerPrivateKey);
        
        AdminRegistry registry = new AdminRegistry();
        registry.initialize();
        
        console.log("AdminRegistry deployed:", address(registry));
        console.log("Owner:", registry.owner());
        
        vm.stopBroadcast();
        
        console.log("");
        console.log("NEXT STEPS:");
        console.log("1. Verify on Etherscan");
        console.log("2. Call setAdminRegistry() on AgenticCommerceV9, ServiceRegistryV2, etc.");
        console.log("3. Re-blacklist any agents/wallets if needed");
    }
}
