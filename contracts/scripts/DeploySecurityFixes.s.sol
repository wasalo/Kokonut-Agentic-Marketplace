// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import {CommitReveal} from "../shared/CommitReveal.sol";
import {SlashManager} from "../shared/SlashManager.sol";
import {ServiceRegistryV2} from "../shared/ServiceRegistryV2.sol";
import {AgentReviewV5} from "../shared/AgentReviewV5.sol";
import {AgenticCommerceV6} from "../shared/AgenticCommerceV6.sol";
import {AgentSkillRegistryV2} from "../shared/AgentSkillRegistryV2.sol";

/**
 * @title DeploySecurityFixes
 * @dev Deployment script for April 2026 security fixes
 * 
 * Run:
 *   forge script scripts/DeploySecurityFixes.s.sol:DeploySecurityFixes \
 *     --rpc-url $SEPOLIA_RPC_URL \
 *     --private-key $PRIVATE_KEY \
 *     --broadcast
 */
contract DeploySecurityFixes is Script {
    address constant SIGNER_1 = 0x0ea26051F7657d59418da186137141CeA90D0652;
    address constant SIGNER_2 = 0xd58bB7Ae72B5b2FDc980C908baB75013a3628820;
    address constant SIGNER_3 = 0xF7E75e58Dfa8CE8f278444523d8564992F5E5322;
    address constant EXISTING_SERVICE_REGISTRY = 0x62E1eeEa1A2Ab987004F35bDA430457Ed6077201;
    address constant ERC8004_IDENTITY = 0x8004A818BFB912233c491871b3d84c89A494BD9e;
    
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address owner = vm.addr(pk);
        
        console.log("Deploying April 2026 Security Fixes...");
        console.log("Owner:", owner);
        
        vm.startBroadcast(pk);
        
        // 1. Deploy CommitReveal
        _deployCommitReveal(owner);
        
        // 2. Deploy SlashManager
        _deploySlashManager(owner);
        
        // 3. Deploy ServiceRegistryV2
        _deployServiceRegistryV2(owner);
        
        // 4. Deploy AgentReviewV5
        address arProxy = _deployAgentReviewV5(owner);
        
        // 5. Deploy AgenticCommerceV6
        _deployAgenticCommerceV6(owner);
        
        vm.stopBroadcast();
        
        console.log("");
        console.log("Deployment complete!");
    }
    
    function _deployCommitReveal(address owner) internal {
        CommitReveal impl = new CommitReveal();
        bytes memory init = abi.encodeCall(CommitReveal.initialize, (EXISTING_SERVICE_REGISTRY, owner));
        TransparentUpgradeableProxy proxy = new TransparentUpgradeableProxy(address(impl), owner, init);
        console.log("CommitReveal:", address(proxy));
    }
    
    function _deploySlashManager(address owner) internal {
        SlashManager impl = new SlashManager();
        address[] memory signers = new address[](3);
        signers[0] = SIGNER_1;
        signers[1] = SIGNER_2;
        signers[2] = SIGNER_3;
        bytes memory init = abi.encodeCall(SlashManager.initialize, (owner, signers));
        TransparentUpgradeableProxy proxy = new TransparentUpgradeableProxy(address(impl), owner, init);
        console.log("SlashManager:", address(proxy));
    }
    
    function _deployServiceRegistryV2(address owner) internal {
        ServiceRegistryV2 impl = new ServiceRegistryV2();
        bytes memory init = abi.encodeCall(ServiceRegistryV2.initialize, (ERC8004_IDENTITY, owner));
        TransparentUpgradeableProxy proxy = new TransparentUpgradeableProxy(address(impl), owner, init);
        console.log("ServiceRegistryV2:", address(proxy));
    }
    
    function _deployAgentReviewV5(address owner) internal returns (address) {
        AgentReviewV5 impl = new AgentReviewV5();
        bytes memory init = abi.encodeCall(AgentReviewV5.initialize, (owner));
        TransparentUpgradeableProxy proxy = new TransparentUpgradeableProxy(address(impl), owner, init);
        console.log("AgentReviewV5:", address(proxy));
        return address(proxy);
    }
    
    function _deployAgenticCommerceV6(address owner) internal {
        AgenticCommerceV6 impl = new AgenticCommerceV6();
        address treasury = vm.envAddress("TREASURY_ADDRESS");
        bytes memory init = abi.encodeCall(AgenticCommerceV6.initialize, (treasury, owner));
        TransparentUpgradeableProxy proxy = new TransparentUpgradeableProxy(address(impl), owner, init);
        console.log("AgenticCommerceV6:", address(proxy));
        console.log("Treasury:", treasury);
    }
}

