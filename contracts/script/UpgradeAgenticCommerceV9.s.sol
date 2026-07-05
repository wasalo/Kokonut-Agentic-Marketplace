// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {AgenticCommerceV9} from "../shared/AgenticCommerceV9.sol";

/**
 * @title UpgradeAgenticCommerceV9
 * @dev Upgrades AgenticCommerceV9 with custom errors for ETH transfers
 * 
 * Changes:
 * - Replaced require() strings with custom errors: EthTransferFailed, RefundFailed, StakeRefundFailed, StakeTransferFailed
 * - Gas savings + consistent error handling
 */
contract UpgradeAgenticCommerceV9 is Script {
    address public constant PROXY_ADDRESS = 0x4c592510e4FAbbEEA8D7142dE1f38d548b500e7f;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("=============================================");
        console.log("AgenticCommerceV9 Upgrade - Custom Errors");
        console.log("=============================================");
        console.log("Deployer:", deployer);
        console.log("Proxy Address:", PROXY_ADDRESS);
        
        console.log("[1/2] Deploying new implementation...");
        
        vm.startBroadcast(deployerPrivateKey);
        
        AgenticCommerceV9 newImplementation = new AgenticCommerceV9();
        
        console.log("    New Implementation:", address(newImplementation));
        
        console.log("[2/2] Upgrading proxy...");
        
        AgenticCommerceV9(PROXY_ADDRESS).upgradeToAndCall(address(newImplementation), "");
        
        console.log("    Upgrade complete!");
        
        vm.stopBroadcast();
        
        console.log("");
        console.log("=============================================");
        console.log("UPGRADE COMPLETE");
        console.log("=============================================");
        console.log("Proxy:", PROXY_ADDRESS);
        console.log("New Implementation:", address(newImplementation));
        console.log("");
        console.log("Verify with:");
        console.log(string.concat("forge verify-contract ", vm.toString(address(newImplementation)), " contracts/shared/AgenticCommerceV9.sol:AgenticCommerceV9 --chain 11155111 --etherscan-api-key $ETHERSCAN_API_KEY"));
    }
}
