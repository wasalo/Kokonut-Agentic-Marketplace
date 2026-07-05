// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {MilestoneEscrowV2} from "../shared/MilestoneEscrowV2.sol";

/**
 * @title UpgradeMilestoneEscrowV2_Phase47
 * @dev Phase 47 Pashov audit remediation for MilestoneEscrowV2:
 *      - resolveDispute: clear disputes[jobId].flaggedAt = 0 after resolution (allows future disputes on same job)
 *      - resolveDispute: refund client regardless of milestone completion status (prevents incomplete-milestone lock)
 *      - flagDispute: exclude job client and provider from random arbiter selection (prevents self-arbitration)
 *      Storage layout: no new variables; existing __gap unchanged (49).
 */
contract UpgradeMilestoneEscrowV2_Phase47 is Script {
    address public constant PROXY_ADDRESS = 0xc89D63057288092012c5D3cEF66121C1F8449a9f;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("=============================================");
        console.log("MilestoneEscrowV2 Phase 47 Upgrade");
        console.log("=============================================");
        console.log("Deployer:", deployer);
        console.log("Proxy:", PROXY_ADDRESS);

        vm.startBroadcast(deployerPrivateKey);

        MilestoneEscrowV2 newImplementation = new MilestoneEscrowV2();
        console.log("New Implementation:", address(newImplementation));

        MilestoneEscrowV2(payable(PROXY_ADDRESS)).upgradeToAndCall(address(newImplementation), "");
        console.log("Upgrade complete");

        vm.stopBroadcast();

        console.log("NEXT STEPS:");
        console.log(string.concat("1. forge verify-contract ", vm.toString(address(newImplementation)), " contracts/shared/MilestoneEscrowV2.sol:MilestoneEscrowV2 --chain 11155111 --etherscan-api-key $ETHERSCAN_API_KEY"));
        console.log("2. Update config/address-manifest.json milestoneEscrowImpl after deployment");
    }
}
