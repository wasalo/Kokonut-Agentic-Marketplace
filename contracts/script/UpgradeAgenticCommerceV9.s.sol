// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {AgenticCommerceV9} from "../shared/AgenticCommerceV9.sol";

/**
 * @title UpgradeAgenticCommerceV9
 * @dev Upgrades AgenticCommerceV9 with hook validation + randomness warning docs
 */
contract UpgradeAgenticCommerceV9 is Script {
    address public constant PROXY_ADDRESS = 0x4c592510e4FAbbEEA8D7142dE1f38d548b500e7f;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("=============================================");
        console.log("AgenticCommerceV9 Upgrade - VULN-09/12 + VULN-03");
        console.log("=============================================");
        console.log("Deployer:", deployer);
        console.log("Proxy Address:", PROXY_ADDRESS);
        
        // 1. Deploy new implementation
        console.log("[1/2] Deploying new implementation...");
        
        vm.startBroadcast(deployerPrivateKey);
        
        AgenticCommerceV9 newImplementation = new AgenticCommerceV9();
        
        console.log("    New Implementation:", address(newImplementation));
        
        // 2. Upgrade proxy
        console.log("[2/2] Upgrading proxy...");
        
        AgenticCommerceV9(PROXY_ADDRESS).upgradeToAndCall(address(newImplementation), "");
        
        console.log("    Upgrade complete!");
        
        vm.stopBroadcast();
        
        console.log("");
        console.log("NEXT STEPS:");
        console.log("1. Verify on Etherscan");
        console.log("2. Test hook validation (createJob with EOA hook should revert)");
    }
}
