// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {AgentSkillRegistryV2} from "../shared/AgentSkillRegistryV2.sol";

/**
 * @title UpgradeAgentSkillRegistryV2_Phase46a
 * @dev Phase 46a audit remediation: fixes findSkillsByDomain domain hash encoding.
 *      Storage layout unchanged.
 */
contract UpgradeAgentSkillRegistryV2_Phase46a is Script {
    address public constant PROXY_ADDRESS = 0xA84684261558f342d6871DD2CFef90A2117Aa20A;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("=============================================");
        console.log("AgentSkillRegistryV2 Phase 46a Upgrade");
        console.log("=============================================");
        console.log("Deployer:", deployer);
        console.log("Proxy:", PROXY_ADDRESS);

        vm.startBroadcast(deployerPrivateKey);

        AgentSkillRegistryV2 newImplementation = new AgentSkillRegistryV2();
        console.log("New Implementation:", address(newImplementation));

        AgentSkillRegistryV2(PROXY_ADDRESS).upgradeToAndCall(address(newImplementation), "");
        console.log("Upgrade complete");

        vm.stopBroadcast();

        console.log("NEXT STEPS:");
        console.log(string.concat("1. forge verify-contract ", vm.toString(address(newImplementation)), " contracts/shared/AgentSkillRegistryV2.sol:AgentSkillRegistryV2 --chain 11155111 --etherscan-api-key $ETHERSCAN_API_KEY"));
        console.log("2. Update config/address-manifest.json skillRegistryImpl after deployment");
    }
}
