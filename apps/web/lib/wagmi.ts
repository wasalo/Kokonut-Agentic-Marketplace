import { http, createConfig, fallback } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';
import { getContractAddress } from '@/lib/contracts/config';

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo';

const sepoliaRpcs = [
  'https://ethereum-sepolia-rpc.publicnode.com',
  'https://eth-sepolia.g.alchemy.com/v2/demo',
  'https://eth-sepolia-public.unifra.io',
  'https://sepolia.gateway.tenderly.co',
  'https://gateway.tenderly.co/public/sepolia',
  'https://sphinx.shardeum.org',
  'https://dapps.shardeum.org',
  'https://api.zan.top/eth-sepolia',
  'https://rpc.notadegen.com/eth/sepolia',
  'https://1rpc.io/sepolia',
  'https://eth-sepolia.api.onfinality.io/public',
  'https://rpc.sepolia.ethpandaops.io',
  'https://invictus.ambire.com/sepolia',
];

export const config = createConfig({
  chains: [sepolia] as const,
  connectors: [
    injected(),
    walletConnect({
      projectId,
      metadata: {
        name: 'Kokonut Agent Economy',
        description: 'Identity, Commerce, and Coordination for AI Agents onchain',
        url: 'https://kokonut.network',
        icons: ['https://kokonut.network/favicon.ico'],
      },
      showQrModal: true,
    }),
  ],
  transports: {
    [sepolia.id]: fallback(sepoliaRpcs.map(url => http(url))),
  },
} as any);

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
  },
} as const;

export type ChainId = keyof typeof CONTRACTS;
