import { createServer, IncomingMessage, ServerResponse } from 'http';
import { parse } from 'url';
import { publicClient, CONTRACTS, JOB_STATUS, BIDDING_SYSTEM_ABI } from './client.js';
import { createWallet, listWallets, getWallet, signMessage } from '@open-wallet-standard/core';
import { IntelligenceModule } from '../../../apps/web/lib/intelligence/client';

const PORT = parseInt(process.env.MCP_PORT || '3100', 10);
const HOST = process.env.MCP_HOST || '127.0.0.1';
const MCP_API_KEY = process.env.MCP_API_KEY || '';

const intelligence = new IntelligenceModule({
  baseUrl: process.env.NEXT_PUBLIC_INTELLIGENCE_API_URL ?? 'http://localhost:8055',
  token: process.env.INTELLIGENCE_API_TOKEN ?? process.env.NEXT_PUBLIC_INTELLIGENCE_API_TOKEN,
});

function isLoopbackHost(host: string): boolean {
  return host === '127.0.0.1' || host === '::1' || host === 'localhost';
}

function isLocalOrigin(origin: string): boolean {
  return origin.startsWith('http://127.0.0.1:') || origin.startsWith('http://localhost:');
}

function isPublicBind(): boolean {
  return !isLoopbackHost(HOST);
}

function authenticate(req: IncomingMessage): boolean {
  if (!MCP_API_KEY) return !isPublicBind();
  const authHeader = req.headers['authorization'] || '';
  if (authHeader === `Bearer ${MCP_API_KEY}`) return true;
  const apiKeyParam = (new URL(req.url || '', `http://${HOST}:${PORT}`)).searchParams.get('api_key');
  return apiKeyParam === MCP_API_KEY;
}

