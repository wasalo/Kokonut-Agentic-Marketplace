// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {BiddingSystem} from "../shared/BiddingSystem.sol";
import {AgenticCommerceV9} from "../shared/AgenticCommerceV9.sol";
import {AgentReviewV5} from "../shared/AgentReviewV5.sol";
import {ServiceRegistryV2} from "../shared/ServiceRegistryV2.sol";

/**
 * @title UpgradeAllPhase4
 * @dev Batch upgrade all 4 contracts with Phase 4 improvements
 * 
 * Upgrades:
 * - BiddingSystem: Admin setter events (5 new events)
 * - AgenticCommerceV9: Custom errors for ETH transfers
 * - AgentReviewV5: Custom error for ETH transfers
 * - ServiceRegistryV2: Custom error for ETH transfers
 */
contract UpgradeAllPhase4 is Script {
    address public constant BIDDING_SYSTEM_PROXY = 0x32c9d069a248a619d3EAc4D1FC76F2639AaBeF04;
    address public constant AGENTIC_COMMERCE_PROXY = 0x4c592510e4FAbbEEA8D7142dE1f38d548b500e7f;
    address public constant AGENT_REVIEW_PROXY = 0x5CDb592Fd37749bF87448FBf5725D1Cd986dd1Cb;
    address public constant SERVICE_REGISTRY_PROXY = 0x62E1eeEa1A2Ab987004F35bDA430457Ed6077201;
    
    struct UpgradeResult {
        string name;
        address proxy;
        address newImpl;
    }
    
    UpgradeResult[] public results;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("==========================================================");
        console.log("  Phase 4 Contract Upgrades - All 4 Contracts");
        console.log("==========================================================");
        console.log("Deployer:", deployer);
        console.log("");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // 1. BiddingSystem
        console.log("[1/4] BiddingSystem - Admin setter events");
        BiddingSystem biddingImpl = new BiddingSystem();
        BiddingSystem(payable(BIDDING_SYSTEM_PROXY)).upgradeToAndCall(address(biddingImpl), "");
        console.log("    Implementation:", address(biddingImpl));
        results.push(UpgradeResult("BiddingSystem", BIDDING_SYSTEM_PROXY, address(biddingImpl)));
        
        // 2. AgenticCommerceV9
        console.log("[2/4] AgenticCommerceV9 - Custom errors");
        AgenticCommerceV9 commerceImpl = new AgenticCommerceV9();
        AgenticCommerceV9(AGENTIC_COMMERCE_PROXY).upgradeToAndCall(address(commerceImpl), "");
        console.log("    Implementation:", address(commerceImpl));
        results.push(UpgradeResult("AgenticCommerceV9", AGENTIC_COMMERCE_PROXY, address(commerceImpl)));
        
        // 3. AgentReviewV5
        console.log("[3/4] AgentReviewV5 - Custom error");
        AgentReviewV5 reviewImpl = new AgentReviewV5();
        AgentReviewV5(payable(AGENT_REVIEW_PROXY)).upgradeToAndCall(address(reviewImpl), "");
        console.log("    Implementation:", address(reviewImpl));
        results.push(UpgradeResult("AgentReviewV5", AGENT_REVIEW_PROXY, address(reviewImpl)));
        
        // 4. ServiceRegistryV2
        console.log("[4/4] ServiceRegistryV2 - Custom error");
        ServiceRegistryV2 serviceImpl = new ServiceRegistryV2();
        ServiceRegistryV2(SERVICE_REGISTRY_PROXY).upgradeToAndCall(address(serviceImpl), "");
        console.log("    Implementation:", address(serviceImpl));
        results.push(UpgradeResult("ServiceRegistryV2", SERVICE_REGISTRY_PROXY, address(serviceImpl)));
        
        vm.stopBroadcast();
        
        console.log("");
        console.log("==========================================================");
        console.log("  ALL UPGRADES COMPLETE");
        console.log("==========================================================");
        console.log("");
        
        for (uint256 i = 0; i < results.length; i++) {
            console.log(string.concat(results[i].name, " Proxy: "), results[i].proxy);
            console.log(string.concat(results[i].name, " Impl:  "), results[i].newImpl);
            console.log("");
        }
        
        console.log("==========================================================");
        console.log("  ETHERSCAN VERIFICATION COMMANDS");
        console.log("==========================================================");
        console.log("");
        console.log(string.concat("forge verify-contract ", vm.toString(results[0].newImpl), " contracts/shared/BiddingSystem.sol:BiddingSystem --chain 11155111 --etherscan-api-key $ETHERSCAN_API_KEY"));
        console.log(string.concat("forge verify-contract ", vm.toString(results[1].newImpl), " contracts/shared/AgenticCommerceV9.sol:AgenticCommerceV9 --chain 11155111 --etherscan-api-key $ETHERSCAN_API_KEY"));
        console.log(string.concat("forge verify-contract ", vm.toString(results[2].newImpl), " contracts/shared/AgentReviewV5.sol:AgentReviewV5 --chain 11155111 --etherscan-api-key $ETHERSCAN_API_KEY"));
        console.log(string.concat("forge verify-contract ", vm.toString(results[3].newImpl), " contracts/shared/ServiceRegistryV2.sol:ServiceRegistryV2 --chain 11155111 --etherscan-api-key $ETHERSCAN_API_KEY"));
    }
}
