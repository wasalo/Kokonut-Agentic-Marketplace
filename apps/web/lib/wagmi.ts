import { http, createConfig, fallback } from 'wagmi';
import { sepolia, mainnet } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';
import { getContractAddress, getContractsByCAIP } from '@/lib/contracts/config';

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo';
const alchemyApiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || '';

// RPC configurations for supported chains (ready for deployment)
export const CHAIN_RPC_CONFIG = {
  11155111: {  // Sepolia (deployed)
    primary: alchemyApiKey 
      ? `https://eth-sepolia.g.alchemy.com/v2/${alchemyApiKey}`
      : 'https://ethereum-sepolia-rpc.publicnode.com',
    fallbacks: [
      'https://ethereum-sepolia-rpc.publicnode.com',
      'https://eth-sepolia-public.unifra.io',
      'https://sepolia.gateway.tenderly.co',
      'https://api.zan.top/eth-sepolia',
      'https://1rpc.io/sepolia',
      'https://eth-sepolia.api.onfinality.io/public',
    ],
  },
  1: {  // Ethereum Mainnet (placeholder)
    primary: 'https://eth.llamarpc.com',
    fallbacks: [
      'https://eth-mainnet.g.alchemy.com/v2/demo',
      'https://rpc.ankr.com/eth',
      'https://eth.public-rpc.com',
    ],
  },
  8453: {  // Base (placeholder)
    primary: 'https://base-mainnet.g.alchemy.com/v2/demo',
    fallbacks: [
      'https://base.llamarpc.com',
      'https://rpc.ankr.com/base',
    ],
  },
  42161: {  // Arbitrum One (placeholder)
    primary: 'https://arb-mainnet.g.alchemy.com/v2/demo',
    fallbacks: [
      'https://arb1.llamarpc.com',
      'https://rpc.ankr.com/arbitrum',
    ],
  },
  10: {  // Optimism (placeholder)
    primary: 'https://opt-mainnet.g.alchemy.com/v2/demo',
    fallbacks: [
      'https://optimism.llamarpc.com',
      'https://rpc.ankr.com/optimism',
    ],
  },
  137: {  // Polygon (placeholder)
    primary: 'https://polygon-mainnet.g.alchemy.com/v2/demo',
    fallbacks: [
      'https://polygon.llamarpc.com',
      'https://rpc.ankr.com/polygon',
    ],
  },
  56: {  // BNB Smart Chain (placeholder)
    primary: 'https://bsc-dataseed1.binance.org',
    fallbacks: [
      'https://bsc-dataseed2.binance.org',
      'https://rpc.ankr.com/bsc',
    ],
  },
  100: {  // Gnosis (placeholder)
    primary: 'https://gnosis-mainnet.g.alchemy.com/v2/demo',
    fallbacks: [
      'https://gnosis.llamarpc.com',
      'https://rpc.ankr.com/gnosis',
    ],
  },
} as const;

// Get RPC URLs for a chain
export function getChainRPCs(chainId: number) {
  const config = CHAIN_RPC_CONFIG[chainId as keyof typeof CHAIN_RPC_CONFIG];
  if (!config) return ['https://eth.llamarpc.com']; // Fallback
  return [config.primary, ...config.fallbacks];
}

// Dynamically detect the current host for WalletConnect metadata
// This allows the app to work on both localhost and local network IPs
const getMetadataUrl = () => {
  // In development, find the first non-wildcard host from NEXT_PUBLIC_DEV_HOST
  if (process.env.NODE_ENV === 'development') {
    const devHosts = (process.env.NEXT_PUBLIC_DEV_HOST || '').split(',');
    // Find first host without wildcard
    const validHost = devHosts
      .map(h => h.trim())
      .find(h => h && !h.includes('*'));
    if (validHost) {
      // Include port if it's not default (80/443)
      const port = process.env.NEXT_PUBLIC_DEV_PORT || '3000';
      return port !== '80' && port !== '443'
        ? `http://${validHost}:${port}`
        : `http://${validHost}`;
    }
  }
  // Fallback for production or when no valid dev host is set
  return 'https://kokonut.network';
};

// Build RPC list from config
const sepoliaRpcs = getChainRPCs(11155111);
const mainnetRpcs = getChainRPCs(1);

export const config = createConfig({
  chains: [sepolia, mainnet] as const,
  ssr: true,
  connectors: [
    injected(),
    walletConnect({
      projectId,
      metadata: {
        name: 'Kokonut Agent Economy',
        description: 'Identity, Commerce, and Coordination for AI Agents onchain',
        url: getMetadataUrl(),
        icons: ['https://kokonut.network/favicon.ico'],
      },
      showQrModal: true,
    }),
  ],
  transports: {
    [sepolia.id]: fallback(sepoliaRpcs.map(url => http(url))),
    [mainnet.id]: fallback(mainnetRpcs.map(url => http(url))),
  },
  config: {
    pollingInterval: 3000,
  },
} as any);

// Multi-chain contract map - keyed by chainId
// Currently only Sepolia has deployments
export const CONTRACTS = {
  11155111: {
    identityRegistry: getContractAddress('ERC8004_REGISTRY'),
    reputationRegistry: getContractAddress('ERC8004_REPUTATION'),
    skillRegistry: getContractAddress('SKILL_REGISTRY'),
    serviceRegistry: getContractAddress('SERVICE_REGISTRY'),
    agenticCommerce: getContractAddress('AGENTIC_COMMERCE'),
    agentReview: getContractAddress('AGENT_REVIEW'),
    priceOracle: getContractAddress('PRICE_ORACLE'),
    commitReveal: getContractAddress('COMMIT_REVEAL'),
    slashManager: getContractAddress('SLASH_MANAGER'),
    usdc: getContractAddress('USDC'),
    biddingSystem: getContractAddress('BIDDING_SYSTEM'),
  },
} as const;

export type ChainId = keyof typeof CONTRACTS;

// Helper to get contracts by CAIP
export function getContractsByCAIPString(caip: string) {
  return getContractsByCAIP(caip);
}

// Default chain for wallet (Sepolia)
export const DEFAULT_CHAIN = sepolia;
