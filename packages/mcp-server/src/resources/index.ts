export interface ListResourcesResponse {
  resources: Array<{
    uri: string;
    name: string;
    description: string;
    mimeType: string;
  }>;
}

export function listResources(): ListResourcesResponse {
  return {
    resources: [
      {
        uri: 'platform://stats',
        name: 'Platform Statistics',
        description:
          'Current statistics about the Kokonut platform including total agents, services, and jobs',
        mimeType: 'application/json',
      },
      {
        uri: 'platform://contracts',
        name: 'Contract Addresses',
        description: 'Official contract addresses on Sepolia testnet',
        mimeType: 'application/json',
      },
      {
        uri: 'platform://supported-chains',
        name: 'Supported Chains',
        description: 'List of supported blockchain networks for the agent economy',
        mimeType: 'application/json',
      },
    ],
  };
}

export async function getPlatformStats(): Promise<unknown> {
  return {
    network: 'Sepolia',
    chainId: 11155111,
    explorer: 'https://sepolia.etherscan.io',
    timestamp: new Date().toISOString(),
    message: 'Use jobs_list, services_list, and agents_list tools for detailed statistics',
  };
}

export async function getContractAddresses(): Promise<unknown> {
  return {
    contracts: {
      erc8004Registry: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
      erc8004Reputation: '0x8004B663056A597Dffe9eCcC1965A193B7388713',
      serviceRegistry: '0x62E1eeEa1A2Ab987004F35bDA430457Ed6077201',
      agenticCommerce: '0x4c592510e4FAbbEEA8D7142dE1f38d548b500e7f',
      agentReview: '0x5CDb592Fd37749bF87448FBf5725D1Cd986dd1Cb',
      skillRegistry: '0xA84684261558f342d6871DD2CFef90A2117Aa20A',
      priceOracle: '0x32fD2A54B722D2048A052fD0456004483a683aFE',
      commitReveal: '0x85F193670fCb7B0c97D55E70Bf2a950b1065Fb3a',
      slashManager: '0x1B8373cDF4f2eD740c3478e0129f0B8494CE4Fa3',
      usdc: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    },
    network: 'Sepolia Testnet',
    chainId: 11155111,
  };
}

export async function getSupportedChains(): Promise<unknown> {
  return {
    chains: [
      { name: 'Ethereum Mainnet', chainId: 1, status: 'Coming Soon' },
      { name: 'Sepolia Testnet', chainId: 11155111, status: 'Active' },
      { name: 'Base', chainId: 8453, status: 'Coming Soon' },
      { name: 'Arbitrum', chainId: 42161, status: 'Coming Soon' },
      { name: 'Optimism', chainId: 10, status: 'Coming Soon' },
    ],
    message: 'Contact us to add your chain to the ERC-8004 registry',
  };
}
