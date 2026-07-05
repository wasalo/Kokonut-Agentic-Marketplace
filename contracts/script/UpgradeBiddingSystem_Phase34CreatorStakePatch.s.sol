// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {BiddingSystem} from "../shared/BiddingSystem.sol";

/**
 * @title UpgradeBiddingSystem_Phase34CreatorStakePatch
 * @dev Makes withdrawCreatorStake permanently revert.
 */
contract UpgradeBiddingSystem_Phase34CreatorStakePatch is Script {
    address public constant PROXY_ADDRESS = 0x4D7F38C6A9DE5De44A7B789962B7A2B06bFE8fd6;
    address public constant EXPECTED_OWNER = 0x3394C45b5938127EB56603A6051dF26CFAF08C26;
    address public constant EXPECTED_CURRENT_IMPLEMENTATION = 0xE8E101ca8Fdd2A4c0633cc4d008c88BC03b32bEe;

    bytes32 internal constant IMPLEMENTATION_SLOT =
        0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;

    error WrongChain(uint256 chainId);
    error UnexpectedDeployer(address deployer);
    error UnexpectedOwner(address owner);
    error UnexpectedImplementation(address implementation);
    error InvalidPostUpgradeState();

    function run() external {
        if (block.chainid != 11155111) revert WrongChain(block.chainid);

        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        if (deployer != EXPECTED_OWNER) revert UnexpectedDeployer(deployer);

        BiddingSystem proxy = BiddingSystem(payable(PROXY_ADDRESS));
        if (proxy.owner() != EXPECTED_OWNER) revert UnexpectedOwner(proxy.owner());

        address currentImplementation = _implementationOf(PROXY_ADDRESS);
        if (currentImplementation != EXPECTED_CURRENT_IMPLEMENTATION) {
            revert UnexpectedImplementation(currentImplementation);
        }

        console.log("=============================================");
        console.log("BiddingSystem Phase 34 Creator Stake Patch");
        console.log("=============================================");
        console.log("Deployer:", deployer);
        console.log("Proxy:", PROXY_ADDRESS);
        console.log("Current Implementation:", currentImplementation);

        vm.startBroadcast(deployerPrivateKey);

        BiddingSystem newImplementation = new BiddingSystem();
        proxy.upgradeToAndCall(address(newImplementation), "");

        vm.stopBroadcast();

        address postImplementation = _implementationOf(PROXY_ADDRESS);
        if (postImplementation != address(newImplementation)) revert UnexpectedImplementation(postImplementation);

        console.log("New Implementation:", address(newImplementation));
        console.log("Creator stake patch upgrade complete");
    }

    function _implementationOf(address proxy) internal view returns (address implementation) {
        implementation = address(uint160(uint256(vm.load(proxy, IMPLEMENTATION_SLOT))));
    }
}
