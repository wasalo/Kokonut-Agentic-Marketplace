// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {AgenticCommerceV9} from "../shared/AgenticCommerceV9.sol";

/**
 * @title UpgradeAgenticCommerceV9_Phase47
 * @dev Phase 47 Pashov audit remediation for AgenticCommerceV9:
 *      - _createJob: require exact funding (fundAmount == budget) when fundNow == true
 *        (prevents marking job Funded at full budget while only pulling partial amount)
 *      - setPaymentToken: revert if job.budget != 0 (forces budget reset before token change)
 *      - _selectRandomEvaluator: skip provider, client, unregistered, and blacklisted evaluators
 *      - unregisterAsEvaluator: revert if evaluator is assigned to an active job
 *      Storage layout: no new variables; existing __gap unchanged (45).
 */
contract UpgradeAgenticCommerceV9_Phase47 is Script {
    address public constant PROXY_ADDRESS = 0x3a1Bc03cC84040A282F6bf238b917D8351499239;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("=============================================");
        console.log("AgenticCommerceV9 Phase 47 Upgrade");
        console.log("=============================================");
        console.log("Deployer:", deployer);
        console.log("Proxy:", PROXY_ADDRESS);

        vm.startBroadcast(deployerPrivateKey);

        AgenticCommerceV9 newImplementation = new AgenticCommerceV9();
        console.log("New Implementation:", address(newImplementation));

        AgenticCommerceV9(payable(PROXY_ADDRESS)).upgradeToAndCall(address(newImplementation), "");
        console.log("Upgrade complete");

        vm.stopBroadcast();

        console.log("NEXT STEPS:");
        console.log(string.concat("1. forge verify-contract ", vm.toString(address(newImplementation)), " contracts/shared/AgenticCommerceV9.sol:AgenticCommerceV9 --chain 11155111 --etherscan-api-key $ETHERSCAN_API_KEY"));
        console.log("2. Update config/address-manifest.json agenticCommerceImpl after deployment");
    }
}
