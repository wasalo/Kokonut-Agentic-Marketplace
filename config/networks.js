"use strict";
/**
 * Shared network configuration
 * Centralized source of truth for network settings and contract addresses
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_NETWORK = exports.NETWORKS = void 0;
exports.getNetwork = getNetwork;
exports.getContracts = getContracts;
exports.getRpcUrl = getRpcUrl;
exports.NETWORKS = {
    sepolia: {
        chainId: 11155111,
        name: 'Sepolia',
        rpcUrl: 'https://ethereum-sepolia.publicnode.com',
        contracts: {
            identityRegistry: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
            reputationRegistry: '0x8004B663056A597Dffe9eCcC1965A193B7388713',
            skillRegistry: '0xA84684261558f342d6871DD2CFef90A2117Aa20A', // AgentSkillRegistryV2 Proxy
            serviceRegistry: '0x62E1eeEa1A2Ab987004F35bDA430457Ed6077201', // ServiceRegistryV2 Proxy
            agentReview: '0x5CDb592Fd37749bF87448FBf5725D1Cd986dd1Cb', // AgentReviewV5 Proxy
            agenticCommerce: '0x948d97EA7F0c49796fB576ADff375C900627568E', // AgenticCommerceV6.1 Proxy
            biddingSystem: '0x32c9d069a248a619d3EAc4D1FC76F2639AaBeF04', // BiddingSystem Proxy
            priceOracle: '0x5C4AC3dAF76708DCd51911BA3B33027eAB1B4047',
            commitReveal: '0x6CEd1574A3dF7ec646e43DD8408300117c453Aa3',
            slashManager: '0x7Cf955900FD7a12680E90D834eAf19346f5DBcf9',
            milestoneEscrow: '0xf24eDD2d8e99c80d40e959b1F37636b6C04FF9A9', // Phase 24
            usdc: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
        },
    },
    mainnet: {
        chainId: 1,
        name: 'Ethereum Mainnet',
        rpcUrl: 'https://ethereum.publicnode.com',
        contracts: {
            // Mainnet addresses to be added when deployed
            identityRegistry: '',
            reputationRegistry: '',
            skillRegistry: '',
            serviceRegistry: '',
            agentReview: '',
            agenticCommerce: '',
            biddingSystem: '',
            priceOracle: '',
            commitReveal: '',
            slashManager: '',
            usdc: '0xA0b86a33E6441e0A421e56C6a4C8F0E1d6F302d1', // Mainnet USDC
        },
    },
};
/**
 * Get network configuration by name
 * @param name Network name (sepolia, mainnet, etc.)
 * @returns Network configuration
 */
function getNetwork(name) {
    return exports.NETWORKS[name];
}
/**
 * Get contract addresses for a network
 * @param name Network name
 * @returns Contract addresses
 */
function getContracts(name) {
    return exports.NETWORKS[name].contracts;
}
/**
 * Get RPC URL for a network
 * @param name Network name
 * @returns RPC URL
 */
function getRpcUrl(name) {
    return exports.NETWORKS[name].rpcUrl;
}
/**
 * Default network for development
 */
exports.DEFAULT_NETWORK = 'sepolia';
