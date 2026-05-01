// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../shared/AgenticCommerceV9.sol";
import "../shared/MilestoneEscrowV2.sol";
import "../shared/PriceOracleV2.sol";

/**
 * @title DeployV9
 * @dev Deployment script for AgenticCommerceV9, MilestoneEscrowV2, and PriceOracleV2
 * 
 * Run: forge script script/DeployV9.s.sol:DeployV9 --rpc-url <RPC> --private-key <PK> --broadcast
 */
contract DeployV9 is Script {
    
    // Sepolia addresses (update as needed)
    address constant USDC = 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238;
    address constant USDT = 0x716B02447b52Eab450e31bD77103B41bC2c7bE0b; // Sepolia USDT (verify)
    
    // Admin
    address constant TREASURY = 0x3394C45b5938127EB56603A6051dF26CFAF08C26;
    address constant ADMIN_REGISTRY = 0xC81C864CEAb6231ad764cf9867e031D8b6dee41d; // Phase 29e UUPS proxy
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deployer:", deployer);
        console.log("Network:", block.chainid);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // ============================================
        // 1. Deploy PriceOracleV2 (UUPS)
        // ============================================
        console.log("\n=== Deploying PriceOracleV2 ===");
        PriceOracleV2 priceOracleImpl = new PriceOracleV2();
        console.log("PriceOracleV2 Implementation:", address(priceOracleImpl));
        
        ERC1967Proxy priceOracleProxy = new ERC1967Proxy(
            address(priceOracleImpl),
            abi.encodeWithSelector(PriceOracleV2.initialize.selector, deployer)
        );
        PriceOracleV2 priceOracle = PriceOracleV2(address(priceOracleProxy));
        console.log("PriceOracleV2 Proxy:", address(priceOracle));
        
        // Register feeds for tokens (not ETH)
        // Note: ETH (address(0)) is handled specially, not via price feed
        priceOracle.setPriceFeed(
            USDC,
            0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43, // USDC/USD
            6
        );
        
        // Mark stablecoins
        priceOracle.setStablecoin(USDC, true);
        if (USDT != address(0)) {
            priceOracle.setStablecoin(USDT, true);
        }
        
        console.log("Price feeds registered");
        
        // ============================================
        // 2. Deploy AgenticCommerceV9 (UUPS)
        // ============================================
        console.log("\n=== Deploying AgenticCommerceV9 ===");
        AgenticCommerceV9 commerceImpl = new AgenticCommerceV9();
        console.log("AgenticCommerceV9 Implementation:", address(commerceImpl));
        
        ERC1967Proxy commerceProxy = new ERC1967Proxy(
            address(commerceImpl),
            abi.encodeWithSelector(
                AgenticCommerceV9.initialize.selector,
                TREASURY,
                ADMIN_REGISTRY
            )
        );
        AgenticCommerceV9 commerce = AgenticCommerceV9(address(commerceProxy));
        console.log("AgenticCommerceV9 Proxy:", address(commerce));
        
        // Configure tokens
        commerce.setAllowedToken(USDC, true);
        if (USDT != address(0)) {
            commerce.setAllowedToken(USDT, true);
        }
        
        // Mark stablecoins
        commerce.setStablecoin(USDC, true);
        if (USDT != address(0)) {
            commerce.setStablecoin(USDT, true);
        }
        
        // Set minimum budget (default is 5e6 = $5)
        // commerce.setMinBudgetUsd(5e6); // Already default
        
        console.log("AgenticCommerceV9 configured");
        
        // ============================================
        // 3. Deploy MilestoneEscrowV2 (UUPS)
        // ============================================
        console.log("\n=== Deploying MilestoneEscrowV2 ===");
        MilestoneEscrowV2 escrowImpl = new MilestoneEscrowV2();
        console.log("MilestoneEscrowV2 Implementation:", address(escrowImpl));
        
        ERC1967Proxy escrowProxy = new ERC1967Proxy(
            address(escrowImpl),
            abi.encodeWithSelector(
                MilestoneEscrowV2.initialize.selector,
                deployer,
                address(commerce)
            )
        );
        MilestoneEscrowV2 escrow = MilestoneEscrowV2(address(escrowProxy));
        console.log("MilestoneEscrowV2 Proxy:", address(escrow));
        
        // Configure tokens
        escrow.setSupportedToken(USDC, true);
        if (USDT != address(0)) {
            escrow.setSupportedToken(USDT, true);
        }
        escrow.setSupportedToken(address(0), true); // ETH
        
        // Set arbiter fees (in token native units)
        escrow.setArbiterFee(USDC, 1000); // 0.001 USDC (6 decimals)
        if (USDT != address(0)) {
            escrow.setArbiterFee(USDT, 1000); // 0.001 USDT
        }
        escrow.setArbiterFee(address(0), 0.001 ether); // 0.001 ETH
        
        // Set arbiter stakes
        escrow.setArbiterStake(USDC, 10e6); // 10 USDC stake
        if (USDT != address(0)) {
            escrow.setArbiterStake(USDT, 10e6); // 10 USDT stake
        }
        escrow.setArbiterStake(address(0), 0.01 ether); // 0.01 ETH stake
        
        console.log("MilestoneEscrowV2 configured");
        
        vm.stopBroadcast();
        
        // ============================================
        // Summary
        // ============================================
        console.log("\n========================================");
        console.log("DEPLOYMENT COMPLETE");
        console.log("========================================");
        console.log("PriceOracleV2 Proxy:     ", address(priceOracle));
        console.log("AgenticCommerceV9 Proxy: ", address(commerce));
        console.log("MilestoneEscrowV2 Proxy: ", address(escrow));
        console.log("========================================");
        console.log("\nNext steps:");
        console.log("1. Verify contracts on Etherscan");
        console.log("2. Update frontend config with new addresses");
        console.log("3. Test job creation with USDC and USDT");
        console.log("4. Register arbiters with token stakes");
    }
}