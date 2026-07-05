// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {SlashManager} from "../shared/SlashManager.sol";

contract UpgradeSlashManager is Script {
    address public constant PROXY_ADDRESS = 0x1B8373cDF4f2eD740c3478e0129f0B8494CE4Fa3;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("=============================================");
        console.log("SlashManager Upgrade - OZ v5 __UUPSUpgradeable_init() removal");
        console.log("=============================================");
        console.log("Deployer:", deployer);
        console.log("Proxy Address:", PROXY_ADDRESS);

        console.log("[1/2] Deploying new implementation...");

        vm.startBroadcast(deployerPrivateKey);

        SlashManager newImplementation = new SlashManager();

        console.log("    New Implementation:", address(newImplementation));

        console.log("[2/2] Upgrading proxy...");

        SlashManager(PROXY_ADDRESS).upgradeToAndCall(address(newImplementation), "");

        console.log("    Upgrade complete!");

        vm.stopBroadcast();

        console.log("");
        console.log("NEXT STEPS:");
        console.log("1. forge verify-contract <IMPL_ADDR> contracts/shared/SlashManager.sol:SlashManager --chain 11155111");
        console.log("2. cast implementation 0x1B8373cDF4f2eD740c3478e0129f0B8494CE4Fa3 --rpc-url sepolia");
    }
}