/**
 * @title UpgradeExistingContracts
 * @dev Upgrade existing contracts with security fixes
 * 
 * Run:
 *   forge script scripts/DeploySecurityFixes.s.sol:UpgradeExistingContracts \
 *     --rpc-url $SEPOLIA_RPC_URL \
 *     --private-key $PROXY_OWNER_KEY \
 *     --broadcast
 */
contract UpgradeExistingContracts is Script {
    address payable constant EXISTING_SERVICE_REGISTRY = payable(0x62E1eeEa1A2Ab987004F35bDA430457Ed6077201);
    address payable constant EXISTING_AGENT_REVIEW = payable(0x5CDb592Fd37749bF87448FBf5725D1Cd986dd1Cb);
    address payable constant EXISTING_AGENTIC_COMMERCE = payable(0x948d97EA7F0c49796fB576ADff375C900627568E);
    
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        
        console.log("Upgrading existing contracts...");
        
        vm.startBroadcast(pk);
        
        // Upgrade ServiceRegistryV2
        ServiceRegistryV2 newSrImpl = new ServiceRegistryV2();
        ServiceRegistryV2(EXISTING_SERVICE_REGISTRY).upgradeToAndCall(address(newSrImpl), "");
        console.log("ServiceRegistryV2 upgraded:", address(newSrImpl));
        
        // Upgrade AgentReviewV5
        AgentReviewV5 newArImpl = new AgentReviewV5();
        AgentReviewV5(EXISTING_AGENT_REVIEW).upgradeToAndCall(address(newArImpl), "");
        console.log("AgentReviewV5 upgraded:", address(newArImpl));
        
        // Upgrade AgenticCommerceV6
        AgenticCommerceV6 newAcImpl = new AgenticCommerceV6();
        AgenticCommerceV6(EXISTING_AGENTIC_COMMERCE).upgradeToAndCall(address(newAcImpl), "");
        console.log("AgenticCommerceV6 upgraded:", address(newAcImpl));
        
        vm.stopBroadcast();
        
        console.log("Upgrades complete!");
    }
}

/**
 * @title DeploySlashManagerOnly
 * @dev Deploy only new SlashManager contract
 * 
 * Run:
 *   forge script scripts/DeploySecurityFixes.s.sol:DeploySlashManagerOnly \
 *     --rpc-url $SEPOLIA_RPC_URL \
 *     --private-key $PRIVATE_KEY \
 *     --broadcast
 */
contract DeploySlashManagerOnly is Script {
    address constant SIGNER_1 = 0x0ea26051F7657d59418da186137141CeA90D0652;
    address constant SIGNER_2 = 0xd58bB7Ae72B5b2FDc980C908baB75013a3628820;
    address constant SIGNER_3 = 0xF7E75e58Dfa8CE8f278444523d8564992F5E5322;
    
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address owner = vm.addr(pk);
        
        console.log("Deploying SlashManager...");
        
        vm.startBroadcast(pk);
        
        SlashManager impl = new SlashManager();
        address[] memory signers = new address[](3);
        signers[0] = SIGNER_1;
        signers[1] = SIGNER_2;
        signers[2] = SIGNER_3;
        
        bytes memory init = abi.encodeCall(SlashManager.initialize, (owner, signers));
        TransparentUpgradeableProxy proxy = new TransparentUpgradeableProxy(address(impl), owner, init);
        
        vm.stopBroadcast();
        
        console.log("SlashManager deployed:", address(proxy));
    }
}

