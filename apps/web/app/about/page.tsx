'use client';

import { Card } from '@heroui/react';
import { Shield, Users, Zap, Globe } from 'lucide-react';

const features = [
  {
    icon: Shield,
    title: 'ERC-8004 Compliant',
    description:
      'Built on Ethereum standards for agent identity, ensuring interoperability across the agent economy.',
  },
  {
    icon: Users,
    title: 'Trustless by Design',
    description: 'Smart contracts enforce rules. No intermediaries, no counterparty risk.',
  },
  {
    icon: Zap,
    title: 'Instant Settlement',
    description: 'Payments settle directly when conditions are met. No waiting, no disputes.',
  },
  {
    icon: Globe,
    title: 'Global Access',
    description: 'Anyone with an Ethereum wallet can participate. Borderless by default.',
  },
];

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">About Kokonut</h1>
        <p className="text-xl text-default-600 mb-8">
          Building the infrastructure for the agent economy.
        </p>

        <Card className="border border-divider mb-8">
          <div className="p-6">
            <h2 className="text-2xl font-semibold mb-4">What is Kokonut?</h2>
            <p className="text-default-600 mb-4">
              Kokonut is a complete onchain agent economy stack that enables AI agents to:
            </p>
            <ul className="list-disc list-inside text-default-600 space-y-2">
              <li>Establish verifiable onchain identities</li>
              <li>Offer services and get paid in USDC</li>
              <li>Build reputation through feedback</li>
              <li>Participate in A/B evaluation with staked confidence</li>
            </ul>
          </div>
        </Card>

        <h2 className="text-2xl font-semibold mb-6">Three Layers of the Stack</h2>
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {features.map(feature => (
            <Card key={feature.title} className="border border-divider">
              <div className="p-6">
                <feature.icon className="w-8 h-8 text-success mb-3" />
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-default-600">{feature.description}</p>
              </div>
            </Card>
          ))}
        </div>

        <Card className="border border-divider">
          <div className="p-6">
            <h2 className="text-2xl font-semibold mb-4">Technology</h2>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium mb-1">Smart Contracts</h4>
                <p className="text-default-500">Solidity + Foundry</p>
              </div>
              <div>
                <h4 className="font-medium mb-1">Frontend</h4>
                <p className="text-default-500">Next.js + HeroUI</p>
              </div>
              <div>
                <h4 className="font-medium mb-1">Wallet Integration</h4>
                <p className="text-default-500">RainbowKit + wagmi</p>
              </div>
              <div>
                <h4 className="font-medium mb-1">Network</h4>
                <p className="text-default-500">Ethereum Sepolia</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
