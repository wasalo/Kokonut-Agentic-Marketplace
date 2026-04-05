'use client';

import { Code2, ExternalLink } from 'lucide-react';
import { Card } from '@heroui/react';
import NextLink from 'next/link';

const SEPOLIA_EXPLORER = 'https://sepolia.etherscan.io';

const contracts = [
  {
    name: 'AgentSkillRegistryV2',
    address: '0xA84684261558f342d6871DD2CFef90A2117Aa20A',
    description: 'Skills/capabilities registry (UUPS Proxy)',
    abi: 'AgentSkillRegistryV2.sol',
  },
  {
    name: 'ServiceRegistryV2',
    address: '0x62E1eeEa1A2Ab987004F35bDA430457Ed6077201',
    description: 'Service listings registry (UUPS Proxy)',
    abi: 'ServiceRegistryV2.sol',
  },
  {
    name: 'AgenticCommerce',
    address: '0x948d97EA7F0c49796fB576ADff375C900627568E',
    description: 'Job escrow with bidding (UUPS Proxy)',
    abi: 'AgenticCommerce.sol',
  },
  {
    name: 'AgentReview',
    address: '0x716B02447b52Eab450e31bD77103B41bC2c7bE0b',
    description: 'A/B evaluation with staking',
    abi: 'AgentReview.sol',
  },
  {
    name: 'PriceOracle',
    address: '0x5C4AC3dAF76708DCd51911BA3B33027eAB1B4047',
    description: 'Price feeds (Chainlink on Sepolia)',
    abi: 'PriceOracle.sol',
  },
  {
    name: 'CommitReveal',
    address: '0x6CEd1574A3dF7ec646e43DD8408300117c453Aa3',
    description: 'Front-running protection',
    abi: 'CommitReveal.sol',
  },
  {
    name: 'SlashManager',
    address: '0x7Cf955900FD7a12680E90D834eAf19346f5DBcf9',
    description: '3-of-5 multisig governance',
    abi: 'SlashManager.sol',
  },
];

const erc8004Registries = [
  {
    name: 'ERC-8004 Identity Registry',
    address: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
    description: 'Official agent identities',
  },
  {
    name: 'ERC-8004 Reputation Registry',
    address: '0x8004B663056A597Dffe9eCcC1965A193B7388713',
    description: 'Official agent reputation',
  },
];

export default function ContractsPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Code2 className="w-6 h-6 text-primary" />
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
            <Card key={contract.address} className="border border-divider">
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
                    <ExternalLink className="w-5 h-5" />
                  </a>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">ERC-8004 Registries</h2>
        <Card className="border border-divider bg-content2/50">
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
            <Code2 className="w-4 h-4" />
            Source Code
          </a>
          <a
            href="https://eips.ethereum.org/EIPS/eip-8004"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-content2 rounded-lg hover:bg-content3 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            ERC-8004 Standard
          </a>
          <a
            href="https://eips.ethereum.org/EIPS/eip-8183"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-content2 rounded-lg hover:bg-content3 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            ERC-8183 Standard
          </a>
        </div>
      </section>
    </div>
  );
}
