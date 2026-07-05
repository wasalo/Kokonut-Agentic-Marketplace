// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {ServiceRegistryV2} from "../shared/ServiceRegistryV2.sol";

/**
 * @title UpgradeServiceRegistryV2
 * @dev Upgrades ServiceRegistryV2 with custom error for ETH transfers
 * 
 * Changes:
 * - Replaced require("ETH transfer failed") with ServiceRegistryV2__Eth_transfer_failed() custom error
 */
contract UpgradeServiceRegistryV2 is Script {
    address public constant PROXY_ADDRESS = 0x62E1eeEa1A2Ab987004F35bDA430457Ed6077201;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("=============================================");
        console.log("ServiceRegistryV2 Upgrade - Custom Error");
        console.log("=============================================");
        console.log("Deployer:", deployer);
        console.log("Proxy Address:", PROXY_ADDRESS);

        console.log("[1/2] Deploying new implementation...");

        vm.startBroadcast(deployerPrivateKey);

        ServiceRegistryV2 newImplementation = new ServiceRegistryV2();

        console.log("    New Implementation:", address(newImplementation));

        console.log("[2/2] Upgrading proxy...");

        ServiceRegistryV2(PROXY_ADDRESS).upgradeToAndCall(address(newImplementation), "");

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
        console.log(string.concat("forge verify-contract ", vm.toString(address(newImplementation)), " contracts/shared/ServiceRegistryV2.sol:ServiceRegistryV2 --chain 11155111 --etherscan-api-key $ETHERSCAN_API_KEY"));
    }
}
