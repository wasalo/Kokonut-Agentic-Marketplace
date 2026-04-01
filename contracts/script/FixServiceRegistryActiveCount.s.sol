// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {ServiceRegistryV2} from "../shared/ServiceRegistryV2.sol";

/**
 * @title FixServiceRegistryActiveCount
 * @dev Script to fix the _activeServiceCount storage issue after V1->V2 upgrade
 * 
 * This script:
 * 1. Deploys new implementation with initializeActiveServiceCount function
 * 2. Upgrades the proxy to use new implementation
 * 3. Calls initializeActiveServiceCount to recalculate the counter
 * 4. Verifies the fix
 * 
 * Prerequisites:
 * - PRIVATE_KEY environment variable set
 * - Sepolia RPC configured
 * 
 * Run:
 * forge script script/FixServiceRegistryActiveCount.s.sol --rpc-url $SEPOLIA_RPC --broadcast -vvvv
 */
contract FixServiceRegistryActiveCount is Script {
    // Sepolia ServiceRegistryV2 Proxy Address
    address public constant PROXY_ADDRESS = 0x62E1eeEa1A2Ab987004F35bDA430457Ed6077201;
    
    // Store addresses for logging
    address public newImplementation;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("=============================================");
        console.log("ServiceRegistryV2 Active Count Fix");
        console.log("=============================================");
        console.log("Deployer:", deployer);
        console.log("Proxy Address:", PROXY_ADDRESS);
        console.log("Chain ID:", block.chainid);
        console.log("");
        
        // Pre-fix checks
        console.log("[1/5] Pre-fix checks...");
        
        ServiceRegistryV2 proxy = ServiceRegistryV2(PROXY_ADDRESS);
        
        // Get current state
        uint256 serviceCounterBefore = proxy.getServiceCounter();
        uint256 activeCountBefore = proxy.getActiveServiceCount();
        address ownerBefore = proxy.owner();
        address implementationBefore = proxy.getImplementation();
        
        console.log("    Current Implementation:", implementationBefore);
        console.log("    Service Counter (total):", serviceCounterBefore);
        console.log("    Active Services (broken):", activeCountBefore);
        console.log("    Owner:", ownerBefore);
        console.log("");
        
        require(ownerBefore == deployer, "Deployer must be owner");
        
        // Deploy new implementation
        console.log("[2/5] Deploying new implementation...");
        
        vm.startBroadcast(deployerPrivateKey);
        
        ServiceRegistryV2 newImpl = new ServiceRegistryV2();
        newImplementation = address(newImpl);
        
        vm.stopBroadcast();
        
        console.log("    New Implementation:", newImplementation);
        console.log("");
        
        // Upgrade proxy
        console.log("[3/5] Upgrading proxy...");
        
        vm.startBroadcast(deployerPrivateKey);
        
        proxy.upgradeToAndCall(newImplementation, "");
        
        vm.stopBroadcast();
        
        console.log("    Upgrade transaction complete");
        console.log("");
        
        // Initialize the active service count
        console.log("[4/5] Initializing active service count...");
        
        vm.startBroadcast(deployerPrivateKey);
        
        proxy.initializeActiveServiceCount();
        
        vm.stopBroadcast();
        
        console.log("    Initialization transaction complete");
        console.log("");
        
        // Post-fix verification
        console.log("[5/5] Post-fix verification...");
        
        address implementationAfter = proxy.getImplementation();
        uint256 serviceCounterAfter = proxy.getServiceCounter();
        uint256 activeServicesAfter = proxy.getActiveServiceCount();
        
        console.log("    New Implementation:", implementationAfter);
        console.log("    Service Counter:", serviceCounterAfter);
        console.log("    Active Services (fixed):", activeServicesAfter);
        console.log("");
        
        // Verify fix succeeded
        require(implementationAfter == newImplementation, "Upgrade failed");
        require(serviceCounterAfter == serviceCounterBefore, "Service counter changed unexpectedly");
        require(activeServicesAfter <= serviceCounterAfter, "Active count exceeds total");
        
        console.log("=============================================");
        console.log("Fix Successful!");
        console.log("=============================================");
        console.log("");
        console.log("Changes:");
        console.log("  - Active Services Before:", activeCountBefore);
        console.log("  - Active Services After:", activeServicesAfter);
        console.log("");
        console.log("New Implementation:", newImplementation);
        console.log("Proxy (unchanged):", PROXY_ADDRESS);
        console.log("");
        console.log("IMPORTANT:");
        console.log("  - Verify new implementation on Etherscan");
        console.log("  - Update .env files with new implementation address");
        console.log("  - Check homepage stats - should show correct count now");
        console.log("");
    }
}
