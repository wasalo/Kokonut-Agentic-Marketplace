// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../shared/AgentSkillRegistryV2.sol";

/**
 * @title DeployAgentSkillRegistryV2
 * @dev Deployment script for AgentSkillRegistryV2 with UUPS proxy pattern
 * 
 * FIXED: Uses IERC721.ownerOf() instead of non-existent getAgent()
 * This fixes the "reason unknown" revert when registering skills.
 * 
 * Usage:
 *   forge script script/DeployAgentSkillRegistryV2.s.sol --rpc-url sepolia --broadcast --verify
 * 
 * Environment Variables:
 *   - IDENTITY_REGISTRY: Address of ERC-8004 IdentityRegistry (default: 0x8004A818BFB912233c491871b3d84c89A494BD9e)
 *   - PRIVATE_KEY: Deployer private key
 *   - ETHERSCAN_API_KEY: For verification (optional)
 */
contract DeployAgentSkillRegistryV2 is Script {
    
    // Default Sepolia addresses
    address constant DEFAULT_IDENTITY_REGISTRY = 0x8004A818BFB912233c491871b3d84c89A494BD9e;
    
    function run() external {
        // Get configuration from environment or use defaults
        address identityRegistry = vm.envOr("IDENTITY_REGISTRY", DEFAULT_IDENTITY_REGISTRY);
        
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("========================================");
        console.log("Deploying AgentSkillRegistryV2...");
        console.log("========================================");
        console.log("Deployer:", deployer);
        console.log("IdentityRegistry:", identityRegistry);
        console.log("");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // 1. Deploy implementation contract
        AgentSkillRegistryV2 implementation = new AgentSkillRegistryV2();
        console.log("Implementation deployed at:", address(implementation));
        
        // 2. Encode initialization data
        bytes memory initData = abi.encodeWithSelector(
            AgentSkillRegistryV2.initialize.selector,
            identityRegistry
        );
        
        // 3. Deploy proxy
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(implementation),
            initData
        );
        console.log("Proxy deployed at:", address(proxy));
        
        // 4. Create interface to proxy for verification
        AgentSkillRegistryV2 registry = AgentSkillRegistryV2(address(proxy));
        
        // Verify initialization
        address storedRegistry = address(registry.identityRegistry());
        console.log("IdentityRegistry set to:", storedRegistry);
        require(storedRegistry == identityRegistry, "Initialization failed");
        
        console.log("Owner:", registry.owner());
        console.log("Total Skills:", registry.getTotalSkillCount());
        
        vm.stopBroadcast();
        
        console.log("");
        console.log("========================================");
        console.log("DEPLOYMENT COMPLETE");
        console.log("========================================");
        console.log("Proxy Address (USE THIS):", address(proxy));
        console.log("Implementation Address:", address(implementation));
        console.log("");
        console.log("NEXT STEPS:");
        console.log("1. Update frontend .env.local:");
        console.log("   NEXT_PUBLIC_SKILL_REGISTRY_ADDRESS=", address(proxy));
        console.log("   NEXT_PUBLIC_SKILL_REGISTRY_IMPL_ADDRESS=", address(implementation));
        console.log("");
        console.log("2. Update contracts/config.ts:");
        console.log("   skillRegistry: '", address(proxy), "'");
        console.log("   skillRegistryImpl: '", address(implementation), "'");
        console.log("");
        console.log("3. Update AGENTS.md with new addresses");
        console.log("");
        console.log("4. Test skill registration at /dashboard/skills");
        console.log("========================================");
    }
}
