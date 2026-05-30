// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {BiddingSystem} from "../shared/BiddingSystem.sol";

/**
 * @title UpgradeBiddingSystem_Phase39
 * @dev Adds random evaluator pool support for bidding sessions.
 *      - Allows address(0) as evaluator in createBiddingSession
 *      - Adds useRandomEvaluator flag to Session struct
 *      - createJobAndFund passes address(0) when useRandomEvaluator is true
 */
contract UpgradeBiddingSystem_Phase39 is Script {
    address public constant PROXY_ADDRESS = 0x4D7F38C6A9DE5De44A7B789962B7A2B06bFE8fd6;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("=============================================");
        console.log("BiddingSystem Phase 39 Random Evaluator");
        console.log("=============================================");
        console.log("Deployer:", deployer);
        console.log("Proxy:", PROXY_ADDRESS);

        vm.startBroadcast(deployerPrivateKey);

        console.log("[1/3] Deploying new implementation...");

        BiddingSystem newImplementation = new BiddingSystem();
        console.log("    New Implementation:", address(newImplementation));

        console.log("[2/3] Upgrading proxy...");

        BiddingSystem(payable(PROXY_ADDRESS)).upgradeToAndCall(address(newImplementation), "");
        console.log("    Upgrade complete!");

        vm.stopBroadcast();

        console.log("");
        console.log("NEXT STEPS:");
        console.log(string.concat("1. forge verify-contract ", vm.toString(address(newImplementation)), " contracts/shared/BiddingSystem.sol:BiddingSystem --chain 11155111 --etherscan-api-key $ETHERSCAN_API_KEY"));
        console.log("2. cast implementation 0x4D7F38C6A9DE5De44A7B789962B7A2B06bFE8fd6 --rpc-url sepolia");
    }
}
