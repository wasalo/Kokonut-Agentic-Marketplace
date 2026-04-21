// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";

/**
 * @title SetAdminRegistry
 * @dev Script to set adminRegistry on ServiceRegistryV2, AgenticCommerceV7, and BiddingSystem
 * 
 * Run:
 *   forge script scripts/SetAdminRegistry.s.sol:SetAdminRegistry \
 *     --rpc-url $SEPOLIA_RPC_URL \
 *     --private-key $PRIVATE_KEY \
 *     --broadcast
 */
contract SetAdminRegistry is Script {
    address constant ADMIN_REGISTRY = 0x8A8E3C9ffB8F25236c8152c8ac634336463f3Ab0;
    
    address constant SERVICE_REGISTRY_V2 = 0x62E1eeEa1A2Ab987004F35bDA430457Ed6077201;
    address constant AGENTIC_COMMERCE_V7 = 0x948d97EA7F0c49796fB576ADff375C900627568E;
    address constant BIDDING_SYSTEM = 0x32c9d069a248a619d3EAc4D1FC76F2639AaBeF04;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address owner = vm.addr(pk);
        
        console.log("Setting adminRegistry on contracts...");
        console.log("Owner:", owner);
        console.log("AdminRegistry:", ADMIN_REGISTRY);
        
        vm.startBroadcast(pk);
        
        // 1. Set adminRegistry on ServiceRegistryV2
        console.log("\n1. Setting adminRegistry on ServiceRegistryV2...");
        (bool successSrv, bytes memory dataSrv) = SERVICE_REGISTRY_V2.call(
            abi.encodeWithSignature("setAdminRegistry(address)", ADMIN_REGISTRY)
        );
        if (successSrv) {
            console.log("[OK] ServiceRegistryV2 adminRegistry set");
        } else {
            console.log("[FAIL] ServiceRegistryV2 failed:", string(dataSrv));
        }
        
        // 2. Set adminRegistry on AgenticCommerceV7
        console.log("\n2. Setting adminRegistry on AgenticCommerceV7...");
        (bool successCom, bytes memory dataCom) = AGENTIC_COMMERCE_V7.call(
            abi.encodeWithSignature("setAdminRegistry(address)", ADMIN_REGISTRY)
        );
        if (successCom) {
            console.log("[OK] AgenticCommerceV7 adminRegistry set");
        } else {
            console.log("[FAIL] AgenticCommerceV7 failed:", string(dataCom));
        }
        
        // 3. Set adminRegistry on BiddingSystem
        console.log("\n3. Setting adminRegistry on BiddingSystem...");
        (bool successBid, bytes memory dataBid) = BIDDING_SYSTEM.call(
            abi.encodeWithSignature("setAdminRegistry(address)", ADMIN_REGISTRY)
        );
        if (successBid) {
            console.log("[OK] BiddingSystem adminRegistry set");
        } else {
            console.log("[FAIL] BiddingSystem failed:", string(dataBid));
        }
        
        vm.stopBroadcast();
        
        console.log("\n=== Complete ===");
    }
}