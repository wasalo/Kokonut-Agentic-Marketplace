// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import {AgentReviewV5} from "../shared/AgentReviewV5.sol";

/**
 * @title DeployAgentReviewV5
 * @dev Deployment script for AgentReviewV5 (UUPS Upgradeable)
 * 
 * Run: 
 *   forge script scripts/DeployV5.s.sol --rpc-url $SEPOLIA_RPC_URL --private-key $PRIVATE_KEY --broadcast
 * 
 * For local testing:
 *   forge script scripts/DeployV5.s.sol -vvv
 */
contract DeployAgentReviewV5 is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address owner = vm.addr(deployerPrivateKey);
        
        console.log("Deploying AgentReviewV5...");
        console.log("Owner:", owner);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy implementation
        AgentReviewV5 implementation = new AgentReviewV5();
        console.log("Implementation deployed:", address(implementation));
        
        // Encode initialization call
        bytes memory initData = abi.encodeWithSelector(
            AgentReviewV5.initialize.selector,
            owner
        );
        
        // Deploy transparent proxy
        TransparentUpgradeableProxy proxy = new TransparentUpgradeableProxy(
            address(implementation),
            owner, // proxy admin (deployer)
            initData
        );
        
        console.log("Proxy deployed:", address(proxy));
        console.log("AgentReviewV5 deployed successfully!");
        console.log("");
        console.log("=== Post-Deployment Setup ===");
        console.log("1. Transfer proxy admin to multisig (e.g., Gnosis Safe)");
        console.log("2. Set SlashManager via setSlashManager()");
        console.log("");
        console.log("Contract addresses for .env:");
        console.log("AGENT_REVIEW_V5_IMPL=<IMPL_ADDRESS>");
        console.log("AGENT_REVIEW_V5_PROXY=<PROXY_ADDRESS>");
        
        vm.stopBroadcast();
    }
}

/**
 * @title UpgradeAgentReviewV5
 * @dev Upgrade script for AgentReviewV5
 * 
 * Run:
 *   forge script scripts/DeployV5.s.sol:UpgradeAgentReviewV5 --rpc-url $SEPOLIA_RPC_URL --private-key $PROXY_ADMIN_KEY --broadcast
 */
contract UpgradeAgentReviewV5 is Script {
    function run() external {
        uint256 adminPrivateKey = vm.envUint("PRIVATE_KEY");
        address proxyAddress = vm.envAddress("AGENT_REVIEW_V5_PROXY");
        address newImplementation = vm.envAddress("AGENT_REVIEW_V5_IMPL");
        
        console.log("Upgrading AgentReviewV5...");
        console.log("Proxy:", proxyAddress);
        console.log("New Implementation:", newImplementation);
        
        vm.startBroadcast(adminPrivateKey);
        
        AgentReviewV5 proxy = AgentReviewV5(payable(proxyAddress));
        proxy.upgradeToAndCall(newImplementation, "");
        
        console.log("Upgrade completed!");
        
        vm.stopBroadcast();
    }
}

/**
 * @title ConfigureAgentReviewV5
 * @dev Configuration script for setting SlashManager and other parameters
 * 
 * Run:
 *   forge script scripts/DeployV5.s.sol:ConfigureAgentReviewV5 --rpc-url $SEPOLIA_RPC_URL --private-key $OWNER_KEY --broadcast
 */
contract ConfigureAgentReviewV5 is Script {
    function run() external {
        uint256 ownerKey = vm.envUint("PRIVATE_KEY");
        address proxyAddress = vm.envAddress("AGENT_REVIEW_V5_PROXY");
        address slashManager = vm.envAddress("SLASH_MANAGER_ADDRESS");
        
        console.log("Configuring AgentReviewV5...");
        console.log("Proxy:", proxyAddress);
        console.log("SlashManager:", slashManager);
        
        vm.startBroadcast(ownerKey);
        
        AgentReviewV5 proxy = AgentReviewV5(payable(proxyAddress));
        
        // Set SlashManager
        proxy.setSlashManager(slashManager);
        console.log("SlashManager set:", slashManager);
        
        console.log("Configuration completed!");
        
        vm.stopBroadcast();
    }
}
