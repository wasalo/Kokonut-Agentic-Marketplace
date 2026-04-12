// Contract addresses with fallbacks for Sepolia testnet
// Phase 18: AgenticCommerceV6 + AgentReviewV5 - Event Enhancements, Median Evaluator (Deployed 2026-04-08)

// Common address constants
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;
export const MAX_UINT256 = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' as const;

export const CONTRACT_ADDRESSES = {
  sepolia: {
    // Official ERC-8004 Registries
    erc8004Registry: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
    erc8004Reputation: '0x8004B663056A597Dffe9eCcC1965A193B7388713',

    // SkillRegistry V2 - Uses ownerOf() instead of getAgent()
    skillRegistry: '0xA84684261558f342d6871DD2CFef90A2117Aa20A',
    skillRegistryImpl: '0x3Eec6BAF9FAc410B9C580d3Eb8c971a14298BC87',
    serviceRegistry: '0x62E1eeEa1A2Ab987004F35bDA430457Ed6077201',
    serviceRegistryImpl: '0x218340e07bEd7fD15058414388F2C82E0f3B04f9',
    // Phase 18: V6 - Event Enhancements, Permissionless Refund, CompleteAfterTimeout
    agenticCommerce: '0x948d97EA7F0c49796fB576ADff375C900627568E',
    agenticCommerceImpl: '0xEecC615310f6A6144eeA0F235E83b7BD391EC251',
    // Phase 11: BiddingSystem - Standalone commit-reveal bidding
    biddingSystem: '0x32c9d069a248a619d3EAc4D1FC76F2639AaBeF04',
    biddingSystemImpl: '0x0A09e4Ff6DAa0eeA49526560e2c946Ea32a293Bb',
    agentReview: '0x5CDb592Fd37749bF87448FBf5725D1Cd986dd1Cb', // AgentReviewV5
    agentReviewImpl: '0xFf4D6df8dDca340e2ff59615Dd00C325706019f7', // Phase 18
    priceOracle: '0x5C4AC3dAF76708DCd51911BA3B33027eAB1B4047',
    commitReveal: '0x85F193670fCb7B0c97D55E70Bf2a950b1065Fb3a',
    commitRevealImpl: '0xd9efa18c45357CC3d218E1FEC86E0C851270d33D',
    slashManager: '0x1B8373cDF4f2eD740c3478e0129f0B8494CE4Fa3',
    slashManagerImpl: '0x240eeC04F12d11eE6e4d03B00FB2148bFD4887F9',

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
  AGENT_REVIEW: 'NEXT_PUBLIC_AGENT_REVIEW_ADDRESS',
  PRICE_ORACLE: 'NEXT_PUBLIC_PRICE_ORACLE_ADDRESS',
  COMMIT_REVEAL: 'NEXT_PUBLIC_COMMIT_REVEAL_ADDRESS',
  SLASH_MANAGER: 'NEXT_PUBLIC_SLASH_MANAGER_ADDRESS',
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
  AGENT_REVIEW: CONTRACT_ADDRESSES.sepolia.agentReview,
  PRICE_ORACLE: CONTRACT_ADDRESSES.sepolia.priceOracle,
  COMMIT_REVEAL: CONTRACT_ADDRESSES.sepolia.commitReveal,
  SLASH_MANAGER: CONTRACT_ADDRESSES.sepolia.slashManager,
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
