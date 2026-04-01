import { http, createConfig, fallback } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';
import type { Chain } from 'wagmi/chains';

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
  chains: [sepolia as Chain],
  connectors: [injected(), walletConnect({ projectId })],
  transports: {
    [sepolia.id]: fallback(sepoliaRpcs.map(url => http(url))),
  },
});

export const CONTRACTS = {
  11155111: {
    identityRegistry: process.env.NEXT_PUBLIC_8004_REGISTRY_ADDRESS,
    reputationRegistry: process.env.NEXT_PUBLIC_8004_REPUTATION_ADDRESS,
    skillRegistry: process.env.NEXT_PUBLIC_SKILL_REGISTRY_ADDRESS,
    serviceRegistry: process.env.NEXT_PUBLIC_SERVICE_REGISTRY_ADDRESS,
    agenticCommerce: process.env.NEXT_PUBLIC_AGENTIC_COMMERCE_ADDRESS,
    agentReview: process.env.NEXT_PUBLIC_AGENT_REVIEW_ADDRESS,
    priceOracle: process.env.NEXT_PUBLIC_PRICE_ORACLE_ADDRESS,
    commitReveal: process.env.NEXT_PUBLIC_COMMIT_REVEAL_ADDRESS,
    slashManager: process.env.NEXT_PUBLIC_SLASH_MANAGER_ADDRESS,
    usdc: process.env.NEXT_PUBLIC_USDC_ADDRESS,
  },
} as const;

export type ChainId = keyof typeof CONTRACTS;
