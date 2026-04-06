// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import {AgenticCommerceV6} from "../shared/AgenticCommerceV6.sol";

/**
 * @title DeployAgenticCommerceV6
 * @dev Deployment script for AgenticCommerceV6
 * 
 * Run (new deployment): 
 *   forge script scripts/DeployV6.s.sol:DeployAgenticCommerceV6 --rpc-url $SEPOLIA_RPC_URL --private-key $PRIVATE_KEY --broadcast
 */
contract DeployAgenticCommerceV6 is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address treasury = vm.envAddress("TREASURY_ADDRESS");
        
        console.log("Deploying AgenticCommerceV6...");
        console.log("Treasury:", treasury);
        
        vm.startBroadcast(deployerPrivateKey);
        
        AgenticCommerceV6 implementation = new AgenticCommerceV6();
        console.log("Implementation deployed:", address(implementation));
        
        TransparentUpgradeableProxy proxy = new TransparentUpgradeableProxy(
            address(implementation),
            msg.sender,
            ""
        );
        
        AgenticCommerceV6 agenticCommerce = AgenticCommerceV6(payable(address(proxy)));
        agenticCommerce.initialize(treasury);
        
        console.log("Proxy deployed:", address(proxy));
        console.log("AgenticCommerceV6 deployed successfully!");
        
        vm.stopBroadcast();
    }
}

/**
 * @title UpgradeAgenticCommerceV6
 * @dev Upgrade script for AgenticCommerceV6 (adds security fixes)
 * 
 * Run:
 *   forge script scripts/DeployV6.s.sol:UpgradeAgenticCommerceV6 --rpc-url $SEPOLIA_RPC_URL --private-key $PROXY_OWNER_KEY --broadcast
 * 
 * Security fixes added:
 * - RolesMustBeDistinct (collusion prevention)
 * - completeAfterTimeout (deadlock resolution)
 * - setDisputeWindow (configurable dispute window)
 */
contract UpgradeAgenticCommerceV6 is Script {
    function run() external {
        uint256 ownerKey = vm.envUint("PRIVATE_KEY");
        address proxyAddress = vm.envAddress("AGENTIC_COMMERCE");
        
        console.log("Upgrading AgenticCommerceV6...");
        console.log("Proxy:", proxyAddress);
        
        vm.startBroadcast(ownerKey);
        
        AgenticCommerceV6 newImpl = new AgenticCommerceV6();
        console.log("New Implementation deployed:", address(newImpl));
        
        AgenticCommerceV6 proxy = AgenticCommerceV6(payable(proxyAddress));
        proxy.upgradeToAndCall(address(newImpl), "");
        
        console.log("Upgrade completed!");
        console.log("");
        console.log("Contract addresses for .env:");
        console.log("AGENTIC_COMMERCE=<PROXY_ADDRESS>");
        console.log("AGENTIC_COMMERCE_IMPL=<NEW_IMPL_ADDRESS>");
        
        vm.stopBroadcast();
    }
}
