// Contract addresses with fallbacks for Sepolia testnet
// Phase 24: MilestoneEscrow deployed (Deployed 2026-04-18)

// CAIP-2 based contract addresses for multi-chain support
// Format: eip155:<chainId> - matching CAIP-2 standard
import { chainIdToCAIP } from '@/lib/caip';

const SEPOLIA_CAIP = chainIdToCAIP(11155111);

// Common address constants
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

// Contracts deployed on Sepolia (currently only chain with deployments)
const sepoliaContracts = {
  // Official ERC-8004 Registries
  erc8004Registry: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
  erc8004Reputation: '0x8004B663056A597Dffe9eCcC1965A193B7388713',
  adminRegistry: '0xC81C864CEAb6231ad764cf9867e031D8b6dee41d', // Phase 29e: UUPS proxy with Pashov fixes

  // SkillRegistry V2 - Uses ownerOf() instead of getAgent()
  skillRegistry: '0xA84684261558f342d6871DD2CFef90A2117Aa20A',
  skillRegistryImpl: '0xbf7283c4d141ca991dae6c91d29a255e7caff48d', // Current Sepolia implementation
  serviceRegistry: '0x62E1eeEa1A2Ab987004F35bDA430457Ed6077201',
  serviceRegistryImpl: '0xe2000Ec87D00980EE912F35fefE2D365DA402BCA', // Phase 42: native-token service listings
    // Phase 29: V9 - Multi-token configurable minimum budgets
  agenticCommerce: '0x3a1Bc03cC84040A282F6bf238b917D8351499239',
  agenticCommerceImpl: '0x3b8b4A6d3cc93D5081a286aCC7EcD4f01086c928', // Phase 38: governance slash
  // Phase 11: BiddingSystem - Standalone commit-reveal bidding
  biddingSystem: '0x4D7F38C6A9DE5De44A7B789962B7A2B06bFE8fd6',
  biddingSystemImpl: '0xde7F38E29D3c2dBDff02984BAaB5a658F0acC96a', // Phase 40: ERC-20 payment token support
  commitReveal: '0x85F193670fCb7B0c97D55E70Bf2a950b1065Fb3a',
  commitRevealImpl: '0x85ac5fd55de6f19e95bed33991f11659a92dbbd2', // Current Sepolia implementation
  slashManager: '0x1B8373cDF4f2eD740c3478e0129f0B8494CE4Fa3',
  slashManagerImpl: '0x8754Abeba49B6688dA132552b9f183FbC7acdc58', // Phase 38: retarget to commerce

  // Phase 29: MilestoneEscrowV2 - Per-token arbiter fees + USDC staking
  milestoneEscrow: '0xc89D63057288092012c5D3cEF66121C1F8449a9f',
  milestoneEscrowImpl: '0x8F9Bae14966Af0BceE5c291A764cE3503f9D49F3', // Phase 34: isolated milestone custody

  // Phase 29: PriceOracleV2 - UUPS upgradeable per-token feeds
  priceOracle: '0x29c27a26DD2F80f840cb4D7B5E53b7db3D67143d',
  priceOracleImpl: '0x7Bad7cc9754814246814299ca50041a939a244b1', // Phase 30: L-03 ETH feed

  // Tokens
  usdc: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
};

const emptyChainContracts = {
  erc8004Registry: undefined,
  erc8004Reputation: undefined,
  adminRegistry: undefined,
  skillRegistry: undefined,
  skillRegistryImpl: undefined,
  serviceRegistry: undefined,
  serviceRegistryImpl: undefined,
  agenticCommerce: undefined,
  agenticCommerceImpl: undefined,
  biddingSystem: undefined,
  biddingSystemImpl: undefined,
  priceOracle: undefined,
  priceOracleImpl: undefined,
  commitReveal: undefined,
  commitRevealImpl: undefined,
  slashManager: undefined,
  slashManagerImpl: undefined,
  milestoneEscrow: undefined,
  milestoneEscrowImpl: undefined,
  usdc: undefined,
};

export interface ChainContracts {
  erc8004Registry?: `0x${string}`;
  erc8004Reputation?: `0x${string}`;
  adminRegistry?: `0x${string}`;
  skillRegistry?: `0x${string}`;
  skillRegistryImpl?: `0x${string}`;
  serviceRegistry?: `0x${string}`;
  serviceRegistryImpl?: `0x${string}`;
  agenticCommerce?: `0x${string}`;
  agenticCommerceImpl?: `0x${string}`;
  biddingSystem?: `0x${string}`;
  biddingSystemImpl?: `0x${string}`;
  priceOracle?: `0x${string}`;
  priceOracleImpl?: `0x${string}`;
  commitReveal?: `0x${string}`;
  commitRevealImpl?: `0x${string}`;
  slashManager?: `0x${string}`;
  slashManagerImpl?: `0x${string}`;
  milestoneEscrow?: `0x${string}`;
  milestoneEscrowImpl?: `0x${string}`;
  usdc?: `0x${string}`;
}

