// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import {AgenticCommerceV6} from "../shared/AgenticCommerceV6.sol";

/**
 * @title DeployAgenticCommerceV6
 * @dev Deployment script for AgenticCommerceV6
 * 
 * Run: 
 *   forge script scripts/DeployV6.s.sol --rpc-url $SEPOLIA_RPC_URL --private-key $PRIVATE_KEY --broadcast
 */
contract DeployAgenticCommerceV6 is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address treasury = vm.envAddress("TREASURY_ADDRESS");
        
        console.log("Deploying AgenticCommerceV6...");
        console.log("Treasury:", treasury);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy implementation
        AgenticCommerceV6 implementation = new AgenticCommerceV6();
        console.log("Implementation deployed:", address(implementation));
        
        // Initialize with minimal calldata (no-op since constructor disables initializer)
        TransparentUpgradeableProxy proxy = new TransparentUpgradeableProxy(
            address(implementation),
            msg.sender, // proxy admin
            "" // no initialization calldata
        );
        
        // Call initialize on proxy
        AgenticCommerceV6 agenticCommerce = AgenticCommerceV6(payable(address(proxy)));
        agenticCommerce.initialize(treasury);
        
        console.log("Proxy deployed:", address(proxy));
        console.log("AgenticCommerceV6 deployed successfully!");
        
        vm.stopBroadcast();
    }
}
