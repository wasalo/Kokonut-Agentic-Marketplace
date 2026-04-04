// Contract addresses with fallbacks for Sepolia testnet
// Phase 6: AgenticCommerceV6 - ERC-2771, Evaluator Fees, Loser Stake Withdrawal (Deployed 2026-04-03)

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
    // Phase 6: V6 - ERC-2771, Evaluator Fees, Loser Stake Withdrawal
    agenticCommerce: '0x948d97EA7F0c49796fB576ADff375C900627568E',
    agenticCommerceImpl: '0x71EF7B696dbcfbb09029c8c60D78949C8309cA16',
    agentReview: '0x716B02447b52Eab450e31bD77103B41bC2c7bE0b',
    priceOracle: '0x5C4AC3dAF76708DCd51911BA3B33027eAB1B4047',
    commitReveal: '0x6CEd1574A3dF7ec646e43DD8408300117c453Aa3',
    slashManager: '0x7Cf955900FD7a12680E90D834eAf19346f5DBcf9',

    // Tokens
    usdc: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
  },
} as const;

// Helper function to get address with fallback
export function getContractAddress(
  envVar: string | undefined,
  fallbackAddress: string
): `0x${string}` {
  return (envVar || fallbackAddress) as `0x${string}`;
}

// Debug logging
export const DEBUG = {
  contracts: true,
  errors: true,
  data: false,
  hooks: true,
} as const;

export function debugLog(category: keyof typeof DEBUG, message: string, data?: any) {
  if (DEBUG[category]) {
    console.log(`[${category.toUpperCase()}] ${message}`, data ? data : '');
  }
}
