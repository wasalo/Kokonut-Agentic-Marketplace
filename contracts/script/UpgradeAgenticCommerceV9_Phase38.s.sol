// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {AgenticCommerceV9} from "../shared/AgenticCommerceV9.sol";

/**
 * @title UpgradeAgenticCommerceV9_Phase38
 * @dev Adds slashByGovernance() for SlashManager multisig governance slashing.
 *      Storage: appends slashManager slot after authorizedJobCreators, reduces __gap 46->45.
 */
contract UpgradeAgenticCommerceV9_Phase38 is Script {
    address public constant PROXY_ADDRESS = 0x3a1Bc03cC84040A282F6bf238b917D8351499239;
    address public constant SLASH_MANAGER_PROXY = 0x1B8373cDF4f2eD740c3478e0129f0B8494CE4Fa3;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("=============================================");
        console.log("AgenticCommerceV9 Phase 38 Governance Slash");
        console.log("=============================================");
        console.log("Deployer:", deployer);
        console.log("Proxy:", PROXY_ADDRESS);
        console.log("SlashManager:", SLASH_MANAGER_PROXY);

        vm.startBroadcast(deployerPrivateKey);

        console.log("[1/3] Deploying new implementation...");

        AgenticCommerceV9 newImplementation = new AgenticCommerceV9();
        console.log("    New Implementation:", address(newImplementation));

        console.log("[2/3] Upgrading proxy...");

        AgenticCommerceV9(PROXY_ADDRESS).upgradeToAndCall(address(newImplementation), "");
        console.log("    Upgrade complete!");

        console.log("[3/3] Setting slash manager...");

        AgenticCommerceV9(PROXY_ADDRESS).setSlashManager(SLASH_MANAGER_PROXY);
        console.log("    SlashManager set to:", SLASH_MANAGER_PROXY);

        vm.stopBroadcast();

        console.log("");
        console.log("NEXT STEPS:");
        console.log(string.concat("1. forge verify-contract ", vm.toString(address(newImplementation)), " contracts/shared/AgenticCommerceV9.sol:AgenticCommerceV9 --chain 11155111 --etherscan-api-key $ETHERSCAN_API_KEY"));
        console.log("2. Deploy SlashManager upgrade: UpgradeSlashManager_Phase38.s.sol");
    }
}
