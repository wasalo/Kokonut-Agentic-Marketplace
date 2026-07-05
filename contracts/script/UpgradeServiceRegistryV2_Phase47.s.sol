// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {ServiceRegistryV2} from "../shared/ServiceRegistryV2.sol";

/**
 * @title UpgradeServiceRegistryV2_Phase47
 * @dev Phase 47 Pashov audit remediation for ServiceRegistryV2:
 *      - activateService: check adminRegistry.isAgentBlacklistedActive(agentId) in addition to
 *        isWalletBlacklistedActive(msg.sender)
 *      - activateService: require _serviceBonds[serviceId] != 0 (prevent reactivation after bond withdrawal)
 *      Storage layout: no new variables; existing __gap unchanged (49).
 */
contract UpgradeServiceRegistryV2_Phase47 is Script {
    address public constant PROXY_ADDRESS = 0x62E1eeEa1A2Ab987004F35bDA430457Ed6077201;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("=============================================");
        console.log("ServiceRegistryV2 Phase 47 Upgrade");
        console.log("=============================================");
        console.log("Deployer:", deployer);
        console.log("Proxy:", PROXY_ADDRESS);

        vm.startBroadcast(deployerPrivateKey);

        ServiceRegistryV2 newImplementation = new ServiceRegistryV2();
        console.log("New Implementation:", address(newImplementation));

        ServiceRegistryV2(payable(PROXY_ADDRESS)).upgradeToAndCall(address(newImplementation), "");
        console.log("Upgrade complete");

        vm.stopBroadcast();

        console.log("NEXT STEPS:");
        console.log(string.concat("1. forge verify-contract ", vm.toString(address(newImplementation)), " contracts/shared/ServiceRegistryV2.sol:ServiceRegistryV2 --chain 11155111 --etherscan-api-key $ETHERSCAN_API_KEY"));
        console.log("2. Update config/address-manifest.json serviceRegistryImpl after deployment");
    }
}
