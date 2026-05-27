// Contract addresses with fallbacks for Sepolia testnet
// Phase 24: MilestoneEscrow deployed (Deployed 2026-04-18)

// CAIP-2 based contract addresses for multi-chain support
// Format: eip155:<chainId> - matching CAIP-2 standard
import { chainIdToCAIP } from '@/lib/caip';

const SEPOLIA_CAIP = chainIdToCAIP(11155111);

// Common address constants
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;
export const MAX_UINT256 = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' as const;

// Runtime validation functions
export function isValidContractAddress(address: string | undefined): address is string {
  if (!address) return false;
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export function validateContractAddress(address: string, name: string): void {
  if (!isValidContractAddress(address)) {
    console.warn(`[Config] Invalid contract address for ${name}: ${address}`);
  }
}

export function validateAllContractAddresses(): void {
  const addresses = getContractAddress('ERC8004_REGISTRY');
  validateContractAddress(addresses, 'ERC8004_REGISTRY');
}

// Contracts deployed on Sepolia (currently only chain with deployments)
const sepoliaContracts = {
  // Official ERC-8004 Registries
  erc8004Registry: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
  erc8004Reputation: '0x8004B663056A597Dffe9eCcC1965A193B7388713',
  adminRegistry: '0xC81C864CEAb6231ad764cf9867e031D8b6dee41d', // Phase 29e: UUPS proxy with Pashov fixes

  // SkillRegistry V2 - Uses ownerOf() instead of getAgent()
  skillRegistry: '0xA84684261558f342d6871DD2CFef90A2117Aa20A',
  skillRegistryImpl: '0x656B6520CE44Bb0Fb08552274Be3a9B11aaa3569', // Phase 14: O(1) domain lookup
  serviceRegistry: '0x62E1eeEa1A2Ab987004F35bDA430457Ed6077201',
  serviceRegistryImpl: '0xe8dEf9ce280ebDf43d8273223C1957747a292e23', // Phase 34c: bond withdrawal + cooldown
    // Phase 29: V9 - Multi-token configurable minimum budgets
  agenticCommerce: '0x3a1Bc03cC84040A282F6bf238b917D8351499239',
  agenticCommerceImpl: '0x5677c6B3133796A6066Bf4bB202edb9D594a022D', // Phase 34c: remove auto bond refund
  // Phase 11: BiddingSystem - Standalone commit-reveal bidding
  biddingSystem: '0x4D7F38C6A9DE5De44A7B789962B7A2B06bFE8fd6',
  biddingSystemImpl: '0x9FfE85CBC78144B1bAd32d2Fd61a1fdc3740f047', // Phase 34: creator stake patch
  agentReview: '0x5CDb592Fd37749bF87448FBf5725D1Cd986dd1Cb', // AgentReviewV5
  agentReviewImpl: '0xb87Af66B11B00E5341990A9f05c934c2e66181fd', // Phase 34: stake/reward patch
  commitReveal: '0x85F193670fCb7B0c97D55E70Bf2a950b1065Fb3a',
  commitRevealImpl: '0x0456fb2B6ef68B9133B22809D48D4f3748bEf87C', // Phase 29f: OZ v5 compat
  slashManager: '0x1B8373cDF4f2eD740c3478e0129f0B8494CE4Fa3',
  slashManagerImpl: '0x865ebF8EaC43FE343985058e56E08aAB4E605214', // Phase 29f: OZ v5 compat

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
  agentReview: undefined,
  agentReviewImpl: undefined,
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
  agentReview?: `0x${string}`;
  agentReviewImpl?: `0x${string}`;
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
export const CONTRACTS_BY_CHAIN: Record<string, ChainContracts | undefined> = {
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

export function getContractsByChainId(chainId: number): ChainContracts | undefined {
  return CONTRACTS_BY_CHAIN[chainIdToCAIP(chainId)];
}

// Check if a chain has deployments
export function isChainDeployed(chainId: number): boolean {
  const caip = chainIdToCAIP(chainId);
  const contracts = CONTRACTS_BY_CHAIN[caip];
  return contracts?.agenticCommerce !== undefined;
}

// Get default CAIP (Sepolia)
export const DEFAULT_CAIP = SEPOLIA_CAIP;

// Legacy CONTRACT_ADDRESSES (backward compatibility)
export const CONTRACT_ADDRESSES = {
  sepolia: {
    // Official ERC-8004 Registries
    erc8004Registry: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
    erc8004Reputation: '0x8004B663056A597Dffe9eCcC1965A193B7388713',
    adminRegistry: '0xC81C864CEAb6231ad764cf9867e031D8b6dee41d', // Phase 29e: UUPS proxy with Pashov fixes

    // SkillRegistry V2 - Uses ownerOf() instead of getAgent()
    skillRegistry: '0xA84684261558f342d6871DD2CFef90A2117Aa20A',
    skillRegistryImpl: '0x656B6520CE44Bb0Fb08552274Be3a9B11aaa3569', // Phase 14: O(1) domain lookup
    serviceRegistry: '0x62E1eeEa1A2Ab987004F35bDA430457Ed6077201',
  serviceRegistryImpl: '0xe8dEf9ce280ebDf43d8273223C1957747a292e23', // Phase 34c: bond withdrawal + cooldown
  // Phase 29: V9 - Multi-token configurable minimum budgets
  agenticCommerce: '0x3a1Bc03cC84040A282F6bf238b917D8351499239',
  agenticCommerceImpl: '0x5677c6B3133796A6066Bf4bB202edb9D594a022D', // Phase 34c: remove auto bond refund
    // Phase 11: BiddingSystem - Standalone commit-reveal bidding
  biddingSystem: '0x4D7F38C6A9DE5De44A7B789962B7A2B06bFE8fd6',
  biddingSystemImpl: '0x9FfE85CBC78144B1bAd32d2Fd61a1fdc3740f047', // Phase 34: creator stake patch
    agentReview: '0x5CDb592Fd37749bF87448FBf5725D1Cd986dd1Cb', // AgentReviewV5
  agentReviewImpl: '0xb87Af66B11B00E5341990A9f05c934c2e66181fd', // Phase 34: stake/reward patch
    commitReveal: '0x85F193670fCb7B0c97D55E70Bf2a950b1065Fb3a',
  commitRevealImpl: '0x0456fb2B6ef68B9133B22809D48D4f3748bEf87C', // Phase 29f: OZ v5 compat
    slashManager: '0x1B8373cDF4f2eD740c3478e0129f0B8494CE4Fa3',
  slashManagerImpl: '0x865ebF8EaC43FE343985058e56E08aAB4E605214', // Phase 29f: OZ v5 compat

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
export const CONTRACT_ENV_VARS = {
  ERC8004_REGISTRY: 'NEXT_PUBLIC_8004_REGISTRY_ADDRESS',
  ERC8004_REPUTATION: 'NEXT_PUBLIC_8004_REPUTATION_ADDRESS',
  SKILL_REGISTRY: 'NEXT_PUBLIC_SKILL_REGISTRY_ADDRESS',
  SERVICE_REGISTRY: 'NEXT_PUBLIC_SERVICE_REGISTRY_ADDRESS',
  AGENTIC_COMMERCE: 'NEXT_PUBLIC_AGENTIC_COMMERCE_ADDRESS',
  BIDDING_SYSTEM: 'NEXT_PUBLIC_BIDDING_SYSTEM_ADDRESS',
  ADMIN_REGISTRY: 'NEXT_PUBLIC_ADMIN_REGISTRY_ADDRESS',
  AGENT_REVIEW: 'NEXT_PUBLIC_AGENT_REVIEW_ADDRESS',
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
  AGENT_REVIEW: CONTRACT_ADDRESSES.sepolia.agentReview,
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

// Legacy helper for backward compatibility
export function getContractAddressFromEnv(
  envVar: string | undefined,
  fallbackAddress: string
): `0x${string}` {
  return (envVar || fallbackAddress) as `0x${string}`;
}

// Re-export debug utilities from lib/debug.ts for backward compatibility
export { debugLog, debugError, isDebugEnabled, enableDebug, disableDebug } from '@/lib/debug';

// Default starting block for event queries on Sepolia (deployed contracts)
export const DEFAULT_FROM_BLOCK = BigInt(9989393);

// Explorer URLs
export const EXPLORER_URLS = {
  sepolia: 'https://sepolia.etherscan.io',
} as const;
