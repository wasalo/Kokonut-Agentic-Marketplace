'use client';

export interface ChainConfig {
  id: number;
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
}

export const SUPPORTED_CHAINS: ChainConfig[] = [
  {
    id: 11155111,
    name: 'Sepolia',
    shortName: 'Sepolia',
    color: '#627EEA',
    isDefault: true,
    isTestnet: true,
    explorerUrl: 'https://sepolia.etherscan.io',
    identityRegistry: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
    reputationRegistry: '0x8004B663056A597Dffe9eCcC1965A193B7388713',
  },
  {
    id: 8453,
    name: 'Base',
    shortName: 'Base',
    color: '#0052FF',
    explorerUrl: 'https://basescan.org',
    identityRegistry: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
    reputationRegistry: '0x8004B663056A597Dffe9eCcC1965A193B7388713',
  },
  {
    id: 42161,
    name: 'Arbitrum One',
    shortName: 'Arbitrum',
    color: '#28AAE2',
    explorerUrl: 'https://arbiscan.io',
    identityRegistry: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
    reputationRegistry: '0x8004B663056A597Dffe9eCcC1965A193B7388713',
  },
  {
    id: 10,
    name: 'Optimism',
    shortName: 'OP',
    color: '#FF0420',
    explorerUrl: 'https://optimistic.etherscan.io',
    identityRegistry: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
    reputationRegistry: '0x8004B663056A597Dffe9eCcC1965A193B7388713',
  },
  {
    id: 42220,
    name: 'Celo',
    shortName: 'Celo',
    color: '#35D07F',
    explorerUrl: 'https://celoscan.io',
    identityRegistry: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
    reputationRegistry: '0x8004B663056A597Dffe9eCcC1965A193B7388713',
  },
  {
    id: 137,
    name: 'Polygon',
    shortName: 'Polygon',
    color: '#8247E5',
    explorerUrl: 'https://polygonscan.com',
    identityRegistry: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
    reputationRegistry: '0x8004B663056A597Dffe9eCcC1965A193B7388713',
  },
  {
    id: 56,
    name: 'BNB Smart Chain',
    shortName: 'BNB',
    color: '#F3BA2F',
    explorerUrl: 'https://bscscan.com',
    identityRegistry: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
    reputationRegistry: '0x8004B663056A597Dffe9eCcC1965A193B7388713',
  },
  {
    id: 534352,
    name: 'Scroll',
    shortName: 'Scroll',
    color: '#E8B9FF',
    explorerUrl: 'https://scrollscan.com',
    identityRegistry: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
    reputationRegistry: '0x8004B663056A597Dffe9eCcC1965A193B7388713',
  },
  {
    id: 59144,
    name: 'Linea',
    shortName: 'Linea',
    color: '#121212',
    explorerUrl: 'https://lineascan.build',
    identityRegistry: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
    reputationRegistry: '0x8004B663056A597Dffe9eCcC1965A193B7388713',
  },
  {
    id: 43114,
    name: 'Avalanche',
    shortName: 'Avalanche',
    color: '#E84142',
    explorerUrl: 'https://snowtrace.io',
    identityRegistry: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
    reputationRegistry: '0x8004B663056A597Dffe9eCcC1965A193B7388713',
  },
  {
    id: 100,
    name: 'Gnosis',
    shortName: 'Gnosis',
    color: '#04795B',
    explorerUrl: 'https://gnosisscan.io',
    identityRegistry: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
    reputationRegistry: '0x8004B663056A597Dffe9eCcC1965A193B7388713',
  },
  {
    id: 143,
    name: 'Monad',
    shortName: 'Monad',
    color: '#00D779',
    explorerUrl: 'https://explorer.monad.xyz',
    identityRegistry: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
    reputationRegistry: '0x8004B663056A597Dffe9eCcC1965A193B7388713',
  },
  {
    id: 4326,
    name: 'MegaETH',
    shortName: 'MegaETH',
    color: '#00F4FF',
    explorerUrl: 'https://megaexplorer.org',
    identityRegistry: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
    reputationRegistry: '0x8004B663056A597Dffe9eCcC1965A193B7388713',
  },
  {
    id: 2741,
    name: 'Abstract',
    shortName: 'Abstract',
    color: '#00D4FF',
    explorerUrl: 'https://explorer.abstractchain.io',
    identityRegistry: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
    reputationRegistry: '0x8004B663056A597Dffe9eCcC1965A193B7388713',
  },
  {
    id: 2345,
    name: 'GOAT Network',
    shortName: 'GOAT',
    color: '#8B5CF6',
    explorerUrl: 'https://goat.exploreme.pro',
    identityRegistry: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
    reputationRegistry: '0x8004B663056A597Dffe9eCcC1965A193B7388713',
  },
  {
    id: 167000,
    name: 'Taiko',
    shortName: 'Taiko',
    color: '#FF叹号',
    explorerUrl: 'https://taikoscan.io',
    identityRegistry: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
    reputationRegistry: '0x8004B663056A597Dffe9eCcC1965A193B7388713',
  },
  {
    id: 1868,
    name: 'Soneium',
    shortName: 'Soneium',
    color: '#FF6B6B',
    explorerUrl: 'https://scan.soneium.org',
    identityRegistry: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
    reputationRegistry: '0x8004B663056A597Dffe9eCcC1965A193B7388713',
  },
  {
    id: 196,
    name: 'X Layer',
    shortName: 'X Layer',
    color: '#00A3FF',
    explorerUrl: 'https://xlayerscan.com',
    identityRegistry: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
    reputationRegistry: '0x8004B663056A597Dffe9eCcC1965A193B7388713',
  },
  {
    id: 5000,
    name: 'Mantle',
    shortName: 'Mantle',
    color: '#00ACd7',
    explorerUrl: 'https://mantlescan.info',
    identityRegistry: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
    reputationRegistry: '0x8004B663056A597Dffe9eCcC1965A193B7388713',
  },
  {
    id: 360,
    name: 'Shape',
    shortName: 'Shape',
    color: '#7B61FF',
    explorerUrl: 'https://explorer.shape.network',
    identityRegistry: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
    reputationRegistry: '0x8004B663056A597Dffe9eCcC1965A193B7388713',
  },
  {
    id: 1088,
    name: 'Metis',
    shortName: 'Metis',
    color: '#00D4D4',
    explorerUrl: 'https://andromeda.metis.io',
    identityRegistry: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
    reputationRegistry: '0x8004B663056A597Dffe9eCcC1965A193B7388713',
  },
  {
    id: 1187947933,
    name: 'SKALE Base',
    shortName: 'SKALE',
    color: '#4A21C8',
    explorerUrl: 'https://delegation.skalenodes.com',
    identityRegistry: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
    reputationRegistry: '0x8004B663056A597Dffe9eCcC1965A193B7388713',
  },
];

export function getChainById(chainId: number): ChainConfig | undefined {
  return SUPPORTED_CHAINS.find(c => c.id === chainId);
}

export function getChainColor(chainId: number): string {
  return getChainById(chainId)?.color || '#627EEA';
}

export function getDefaultChain(): ChainConfig {
  return SUPPORTED_CHAINS.find(c => c.isDefault) || SUPPORTED_CHAINS[0];
}

export function isTestnet(chainId: number): boolean {
  return getChainById(chainId)?.isTestnet ?? false;
}
