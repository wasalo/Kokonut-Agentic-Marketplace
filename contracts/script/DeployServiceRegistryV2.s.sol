// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../shared/ServiceRegistryV2.sol";

/**
 * @title DeployServiceRegistryV2
 * @dev Deployment script for ServiceRegistryV2 with UUPS proxy pattern
 * 
 * Usage:
 *   forge script script/DeployServiceRegistryV2.s.sol --rpc-url sepolia --broadcast --verify
 * 
 * Environment Variables:
 *   - IDENTITY_REGISTRY: Address of ERC-8004 IdentityRegistry (default: 0x8004A818BFB912233c491871b3d84c89A494BD9e)
 *   - PRIVATE_KEY: Deployer private key
 *   - ETHERSCAN_API_KEY: For verification (optional)
 */
contract DeployServiceRegistryV2 is Script {
    
    // Default Sepolia addresses
    address constant DEFAULT_IDENTITY_REGISTRY = 0x8004A818BFB912233c491871b3d84c89A494BD9e;
    
    function run() external {
        // Get configuration from environment or use defaults
        address identityRegistry = vm.envOr("IDENTITY_REGISTRY", DEFAULT_IDENTITY_REGISTRY);
        
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying ServiceRegistryV2...");
        console.log("Deployer:", deployer);
        console.log("IdentityRegistry:", identityRegistry);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // 1. Deploy implementation contract
        ServiceRegistryV2 implementation = new ServiceRegistryV2();
        console.log("Implementation deployed at:", address(implementation));
        
        // 2. Encode initialization data
        bytes memory initData = abi.encodeWithSelector(
            ServiceRegistryV2.initialize.selector,
            identityRegistry
        );
        
        // 3. Deploy proxy
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(implementation),
            initData
        );
        console.log("Proxy deployed at:", address(proxy));
        
        // 4. Create interface to proxy for verification
        ServiceRegistryV2 registry = ServiceRegistryV2(address(proxy));
        
        // Verify initialization
        address storedRegistry = address(registry.identityRegistry());
        console.log("IdentityRegistry set to:", storedRegistry);
        require(storedRegistry == identityRegistry, "Initialization failed");
        
        console.log("Owner:", registry.owner());
        
        vm.stopBroadcast();
        
        console.log("\n=== DEPLOYMENT COMPLETE ===");
        console.log("Proxy Address (USE THIS):", address(proxy));
        console.log("Implementation Address:", address(implementation));
        console.log("");
        console.log("NEXT STEPS:");
        console.log("1. Update AgenticCommerce with new ServiceRegistry:");
        console.log("   - Call setServiceRegistry(", address(proxy), ")");
        console.log("   - On AgenticCommerce at: 0x8E5AD4C87262A1d758E12702DE830f83d1e8D4b5");
        console.log("");
        console.log("2. Update CommitReveal with new ServiceRegistry:");
        console.log("   - Call updateServiceRegistry(", address(proxy), ")");
        console.log("   - On CommitReveal at: 0x6CEd1574A3dF7ec646e43DD8408300117c453Aa3");
        console.log("");
        console.log("3. Update frontend config:");
        console.log("   - Set SERVICE_REGISTRY_ADDRESS=", address(proxy));
    }
}
