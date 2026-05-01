// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {AdminRegistry} from "../shared/AdminRegistry.sol";

/**
 * @title UpgradeAdminRegistry
 * @dev DEPRECATED: Old AdminRegistry (0x8A8E...) was not UUPS upgradeable.
 *      Re-deployed directly at 0x9b4a7479E2609D1E6Dfc4232aD4CA493adF82c6e.
 *      This script is kept for reference only.
 */
contract UpgradeAdminRegistry is Script {
    address public constant PROXY_ADDRESS = 0x8A8E3C9ffB8F25236c8152c8ac634336463f3Ab0;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("=============================================");
        console.log("AdminRegistry Upgrade - VULN-01 + VULN-08");
        console.log("=============================================");
        console.log("Deployer:", deployer);
        console.log("Proxy Address:", PROXY_ADDRESS);
        
        // 1. Deploy new implementation
        console.log("[1/2] Deploying new implementation...");
        
        vm.startBroadcast(deployerPrivateKey);
        
        AdminRegistry newImplementation = new AdminRegistry();
        
        console.log("    New Implementation:", address(newImplementation));
        
        // 2. Upgrade proxy
        console.log("[2/2] Upgrading proxy...");
        
        AdminRegistry(PROXY_ADDRESS).upgradeToAndCall(address(newImplementation), "");
        
        console.log("    Upgrade complete!");
        
        vm.stopBroadcast();
        
        console.log("");
        console.log("NEXT STEPS:");
        console.log("1. Verify on Etherscan");
        console.log("2. Call setSlashManager() with SlashManager address");
    }
}
