/**
 * x402 Chain Configurations
 *
 * Multi-chain support: Ethereum, Base, Polygon, Avalanche, Arbitrum
 * Testnet: Sepolia, Base Sepolia
 */

import type { Chain } from 'viem';

export interface X402ChainConfig {
  caip: string;
  chainId: number;
  name: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpc: string;
  blockExplorer: string;
  usdc: string;
  usdcDecimals: number;
  facilitator: string;
  isTestnet: boolean;
}

export const X402_CHAINS: Record<string, X402ChainConfig> = {
  'eip155:1': {
    caip: 'eip155:1',
    chainId: 1,
    name: 'Ethereum',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpc: process.env.NEXT_PUBLIC_ETHEREUM_RPC || 'https://eth.llamarpc.com',
    blockExplorer: 'https://etherscan.io',
    usdc: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    usdcDecimals: 6,
    facilitator: process.env.X402_FACILITATOR_URL || 'https://x402.org/facilitator',
    isTestnet: false,
  },
  'eip155:11155111': {
    caip: 'eip155:11155111',
    chainId: 11155111,
    name: 'Ethereum Sepolia',
    nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
    rpc: process.env.NEXT_PUBLIC_SEPOLIA_RPC || 'https://ethereum-sepolia.publicnode.com',
    blockExplorer: 'https://sepolia.etherscan.io',
    usdc: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    usdcDecimals: 6,
    facilitator: process.env.X402_FACILITATOR_URL || 'https://x402.org/facilitator',
    isTestnet: true,
  },
  'eip155:8453': {
    caip: 'eip155:8453',
    chainId: 8453,
    name: 'Base',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpc: process.env.NEXT_PUBLIC_BASE_RPC || 'https://base.llamarpc.com',
    blockExplorer: 'https://basescan.org',
    usdc: '0x833589fCD6e5036E8f7022F7F5D8C8D2E8F3C1A6',
    usdcDecimals: 6,
    facilitator: process.env.X402_FACILITATOR_URL || 'https://x402.org/facilitator',
    isTestnet: false,
  },
  'eip155:84532': {
    caip: 'eip155:84532',
    chainId: 84532,
    name: 'Base Sepolia',
    nativeCurrency: { name: 'Base Sepolia Ether', symbol: 'ETH', decimals: 18 },
    rpc: process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC || 'https://sepolia.base.org',
    blockExplorer: 'https://base-sepolia.etherscan.io',
    usdc: '0x41d5a5e082eBDBd39c8A6C7d6d3aC5D6B7aF2E8D',
    usdcDecimals: 6,
    facilitator: process.env.X402_FACILITATOR_URL || 'https://x402.org/facilitator',
    isTestnet: true,
  },
  'eip155:137': {
    caip: 'eip155:137',
    chainId: 137,
    name: 'Polygon',
    nativeCurrency: { name: ' MATIC', symbol: 'POL', decimals: 18 },
    rpc: process.env.NEXT_PUBLIC_POLYGON_RPC || 'https://polygon.llamarpc.com',
    blockExplorer: 'https://polygonscan.com',
    usdc: '0x2791Bca1f2de8c26c47dB6FDfe64a5c3dDx817Cd8',
    usdcDecimals: 6,
    facilitator: process.env.X402_FACILITATOR_URL || 'https://x402.org/facilitator',
    isTestnet: false,
  },
  'eip155:80002': {
    caip: 'eip155:80002',
    chainId: 80002,
    name: 'Polygon Amoy',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    rpc: process.env.NEXT_PUBLIC_AMOY_RPC || 'https://rpc.amoy.polygon.technology',
    blockExplorer: 'https://amoy.polygonscan.com',
    usdc: '0x7c8E1B1f1f1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F1F',
    usdcDecimals: 6,
    facilitator: process.env.X402_FACILITATOR_URL || 'https://x402.org/facilitator',
    isTestnet: true,
  },
  'eip155:42161': {
    caip: 'eip155:42161',
    chainId: 42161,
    name: 'Arbitrum One',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpc: process.env.NEXT_PUBLIC_ARBITRUM_RPC || 'https://arbitrum.llamarpc.com',
    blockExplorer: 'https://arbiscan.io',
    usdc: '0xaf88d065e77c2cBE4C5C5aCb5C0d5Bd84E0f3C3G',
    usdcDecimals: 6,
    facilitator: process.env.X402_FACILITATOR_URL || 'https://x402.org/facilitator',
    isTestnet: false,
  },
  'eip155:421614': {
    caip: 'eip155:421614',
    chainId: 421614,
    name: 'Arbitrum Sepolia',
    nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
    rpc: process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC || 'https://sepolia.arbitrum.io',
    blockExplorer: 'https://sepolia.arbiscan.io',
    usdc: '0x6f1f1f1f1f1f1f1f1f1f1f1f1f1f1F1F1F1F1F1F1F',
    usdcDecimals: 6,
    facilitator: process.env.X402_FACILITATOR_URL || 'https://x402.org/facilitator',
    isTestnet: true,
  },
  'eip155:43114': {
    caip: 'eip155:43114',
    chainId: 43114,
    name: 'Avalanche',
    nativeCurrency: { name: 'AVAX', symbol: 'AVAX', decimals: 18 },
    rpc: process.env.NEXT_PUBLIC_AVALANCHE_RPC || 'https://avalanche.llamarpc.com',
    blockExplorer: 'https://snowtrace.io',
    usdc: '0xB97EF9Ef8734C71958D357f1826E3D9eC1F1e6E',
    usdcDecimals: 6,
    facilitator: process.env.X402_FACILITATOR_URL || 'https://x402.org/facilitator',
    isTestnet: false,
  },
  'eip155:43113': {
    caip: 'eip155:43113',
    chainId: 43113,
    name: 'Avalanche Fuji',
    nativeCurrency: { name: 'AVAX', symbol: 'AVAX', decimals: 18 },
    rpc: process.env.NEXT_PUBLIC_FUJI_RPC || 'https://api.avax-test.network/ext/bc/C/rpr',
    blockExplorer: 'https://testnet.snowtrace.io',
    usdc: '0x5425C8Eo80A90d95D08fA3f1fC5C5cB4D1dC80a93',
    usdcDecimals: 6,
    facilitator: process.env.X402_FACILITATOR_URL || 'https://x402.org/facilitator',
    isTestnet: true,
  },
};

export function getChainConfig(caip: string): X402ChainConfig | undefined {
  return X402_CHAINS[caip];
}

export function getChainByChainId(chainId: number): X402ChainConfig | undefined {
  return Object.values(X402_CHAINS).find((c) => c.chainId === chainId);
}

export function getTestnetChains(): X402ChainConfig[] {
  return Object.values(X402_CHAINS).filter((c) => c.isTestnet);
}

export function getMainnetChains(): X402ChainConfig[] {
  return Object.values(X402_CHAINS).filter((c) => !c.isTestnet);
}

export function getDefaultChain(): X402ChainConfig {
  return X402_CHAINS['eip155:84532'];
}

export function isValidChain(caip: string): boolean {
  return caip in X402_CHAINS;
}

export const DEFAULT_CAIP = process.env.NEXT_PUBLIC_X402_DEFAULT_CHAIN || 'eip155:84532';

export const DEFAULT_TESTNET_CAIP = 'eip155:84532';
export const DEFAULT_MAINNET_CAIP = 'eip155:8453';