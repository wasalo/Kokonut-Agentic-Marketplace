// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {AgenticCommerceV7} from "../shared/AgenticCommerceV7.sol";

contract UpgradeToV7 is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        // Existing V6 proxy (from AGENTS.md)
        address v6Proxy = 0x948d97EA7F0c49796fB576ADff375C900627568E;
        
        // Already deployed V7 implementation WITH MILESTONE SUPPORT (FIXED VALIDATION)
        address v7Implementation = 0x26a01019488640B4785D57f5809A39e18788133C;
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Call upgradeToAndCall on the proxy (this is an OZ pattern)
        AgenticCommerceV7(v6Proxy).upgradeToAndCall(v7Implementation, "");
        
        console.log("Upgraded V6 proxy to V7 at:", v6Proxy);
        console.log("New implementation:", v7Implementation);
        
        vm.stopBroadcast();
    }
}