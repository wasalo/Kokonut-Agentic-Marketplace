// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {MilestoneEscrowV2} from "../shared/MilestoneEscrowV2.sol";

/**
 * @title UpgradeMilestoneEscrowV2_Phase34
 * @dev Phase 34 Upgrade — Native currency (ETH) support for role stakes
 *
 * Changes:
 * - 5 functions now support address(0) for native ETH: registerAsArbiter, unregisterAsArbiter,
 *   releaseMilestone, flagDispute, resolveDispute
 * - Added _safeTransfer helper for native + ERC-20 transfers
 * - Added EthTransferFailed custom error
 * - CEI pattern enforced on all transfer paths
 */
contract UpgradeMilestoneEscrowV2_Phase34 is Script {
    address public constant PROXY_ADDRESS = 0xc89D63057288092012c5D3cEF66121C1F8449a9f;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("=============================================");
        console.log("MilestoneEscrowV2 Upgrade - Phase 34");
        console.log("Native Currency (ETH) Support");
        console.log("=============================================");
        console.log("Deployer:", deployer);
        console.log("Proxy Address:", PROXY_ADDRESS);

        console.log("[1/2] Deploying new implementation...");

        vm.startBroadcast(deployerPrivateKey);

        MilestoneEscrowV2 newImplementation = new MilestoneEscrowV2();

        console.log("    New Implementation:", address(newImplementation));

        console.log("[2/2] Upgrading proxy...");

        MilestoneEscrowV2(PROXY_ADDRESS).upgradeToAndCall(address(newImplementation), "");

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
        console.log(string.concat("forge verify-contract ", vm.toString(address(newImplementation)), " contracts/shared/MilestoneEscrowV2.sol:MilestoneEscrowV2 --chain 11155111 --etherscan-api-key $ETHERSCAN_API_KEY"));
    }
}
