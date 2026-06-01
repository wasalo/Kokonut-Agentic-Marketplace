// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {ServiceRegistryV2} from "../shared/ServiceRegistryV2.sol";

/**
 * @title UpgradeServiceRegistryV2_NativePaymentServices
 * @dev Enables native-token service pricing while preserving the ETH listing bond.
 */
contract UpgradeServiceRegistryV2_NativePaymentServices is Script {
    address public constant PROXY_ADDRESS = 0x62E1eeEa1A2Ab987004F35bDA430457Ed6077201;
    address public constant EXPECTED_OWNER = 0x3394C45b5938127EB56603A6051dF26CFAF08C26;
    address public constant EXPECTED_CURRENT_IMPLEMENTATION = 0xe8dEf9ce280ebDf43d8273223C1957747a292e23;

    bytes32 internal constant IMPLEMENTATION_SLOT =
        0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;

    error WrongChain(uint256 chainId);
    error UnexpectedDeployer(address deployer);
    error UnexpectedOwner(address owner);
    error UnexpectedImplementation(address implementation);

    function run() external {
        if (block.chainid != 11155111) revert WrongChain(block.chainid);

        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        if (deployer != EXPECTED_OWNER) revert UnexpectedDeployer(deployer);

        ServiceRegistryV2 proxy = ServiceRegistryV2(PROXY_ADDRESS);
        if (proxy.owner() != EXPECTED_OWNER) revert UnexpectedOwner(proxy.owner());

        address currentImplementation = _implementationOf(PROXY_ADDRESS);
        if (currentImplementation != EXPECTED_CURRENT_IMPLEMENTATION) {
            revert UnexpectedImplementation(currentImplementation);
        }

        console.log("=============================================");
        console.log("ServiceRegistryV2 Native Payment Services Upgrade");
        console.log("=============================================");
        console.log("Deployer:", deployer);
        console.log("Proxy:", PROXY_ADDRESS);
        console.log("Current Implementation:", currentImplementation);

        vm.startBroadcast(deployerPrivateKey);

        ServiceRegistryV2 newImplementation = new ServiceRegistryV2();
        proxy.upgradeToAndCall(address(newImplementation), "");

        vm.stopBroadcast();

        address postImplementation = _implementationOf(PROXY_ADDRESS);
        if (postImplementation != address(newImplementation)) revert UnexpectedImplementation(postImplementation);

        console.log("New Implementation:", address(newImplementation));
        console.log("Native payment services upgrade complete");
    }

    function _implementationOf(address proxy) internal view returns (address implementation) {
        implementation = address(uint160(uint256(vm.load(proxy, IMPLEMENTATION_SLOT))));
    }
}
