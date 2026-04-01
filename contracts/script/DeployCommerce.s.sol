// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../shared/AgenticCommerce.sol";
import "../shared/ServiceRegistry.sol";

contract DeployCommerceScript is Script {
    // ServiceRegistryV2 Proxy (UUPS) - Deployed March 2026
    address constant SERVICE_REGISTRY = 0x62E1eeEa1A2Ab987004F35bDA430457Ed6077201;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deploying AgenticCommerce (wired to ServiceRegistryV2)...");
        console.log("Deployer:", deployer);
        console.log("ServiceRegistryV2:", SERVICE_REGISTRY);

        vm.startBroadcast(deployerPrivateKey);

        AgenticCommerce agenticCommerce = new AgenticCommerce(deployer);
        agenticCommerce.setServiceRegistry(SERVICE_REGISTRY);

        vm.stopBroadcast();

        console.log("AgenticCommerce:", address(agenticCommerce));
        console.log("NEXT_PUBLIC_AGENTIC_COMMERCE_ADDRESS=", vm.toString(address(agenticCommerce)));
    }
}
