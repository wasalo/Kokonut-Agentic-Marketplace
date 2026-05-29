// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {SlashManager} from "../shared/SlashManager.sol";

contract UpgradeSlashManager_Phase38 is Script {
    address public constant PROXY_ADDRESS = 0x1B8373cDF4f2eD740c3478e0129f0B8494CE4Fa3;
    address public constant AGENTIC_COMMERCE_PROXY = 0x3a1Bc03cC84040A282F6bf238b917D8351499239;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("=============================================");
        console.log("SlashManager Phase 38 Upgrade");
        console.log("=============================================");
        console.log("Deployer:", deployer);
        console.log("Proxy Address:", PROXY_ADDRESS);
        console.log("AgenticCommerce Proxy:", AGENTIC_COMMERCE_PROXY);

        console.log("[1/3] Deploying new implementation...");

        vm.startBroadcast(deployerPrivateKey);

        SlashManager newImplementation = new SlashManager();

        console.log("    New Implementation:", address(newImplementation));

        console.log("[2/3] Upgrading proxy...");

        SlashManager(PROXY_ADDRESS).upgradeToAndCall(address(newImplementation), "");

        console.log("    Upgrade complete!");

        console.log("[3/3] Setting commerce address...");

        SlashManager(PROXY_ADDRESS).setCommerce(AGENTIC_COMMERCE_PROXY);

        console.log("    Commerce set to:", AGENTIC_COMMERCE_PROXY);

        vm.stopBroadcast();

        console.log("");
        console.log("NEXT STEPS:");
        console.log(string.concat("1. forge verify-contract ", vm.toString(address(newImplementation)), " contracts/shared/SlashManager.sol:SlashManager --chain 11155111 --etherscan-api-key $ETHERSCAN_API_KEY"));
        console.log("2. cast implementation 0x1B8373cDF4f2eD740c3478e0129f0B8494CE4Fa3 --rpc-url sepolia");
    }
}
