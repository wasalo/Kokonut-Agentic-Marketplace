// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import {AgenticCommerceV5} from "../shared/AgenticCommerceV5.sol";
import {AgenticCommerceProxy} from "../proxies/AgenticCommerceProxy.sol";
import {IAgenticCommerceV5} from "../interfaces/IAgenticCommerceV5.sol";

/**
 * @title DeployAgenticCommerceV5
 * @dev Deployment script for AgenticCommerceV5 with UUPS proxy
 */
contract DeployAgenticCommerceV5 is Script {
    // Configuration
    address constant TREASURY = 0x03779B674CbCBfc0B801c4cAc9DFaC8aACbbD5c5;
    address constant SERVICE_REGISTRY = 0x62E1eeEa1A2Ab987004F35bDA430457Ed6077201;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        console.log("Deploying AgenticCommerceV5...");
        console.log("Treasury:", TREASURY);
        console.log("Service Registry:", SERVICE_REGISTRY);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // 1. Deploy implementation
        AgenticCommerceV5 implementation = new AgenticCommerceV5();
        console.log("Implementation deployed:", address(implementation));
        
        // 2. Encode initializer data
        bytes memory initData = abi.encodeWithSelector(
            IAgenticCommerceV5.initialize.selector,
            TREASURY,
            SERVICE_REGISTRY
        );
        
        // 3. Deploy proxy
        AgenticCommerceProxy proxy = new AgenticCommerceProxy(
            address(implementation),
            msg.sender, // admin - this will be the deployer initially
            initData
        );
        console.log("Proxy deployed:", address(proxy));
        
        // 4. Cast to interface
        IAgenticCommerceV5 agentic = IAgenticCommerceV5(address(proxy));
        console.log("AgenticCommerceV5 initialized at:", address(agentic));
        
        // 5. Verify initialization (using implementation to check storage)
        AgenticCommerceV5 v5Impl = AgenticCommerceV5(address(agentic));
        console.log("Treasury:", v5Impl.platformTreasury());
        
        vm.stopBroadcast();
        
        // Output for verification
        console.log("");
        console.log("=== Deployment Summary ===");
        console.log("Implementation:", address(implementation));
        console.log("Proxy:", address(proxy));
        console.log("Treasury:", TREASURY);
        console.log("Service Registry:", SERVICE_REGISTRY);
    }
}