/**
 * @title DeployCommitRevealOnly
 * @dev Deploy only new CommitReveal contract
 * 
 * Run:
 *   forge script scripts/DeploySecurityFixes.s.sol:DeployCommitRevealOnly \
 *     --rpc-url $SEPOLIA_RPC_URL \
 *     --private-key $PRIVATE_KEY \
 *     --broadcast
 */
contract DeployCommitRevealOnly is Script {
    address constant EXISTING_SERVICE_REGISTRY = 0x62E1eeEa1A2Ab987004F35bDA430457Ed6077201;
    
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address owner = vm.addr(pk);
        
        console.log("Deploying CommitReveal...");
        
        vm.startBroadcast(pk);
        
        CommitReveal impl = new CommitReveal();
        bytes memory init = abi.encodeCall(CommitReveal.initialize, (EXISTING_SERVICE_REGISTRY, owner));
        TransparentUpgradeableProxy proxy = new TransparentUpgradeableProxy(address(impl), owner, init);
        
        vm.stopBroadcast();
        
        console.log("CommitReveal deployed:", address(proxy));
    }
}

/**
 * @title UpgradePhase14
 * @dev Upgrade Phase 14 fixes
 * 
 * Phase 14 fixes:
 * - M5: AgenticCommerceV6 - permissionless refundExpired()
 * - M5: AgentReviewV5 - finalizeDecision() permissionless fallback (7 day grace)
 * - M5: SlashManager - allow owner AND signers to create proposals
 * - M1: AgentSkillRegistryV2 - O(1) domain lookup via domain->skills mapping
 * 
 * Run:
 *   forge script scripts/DeploySecurityFixes.s.sol:UpgradePhase14 \
 *     --rpc-url $SEPOLIA_RPC_URL \
 *     --private-key $PRIVATE_KEY \
 *     --broadcast
 */
contract UpgradePhase14 is Script {
    address payable constant EXISTING_AGENTIC_COMMERCE = payable(0x948d97EA7F0c49796fB576ADff375C900627568E);
    address payable constant EXISTING_AGENT_REVIEW = payable(0x5CDb592Fd37749bF87448FBf5725D1Cd986dd1Cb);
    address payable constant EXISTING_SLASH_MANAGER = payable(0x1B8373cDF4f2eD740c3478e0129f0B8494CE4Fa3);
    address payable constant EXISTING_SKILL_REGISTRY = payable(0xA84684261558f342d6871DD2CFef90A2117Aa20A);
    
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        
        console.log("Upgrading Phase 14 fixes...");
        
        vm.startBroadcast(pk);
        
        // Upgrade AgenticCommerceV6 (refundExpired)
        AgenticCommerceV6 newAcImpl = new AgenticCommerceV6();
        AgenticCommerceV6(EXISTING_AGENTIC_COMMERCE).upgradeToAndCall(address(newAcImpl), "");
        console.log("AgenticCommerceV6 upgraded:", address(newAcImpl));
        
        // Upgrade AgentReviewV5 (finalizeDecision)
        AgentReviewV5 newArImpl = new AgentReviewV5();
        AgentReviewV5(EXISTING_AGENT_REVIEW).upgradeToAndCall(address(newArImpl), "");
        console.log("AgentReviewV5 upgraded:", address(newArImpl));
        
        // Upgrade SlashManager (signer-based proposal creation)
        SlashManager newSmImpl = new SlashManager();
        SlashManager(EXISTING_SLASH_MANAGER).upgradeToAndCall(address(newSmImpl), "");
        console.log("SlashManager upgraded:", address(newSmImpl));
        
        // Upgrade AgentSkillRegistryV2 (O(1) domain lookup)
        AgentSkillRegistryV2 newSrImpl = new AgentSkillRegistryV2();
        AgentSkillRegistryV2(EXISTING_SKILL_REGISTRY).upgradeToAndCall(address(newSrImpl), "");
        console.log("AgentSkillRegistryV2 upgraded:", address(newSrImpl));
        
        vm.stopBroadcast();
        
        console.log("Phase 14 upgrades complete!");
    }
}
