// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {AgenticCommerceV9} from "../shared/AgenticCommerceV9.sol";

/**
 * @title UpgradeAgenticCommerceV9_Phase46b
 * @dev Phase 46a/46b audit remediation for V9:
 *      - invalid oracle prices now revert in max-budget checks
 *      - slashByGovernance supports partial slash amounts
 *      Storage layout unchanged.
 */
contract UpgradeAgenticCommerceV9_Phase46b is Script {
    address public constant PROXY_ADDRESS = 0x3a1Bc03cC84040A282F6bf238b917D8351499239;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("=============================================");
        console.log("AgenticCommerceV9 Phase 46b Upgrade");
        console.log("=============================================");
        console.log("Deployer:", deployer);
        console.log("Proxy:", PROXY_ADDRESS);

        vm.startBroadcast(deployerPrivateKey);

        AgenticCommerceV9 newImplementation = new AgenticCommerceV9();
        console.log("New Implementation:", address(newImplementation));

        AgenticCommerceV9(PROXY_ADDRESS).upgradeToAndCall(address(newImplementation), "");
        console.log("Upgrade complete");

        vm.stopBroadcast();

        console.log("NEXT STEPS:");
        console.log(string.concat("1. forge verify-contract ", vm.toString(address(newImplementation)), " contracts/shared/AgenticCommerceV9.sol:AgenticCommerceV9 --chain 11155111 --etherscan-api-key $ETHERSCAN_API_KEY"));
        console.log("2. Update config/address-manifest.json agenticCommerceImpl after deployment");
    }
}
