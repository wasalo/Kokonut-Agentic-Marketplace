// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {AgentReviewV5} from "../shared/AgentReviewV5.sol";

/**
 * @title UpgradeAgentReviewV5_Phase34StakeRewardPatch
 * @dev Fixes stake/reward accounting: winner gets stake + reward share; losers retain stake.
 */
contract UpgradeAgentReviewV5_Phase34StakeRewardPatch is Script {
    address public constant PROXY_ADDRESS = 0x5CDb592Fd37749bF87448FBf5725D1Cd986dd1Cb;
    address public constant EXPECTED_OWNER = 0x3394C45b5938127EB56603A6051dF26CFAF08C26;
    address public constant EXPECTED_CURRENT_IMPLEMENTATION = 0xa921f01c0617dF72e2aAAe641AF800b760BA6855;

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

        AgentReviewV5 proxy = AgentReviewV5(payable(PROXY_ADDRESS));
        if (proxy.owner() != EXPECTED_OWNER) revert UnexpectedOwner(proxy.owner());

        address currentImplementation = _implementationOf(PROXY_ADDRESS);
        if (currentImplementation != EXPECTED_CURRENT_IMPLEMENTATION) {
            revert UnexpectedImplementation(currentImplementation);
        }

        console.log("=============================================");
        console.log("AgentReviewV5 Phase 34 Stake/Reward Patch");
        console.log("=============================================");
        console.log("Deployer:", deployer);
        console.log("Proxy:", PROXY_ADDRESS);
        console.log("Current Implementation:", currentImplementation);

        vm.startBroadcast(deployerPrivateKey);

        AgentReviewV5 newImplementation = new AgentReviewV5();
        proxy.upgradeToAndCall(address(newImplementation), "");

        vm.stopBroadcast();

        address postImplementation = _implementationOf(PROXY_ADDRESS);
        if (postImplementation != address(newImplementation)) revert UnexpectedImplementation(postImplementation);

        console.log("New Implementation:", address(newImplementation));
        console.log("Stake/reward patch upgrade complete");
    }

    function _implementationOf(address proxy) internal view returns (address implementation) {
        implementation = address(uint160(uint256(vm.load(proxy, IMPLEMENTATION_SLOT))));
    }
}
