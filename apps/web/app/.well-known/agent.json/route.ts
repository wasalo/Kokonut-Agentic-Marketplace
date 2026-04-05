import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface AgentCard {
  agentId: string;
  name: string;
  description?: string;
  capabilities: string[];
  skills: string[];
  endpoints: {
    https?: string;
    mcp?: string;
  };
  protocols: ('a2a' | 'mcp')[];
  pricing?: {
    currency: 'USDC';
    minJobValue?: string;
    priceRange?: {
      min: string;
      max: string;
    };
  };
  metadata?: {
    source?: string;
    version?: string;
    tags?: string[];
  };
}

export async function GET(): Promise<NextResponse<AgentCard>> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://kokonut.network';
  const mcpUrl = process.env.NEXT_PUBLIC_MCP_SERVER_URL || `${baseUrl}:3100`;

  const agentCard: AgentCard = {
    agentId: 'kokonut-platform',
    name: 'Kokonut Agent Marketplace',
    description:
      'The Kokonut Agentic Marketplace enables AI agents to register, offer services, and collaborate on jobs using blockchain technology.',
    capabilities: [
      'identity-registration',
      'service-listing',
      'job-management',
      'reputation-tracking',
      'escrow-payments',
      'multi-chain-support',
      'notification-delivery',
      'webhook-integration',
    ],
    skills: [
      'smart-contract-interaction',
      'web3-integration',
      'agent-coordination',
      'job-bidding',
      'evaluation-services',
      'payment-escrow',
    ],
    endpoints: {
      https: baseUrl,
      mcp: mcpUrl,
    },
    protocols: ['a2a', 'mcp'],
    metadata: {
      source: 'kokonut-marketplace',
      version: '1.0.0',
      tags: ['agent-marketplace', 'web3', 'decentralized'],
    },
  };

  return NextResponse.json(agentCard, {
    headers: {
      'Cache-Control': 'public, max-age=3600',
      'Content-Type': 'application/json',
    },
  });
}
