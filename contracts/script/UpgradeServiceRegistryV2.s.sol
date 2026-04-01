// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {ServiceRegistryV2} from "../shared/ServiceRegistryV2.sol";

/**
 * @title UpgradeServiceRegistryV2
 * @dev Script to upgrade ServiceRegistryV2 to Phase 2 implementation
 * 
 * This script:
 * 1. Deploys new implementation with O(1) caching
 * 2. Upgrades the proxy to use new implementation
 * 3. Verifies the upgrade succeeded
 * 
 * Prerequisites:
 * - PRIVATE_KEY environment variable set
 * - Sepolia RPC configured
 * 
 * Run:
 * forge script script/UpgradeServiceRegistryV2.s.sol --rpc-url $SEPOLIA_RPC --broadcast -vvvv
 */
contract UpgradeServiceRegistryV2 is Script {
    // Sepolia ServiceRegistryV2 Proxy Address
    address public constant PROXY_ADDRESS = 0x62E1eeEa1A2Ab987004F35bDA430457Ed6077201;
    
    // Store addresses for logging
    address public newImplementation;
    address public proxyOwner;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("=============================================");
        console.log("ServiceRegistryV2 Upgrade (Phase 2)");
        console.log("=============================================");
        console.log("Deployer:", deployer);
        console.log("Proxy Address:", PROXY_ADDRESS);
        console.log("Chain ID:", block.chainid);
        console.log("");
        
        // Pre-upgrade checks
        console.log("[1/4] Pre-upgrade checks...");
        
        ServiceRegistryV2 proxy = ServiceRegistryV2(PROXY_ADDRESS);
        
        // Get current state
        uint256 serviceCounterBefore = proxy.getServiceCounter();
        address ownerBefore = proxy.owner();
        
        console.log("    Current Implementation:", proxy.getImplementation());
        console.log("    Service Counter:", serviceCounterBefore);
        console.log("    Owner:", ownerBefore);
        console.log("    Active Services:", proxy.getActiveServiceCount());
        console.log("");
        
        require(ownerBefore == deployer, "Deployer must be owner");
        
        // Deploy new implementation
        console.log("[2/4] Deploying new implementation...");
        
        vm.startBroadcast(deployerPrivateKey);
        
        ServiceRegistryV2 newImpl = new ServiceRegistryV2();
        newImplementation = address(newImpl);
        
        vm.stopBroadcast();
        
        console.log("    New Implementation:", newImplementation);
        console.log("");
        
        // Upgrade proxy
        console.log("[3/4] Upgrading proxy...");
        
        vm.startBroadcast(deployerPrivateKey);
        
        proxy.upgradeToAndCall(newImplementation, "");
        
        vm.stopBroadcast();
        
        console.log("    Upgrade transaction complete");
        console.log("");
        
        // Post-upgrade verification
        console.log("[4/4] Post-upgrade verification...");
        
        address implementationAfter = proxy.getImplementation();
        uint256 serviceCounterAfter = proxy.getServiceCounter();
        uint256 activeServicesAfter = proxy.getActiveServiceCount();
        
        console.log("    New Implementation:", implementationAfter);
        console.log("    Service Counter:", serviceCounterAfter);
        console.log("    Active Services (O(1)):", activeServicesAfter);
        console.log("");
        
        // Verify upgrade succeeded
        require(implementationAfter == newImplementation, "Upgrade failed");
        require(serviceCounterAfter == serviceCounterBefore, "State changed unexpectedly");
        
        console.log("=============================================");
        console.log("Upgrade Successful!");
        console.log("=============================================");
        console.log("");
        console.log("Phase 2 Features Activated:");
        console.log("  - O(1) getActiveServiceCount()");
        console.log("  - Automatic counter updates in create/deactivate");
        console.log("");
        console.log("New Implementation:", newImplementation);
        console.log("Proxy (unchanged):", PROXY_ADDRESS);
        console.log("");
        console.log("IMPORTANT:");
        console.log("  - Verify new implementation on Etherscan");
        console.log("  - Update config files with new implementation address");
        console.log("  - Run GasBenchmark.t.sol to verify improvements");
        console.log("");
    }
}
