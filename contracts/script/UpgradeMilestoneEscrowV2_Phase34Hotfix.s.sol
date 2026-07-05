// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {MilestoneEscrowV2} from "../shared/MilestoneEscrowV2.sol";

/**
 * @title UpgradeMilestoneEscrowV2_Phase34Hotfix
 * @dev Hotfix for fake milestone drain and native slash handling.
 */
contract UpgradeMilestoneEscrowV2_Phase34Hotfix is Script {
    address public constant PROXY_ADDRESS = 0xc89D63057288092012c5D3cEF66121C1F8449a9f;
    address public constant EXPECTED_OWNER = 0x3394C45b5938127EB56603A6051dF26CFAF08C26;
    address public constant EXPECTED_CURRENT_IMPLEMENTATION = 0x11AAc9e99300F783Ad7BdfE7899C7f86CF8A1A74;
    address public constant EXPECTED_AGENTIC_COMMERCE = 0x3a1Bc03cC84040A282F6bf238b917D8351499239;

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

        MilestoneEscrowV2 proxy = MilestoneEscrowV2(payable(PROXY_ADDRESS));
        if (proxy.owner() != EXPECTED_OWNER) revert UnexpectedOwner(proxy.owner());

        address currentImplementation = _implementationOf(PROXY_ADDRESS);
        if (currentImplementation != EXPECTED_CURRENT_IMPLEMENTATION) {
            revert UnexpectedImplementation(currentImplementation);
        }

        console.log("=============================================");
        console.log("MilestoneEscrowV2 Phase 34 Hotfix Upgrade");
        console.log("=============================================");
        console.log("Deployer:", deployer);
        console.log("Proxy:", PROXY_ADDRESS);
        console.log("Current Implementation:", currentImplementation);

        vm.startBroadcast(deployerPrivateKey);

        MilestoneEscrowV2 newImplementation = new MilestoneEscrowV2();
        proxy.upgradeToAndCall(address(newImplementation), "");

        vm.stopBroadcast();

        address postImplementation = _implementationOf(PROXY_ADDRESS);
        if (postImplementation != address(newImplementation)) revert UnexpectedImplementation(postImplementation);
        if (proxy.agenticCommerce() != EXPECTED_AGENTIC_COMMERCE) revert InvalidPostUpgradeState();
        if (!proxy.supportedTokens(address(0))) revert InvalidPostUpgradeState();

        console.log("New Implementation:", address(newImplementation));
        console.log("Hotfix upgrade complete");
    }

    function _implementationOf(address proxy) internal view returns (address implementation) {
        implementation = address(uint160(uint256(vm.load(proxy, IMPLEMENTATION_SLOT))));
    }
}
