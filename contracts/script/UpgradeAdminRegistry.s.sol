// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {AdminRegistry} from "../shared/AdminRegistry.sol";

/**
 * @title UpgradeAdminRegistry
 * @dev Upgrades AdminRegistry to remove __UUPSUpgradeable_init() for OZ v5 compatibility.
 *      Current proxy: 0xC81C864CEAb6231ad764cf9867e031D8b6dee41d (Phase 29e UUPS deploy)
 */
contract UpgradeAdminRegistry is Script {
    address public constant PROXY_ADDRESS = 0xC81C864CEAb6231ad764cf9867e031D8b6dee41d;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("=============================================");
        console.log("AdminRegistry Upgrade - OZ v5 __UUPSUpgradeable_init() removal");
        console.log("=============================================");
        console.log("Deployer:", deployer);
        console.log("Proxy Address:", PROXY_ADDRESS);
        
        // 1. Deploy new implementation
        console.log("[1/2] Deploying new implementation...");
        
        vm.startBroadcast(deployerPrivateKey);
        
        AdminRegistry newImplementation = new AdminRegistry();
        
        console.log("    New Implementation:", address(newImplementation));
        
        // 2. Upgrade proxy
        console.log("[2/2] Upgrading proxy...");
        
        AdminRegistry(PROXY_ADDRESS).upgradeToAndCall(address(newImplementation), "");
        
        console.log("    Upgrade complete!");
        
        vm.stopBroadcast();
        
        console.log("");
        console.log("NEXT STEPS:");
        console.log("1. Verify on Etherscan: forge verify-contract <IMPL_ADDR> contracts/shared/AdminRegistry.sol:AdminRegistry --chain 11155111");
        console.log("2. Confirm proxy upgraded: cast implementation 0xC81C864CEAb6231ad764cf9867e031D8b6dee41d --rpc-url sepolia");
    }
}
