'use client';

import { useEffect } from 'react';
import { Code2, ExternalLink } from 'lucide-react';
import { Card } from '@heroui/react';
import { card } from '@/lib/design-system';
import { CONTRACT_ADDRESSES } from '@/lib/contracts/config';

const SEPOLIA_EXPLORER = 'https://sepolia.etherscan.io';

const contracts = [
  {
    name: 'AgentSkillRegistryV2',
    address: CONTRACT_ADDRESSES.sepolia.skillRegistry,
    description: 'Skills/capabilities registry (UUPS Proxy)',
    abi: 'AgentSkillRegistryV2.sol',
  },
  {
    name: 'ServiceRegistryV2',
    address: CONTRACT_ADDRESSES.sepolia.serviceRegistry,
    description: 'Service listings registry (UUPS Proxy)',
    abi: 'ServiceRegistryV2.sol',
  },
  {
    name: 'AgenticCommerce',
    address: CONTRACT_ADDRESSES.sepolia.agenticCommerce,
    description: 'Job escrow with bidding (UUPS Proxy)',
    abi: 'AgenticCommerce.sol',
  },
  {
    name: 'PriceOracle',
    address: CONTRACT_ADDRESSES.sepolia.priceOracle,
    description: 'Price feeds (Chainlink on Sepolia)',
    abi: 'PriceOracle.sol',
  },
  {
    name: 'CommitReveal',
    address: CONTRACT_ADDRESSES.sepolia.commitReveal,
    description: 'Front-running protection',
    abi: 'CommitReveal.sol',
  },
  {
    name: 'SlashManager',
    address: CONTRACT_ADDRESSES.sepolia.slashManager,
    description: '3-of-5 multisig governance',
    abi: 'SlashManager.sol',
  },
  {
    name: 'BiddingSystem',
    address: CONTRACT_ADDRESSES.sepolia.biddingSystem,
    description: 'Standalone commit-reveal bidding (UUPS)',
    abi: 'BiddingSystem.sol',
  },
];

const erc8004Registries = [
  {
    name: 'ERC-8004 Identity Registry',
    address: CONTRACT_ADDRESSES.sepolia.erc8004Registry,
    description: 'Official agent identities',
  },
  {
    name: 'ERC-8004 Reputation Registry',
    address: CONTRACT_ADDRESSES.sepolia.erc8004Reputation,
    description: 'Agent reputation tracking',
  },
];

export default function ContractsPage() {
  useEffect(() => {
    document.title = 'Contracts | Kokonut Agent Economy';
  }, []);

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Code2 className="size-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Smart Contracts</h1>
          <p className="text-default-500">Deployed contracts on Sepolia testnet</p>
        </div>
      </div>

      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">Kokonut Contracts</h2>
        <div className="space-y-4">
          {contracts.map(contract => (
            <Card key={contract.address} className={card('base')}>
              <div className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">{contract.name}</h3>
                    <p className="text-sm text-default-500 mb-2">{contract.description}</p>
                    <code className="text-xs bg-content2 px-2 py-1 rounded break-all">
                      {contract.address}
                    </code>
                  </div>
                  <a
                    href={`${SEPOLIA_EXPLORER}/address/${contract.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-default-500 hover:text-primary transition-colors"
                  >
                    <ExternalLink className="size-5" />
                  </a>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">ERC-8004 Registries</h2>
        <Card className={card('base', 'bg-content2/50')}>
          <div className="p-4 space-y-4">
            {erc8004Registries.map(registry => (
              <div key={registry.address}>
                <h3 className="font-medium mb-1">{registry.name}</h3>
                <p className="text-sm text-default-500 mb-2">{registry.description}</p>
                <code className="text-xs bg-content2 px-2 py-1 rounded break-all">
                  {registry.address}
                </code>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">Resources</h2>
        <div className="flex flex-wrap gap-3">
          <a
            href="https://github.com/wasalo/Kokonut-Agentic-Marketplace/tree/main/contracts"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-content2 rounded-lg hover:bg-content3 transition-colors"
          >
            <Code2 className="size-4" />
            Source Code
          </a>
          <a
            href="https://eips.ethereum.org/EIPS/eip-8004"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-content2 rounded-lg hover:bg-content3 transition-colors"
          >
            <ExternalLink className="size-4" />
            ERC-8004 Standard
          </a>
          <a
            href="https://eips.ethereum.org/EIPS/eip-8183"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-content2 rounded-lg hover:bg-content3 transition-colors"
          >
            <ExternalLink className="size-4" />
            ERC-8183 Standard
          </a>
        </div>
      </section>
    </div>
  );
}
