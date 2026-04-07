// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {AgenticCommerceV6} from "../shared/AgenticCommerceV6.sol";
import {TransparentUpgradeableProxy} from "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import {ITransparentUpgradeableProxy} from "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import {ProxyAdmin} from "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";

/**
 * @title UpgradeAgenticCommerceV6
 * @dev Upgrade script for AgenticCommerceV6 proxy
 * 
 * Security fixes applied:
 * - Issue 3a: nonReentrant added to setBudget()
 * - Issue 3b: Budget cached before hook call in fund()
 * 
 * Usage:
 *   PRIVATE_KEY=<key> forge script script/UpgradeAgenticCommerceV6.s.sol \
 *     --rpc-url sepolia \
 *     --broadcast \
 *     --verify
 */
contract UpgradeAgenticCommerceV6 is Script {
    address constant PROXY_ADDRESS = 0x948d97EA7F0c49796fB576ADff375C900627568E;
    address constant PROXY_ADMIN_ADDRESS = 0x971a3333cd4f55Ecf466a60b090fDb63e755Fbbb;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("========================================");
        console.log("Upgrading AgenticCommerceV6...");
        console.log("========================================");
        console.log("Deployer:", deployer);
        console.log("Proxy:", PROXY_ADDRESS);
        console.log("ProxyAdmin:", PROXY_ADMIN_ADDRESS);
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy new implementation
        AgenticCommerceV6 newImpl = new AgenticCommerceV6();
        console.log("New Implementation deployed at:", address(newImpl));

        // 2. Upgrade via ProxyAdmin
        ProxyAdmin proxyAdmin = ProxyAdmin(PROXY_ADMIN_ADDRESS);
        proxyAdmin.upgradeAndCall(
            ITransparentUpgradeableProxy(PROXY_ADDRESS),
            address(newImpl),
            ""  // No initialization call needed
        );
        console.log("Proxy upgraded successfully via ProxyAdmin");

        vm.stopBroadcast();

        console.log("");
        console.log("========================================");
        console.log("UPGRADE COMPLETE");
        console.log("========================================");
        console.log("New Implementation:", address(newImpl));
        console.log("Proxy:", PROXY_ADDRESS);
        console.log("");
        console.log("NEXT STEPS:");
        console.log("1. Verify the upgrade on Etherscan");
        console.log("2. Run tests to ensure everything works");
        console.log("========================================");
    }
}
