// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {AgentReviewV5} from "../shared/AgentReviewV5.sol";

/**
 * @title UpgradeAgentReviewV5
 * @dev Upgrades AgentReviewV5 with custom error for ETH transfers
 * 
 * Changes:
 * - Replaced require("ETH transfer failed") with AgentReviewV5_Eth_transfer_failed() custom error
 */
contract UpgradeAgentReviewV5 is Script {
    address public constant PROXY_ADDRESS = 0x5CDb592Fd37749bF87448FBf5725D1Cd986dd1Cb;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("=============================================");
        console.log("AgentReviewV5 Upgrade - Custom Error");
        console.log("=============================================");
        console.log("Deployer:", deployer);
        console.log("Proxy Address:", PROXY_ADDRESS);

        console.log("[1/2] Deploying new implementation...");

        vm.startBroadcast(deployerPrivateKey);

        AgentReviewV5 newImplementation = new AgentReviewV5();

        console.log("    New Implementation:", address(newImplementation));

        console.log("[2/2] Upgrading proxy...");

        AgentReviewV5(payable(PROXY_ADDRESS)).upgradeToAndCall(address(newImplementation), "");

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
        console.log(string.concat("forge verify-contract ", vm.toString(address(newImplementation)), " contracts/shared/AgentReviewV5.sol:AgentReviewV5 --chain 11155111 --etherscan-api-key $ETHERSCAN_API_KEY"));
    }
}
