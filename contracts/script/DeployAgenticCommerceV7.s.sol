// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {TransparentUpgradeableProxy} from "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import {ProxyAdmin} from "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";
import {AgenticCommerceV7} from "../shared/AgenticCommerceV7.sol";

contract DeployAgenticCommerceV7 is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address treasury = vm.envAddress("TREASURY_ADDRESS");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy implementation
        AgenticCommerceV7 implementation = new AgenticCommerceV7();
        console.log("V7 Implementation:", address(implementation));
        
        // Initialize
        bytes memory initData = abi.encodeCall(
            AgenticCommerceV7.initialize,
            (treasury, msg.sender)
        );
        
        // Deploy proxy
        TransparentUpgradeableProxy proxy = new TransparentUpgradeableProxy(
            address(implementation),
            msg.sender,
            initData
        );
        
        console.log("V7 Proxy:", address(proxy));
        
        vm.stopBroadcast();
    }
}