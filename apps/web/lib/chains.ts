'use client';

import { chainIdToCAIP } from './caip';

export interface ChainConfig {
  id: number;
  caip: string;
  name: string;
  shortName: string;
  color: string;
  logo?: string;
  rpcUrl?: string;
  explorerUrl?: string;
  identityRegistry: `0x${string}`;
  reputationRegistry: `0x${string}`;
  isDefault?: boolean;
  isTestnet?: boolean;
  isProduction?: boolean;
}

export const LAUNCH_CHAIN_IDS = [1, 42220, 100, 42161, 137, 56, 4326, 11155111] as const;

export const SUPPORTED_CHAINS: ChainConfig[] = [
  {
    id: 11155111,
    caip: chainIdToCAIP(11155111),
    name: 'Sepolia',
    shortName: 'Sepolia',
    color: '#627EEA',
    isDefault: true,
    isTestnet: true,
    rpcUrl: 'https://ethereum-sepolia.publicnode.com',
    explorerUrl: 'https://sepolia.etherscan.io',
    identityRegistry: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
    reputationRegistry: '0x8004B663056A597Dffe9eCcC1965A193B7388713',
  },
  {
    id: 1,
    caip: chainIdToCAIP(1),
    name: 'Ethereum',
    shortName: 'Ethereum',
    color: '#627EEA',
    isProduction: true,
    rpcUrl: 'https://eth.llamarpc.com',
    explorerUrl: 'https://etherscan.io',
    identityRegistry: '0x0000000000000000000000000000000000000001',
    reputationRegistry: '0x0000000000000000000000000000000000000001',
  },
  {
    id: 42220,
    caip: chainIdToCAIP(42220),
    name: 'Celo',
    shortName: 'Celo',
    color: '#35D07F',
    isProduction: true,
    rpcUrl: 'https://forno.celo.org',
    explorerUrl: 'https://celoscan.io',
    identityRegistry: '0x0000000000000000000000000000000000000001',
    reputationRegistry: '0x0000000000000000000000000000000000000001',
  },
  {
    id: 100,
    caip: chainIdToCAIP(100),
    name: 'Gnosis',
    shortName: 'Gnosis',
    color: '#04795B',
    isProduction: true,
    rpcUrl: 'https://rpc.gnosischain.com',
    explorerUrl: 'https://gnosisscan.io',
    identityRegistry: '0x0000000000000000000000000000000000000001',
    reputationRegistry: '0x0000000000000000000000000000000000000001',
  },
  {
    id: 42161,
    caip: chainIdToCAIP(42161),
    name: 'Arbitrum One',
    shortName: 'Arbitrum',
    color: '#28AAE2',
    isProduction: true,
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    explorerUrl: 'https://arbiscan.io',
    identityRegistry: '0x0000000000000000000000000000000000000001',
    reputationRegistry: '0x0000000000000000000000000000000000000001',
  },
  {
    id: 137,
    caip: chainIdToCAIP(137),
    name: 'Polygon',
    shortName: 'Polygon',
    color: '#8247E5',
    isProduction: true,
    rpcUrl: 'https://polygon-rpc.com',
    explorerUrl: 'https://polygonscan.com',
    identityRegistry: '0x0000000000000000000000000000000000000001',
    reputationRegistry: '0x0000000000000000000000000000000000000001',
  },
  {
    id: 56,
    caip: chainIdToCAIP(56),
    name: 'BNB Smart Chain',
    shortName: 'BNB',
    color: '#F3BA2F',
    isProduction: true,
    rpcUrl: 'https://bsc-dataseed.binance.org',
    explorerUrl: 'https://bscscan.com',
    identityRegistry: '0x0000000000000000000000000000000000000001',
    reputationRegistry: '0x0000000000000000000000000000000000000001',
  },
  {
    id: 4326,
    caip: chainIdToCAIP(4326),
    name: 'MegaETH',
    shortName: 'MegaETH',
    color: '#00F4FF',
    isProduction: true,
    rpcUrl: 'https://rpc.megaeth.com',
    explorerUrl: 'https://megaexplorer.org',
    identityRegistry: '0x0000000000000000000000000000000000000001',
    reputationRegistry: '0x0000000000000000000000000000000000000001',
  },
  {
    id: 8453,
    caip: chainIdToCAIP(8453),
    name: 'Base',
    shortName: 'Base',
    color: '#0052FF',
    explorerUrl: 'https://basescan.org',
    identityRegistry: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
    reputationRegistry: '0x8004B663056A597Dffe9eCcC1965A193B7388713',
  },
  {
    id: 10,
    caip: chainIdToCAIP(10),
    name: 'Optimism',
    shortName: 'OP',
    color: '#FF0420',
    explorerUrl: 'https://optimistic.etherscan.io',
    identityRegistry: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
    reputationRegistry: '0x8004B663056A597Dffe9eCcC1965A193B7388713',
  },
  {
    id: 534352,
    caip: chainIdToCAIP(534352),
    name: 'Scroll',
    shortName: 'Scroll',
    color: '#E8B9FF',
    explorerUrl: 'https://scrollscan.com',
    identityRegistry: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
    reputationRegistry: '0x8004B663056A597Dffe9eCcC1965A193B7388713',
  },
  {
    id: 59144,
    caip: chainIdToCAIP(59144),
    name: 'Linea',
    shortName: 'Linea',
    color: '#121212',
    explorerUrl: 'https://lineascan.build',
    identityRegistry: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
    reputationRegistry: '0x8004B663056A597Dffe9eCcC1965A193B7388713',
  },
  {
    id: 143,
    caip: chainIdToCAIP(143),
    name: 'Monad',
    shortName: 'Monad',
    color: '#00D779',
    explorerUrl: 'https://explorer.monad.xyz',
    identityRegistry: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
    reputationRegistry: '0x8004B663056A597Dffe9eCcC1965A193B7388713',
  },
  {
    id: 2741,
    caip: chainIdToCAIP(2741),
    name: 'Abstract',
    shortName: 'Abstract',
    color: '#00D4FF',
    explorerUrl: 'https://explorer.abstractchain.io',
    identityRegistry: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
    reputationRegistry: '0x8004B663056A597Dffe9eCcC1965A193B7388713',
  },
  {
    id: 2345,
    caip: chainIdToCAIP(2345),
    name: 'GOAT Network',
    shortName: 'GOAT',
    color: '#8B5CF6',
    explorerUrl: 'https://goat.exploreme.pro',
    identityRegistry: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
    reputationRegistry: '0x8004B663056A597Dffe9eCcC1965A193B7388713',
  },
  {
    id: 167000,
    caip: chainIdToCAIP(167000),
    name: 'Taiko',
    shortName: 'Taiko',
    color: '#FF0420',
    explorerUrl: 'https://taikoscan.io',
    identityRegistry: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
    reputationRegistry: '0x8004B663056A597Dffe9eCcC1965A193B7388713',
  },
  {
    id: 1868,
    caip: chainIdToCAIP(1868),
    name: 'Soneium',
    shortName: 'Soneium',
    color: '#FF6B6B',
    explorerUrl: 'https://scan.soneium.org',
    identityRegistry: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
    reputationRegistry: '0x8004B663056A597Dffe9eCcC1965A193B7388713',
  },
  {
    id: 196,
    caip: chainIdToCAIP(196),
    name: 'X Layer',
    shortName: 'X Layer',
    color: '#00A3FF',
    explorerUrl: 'https://xlayerscan.com',
    identityRegistry: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
    reputationRegistry: '0x8004B663056A597Dffe9eCcC1965A193B7388713',
  },
  {
    id: 5000,
    caip: chainIdToCAIP(5000),
    name: 'Mantle',
    shortName: 'Mantle',
    color: '#00ACd7',
    explorerUrl: 'https://mantlescan.info',
    identityRegistry: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
    reputationRegistry: '0x8004B663056A597Dffe9eCcC1965A193B7388713',
  },
  {
    id: 360,
    caip: chainIdToCAIP(360),
    name: 'Shape',
    shortName: 'Shape',
    color: '#7B61FF',
    explorerUrl: 'https://explorer.shape.network',
    identityRegistry: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
    reputationRegistry: '0x8004B663056A597Dffe9eCcC1965A193B7388713',
  },
  {
    id: 1088,
    caip: chainIdToCAIP(1088),
    name: 'Metis',
    shortName: 'Metis',
    color: '#00D4D4',
    explorerUrl: 'https://andromeda.metis.io',
    identityRegistry: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
    reputationRegistry: '0x8004B663056A597Dffe9eCcC1965A193B7388713',
  },
  {
    id: 1187947933,
    caip: chainIdToCAIP(1187947933),
    name: 'SKALE Base',
    shortName: 'SKALE',
    color: '#4A21C8',
    explorerUrl: 'https://delegation.skalenodes.com',
    identityRegistry: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
    reputationRegistry: '0x8004B663056A597Dffe9eCcC1965A193B7388713',
  },
];

export const PRODUCTION_CHAINS = SUPPORTED_CHAINS.filter(
  (chain) => chain.isProduction || chain.isTestnet
);

export function getChainById(chainId: number): ChainConfig | undefined {
  return SUPPORTED_CHAINS.find((c) => c.id === chainId);
}

export function getChainByCAIP(caip: string): ChainConfig | undefined {
  return SUPPORTED_CHAINS.find((c) => c.caip === caip);
}

export function getChainColor(chainId: number): string {
  return getChainById(chainId)?.color || '#627EEA';
}

export function getDefaultChain(): ChainConfig {
  return SUPPORTED_CHAINS.find((c) => c.isDefault) || SUPPORTED_CHAINS[0];
}

export function isTestnet(chainId: number): boolean {
  return getChainById(chainId)?.isTestnet ?? false;
}

export function getNetworkSlug(chainId: number): string {
  return getChainById(chainId)?.shortName?.toLowerCase() || String(chainId);
}
