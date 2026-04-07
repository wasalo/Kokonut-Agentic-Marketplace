// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {AgentReviewV5} from "../shared/AgentReviewV5.sol";
import {TransparentUpgradeableProxy} from "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import {ITransparentUpgradeableProxy} from "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import {ProxyAdmin} from "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";

/**
 * @title UpgradeAgentReviewV5
 * @dev Upgrade script for AgentReviewV5 proxy
 * 
 * Security fixes applied:
 * - Issue 4: Exact payment required (msg.value == reward)
 * 
 * Usage:
 *   forge script script/DeployAgentReviewV5.s.sol \
 *     --rpc-url sepolia \
 *     --broadcast \
 *     --verify \
 *     -i PRIVATE_KEY
 */
contract UpgradeAgentReviewV5 is Script {
    address constant PROXY_ADDRESS = 0x5CDb592Fd37749bF87448FBf5725D1Cd986dd1Cb;
    address constant PROXY_ADMIN_ADDRESS = 0x116E29f49d0dD1aC2848611CB074dc41B0549733;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("========================================");
        console.log("Upgrading AgentReviewV5...");
        console.log("========================================");
        console.log("Deployer:", deployer);
        console.log("Proxy:", PROXY_ADDRESS);
        console.log("ProxyAdmin:", PROXY_ADMIN_ADDRESS);
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy new implementation
        AgentReviewV5 newImpl = new AgentReviewV5();
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
