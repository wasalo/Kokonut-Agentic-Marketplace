// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {BiddingSystem} from "../shared/BiddingSystem.sol";

/**
 * @title UpgradeBiddingSystem
 * @dev Upgrades BiddingSystem with admin setter events
 * 
 * Changes:
 * - Added 5 new events: CommerceUpdated, TreasuryUpdated, AdminRegistryUpdated, RevealWindowUpdated, PlatformFeeUpdated
 * - All admin setters now emit events for transparency
 */
contract UpgradeBiddingSystem is Script {
    address public constant PROXY_ADDRESS = 0x32c9d069a248a619d3EAc4D1FC76F2639AaBeF04;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("=============================================");
        console.log("BiddingSystem Upgrade - Admin Setter Events");
        console.log("=============================================");
        console.log("Deployer:", deployer);
        console.log("Proxy Address:", PROXY_ADDRESS);
        
        // 1. Deploy new implementation
        console.log("[1/2] Deploying new implementation...");
        
        vm.startBroadcast(deployerPrivateKey);
        
        BiddingSystem newImplementation = new BiddingSystem();
        
        console.log("    New Implementation:", address(newImplementation));
        
        // 2. Upgrade proxy
        console.log("[2/2] Upgrading proxy...");
        
        BiddingSystem(payable(PROXY_ADDRESS)).upgradeToAndCall(address(newImplementation), "");
        
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
        console.log(string.concat("forge verify-contract ", vm.toString(address(newImplementation)), " contracts/shared/BiddingSystem.sol:BiddingSystem --chain 11155111 --etherscan-api-key $ETHERSCAN_API_KEY"));
    }
}
