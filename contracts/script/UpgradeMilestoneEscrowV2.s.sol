// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {MilestoneEscrowV2} from "../shared/MilestoneEscrowV2.sol";

/**
 * @title UpgradeMilestoneEscrowV2
 * @dev Upgrades MilestoneEscrowV2 with per-milestone dispute resolution + dead event removal
 */
contract UpgradeMilestoneEscrowV2 is Script {
    address public constant PROXY_ADDRESS = 0xd4Fdc345b1c6aF1B4Cc84339bcB251B33527Eb45;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("=============================================");
        console.log("MilestoneEscrowV2 Upgrade - VULN-05 + VULN-11");
        console.log("=============================================");
        console.log("Deployer:", deployer);
        console.log("Proxy Address:", PROXY_ADDRESS);
        
        // 1. Deploy new implementation
        console.log("[1/2] Deploying new implementation...");
        
        vm.startBroadcast(deployerPrivateKey);
        
        MilestoneEscrowV2 newImplementation = new MilestoneEscrowV2();
        
        console.log("    New Implementation:", address(newImplementation));
        
        // 2. Upgrade proxy
        console.log("[2/2] Upgrading proxy...");
        
        MilestoneEscrowV2(PROXY_ADDRESS).upgradeToAndCall(address(newImplementation), "");
        
        console.log("    Upgrade complete!");
        
        vm.stopBroadcast();
        
        console.log("");
        console.log("NEXT STEPS:");
        console.log("1. Verify on Etherscan");
        console.log("2. Test flagDispute(jobId, milestoneIndex) resolves only that milestone");
    }
}
