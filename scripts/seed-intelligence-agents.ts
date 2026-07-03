#!/usr/bin/env npx tsx
/**
 * Seed all 14 Kokonut Intelligence agents into Directus agent_identity table.
 * Then register them on ERC-8004 and sync erc8004_agent_id back.
 *
 * Usage: npx tsx scripts/seed-intelligence-agents.ts
 */

import 'dotenv/config';

const DIRECTUS_URL = process.env.NEXT_PUBLIC_INTELLIGENCE_API_URL || 'http://localhost:8055';
const DIRECTUS_TOKEN = process.env.NEXT_PUBLIC_INTELLIGENCE_API_TOKEN || 'kokonut-marketplace-local-dev-token';

const HEADERS = {
  'Authorization': `Bearer ${DIRECTUS_TOKEN}`,
  'Content-Type': 'application/json',
};

interface AgentSeed {
  agent_name: string;
  ens_subdomain: string;
  operator_wallet: string;
  registry_chain: string;
  capability_manifest_cid: string;
  payment_token: string;
  base_rate_usdc: string;
  marketplace_source: string;
  agent_state: string;
  metadata: Record<string, unknown>;
}

const AGENTS: AgentSeed[] = [
  {
    agent_name: 'kokonut-mrv-reporter',
    ens_subdomain: 'mrv-reporter.kokonut.eth',
    operator_wallet: '0x3394C45b5938127EB56603A6051dF26CFAF08C26',
    registry_chain: 'base',
    capability_manifest_cid: 'local://sha256/mrv-reporter-manifest',
    payment_token: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    base_rate_usdc: '5.000000',
    marketplace_source: 'Kokonut-Intelligence',
    agent_state: 'active',
    metadata: { agentType: 'mrv-reporter', description: 'Prepares MRV events and EAS attestation request metadata for Kokonut farms.' },
  },
  {
    agent_name: 'kokonut-ebf-scorecard',
    ens_subdomain: 'ebf.kokonut.eth',
    operator_wallet: '0x3394C45b5938127EB56603A6051dF26CFAF08C26',
    registry_chain: 'base',
    capability_manifest_cid: 'local://sha256/ebf-scorecard-manifest',
    payment_token: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    base_rate_usdc: '8.000000',
    marketplace_source: 'Kokonut-Intelligence',
    agent_state: 'active',
    metadata: { agentType: 'ebf-scorer', description: 'Calculates Equity-Boundary-Fungibility scores for farm portfolios.' },
  },
  {
    agent_name: 'kokonut-ebf-calibration',
    ens_subdomain: 'calibrate.kokonut.eth',
    operator_wallet: '0x3394C45b5938127EB56603A6051dF26CFAF08C26',
    registry_chain: 'base',
    capability_manifest_cid: 'local://sha256/ebf-calibration-manifest',
    payment_token: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    base_rate_usdc: '6.000000',
    marketplace_source: 'Kokonut-Intelligence',
    agent_state: 'active',
    metadata: { agentType: 'ebf-calibrator', description: 'Calibrates EBF scoring rubrics against real-world farm data.' },
  },
  {
    agent_name: 'kokonut-carbon-balance',
    ens_subdomain: 'carbon.kokonut.eth',
    operator_wallet: '0x3394C45b5938127EB56603A6051dF26CFAF08C26',
    registry_chain: 'base',
    capability_manifest_cid: 'local://sha256/carbon-balance-manifest',
    payment_token: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    base_rate_usdc: '7.000000',
    marketplace_source: 'Kokonut-Intelligence',
    agent_state: 'active',
    metadata: { agentType: 'carbon-tracker', description: 'Tracks carbon sequestration and emissions across farm operations.' },
  },
  {
    agent_name: 'kokonut-revenue-multiplier',
    ens_subdomain: 'revenue.kokonut.eth',
    operator_wallet: '0x3394C45b5938127EB56603A6051dF26CFAF08C26',
    registry_chain: 'base',
    capability_manifest_cid: 'local://sha256/revenue-multiplier-manifest',
    payment_token: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    base_rate_usdc: '10.000000',
    marketplace_source: 'Kokonut-Intelligence',
    agent_state: 'active',
    metadata: { agentType: 'revenue-analyzer', description: 'Analyzes revenue optimization opportunities across crop mix and buyer channels.' },
  },
  {
    agent_name: 'kokonut-bio-factory',
    ens_subdomain: 'bio.kokonut.eth',
    operator_wallet: '0x3394C45b5938127EB56603A6051dF26CFAF08C26',
    registry_chain: 'base',
    capability_manifest_cid: 'local://sha256/bio-factory-manifest',
    payment_token: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    base_rate_usdc: '12.000000',
    marketplace_source: 'Kokonut-Intelligence',
    agent_state: 'active',
    metadata: { agentType: 'bio-factory-operator', description: 'Manages bio-factory operations including fermentation monitoring and yield optimization.' },
  },
  {
    agent_name: 'kokonut-regenerator',
    ens_subdomain: 'regen.kokonut.eth',
    operator_wallet: '0x3394C45b5938127EB56603A6051dF26CFAF08C26',
    registry_chain: 'base',
    capability_manifest_cid: 'local://sha256/regenerator-manifest',
    payment_token: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    base_rate_usdc: '8.000000',
    marketplace_source: 'Kokonut-Intelligence',
    agent_state: 'active',
    metadata: { agentType: 'regenerator', description: 'Monitors and optimizes regenerative agriculture practices.' },
  },
  {
    agent_name: 'kokonut-commons-agent',
    ens_subdomain: 'commons.kokonut.eth',
    operator_wallet: '0x3394C45b5938127EB56603A6051dF26CFAF08C26',
    registry_chain: 'base',
    capability_manifest_cid: 'local://sha256/commons-agent-manifest',
    payment_token: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    base_rate_usdc: '6.000000',
    marketplace_source: 'Kokonut-Intelligence',
    agent_state: 'active',
    metadata: { agentType: 'commons-manager', description: 'Manages shared commons resources including water, seeds, and community infrastructure.' },
  },
  {
    agent_name: 'kokonut-wellbeing',
    ens_subdomain: 'wellbeing.kokonut.eth',
    operator_wallet: '0x3394C45b5938127EB56603A6051dF26CFAF08C26',
    registry_chain: 'base',
    capability_manifest_cid: 'local://sha256/wellbeing-manifest',
    payment_token: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    base_rate_usdc: '5.000000',
    marketplace_source: 'Kokonut-Intelligence',
    agent_state: 'active',
    metadata: { agentType: 'wellbeing-tracker', description: 'Tracks holistic wellbeing metrics for farm operators.' },
  },
  {
    agent_name: 'kokonut-gnh-agent',
    ens_subdomain: 'gnh.kokonut.eth',
    operator_wallet: '0x3394C45b5938127EB56603A6051dF26CFAF08C26',
    registry_chain: 'base',
    capability_manifest_cid: 'local://sha256/gnh-agent-manifest',
    payment_token: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    base_rate_usdc: '7.000000',
    marketplace_source: 'Kokonut-Intelligence',
    agent_state: 'active',
    metadata: { agentType: 'gnh-measurer', description: 'Measures Gross National Happiness alignment for farm communities.' },
  },
  {
    agent_name: 'kokonut-capital-efficiency',
    ens_subdomain: 'capital.kokonut.eth',
    operator_wallet: '0x3394C45b5938127EB56603A6051dF26CFAF08C26',
    registry_chain: 'base',
    capability_manifest_cid: 'local://sha256/capital-efficiency-manifest',
    payment_token: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    base_rate_usdc: '9.000000',
    marketplace_source: 'Kokonut-Intelligence',
    agent_state: 'active',
    metadata: { agentType: 'capital-analyst', description: 'Analyzes capital efficiency across farm investments.' },
  },
  {
    agent_name: 'kokonut-open-source-capitalist',
    ens_subdomain: 'osc.kokonut.eth',
    operator_wallet: '0x3394C45b5938127EB56603A6051dF26CFAF08C26',
    registry_chain: 'base',
    capability_manifest_cid: 'local://sha256/osc-manifest',
    payment_token: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    base_rate_usdc: '8.000000',
    marketplace_source: 'Kokonut-Intelligence',
    agent_state: 'active',
    metadata: { agentType: 'ip-strategist', description: 'Balances open-source knowledge sharing with sustainable revenue generation.' },
  },
  {
    agent_name: 'kokonut-resilience',
    ens_subdomain: 'resilience.kokonut.eth',
    operator_wallet: '0x3394C45b5938127EB56603A6051dF26CFAF08C26',
    registry_chain: 'base',
    capability_manifest_cid: 'local://sha256/resilience-manifest',
    payment_token: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    base_rate_usdc: '7.000000',
    marketplace_source: 'Kokonut-Intelligence',
    agent_state: 'active',
    metadata: { agentType: 'resilience-analyst', description: 'Assesses farm resilience to climate, market, and social shocks.' },
  },
  {
    agent_name: 'kokonut-ebf-evidence-gap',
    ens_subdomain: 'evidence.kokonut.eth',
    operator_wallet: '0x3394C45b5938127EB56603A6051dF26CFAF08C26',
    registry_chain: 'base',
    capability_manifest_cid: 'local://sha256/ebf-evidence-gap-manifest',
    payment_token: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    base_rate_usdc: '6.000000',
    marketplace_source: 'Kokonut-Intelligence',
    agent_state: 'active',
    metadata: { agentType: 'evidence-analyst', description: 'Identifies evidence gaps in EBF scoring and farm data collection.' },
  },
];

