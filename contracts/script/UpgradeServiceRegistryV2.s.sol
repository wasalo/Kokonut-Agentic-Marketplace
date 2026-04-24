// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address proxyAddress = 0x62E1eeEa1A2Ab987004F35bDA430457Ed6077201;
        
        // New implementation deployed
        address newImplementation = 0x457f803758F5c64208D60d23B7e831a13501d8F7;
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Call upgradeTo directly on the UUPS proxy (the proxy itself has this function)
        (bool success, ) = proxyAddress.call(
            abi.encodeWithSignature("upgradeTo(address)", newImplementation)
        );
        require(success, "Upgrade failed");
        
        console.log("Upgraded proxy to:", newImplementation);
        
        vm.stopBroadcast();
    }
}