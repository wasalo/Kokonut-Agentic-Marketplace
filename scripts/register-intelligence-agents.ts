#!/usr/bin/env npx tsx
/**
 * Register all Kokonut Intelligence agents on ERC-8004 (Sepolia)
 * and sync their agent IDs back to Directus.
 *
 * Usage:
 *   npx tsx scripts/register-intelligence-agents.ts
 *
 * Requirements:
 *   - .env.local with PRIVATE_KEY (deployer wallet)
 *   - Directus running at http://localhost:8055
 *   - Directus token: kokonut-marketplace-local-dev-token
 */

import 'dotenv/config';
import { createWalletClient, http, encodeFunctionData, createPublicClient } from 'viem';
import { sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const ERC8004_ADDRESS = '0x8004A818BFB912233c491871b3d84c89A494BD9e' as const;
const DIRECTUS_URL = process.env.NEXT_PUBLIC_INTELLIGENCE_API_URL || 'http://localhost:8055';
const DIRECTUS_TOKEN = process.env.NEXT_PUBLIC_INTELLIGENCE_API_TOKEN || 'kokonut-marketplace-local-dev-token';

const ERC8004_ABI = [
  {
    inputs: [{ name: 'agentURI', type: 'string' }],
    name: 'register',
    outputs: [{ name: 'agentId', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

interface IntelligenceAgent {
  agent_name: string;
  ens_subdomain: string;
  description: string;
  capabilities: string[];
  base_rate_usdc: number;
  agent_type: string;
  directus_id?: string;
}

const AGENTS: IntelligenceAgent[] = [
  {
    agent_name: 'kokonut-mrv-reporter',
    ens_subdomain: 'mrv.kokonut',
    description: 'Prepares MRV events and EAS attestation request metadata for Kokonut farms. Monitors soil, water, and biodiversity metrics.',
    capabilities: ['mrv-reporting', 'attestation-prep', 'farm-monitoring'],
    base_rate_usdc: 5,
    agent_type: 'mrv-reporter',
  },
  {
    agent_name: 'kokonut-ebf-scorecard',
    ens_subdomain: 'ebf.kokonut',
    description: 'Calculates Equity-Boundary-Fungibility scores for farm portfolios. Analyzes financial resilience and regenerative impact.',
    capabilities: ['ebf-scoring', 'portfolio-analysis', 'resilience-assessment'],
    base_rate_usdc: 8,
    agent_type: 'ebf-scorer',
  },
  {
    agent_name: 'kokonut-ebf-calibration',
    ens_subdomain: 'calibrate.kokonut',
    description: 'Calibrates EBF scoring rubrics against real-world farm data. Ensures scoring consistency across diverse agricultural contexts.',
    capabilities: ['ebf-calibration', 'rubric-validation', 'data-calibration'],
    base_rate_usdc: 6,
    agent_type: 'ebf-calibrator',
  },
  {
    agent_name: 'kokonut-carbon-balance',
    ens_subdomain: 'carbon.kokonut',
    description: 'Tracks carbon sequestration and emissions across farm operations. Prepares carbon balance reports for verification.',
    capabilities: ['carbon-tracking', 'emissions-monitoring', 'verification-prep'],
    base_rate_usdc: 7,
    agent_type: 'carbon-tracker',
  },
  {
    agent_name: 'kokonut-revenue-multiplier',
    ens_subdomain: 'revenue.kokonut',
    description: 'Analyzes revenue optimization opportunities across crop mix, buyer channels, and value-added processing.',
    capabilities: ['revenue-analysis', 'crop-optimization', 'market-intelligence'],
    base_rate_usdc: 10,
    agent_type: 'revenue-analyzer',
  },
  {
    agent_name: 'kokonut-bio-factory',
    ens_subdomain: 'bio.kokonut',
    description: 'Manages bio-factory operations including fermentation monitoring, yield optimization, and quality control.',
    capabilities: ['biofactory-ops', 'fermentation-monitoring', 'quality-control'],
    base_rate_usdc: 12,
    agent_type: 'bio-factory-operator',
  },
  {
    agent_name: 'kokonut-regenerator',
    ens_subdomain: 'regen.kokonut',
    description: 'Monitors and optimizes regenerative agriculture practices. Tracks soil health, biodiversity, and ecosystem services.',
    capabilities: ['regenerative-agriculture', 'soil-health', 'biodiversity-monitoring'],
    base_rate_usdc: 8,
    agent_type: 'regenerator',
  },
  {
    agent_name: 'kokonut-commons-agent',
    ens_subdomain: 'commons.kokonut',
    description: 'Manages shared commons resources including water, seeds, and community infrastructure. Facilitates collective governance.',
    capabilities: ['commons-management', 'resource-governance', 'community-facilitation'],
    base_rate_usdc: 6,
    agent_type: 'commons-manager',
  },
  {
    agent_name: 'kokonut-wellbeing',
    ens_subdomain: 'wellbeing.kokonut',
    description: 'Tracks holistic wellbeing metrics for farm operators including health, social connection, and life satisfaction.',
    capabilities: ['wellbeing-tracking', 'holistic-metrics', 'quality-of-life'],
    base_rate_usdc: 5,
    agent_type: 'wellbeing-tracker',
  },
  {
    agent_name: 'kokonut-gnh-agent',
    ens_subdomain: 'gnh.kokonut',
    description: 'Measures Gross National Happiness alignment for farm communities. Evaluates psychological, cultural, and ecological wellbeing.',
    capabilities: ['gnh-measurement', 'community-wellbeing', 'cultural-alignment'],
    base_rate_usdc: 7,
    agent_type: 'gnh-measurer',
  },
  {
    agent_name: 'kokonut-capital-efficiency',
    ens_subdomain: 'capital.kokonut',
    description: 'Analyzes capital efficiency across farm investments. Optimizes resource allocation and tracks return on regenerative investment.',
    capabilities: ['capital-analysis', 'investment-optimization', 'roi-tracking'],
    base_rate_usdc: 9,
    agent_type: 'capital-analyst',
  },
  {
    agent_name: 'kokonut-open-source-capitalist',
    ens_subdomain: 'osc.kokonut',
    description: 'Balances open-source knowledge sharing with sustainable revenue generation. Manages IP licensing and community contributions.',
    capabilities: ['ip-management', 'open-source-strategy', 'revenue-balance'],
    base_rate_usdc: 8,
    agent_type: 'ip-strategist',
  },
  {
    agent_name: 'kokonut-resilience',
    ens_subdomain: 'resilience.kokonut',
    description: 'Assesses farm resilience to climate, market, and social shocks. Develops contingency plans and risk mitigation strategies.',
    capabilities: ['resilience-assessment', 'risk-mitigation', 'contingency-planning'],
    base_rate_usdc: 7,
    agent_type: 'resilience-analyst',
  },
  {
    agent_name: 'kokonut-ebf-evidence-gap',
    ens_subdomain: 'evidence.kokonut',
    description: 'Identifies evidence gaps in EBF scoring and farm data collection. Recommends data collection priorities for improved accuracy.',
    capabilities: ['evidence-analysis', 'gap-identification', 'data-prioritization'],
    base_rate_usdc: 6,
    agent_type: 'evidence-analyst',
  },
];

function buildAgentMetadata(agent: IntelligenceAgent): string {
  const metadata = {
    name: agent.agent_name,
    capabilities: agent.capabilities,
    endpoints: { intelligence: DIRECTUS_URL },
    social: { github: 'kokonut-network' },
    source: 'kokonut-intelligence',
    intelligence: {
      agentType: agent.agent_type,
      capabilityManifestCid: `local-${agent.agent_name}-manifest`,
      reviewRequired: false,
    },
  };
  return `data:application/json;base64,${btoa(JSON.stringify(metadata))}`;
}

async function registerAgent(
  walletClient: any,
  account: any,
  agent: IntelligenceAgent,
  nonce: number,
): Promise<{ agentId: bigint; txHash: `0x${string}` }> {
  const metadataURI = buildAgentMetadata(agent);
  
  const data = encodeFunctionData({
    abi: ERC8004_ABI,
    functionName: 'register',
    args: [metadataURI],
  });

  const txHash = await walletClient.sendTransaction({
    to: ERC8004_ADDRESS,
    data,
    nonce,
    chain: sepolia,
    value: 0n,
  });

  return { agentId: 0n, txHash };
}

async function syncToDirectus(agentName: string, erc8004AgentId: string): Promise<boolean> {
  try {
    const res = await fetch(`${DIRECTUS_URL}/items/agent_identity?filter[agent_name][_eq]=${agentName}`, {
      headers: {
        'Authorization': `Bearer ${DIRECTUS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });
    
    const data = await res.json();
    const existing = data?.data?.[0];
    
    if (existing) {
      await fetch(`${DIRECTUS_URL}/items/agent_identity/${existing.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${DIRECTUS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ erc8004_agent_id: erc8004AgentId }),
      });
      console.log(`  ✓ Synced ${agentName} → Directus (erc8004_agent_id: ${erc8004AgentId})`);
      return true;
    } else {
      console.log(`  ⚠ No Directus record found for ${agentName} — skipping sync`);
      return false;
    }
  } catch (err) {
    console.error(`  ✗ Failed to sync ${agentName} to Directus:`, err);
    return false;
  }
}

async function main() {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error('Error: PRIVATE_KEY environment variable required');
    process.exit(1);
  }

  const account = privateKeyToAccount((privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`) as `0x${string}`);
  
  const walletClient = createWalletClient({
    account,
    chain: sepolia,
    transport: http('https://ethereum-sepolia.publicnode.com'),
  });

  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http('https://ethereum-sepolia.publicnode.com'),
  });

  console.log('Kokonut Intelligence Agent Registration');
  console.log('========================================');
  console.log(`Deployer: ${account.address}`);
  console.log(`ERC-8004: ${ERC8004_ADDRESS}`);
  console.log(`Directus: ${DIRECTUS_URL}`);
  console.log(`Agents to register: ${AGENTS.length}`);
  console.log('');

  let currentNonce = await publicClient.getTransactionCount({ address: account.address });
  console.log(`Starting nonce: ${currentNonce}`);
  console.log('');

  const results: Array<{ name: string; agentId: string; txHash: string; synced: boolean }> = [];

  for (let i = 0; i < AGENTS.length; i++) {
    const agent = AGENTS[i];
    console.log(`[${i + 1}/${AGENTS.length}] Registering ${agent.agent_name}...`);
    
    try {
      const { txHash } = await registerAgent(walletClient, account, agent, currentNonce);
      currentNonce++;
      console.log(`  ✓ TX: ${txHash}`);
      
      const synced = await syncToDirectus(agent.agent_name, String(i + 1));
      
      results.push({
        name: agent.agent_name,
        agentId: String(i + 1),
        txHash,
        synced,
      });
      
      await new Promise(resolve => setTimeout(resolve, 1500));
    } catch (err) {
      console.error(`  ✗ Failed:`, err);
      results.push({
        name: agent.agent_name,
        agentId: 'FAILED',
        txHash: '',
        synced: false,
      });
    }
  }

  console.log('');
  console.log('Registration Summary');
  console.log('====================');
  console.log(`Total: ${AGENTS.length} | Successful: ${results.filter(r => r.agentId !== 'FAILED').length} | Failed: ${results.filter(r => r.agentId === 'FAILED').length}`);
  console.log('');
  
  for (const r of results) {
    const status = r.agentId === 'FAILED' ? '✗' : '✓';
    const syncStatus = r.synced ? ' (synced)' : '';
    console.log(`  ${status} ${r.name}: agentId=${r.agentId}${syncStatus}`);
  }
}

main().catch(console.error);