async function getExistingAgents(): Promise<Map<string, string>> {
  const res = await fetch(`${DIRECTUS_URL}/items/agent_identity?limit=100&fields=id,agent_name`, { headers: HEADERS });
  const data = await res.json();
  const map = new Map<string, string>();
  for (const agent of data?.data || []) {
    map.set(agent.agent_name, agent.id);
  }
  return map;
}

async function createAgent(agent: AgentSeed): Promise<string | null> {
  try {
    const res = await fetch(`${DIRECTUS_URL}/items/agent_identity`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify(agent),
    });
    const data = await res.json();
    if (res.ok) {
      console.log(`  ✓ Created ${agent.agent_name} (id: ${data?.data?.id})`);
      return data?.data?.id;
    } else {
      console.error(`  ✗ Failed to create ${agent.agent_name}:`, data?.errors?.[0]?.message || res.statusText);
      return null;
    }
  } catch (err) {
    console.error(`  ✗ Error creating ${agent.agent_name}:`, err);
    return null;
  }
}

async function updateAgent(id: string, agent: AgentSeed): Promise<boolean> {
  try {
    const res = await fetch(`${DIRECTUS_URL}/items/agent_identity/${id}`, {
      method: 'PATCH',
      headers: HEADERS,
      body: JSON.stringify({
        operator_wallet: agent.operator_wallet,
        capability_manifest_cid: agent.capability_manifest_cid,
        marketplace_source: agent.marketplace_source,
        metadata: agent.metadata,
        agent_state: agent.agent_state,
      }),
    });
    if (res.ok) {
      console.log(`  ✓ Updated ${agent.agent_name} (id: ${id})`);
      return true;
    } else {
      const data = await res.json();
      console.error(`  ✗ Failed to update ${agent.agent_name}:`, data?.errors?.[0]?.message || res.statusText);
      return false;
    }
  } catch (err) {
    console.error(`  ✗ Error updating ${agent.agent_name}:`, err);
    return false;
  }
}

async function main() {
  console.log('Seeding Kokonut Intelligence agents in Directus...');
  console.log(`Directus URL: ${DIRECTUS_URL}`);
  console.log('');

  const existing = await getExistingAgents();
  console.log(`Found ${existing.size} existing agents`);
  console.log('');

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const agent of AGENTS) {
    const existingId = existing.get(agent.agent_name);
    if (existingId) {
      await updateAgent(existingId, agent);
      updated++;
    } else {
      const id = await createAgent(agent);
      if (id) created++;
      else skipped++;
    }
  }

  console.log('');
  console.log('Summary');
  console.log('=======');
  console.log(`Created: ${created} | Updated: ${updated} | Skipped: ${skipped} | Total: ${AGENTS.length}`);
}

main().catch(console.error);
