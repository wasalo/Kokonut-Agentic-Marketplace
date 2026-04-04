import { createServer, IncomingMessage, ServerResponse } from 'http';
import { parse } from 'url';
import { publicClient, CONTRACTS, JOB_STATUS } from './client.js';

const PORT = parseInt(process.env.MCP_PORT || '3100', 10);
const HOST = process.env.MCP_HOST || '0.0.0.0';

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
];

const RESOURCES = [
  { uri: 'platform://stats', name: 'Platform Statistics', description: 'Current platform stats' },
  {
    uri: 'platform://contracts',
    name: 'Contract Addresses',
    description: 'Sepolia contract addresses',
  },
];

async function requestHandler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const parsedUrl = parse(req.url || '', true);
  const pathname = parsedUrl.pathname || '';

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

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
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

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
