// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {AgentSkillRegistryV2} from "../shared/AgentSkillRegistryV2.sol";

contract UpgradeAgentSkillRegistryV2 is Script {
    address public constant PROXY_ADDRESS = 0xA84684261558f342d6871DD2CFef90A2117Aa20A;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("=============================================");
        console.log("AgentSkillRegistryV2 Upgrade");
        console.log("=============================================");
        console.log("Deployer:", deployer);
        console.log("Proxy Address:", PROXY_ADDRESS);

        console.log("[1/2] Deploying new implementation...");

        vm.startBroadcast(deployerPrivateKey);

        AgentSkillRegistryV2 newImplementation = new AgentSkillRegistryV2();

        console.log("    New Implementation:", address(newImplementation));

        console.log("[2/2] Upgrading proxy...");

        AgentSkillRegistryV2(PROXY_ADDRESS).upgradeToAndCall(address(newImplementation), "");

        console.log("    Upgrade complete!");

        vm.stopBroadcast();

        console.log("");
        console.log("NEXT STEPS:");
        console.log("1. forge verify-contract <IMPL_ADDR> contracts/shared/AgentSkillRegistryV2.sol:AgentSkillRegistryV2 --chain 11155111");
        console.log("2. cast implementation 0xA84684261558f342d6871DD2CFef90A2117Aa20A --rpc-url sepolia");
    }
}
