// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import {MilestoneEscrow} from "../shared/MilestoneEscrow.sol";

/**
 * @title DeployMilestoneEscrow
 * @dev Deployment script for MilestoneEscrow (UUPS upgradeable)
 * 
 * Run: 
 *   forge script scripts/DeployMilestoneEscrow.s.sol:DeployMilestoneEscrow --rpc-url $SEPOLIA_RPC_URL --private-key $PRIVATE_KEY --broadcast
 */
contract DeployMilestoneEscrow is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address owner = vm.envAddress("TREASURY_ADDRESS");
        
        console.log("Deploying MilestoneEscrow...");
        console.log("Owner:", owner);
        
        vm.startBroadcast(deployerPrivateKey);
        
        MilestoneEscrow implementation = new MilestoneEscrow();
        console.log("Implementation deployed:", address(implementation));
        
        TransparentUpgradeableProxy proxy = new TransparentUpgradeableProxy(
            address(implementation),
            msg.sender,
            ""
        );
        
        MilestoneEscrow milestoneEscrow = MilestoneEscrow(payable(address(proxy)));
        milestoneEscrow.initialize(owner, msg.sender);
        
        console.log("Proxy deployed:", address(proxy));
        console.log("MilestoneEscrow deployed successfully!");
        
        vm.stopBroadcast();
    }
}

/**
 * @title UpgradeMilestoneEscrow
 * @dev Upgrade script for MilestoneEscrow
 * 
 * Run:
 *   forge script scripts/DeployMilestoneEscrow.s.sol:UpgradeMilestoneEscrow --rpc-url $SEPOLIA_RPC_URL --private-key $PRIVATE_KEY --broadcast
 */
contract UpgradeMilestoneEscrow is Script {
    function run() external {
        uint256 ownerKey = vm.envUint("PRIVATE_KEY");
        address proxyAddress = vm.envAddress("MILESTONE_ESCROW");
        
        console.log("Upgrading MilestoneEscrow...");
        console.log("Proxy:", proxyAddress);
        
        vm.startBroadcast(ownerKey);
        
        MilestoneEscrow newImpl = new MilestoneEscrow();
        console.log("New Implementation deployed:", address(newImpl));
        
        MilestoneEscrow proxy = MilestoneEscrow(payable(proxyAddress));
        proxy.upgradeToAndCall(address(newImpl), "");
        
        console.log("Upgrade completed!");
        console.log("");
        console.log("Contract addresses for .env:");
        console.log("MILESTONE_ESCROW=<PROXY_ADDRESS>");
        console.log("MILESTONE_ESCROW_IMPL=<NEW_IMPL_ADDRESS>");
        
        vm.stopBroadcast();
    }
}