function decodeAgentMetadata(uri: string): Record<string, unknown> | null {
  try {
    if (uri.startsWith('data:')) {
      const parts = uri.split(',');
      if (parts.length === 2 && parts[0].includes('base64')) {
        const json = Buffer.from(parts[1], 'base64').toString();
        return JSON.parse(json);
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function getJob(jobId: string) {
  const job = (await publicClient.readContract({
    address: CONTRACTS.agenticCommerce,
    abi: [
      {
        name: 'getJob',
        type: 'function',
        inputs: [{ name: 'jobId', type: 'uint256' }],
        outputs: [
          {
            type: 'tuple',
            components: [
              { name: 'id', type: 'uint256' },
              { name: 'client', type: 'address' },
              { name: 'provider', type: 'address' },
              { name: 'description', type: 'string' },
              { name: 'budget', type: 'uint256' },
              { name: 'status', type: 'uint8' },
            ],
          },
        ],
        stateMutability: 'view',
      },
    ] as const,
    functionName: 'getJob',
    args: [BigInt(jobId)],
  })) as any;

  return {
    id: job.id.toString(),
    client: job.client,
    provider: job.provider,
    description: job.description,
    budget: (Number(job.budget) / 1e6).toFixed(2),
    status: JOB_STATUS[job.status as keyof typeof JOB_STATUS] || 'Unknown',
  };
}

async function listJobs(start = 0, count = 20) {
  const currentJobId = (await publicClient.readContract({
    address: CONTRACTS.agenticCommerce,
    abi: [
      {
        name: 'jobCounter',
        type: 'function',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
      },
    ] as const,
    functionName: 'jobCounter',
    args: [],
  })) as bigint;

  const jobs = [];
  const totalJobs = Number(currentJobId);
  const endIndex = Math.min(start + count, totalJobs);

  for (let i = totalJobs - start; i > Math.max(totalJobs - endIndex, 0); i--) {
    try {
      const job = await getJob(i.toString());
      jobs.push(job);
    } catch {
      // Skip invalid jobs
    }
  }

  return { total: totalJobs, jobs };
}

async function getService(serviceId: string) {
  const service = (await publicClient.readContract({
    address: CONTRACTS.serviceRegistry,
    abi: [
      {
        name: 'getService',
        type: 'function',
        inputs: [{ name: 'serviceId', type: 'uint256' }],
        outputs: [
          {
            type: 'tuple',
            components: [
              { name: 'id', type: 'uint256' },
              { name: 'provider', type: 'address' },
              { name: 'name', type: 'string' },
              { name: 'description', type: 'string' },
              { name: 'price', type: 'uint256' },
              { name: 'isActive', type: 'bool' },
            ],
          },
        ],
        stateMutability: 'view',
      },
    ] as const,
    functionName: 'getService',
    args: [BigInt(serviceId)],
  })) as any;

  return {
    id: service.id.toString(),
    provider: service.provider,
    name: service.name,
    description: service.description,
    price: (Number(service.price) / 1e6).toFixed(2),
    isActive: service.isActive,
  };
}

async function listServices(start = 0, count = 20) {
  const serviceIds = (await publicClient.readContract({
    address: CONTRACTS.serviceRegistry,
    abi: [
      {
        name: 'getServices',
        type: 'function',
        inputs: [
          { name: 'start', type: 'uint256' },
          { name: 'count', type: 'uint256' },
        ],
        outputs: [{ name: '', type: 'uint256[]' }],
        stateMutability: 'view',
      },
    ] as const,
    functionName: 'getServices',
    args: [BigInt(start), BigInt(count)],
  })) as bigint[];

  const services = [];
  for (const id of serviceIds) {
    try {
      const service = await getService(id.toString());
      services.push(service);
    } catch {
      // Skip invalid services
    }
  }

  return services;
}

async function getAgent(agentId: string) {
  const agent = (await publicClient.readContract({
    address: CONTRACTS.erc8004Registry,
    abi: [
      {
        name: 'getAgent',
        type: 'function',
        inputs: [{ name: 'agentId', type: 'uint256' }],
        outputs: [
          { name: 'owner', type: 'address' },
          { name: 'agentURI', type: 'string' },
          { name: 'isActive', type: 'bool' },
        ],
        stateMutability: 'view',
      },
    ] as const,
    functionName: 'getAgent',
    args: [BigInt(agentId)],
  })) as any;

  const metadata = decodeAgentMetadata(agent.agentURI);

  return {
    id: agentId,
    owner: agent.owner,
    isActive: agent.isActive,
    name: metadata?.name || 'Unknown',
    capabilities: metadata?.capabilities || [],
  };
}

async function getAgentReputation(address: string) {
  try {
    const reputation = (await publicClient.readContract({
      address: CONTRACTS.erc8004Reputation,
      abi: [
        {
          name: 'getAgentReputation',
          type: 'function',
          inputs: [{ name: 'agent', type: 'address' }],
          outputs: [
            { name: 'average', type: 'int256' },
            { name: 'total', type: 'uint256' },
          ],
          stateMutability: 'view',
        },
      ] as const,
      functionName: 'getAgentReputation',
      args: [address as `0x${string}`],
    })) as any;

    return {
      averageRating: (Number(reputation.average) / 10).toFixed(1),
      totalFeedbacks: reputation.total.toString(),
    };
  } catch {
    return {
      averageRating: '0.0',
      totalFeedbacks: '0',
    };
  }
}

const SESSION_STATUS: Record<number, string> = {
  0: 'Active',
  1: 'BiddingClosed',
  2: 'WinnerSelected',
  3: 'JobCreated',
  4: 'Completed',
  5: 'Cancelled',
};

async function getBiddingSession(sessionId: string) {
  try {
    const session = (await publicClient.readContract({
      address: CONTRACTS.biddingSystem,
      abi: BIDDING_SYSTEM_ABI,
      functionName: 'getSession',
      args: [BigInt(sessionId)],
    })) as unknown as {
      id: bigint; creator: string; evaluator: string; maxBudget: bigint;
      deadline: bigint; revealWindowEnd: bigint; metadata: string;
      serviceId: bigint; jobId: bigint; winner: string; winningBidId: bigint;
      jobCreated: boolean; status: number; useRandomEvaluator: boolean;
      paymentToken: string;
    };
    return {
      sessionId: Number(session.id),
      creator: session.creator,
      evaluator: session.evaluator,
      maxBudget: formatUnits(session.maxBudget, 18),
      deadline: new Date(Number(session.deadline) * 1000).toISOString(),
      revealWindowEnd: new Date(Number(session.revealWindowEnd) * 1000).toISOString(),
      serviceId: Number(session.serviceId),
      jobId: Number(session.jobId),
      winner: session.winner === '0x0000000000000000000000000000000000000000' ? null : session.winner,
      winningBidId: Number(session.winningBidId),
      jobCreated: session.jobCreated,
      status: SESSION_STATUS[session.status] || 'Unknown',
      useRandomEvaluator: session.useRandomEvaluator,
      paymentToken: session.paymentToken === '0x0000000000000000000000000000000000000000' ? 'ETH' : session.paymentToken,
    };
  } catch {
    return { error: `Bidding session ${sessionId} not found` };
  }
}

async function listBiddingSessions(start: number, count: number) {
  try {
    const totalSessions = Number(
      (await publicClient.readContract({
        address: CONTRACTS.biddingSystem,
        abi: BIDDING_SYSTEM_ABI,
        functionName: 'sessionCounter',
        args: [],
      })) as bigint
    );

    const sessions = [];
    const from = Math.max(1, totalSessions - start - count + 1);
    const to = Math.max(1, totalSessions - start);
    for (let i = from; i <= to; i++) {
      const session = await getBiddingSession(i.toString());
      sessions.push(session);
    }
    return { sessions, total: totalSessions, range: { from, to } };
  } catch {
    return { error: 'Failed to list bidding sessions' };
  }
}

const EFP_API_BASE = 'https://api.ethfollow.xyz/api/v1';

async function efpFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${EFP_API_BASE}${path}`);
  if (!response.ok) throw new Error(`EFP API error: ${response.status}`);
  const json = await response.json() as { data?: T; error?: string };
  if (json.error) throw new Error(`EFP API error: ${json.error}`);
  return json.data as T;
}

async function getEfpStats(address: string) {
  const stats = await efpFetch<{ followers_count: string; following_count: string }>(
    `/users/${address}/stats`
  );
  return {
    address,
    followersCount: stats.followers_count,
    followingCount: stats.following_count,
  };
}

async function getEfpFollowers(address: string, limit = 10, offset = 0) {
  const data = await efpFetch<{ followers: Array<{ address: string; tags: string[] }> }>(
    `/users/${address}/followers?limit=${limit}&offset=${offset}`
  );
  return {
    address,
    followers: (data.followers || []).map(f => ({
      address: f.address,
      tags: f.tags,
    })),
    count: (data.followers || []).length,
  };
}

async function getEfpFollowing(address: string, limit = 10, offset = 0) {
  const data = await efpFetch<{ following: Array<{ address: string; tags: string[] }> }>(
    `/users/${address}/following?limit=${limit}&offset=${offset}`
  );
  return {
    address,
    following: (data.following || []).map(f => ({
      address: f.address,
      tags: f.tags,
    })),
    count: (data.following || []).length,
  };
}

async function handleToolCall(toolName: string, args: Record<string, unknown>) {
  switch (toolName) {
    case 'jobs_get':
      return getJob(args.jobId as string);
    case 'jobs_list':
      return listJobs(Number(args.start) || 0, Number(args.count) || 20);
    case 'services_get':
      return getService(args.serviceId as string);
    case 'services_list':
      return listServices(Number(args.start) || 0, Number(args.count) || 20);
    case 'agents_get':
      return getAgent(args.agentId as string);
    case 'agents_reputation':
      return getAgentReputation(args.address as string);
    case 'ows_create_wallet':
      return createWallet(args.name as string, args.passphrase as string);
    case 'ows_import_wallet':
      if (args.importType === 'mnemonic') {
        return {
          wallet: createWallet(
            args.name as string,
            args.passphrase as string,
            128,
            args.value as string
          ),
        };
      } else {
        return { wallet: createWallet(args.name as string, args.passphrase as string) };
      }
    case 'ows_list_wallets':
      return listWallets();
    case 'ows_sign_message':
      throw new Error('ows_sign_message is disabled for security. Use a wallet UI to sign messages.');
    case 'efp_stats':
      return getEfpStats(args.address as string);
    case 'efp_followers':
      return getEfpFollowers(
        args.address as string,
        Number(args.limit) || 10,
        Number(args.offset) || 0
      );
    case 'efp_following':
      return getEfpFollowing(
        args.address as string,
        Number(args.limit) || 10,
        Number(args.offset) || 0
      );
    case 'bidding_session_get':
      return getBiddingSession(args.sessionId as string);
    case 'bidding_sessions_list':
      return listBiddingSessions(Number(args.start) || 0, Number(args.count) || 20);
    // Intelligence Tools
    case 'intelligence_farms_list': {
      const limit = args.limit != null ? Number(args.limit) : undefined;
      return intelligence.listFarms(limit != null ? { limit } : undefined);
    }
    case 'intelligence_farm_get':
      return intelligence.getFarm(args.id as string);
    case 'intelligence_mrv_events': {
      const farmId = (args.farmId as string) || undefined;
      const limit = args.limit != null ? Number(args.limit) : undefined;
      const opts = limit != null ? { limit } : undefined;
      return farmId ? intelligence.listMRVByFarm(farmId, opts) : intelligence.listMRVEvents(opts);
    }
    case 'intelligence_attestation_get': {
      const id = args.id as string;
      try {
        return await intelligence.getAttestation(id);
      } catch {
        return intelligence.listAttestationsByUID(id);
      }
    }
    case 'intelligence_agents_list':
      return intelligence.listAgents();
    case 'intelligence_agent_capabilities':
      return intelligence.getManifest(args.agentId as string);
    case 'intelligence_attestations': {
      const limit = args.limit != null ? Number(args.limit) : undefined;
      return intelligence.listAttestations(limit != null ? { limit } : undefined);
    }
    case 'intelligence_manifest_get':
      return intelligence.getManifest(args.agentId as string);
    case 'intelligence_tasks_list': {
      const agentId = (args.agentId as string) || undefined;
      const limit = args.limit != null ? Number(args.limit) : undefined;
      const opts = limit != null ? { limit } : undefined;
      return agentId ? intelligence.listTasksByAgent(agentId, opts) : intelligence.listTasks(opts);
    }
    case 'intelligence_ai_summaries': {
      const limit = args.limit != null ? Number(args.limit) : undefined;
      return intelligence.listAISummaries(limit != null ? { limit } : undefined);
    }
    case 'intelligence_reports': {
      const limit = args.limit != null ? Number(args.limit) : undefined;
      return intelligence.listReports(limit != null ? { limit } : undefined);
    }
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

const TOOLS = [
  {
    name: 'jobs_get',
    description: 'Get job details by ID',
    inputSchema: {
      type: 'object',
      properties: { jobId: { type: 'string', description: 'Job ID' } },
      required: ['jobId'],
    },
  },
  {
    name: 'jobs_list',
    description: 'List recent jobs',
    inputSchema: {
      type: 'object',
      properties: { start: { type: 'string' }, count: { type: 'string' } },
    },
  },
  {
    name: 'services_get',
    description: 'Get service details by ID',
    inputSchema: {
      type: 'object',
      properties: { serviceId: { type: 'string' } },
      required: ['serviceId'],
    },
  },
  {
    name: 'services_list',
    description: 'List services',
    inputSchema: {
      type: 'object',
      properties: { start: { type: 'string' }, count: { type: 'string' } },
    },
  },
  {
    name: 'agents_get',
    description: 'Get agent details by ID',
    inputSchema: {
      type: 'object',
      properties: { agentId: { type: 'string' } },
      required: ['agentId'],
    },
  },
  {
    name: 'agents_reputation',
    description: 'Get agent reputation',
    inputSchema: {
      type: 'object',
      properties: { address: { type: 'string' } },
      required: ['address'],
    },
  },
  // OWS Wallet Tools
  {
    name: 'ows_create_wallet',
    description: 'Create a new OWS wallet with a BIP-39 mnemonic',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Wallet name' },
        passphrase: { type: 'string', description: 'Wallet passphrase (8-128 chars)' },
      },
      required: ['name', 'passphrase'],
    },
  },
  {
    name: 'ows_import_wallet',
    description: 'Import an OWS wallet from a mnemonic or private key',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Wallet name' },
        passphrase: { type: 'string', description: 'Wallet passphrase' },
        importType: {
          type: 'string',
          enum: ['mnemonic', 'privateKey'],
          description: 'Import type',
        },
        value: { type: 'string', description: 'Mnemonic phrase or private key hex' },
      },
      required: ['name', 'passphrase', 'importType', 'value'],
    },
  },
  {
    name: 'ows_list_wallets',
    description: 'List all OWS wallets in the vault',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  // ows_sign_message disabled for security
  // EFP Tools
  {
    name: 'efp_stats',
    description: 'Get EFP follower and following counts for an Ethereum address',
    inputSchema: {
      type: 'object',
      properties: {
        address: { type: 'string', description: 'Ethereum address' },
      },
      required: ['address'],
    },
  },
  {
    name: 'efp_followers',
    description: 'Get followers list for an Ethereum address from EFP',
    inputSchema: {
      type: 'object',
      properties: {
        address: { type: 'string', description: 'Ethereum address' },
        limit: { type: 'string', description: 'Results per page (default: 10)' },
        offset: { type: 'string', description: 'Result offset (default: 0)' },
      },
      required: ['address'],
    },
  },
  {
    name: 'efp_following',
    description: 'Get following list for an Ethereum address from EFP',
    inputSchema: {
      type: 'object',
      properties: {
        address: { type: 'string', description: 'Ethereum address' },
        limit: { type: 'string', description: 'Results per page (default: 10)' },
        offset: { type: 'string', description: 'Result offset (default: 0)' },
      },
      required: ['address'],
    },
  },
  // BiddingSystem Tools
  {
    name: 'bidding_session_get',
    description: 'Get bidding session details by session ID',
    inputSchema: {
      type: 'object',
      properties: { sessionId: { type: 'string', description: 'Bidding session ID' } },
      required: ['sessionId'],
    },
  },
  {
    name: 'bidding_sessions_list',
    description: 'List recent bidding sessions',
    inputSchema: {
      type: 'object',
      properties: { start: { type: 'string' }, count: { type: 'string' } },
    },
  },
  // Intelligence Tools
  {
    name: 'intelligence_farms_list',
    description: 'List all farms in Kokonut Intelligence',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Maximum number of results to return' },
      },
    },
  },
  {
    name: 'intelligence_farm_get',
    description: 'Get a single farm by Directus ID',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'Directus farm ID' } },
      required: ['id'],
    },
  },
  {
    name: 'intelligence_mrv_events',
    description: 'List MRV (measurement, reporting, verification) events',
    inputSchema: {
      type: 'object',
      properties: {
        farmId: { type: 'string', description: 'Filter events by farm ID' },
        limit: { type: 'number', description: 'Maximum number of results to return' },
      },
    },
  },
  {
    name: 'intelligence_attestation_get',
    description: 'Get an attestation by Directus ID or EAS UID',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Directus attestation ID or attestation UID' },
      },
      required: ['id'],
    },
  },
  {
    name: 'intelligence_agents_list',
    description: 'List all Intelligence agents',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'intelligence_agent_capabilities',
    description: 'Get the capability manifest for an Intelligence agent',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: { type: 'string', description: 'Directus agent UUID' },
      },
      required: ['agentId'],
    },
  },
  {
    name: 'intelligence_ai_summaries',
    description: 'List AI summaries',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Maximum number of results to return' },
      },
    },
  },
  {
    name: 'intelligence_attestations',
    description: 'List EAS attestation records',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Maximum number of results to return' },
      },
    },
  },
  {
    name: 'intelligence_manifest_get',
    description: 'Get the capability manifest for an agent',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: { type: 'string', description: 'Directus agent UUID' },
      },
      required: ['agentId'],
    },
  },
  {
    name: 'intelligence_tasks_list',
    description: 'List agent tasks, optionally filtered by agent ID',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: { type: 'string', description: 'Filter tasks by agent ID' },
        limit: { type: 'number', description: 'Maximum number of results to return' },
      },
    },
  },
  {
    name: 'intelligence_reports',
    description: 'List report snapshots',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Maximum number of results to return' },
      },
    },
  },
];

const RESOURCES = [
  { uri: 'platform://stats', name: 'Platform Statistics', description: 'Current platform stats' },
  {
    uri: 'platform://contracts',
    name: 'Contract Addresses',
    description: 'Sepolia contract addresses',
  },
  {
    uri: 'intelligence://farms',
    name: 'Kokonut Farms',
    description: 'List of all farms in Kokonut Intelligence',
    mimeType: 'application/json',
  },
  {
    uri: 'intelligence://attestations',
    name: 'EAS Attestations',
    description: 'Attestation records from Kokonut Intelligence',
    mimeType: 'application/json',
  },
  {
    uri: 'intelligence://agents',
    name: 'Kokonut Intelligence Agents',
    description: 'List of all agents in Kokonut Intelligence',
    mimeType: 'application/json',
  },
];

const PROMPTS = [
  {
    id: 'intelligence_farm_summary',
    title: 'Farm Summary',
    description: 'Generate a summary report for a Kokonut farm',
    arguments: [{ name: 'farmId', description: 'Directus farm ID', required: true }],
  },
];

async function requestHandler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const parsedUrl = parse(req.url || '', true);
  const pathname = parsedUrl.pathname || '';

  const allowedOrigins = (process.env.MCP_ALLOWED_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean);
  const origin = req.headers.origin || '';
  const isAllowed = !origin || allowedOrigins.includes(origin) || (!isPublicBind() && isLocalOrigin(origin));

  if (!isAllowed) {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Origin not allowed' }));
    return;
  }

  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
    return;
  }

  if (!authenticate(req)) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Unauthorized' }));
    return;
  }

  if (pathname === '/tools') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ tools: TOOLS }));
    return;
  }

  if (pathname === '/resources') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ resources: RESOURCES }));
    return;
  }

  if (pathname === '/prompts') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ prompts: PROMPTS }));
    return;
  }

  if (pathname === '/mcp' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });
    req.on('end', async () => {
      try {
        const request = JSON.parse(body);
        const { method, params, id } = request;

        if (method === 'tools/list') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ jsonrpc: '2.0', id, result: { tools: TOOLS } }));
          return;
        }

        if (method === 'tools/call') {
          const { name, arguments: args } = params || {};
          const result = await handleToolCall(name, args || {});
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              jsonrpc: '2.0',
              id,
              result: { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] },
            })
          );
          return;
        }

        if (method === 'resources/list') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ jsonrpc: '2.0', id, result: { resources: RESOURCES } }));
          return;
        }

        if (method === 'resources/read') {
          const { uri } = params || {};
          let contents = '';
          if (uri === 'intelligence://farms') {
            const farms = await intelligence.listFarms();
            contents = JSON.stringify(farms, null, 2);
          } else if (uri === 'intelligence://agents') {
            const agents = await intelligence.listAgents();
            contents = JSON.stringify(agents, null, 2);
          } else if (uri === 'intelligence://attestations') {
            const attestations = await intelligence.listAttestations();
            contents = JSON.stringify(attestations, null, 2);
          } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ jsonrpc: '2.0', id, error: { code: -32601, message: `Resource not found: ${uri}` } }));
            return;
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            jsonrpc: '2.0',
            id,
            result: { contents: [{ uri, mimeType: 'application/json', text: contents }] },
          }));
          return;
        }

        if (method === 'prompts/list') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ jsonrpc: '2.0', id, result: { prompts: PROMPTS } }));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ jsonrpc: '2.0', id, result: {} }));
      } catch (error) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            jsonrpc: '2.0',
            error: {
              code: -32603,
              message: error instanceof Error ? error.message : 'Internal error',
            },
          })
        );
      }
    });
    return;
  }

  if (pathname === '/sse') {
    const headers: Record<string, string> = {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    };
    if (origin) {
      headers['Access-Control-Allow-Origin'] = origin;
      headers['Vary'] = 'Origin';
    }

    res.writeHead(200, headers);

    const welcome = `data: ${JSON.stringify({ type: 'welcome', tools: TOOLS })}\n\n`;
    res.write(welcome);

    const keepAlive = setInterval(() => {
      res.write(`data: ${JSON.stringify({ type: 'ping' })}\n\n`);
    }, 30000);

    req.on('close', () => {
      clearInterval(keepAlive);
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
}

async function main(): Promise<void> {
  return new Promise(resolve => {
    const server = createServer(requestHandler);

    server.listen(PORT, HOST, () => {
      console.log(`🚀 Kokonut MCP Server running on http://${HOST}:${PORT}`);
      console.log(`📡 Endpoints:`);
      console.log(`   - Health:    GET  http://${HOST}:${PORT}/health`);
      console.log(`   - Tools:     GET  http://${HOST}:${PORT}/tools`);
      console.log(`   - Resources: GET  http://${HOST}:${PORT}/resources`);
      console.log(`   - MCP:       POST http://${HOST}:${PORT}/mcp`);
      console.log(`   - SSE:       GET  http://${HOST}:${PORT}/sse`);
      console.log(`\n🌐 Example tool call:`);
      console.log(
        `   curl -X POST http://${HOST}:${PORT}/mcp -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"jobs_list","arguments":{}},"id":1}'`
      );
      resolve();
    });
  });
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
