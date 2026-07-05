// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {AgenticCommerceV9} from "../shared/AgenticCommerceV9.sol";

/**
 * @title UpgradeAgenticCommerceV9_Phase34Recovery
 * @dev Storage-compatible recovery for the Phase 34 evaluator stake upgrade.
 */
contract UpgradeAgenticCommerceV9_Phase34Recovery is Script {
    address public constant PROXY_ADDRESS = 0x3a1Bc03cC84040A282F6bf238b917D8351499239;
    address public constant EXPECTED_OWNER = 0x3394C45b5938127EB56603A6051dF26CFAF08C26;
    address public constant EXPECTED_CURRENT_IMPLEMENTATION = 0x09ce4753148CD3652E13D3f824E1E5Dc478B2688;
    address public constant EXPECTED_ADMIN_REGISTRY = 0xC81C864CEAb6231ad764cf9867e031D8b6dee41d;
    address public constant EXPECTED_PRICE_ORACLE = 0x29c27a26DD2F80f840cb4D7B5E53b7db3D67143d;
    uint256 public constant EXPECTED_MIN_BUDGET_USD = 5e6;
    uint256 public constant EXPECTED_MAX_BUDGET_USD = 1_000_000e6;
    uint256 public constant DEFAULT_MIN_EVALUATOR_STAKE = 0.01 ether;

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

        AgenticCommerceV9 proxy = AgenticCommerceV9(PROXY_ADDRESS);
        if (proxy.owner() != EXPECTED_OWNER) revert UnexpectedOwner(proxy.owner());

        address currentImplementation = _implementationOf(PROXY_ADDRESS);
        if (currentImplementation != EXPECTED_CURRENT_IMPLEMENTATION) {
            revert UnexpectedImplementation(currentImplementation);
        }

        console.log("=============================================");
        console.log("AgenticCommerceV9 Phase 34 Recovery Upgrade");
        console.log("=============================================");
        console.log("Deployer:", deployer);
        console.log("Proxy:", PROXY_ADDRESS);
        console.log("Current Implementation:", currentImplementation);

        vm.startBroadcast(deployerPrivateKey);

        AgenticCommerceV9 newImplementation = new AgenticCommerceV9();
        bytes memory data = abi.encodeCall(
            AgenticCommerceV9.setMinEvaluatorStake,
            (DEFAULT_MIN_EVALUATOR_STAKE)
        );
        proxy.upgradeToAndCall(address(newImplementation), data);

        vm.stopBroadcast();

        address postImplementation = _implementationOf(PROXY_ADDRESS);
        if (postImplementation != address(newImplementation)) revert UnexpectedImplementation(postImplementation);
        if (proxy.minBudgetUsd() != EXPECTED_MIN_BUDGET_USD) revert InvalidPostUpgradeState();
        if (proxy.maxBudgetUsd() != EXPECTED_MAX_BUDGET_USD) revert InvalidPostUpgradeState();
        if (proxy.adminRegistry() != EXPECTED_ADMIN_REGISTRY) revert InvalidPostUpgradeState();
        if (address(proxy.priceOracle()) != EXPECTED_PRICE_ORACLE) revert InvalidPostUpgradeState();
        if (proxy.minEvaluatorStake() != DEFAULT_MIN_EVALUATOR_STAKE) revert InvalidPostUpgradeState();

        console.log("New Implementation:", address(newImplementation));
        console.log("Recovery upgrade complete");
    }

    function _implementationOf(address proxy) internal view returns (address implementation) {
        implementation = address(uint160(uint256(vm.load(proxy, IMPLEMENTATION_SLOT))));
    }
}
