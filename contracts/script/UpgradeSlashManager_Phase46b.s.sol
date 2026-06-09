// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {SlashManager} from "../shared/SlashManager.sol";

/**
 * @title UpgradeSlashManager_Phase46b
 * @dev Phase 46b audit remediation: executeSlash forwards a capped partial
 *      slash amount into AgenticCommerceV9 instead of treating proposal.amount
 *      as decorative. Storage layout unchanged.
 */
contract UpgradeSlashManager_Phase46b is Script {
    address public constant PROXY_ADDRESS = 0x1B8373cDF4f2eD740c3478e0129f0B8494CE4Fa3;
    address public constant AGENTIC_COMMERCE_PROXY = 0x3a1Bc03cC84040A282F6bf238b917D8351499239;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("=============================================");
        console.log("SlashManager Phase 46b Upgrade");
        console.log("=============================================");
        console.log("Deployer:", deployer);
        console.log("Proxy:", PROXY_ADDRESS);
        console.log("AgenticCommerce:", AGENTIC_COMMERCE_PROXY);

        vm.startBroadcast(deployerPrivateKey);

        SlashManager newImplementation = new SlashManager();
        console.log("New Implementation:", address(newImplementation));

        SlashManager(PROXY_ADDRESS).upgradeToAndCall(address(newImplementation), "");
        SlashManager(PROXY_ADDRESS).setCommerce(AGENTIC_COMMERCE_PROXY);
        console.log("Upgrade complete");

        vm.stopBroadcast();

        console.log("NEXT STEPS:");
        console.log(string.concat("1. forge verify-contract ", vm.toString(address(newImplementation)), " contracts/shared/SlashManager.sol:SlashManager --chain 11155111 --etherscan-api-key $ETHERSCAN_API_KEY"));
        console.log("2. Update config/address-manifest.json slashManagerImpl after deployment");
    }
}
