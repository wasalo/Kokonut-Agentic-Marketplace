// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {BiddingSystem} from "../shared/BiddingSystem.sol";

/**
 * @title UpgradeBiddingSystem_Phase40
 * @dev Adds ERC-20 payment token support for bidding sessions.
 *      - paymentToken field added to Session struct
 *      - createBiddingSession accepts paymentToken parameter
 *      - commitBid handles ERC-20 stakes
 *      - createJobAndFund passes paymentToken to AgenticCommerceV9
 *      - All refund functions handle ERC-20 tokens
 */
contract UpgradeBiddingSystem_Phase40 is Script {
    address public constant PROXY_ADDRESS = 0x4D7F38C6A9DE5De44A7B789962B7A2B06bFE8fd6;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("=============================================");
        console.log("BiddingSystem Phase 40 ERC-20 Support");
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
