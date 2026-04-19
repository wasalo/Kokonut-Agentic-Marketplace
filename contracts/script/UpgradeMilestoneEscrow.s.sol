// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {MilestoneEscrow} from "../shared/MilestoneEscrow.sol";

/**
 * @title UpgradeMilestoneEscrow
 * @dev Upgrades MilestoneEscrow with Pausable
 */
contract UpgradeMilestoneEscrow is Script {
    address public constant PROXY_ADDRESS = 0xf24eDD2d8e99c80d40e959b1F37636b6C04FF9A9;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("=============================================");
        console.log("MilestoneEscrow Upgrade - Add Pausable");
        console.log("=============================================");
        console.log("Deployer:", deployer);
        console.log("Proxy Address:", PROXY_ADDRESS);
        
        // 1. Deploy new implementation
        console.log("[1/2] Deploying new implementation...");
        
        vm.startBroadcast(deployerPrivateKey);
        
        MilestoneEscrow newImplementation = new MilestoneEscrow();
        
        console.log("    New Implementation:", address(newImplementation));
        
        // 2. Upgrade proxy
        console.log("[2/2] Upgrading proxy...");
        
        MilestoneEscrow(PROXY_ADDRESS).upgradeToAndCall(address(newImplementation), "");
        
        console.log("    Upgrade complete!");
        
        vm.stopBroadcast();
        
        console.log("");
        console.log("NEXT STEPS:");
        console.log("1. Verify on Etherscan");
        console.log("2. Test pause/unpause functions");
    }
}