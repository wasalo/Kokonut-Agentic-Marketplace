// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {BiddingSystem} from "../shared/BiddingSystem.sol";

/**
 * @title UpgradeBiddingSystem_Phase46b
 * @dev Phase 46a/46b audit remediation for BiddingSystem:
 *      - ERC-20 createJobAndFund gives AgenticCommerce exact temporary allowance
 *      - creator stake refund uses pending pull accounting after job creation
 *      - creator can recover stake after a stuck WinnerSelected recovery window
 *      - sweepUnclaimedStakes only penalizes unrevealed no-shows and refunds remainder
 *      Storage layout: appends winnerSelectedAt and pendingCreatorRefund; __gap 42 -> 40.
 */
contract UpgradeBiddingSystem_Phase46b is Script {
    address public constant PROXY_ADDRESS = 0x4D7F38C6A9DE5De44A7B789962B7A2B06bFE8fd6;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("=============================================");
        console.log("BiddingSystem Phase 46b Upgrade");
        console.log("=============================================");
        console.log("Deployer:", deployer);
        console.log("Proxy:", PROXY_ADDRESS);

        vm.startBroadcast(deployerPrivateKey);

        BiddingSystem newImplementation = new BiddingSystem();
        console.log("New Implementation:", address(newImplementation));

        BiddingSystem(payable(PROXY_ADDRESS)).upgradeToAndCall(address(newImplementation), "");
        console.log("Upgrade complete");

        vm.stopBroadcast();

        console.log("NEXT STEPS:");
        console.log(string.concat("1. forge verify-contract ", vm.toString(address(newImplementation)), " contracts/shared/BiddingSystem.sol:BiddingSystem --chain 11155111 --etherscan-api-key $ETHERSCAN_API_KEY"));
        console.log("2. Update config/address-manifest.json biddingSystemImpl after deployment");
    }
}