// CAIP-keyed contract map for multi-chain support
const CONTRACTS_BY_CHAIN: Record<string, ChainContracts | undefined> = {
  [SEPOLIA_CAIP]: sepoliaContracts as ChainContracts,
  // Future chains - ready for deployment
  'eip155:1': emptyChainContracts as ChainContracts,
  'eip155:8453': emptyChainContracts as ChainContracts,
  'eip155:42161': emptyChainContracts as ChainContracts,
  'eip155:10': emptyChainContracts as ChainContracts,
  'eip155:42220': emptyChainContracts as ChainContracts,
  'eip155:137': emptyChainContracts as ChainContracts,
  'eip155:56': emptyChainContracts as ChainContracts,
  'eip155:534352': emptyChainContracts as ChainContracts,
  'eip155:59144': emptyChainContracts as ChainContracts,
  'eip155:100': emptyChainContracts as ChainContracts,
  'eip155:143': emptyChainContracts as ChainContracts,
  'eip155:4326': emptyChainContracts as ChainContracts,
  'eip155:2741': emptyChainContracts as ChainContracts,
  'eip155:2345': emptyChainContracts as ChainContracts,
  'eip155:167000': emptyChainContracts as ChainContracts,
  'eip155:1868': emptyChainContracts as ChainContracts,
  'eip155:196': emptyChainContracts as ChainContracts,
  'eip155:5000': emptyChainContracts as ChainContracts,
  'eip155:360': emptyChainContracts as ChainContracts,
  'eip155:1088': emptyChainContracts as ChainContracts,
  'eip155:1187947933': emptyChainContracts as ChainContracts,
};

// Helper to get contracts for a chain
export function getContractsByCAIP(caip: string): ChainContracts | undefined {
  return CONTRACTS_BY_CHAIN[caip];
}

// Legacy CONTRACT_ADDRESSES (backward compatibility)
export const CONTRACT_ADDRESSES = {
  sepolia: {
    // Official ERC-8004 Registries
    erc8004Registry: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
    erc8004Reputation: '0x8004B663056A597Dffe9eCcC1965A193B7388713',
    adminRegistry: '0xC81C864CEAb6231ad764cf9867e031D8b6dee41d', // Phase 29e: UUPS proxy with Pashov fixes

    // SkillRegistry V2 - Uses ownerOf() instead of getAgent()
    skillRegistry: '0xA84684261558f342d6871DD2CFef90A2117Aa20A',
    skillRegistryImpl: '0xbf7283c4d141ca991dae6c91d29a255e7caff48d', // Current Sepolia implementation
    serviceRegistry: '0x62E1eeEa1A2Ab987004F35bDA430457Ed6077201',
  serviceRegistryImpl: '0xe2000Ec87D00980EE912F35fefE2D365DA402BCA', // Phase 42: native-token service listings
  // Phase 29: V9 - Multi-token configurable minimum budgets
  agenticCommerce: '0x3a1Bc03cC84040A282F6bf238b917D8351499239',
  agenticCommerceImpl: '0x3b8b4A6d3cc93D5081a286aCC7EcD4f01086c928', // Phase 38: governance slash
    // Phase 11: BiddingSystem - Standalone commit-reveal bidding
  biddingSystem: '0x4D7F38C6A9DE5De44A7B789962B7A2B06bFE8fd6',
  biddingSystemImpl: '0xde7F38E29D3c2dBDff02984BAaB5a658F0acC96a', // Phase 40: ERC-20 payment token support
    commitReveal: '0x85F193670fCb7B0c97D55E70Bf2a950b1065Fb3a',
  commitRevealImpl: '0x85ac5fd55de6f19e95bed33991f11659a92dbbd2', // Current Sepolia implementation
    slashManager: '0x1B8373cDF4f2eD740c3478e0129f0B8494CE4Fa3',
  slashManagerImpl: '0x8754Abeba49B6688dA132552b9f183FbC7acdc58', // Phase 38: retarget to commerce

    // Phase 29: MilestoneEscrowV2 - Per-token arbiter fees + USDC staking
    milestoneEscrow: '0xc89D63057288092012c5D3cEF66121C1F8449a9f',
  milestoneEscrowImpl: '0x8F9Bae14966Af0BceE5c291A764cE3503f9D49F3', // Phase 34: isolated milestone custody

    // Phase 29: PriceOracleV2 - UUPS upgradeable per-token feeds
    priceOracle: '0x29c27a26DD2F80f840cb4D7B5E53b7db3D67143d',
  priceOracleImpl: '0x7Bad7cc9754814246814299ca50041a939a244b1', // Phase 30: L-03 ETH feed

    // Tokens
    usdc: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
  },
} as const;

