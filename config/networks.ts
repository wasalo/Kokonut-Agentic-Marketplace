/**
 * Shared network configuration
 * Centralized source of truth for network settings and contract addresses
 */

export const NETWORKS = {
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
      agenticCommerce: '0x3a1Bc03cC84040A282F6bf238b917D8351499239', // AgenticCommerceV9 Proxy
      biddingSystem: '0x4D7F38C6A9DE5De44A7B789962B7A2B06bFE8fd6', // BiddingSystem Proxy
      priceOracle: '0x29c27a26DD2F80f840cb4D7B5E53b7db3D67143d', // PriceOracleV2 Proxy
      commitReveal: '0x85F193670fCb7B0c97D55E70Bf2a950b1065Fb3a', // CommitReveal Proxy
      slashManager: '0x1B8373cDF4f2eD740c3478e0129f0B8494CE4Fa3', // SlashManager Proxy
      milestoneEscrow: '0xc89D63057288092012c5D3cEF66121C1F8449a9f', // MilestoneEscrowV2 Proxy
      adminRegistry: '0xC81C864CEAb6231ad764cf9867e031D8b6dee41d', // AdminRegistry Phase 29e UUPS proxy
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
} as const;

export type NetworkConfig = (typeof NETWORKS)[keyof typeof NETWORKS];
export type ContractAddresses = NetworkConfig['contracts'];
export type NetworkName = keyof typeof NETWORKS;

/**
 * Get network configuration by name
 * @param name Network name (sepolia, mainnet, etc.)
 * @returns Network configuration
 */
export function getNetwork(name: NetworkName): NetworkConfig {
  return NETWORKS[name];
}

/**
 * Get contract addresses for a network
 * @param name Network name
 * @returns Contract addresses
 */
export function getContracts(name: NetworkName): ContractAddresses {
  return NETWORKS[name].contracts;
}

/**
 * Get RPC URL for a network
 * @param name Network name
 * @returns RPC URL
 */
export function getRpcUrl(name: NetworkName): string {
  return NETWORKS[name].rpcUrl;
}

/**
 * Default network for development
 */
export const DEFAULT_NETWORK: NetworkName = 'sepolia';
