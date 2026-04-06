// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import {BiddingSystem} from "../shared/BiddingSystem.sol";

/**
 * @title DeployBiddingSystem
 * @dev Deployment script for BiddingSystem
 * 
 * Run (new deployment): 
 *   forge script scripts/DeployBiddingSystem.s.sol:DeployBiddingSystem --rpc-url $SEPOLIA_RPC_URL --private-key $PRIVATE_KEY --broadcast
 */
contract DeployBiddingSystem is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address commerce = vm.envAddress("AGENTIC_COMMERCE"); // AgenticCommerceV6.1 proxy
        address treasury = vm.envAddress("TREASURY_ADDRESS");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying BiddingSystem...");
        console.log("Deployer:", deployer);
        console.log("Commerce (AgenticCommerceV6.1):", commerce);
        console.log("Treasury:", treasury);
        
        vm.startBroadcast(deployerPrivateKey);
        
        BiddingSystem implementation = new BiddingSystem();
        console.log("Implementation deployed:", address(implementation));
        
        bytes memory initData = abi.encodeWithSelector(
            BiddingSystem.initialize.selector,
            deployer, // Use deployer as initial owner
            commerce,
            treasury
        );
        
        TransparentUpgradeableProxy proxy = new TransparentUpgradeableProxy(
            address(implementation),
            deployer,
            initData
        );
        
        console.log("Proxy deployed:", address(proxy));
        console.log("");
        console.log("Contract addresses for .env:");
        console.log("BIDDING_SYSTEM=address(proxy)");
        console.log("BIDDING_SYSTEM_IMPL=address(implementation)");
        
        vm.stopBroadcast();
    }
}

/**
 * @title UpgradeBiddingSystem
 * @dev Upgrade script for BiddingSystem
 * 
 * Run:
 *   forge script scripts/DeployBiddingSystem.s.sol:UpgradeBiddingSystem --rpc-url $SEPOLIA_RPC_URL --private-key $OWNER_KEY --broadcast
 */
contract UpgradeBiddingSystem is Script {
    function run() external {
        uint256 ownerKey = vm.envUint("PRIVATE_KEY");
        address proxyAddress = vm.envAddress("BIDDING_SYSTEM");
        
        console.log("Upgrading BiddingSystem...");
        console.log("Proxy:", proxyAddress);
        
        vm.startBroadcast(ownerKey);
        
        BiddingSystem newImpl = new BiddingSystem();
        console.log("New Implementation deployed:", address(newImpl));
        
        BiddingSystem proxy = BiddingSystem(payable(proxyAddress));
        proxy.upgradeToAndCall(address(newImpl), "");
        
        console.log("Upgrade completed!");
        
        vm.stopBroadcast();
    }
}

/**
 * @title ConfigureBiddingSystem
 * @dev Configuration script after deployment
 * 
 * Run:
 *   forge script scripts/DeployBiddingSystem.s.sol:ConfigureBiddingSystem --rpc-url $SEPOLIA_RPC_URL --private-key $OWNER_KEY --broadcast
 */
contract ConfigureBiddingSystem is Script {
    function run() external {
        uint256 ownerKey = vm.envUint("PRIVATE_KEY");
        address biddingSystem = vm.envAddress("BIDDING_SYSTEM");
        address commerce = vm.envAddress("AGENTIC_COMMERCE");
        
        console.log("Configuring BiddingSystem...");
        console.log("BiddingSystem:", biddingSystem);
        
        BiddingSystem bidding = BiddingSystem(payable(biddingSystem));
        
        vm.startBroadcast(ownerKey);
        
        // Set AgenticCommerce address
        bidding.setCommerce(commerce);
        console.log("Commerce set:", commerce);
        
        // Configure reveal window (optional)
        bidding.setRevealWindow(1 hours);
        console.log("Reveal window: 1 hour");
        
        // Configure platform fee (1%)
        bidding.setPlatformFeeBP(100);
        console.log("Platform fee: 1%");
        
        vm.stopBroadcast();
        
        console.log("");
        console.log("Configuration complete!");
    }
}