// Chainlink Price Feeds (Sepolia) - Standard addresses
export const CHAINLINK_PRICE_FEEDS = {
  sepolia: {
    ethUsd: '0x694AA1769357215DE4FAC081bf1f309aDC325306',
  },
} as const;

// Env var names for contract addresses - centralized reference
const CONTRACT_ENV_VARS = {
  ERC8004_REGISTRY: 'NEXT_PUBLIC_8004_REGISTRY_ADDRESS',
  ERC8004_REPUTATION: 'NEXT_PUBLIC_8004_REPUTATION_ADDRESS',
  SKILL_REGISTRY: 'NEXT_PUBLIC_SKILL_REGISTRY_ADDRESS',
  SERVICE_REGISTRY: 'NEXT_PUBLIC_SERVICE_REGISTRY_ADDRESS',
  AGENTIC_COMMERCE: 'NEXT_PUBLIC_AGENTIC_COMMERCE_ADDRESS',
  BIDDING_SYSTEM: 'NEXT_PUBLIC_BIDDING_SYSTEM_ADDRESS',
  ADMIN_REGISTRY: 'NEXT_PUBLIC_ADMIN_REGISTRY_ADDRESS',
  PRICE_ORACLE: 'NEXT_PUBLIC_PRICE_ORACLE_ADDRESS',
  COMMIT_REVEAL: 'NEXT_PUBLIC_COMMIT_REVEAL_ADDRESS',
  SLASH_MANAGER: 'NEXT_PUBLIC_SLASH_MANAGER_ADDRESS',
  MILESTONE_ESCROW: 'NEXT_PUBLIC_MILESTONE_ESCROW_ADDRESS',
  USDC: 'NEXT_PUBLIC_USDC_ADDRESS',
} as const;

// Map env vars to their fallback addresses
const ENV_TO_FALLBACK: Record<keyof typeof CONTRACT_ENV_VARS, string> = {
  ERC8004_REGISTRY: CONTRACT_ADDRESSES.sepolia.erc8004Registry,
  ERC8004_REPUTATION: CONTRACT_ADDRESSES.sepolia.erc8004Reputation,
  SKILL_REGISTRY: CONTRACT_ADDRESSES.sepolia.skillRegistry,
  SERVICE_REGISTRY: CONTRACT_ADDRESSES.sepolia.serviceRegistry,
  AGENTIC_COMMERCE: CONTRACT_ADDRESSES.sepolia.agenticCommerce,
  BIDDING_SYSTEM: CONTRACT_ADDRESSES.sepolia.biddingSystem,
  ADMIN_REGISTRY: CONTRACT_ADDRESSES.sepolia.adminRegistry, // Phase 29e: UUPS proxy with Pashov fixes
  PRICE_ORACLE: CONTRACT_ADDRESSES.sepolia.priceOracle,
  COMMIT_REVEAL: CONTRACT_ADDRESSES.sepolia.commitReveal,
  SLASH_MANAGER: CONTRACT_ADDRESSES.sepolia.slashManager,
  MILESTONE_ESCROW: CONTRACT_ADDRESSES.sepolia.milestoneEscrow, // Phase 29: UUPS proxy
  USDC: CONTRACT_ADDRESSES.sepolia.usdc,
};

// Centralized function to get contract address with fallback
export function getContractAddress(key: keyof typeof CONTRACT_ENV_VARS): `0x${string}`;
export function getContractAddress(
  envVar: string | undefined,
  fallbackAddress: string
): `0x${string}`;
export function getContractAddress(
  keyOrEnvVar: keyof typeof CONTRACT_ENV_VARS | string | undefined,
  fallbackOrKey?: string
): `0x${string}` {
  // New signature: getContractAddress('ERC8004_REGISTRY')
  if (typeof keyOrEnvVar === 'string' && Object.keys(CONTRACT_ENV_VARS).includes(keyOrEnvVar)) {
    const key = keyOrEnvVar as keyof typeof CONTRACT_ENV_VARS;
    const envVar = CONTRACT_ENV_VARS[key];
    const fallback = ENV_TO_FALLBACK[key];
    return (process.env[envVar] || fallback) as `0x${string}`;
  }

  // Legacy signature: getContractAddress(process.env.X, fallbackAddress)
  return (keyOrEnvVar || fallbackOrKey) as `0x${string}`;
}

// Re-export debug utilities from lib/debug.ts for backward compatibility
export { debugLog, debugError, isDebugEnabled, enableDebug, disableDebug } from '@/lib/debug';

// Default starting block for event queries on Sepolia (deployed contracts)
export const DEFAULT_FROM_BLOCK = BigInt(9989393);
