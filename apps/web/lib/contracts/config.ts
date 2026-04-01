// Contract addresses with fallbacks for Sepolia testnet
// Phase 3: Comprehensive Events (Deployed 2026-03-29)

export const CONTRACT_ADDRESSES = {
  sepolia: {
    // Official ERC-8004 Registries
    erc8004Registry: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
    erc8004Reputation: '0x8004B663056A597Dffe9eCcC1965A193B7388713',

    // Phase 3: Comprehensive Events (Latest)
    skillRegistry: '0x7cf16C00ed4831EB9eE3a8765831968F0a28f53D',
    serviceRegistry: '0x62E1eeEa1A2Ab987004F35bDA430457Ed6077201',
    serviceRegistryImpl: '0x218340e07bEd7fD15058414388F2C82E0f3B04f9',
    agenticCommerce: '0xA7E8F13AC8E659356333Bf3e579BF3f39334821e',
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
} as const;

export function debugLog(category: keyof typeof DEBUG, message: string, data?: any) {
  if (DEBUG[category]) {
    console.log(`[${category.toUpperCase()}] ${message}`, data ? data : '');
  }
}
