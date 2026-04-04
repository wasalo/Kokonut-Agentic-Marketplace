import { publicClient, CONTRACTS, IDENTITY_REGISTRY_ABI, REPUTATION_ABI } from '../client.js';

interface GetAgentArgs {
  agentId: string;
}

interface GetAgentByAddressArgs {
  address: string;
}

interface ListAgentsArgs {
  start?: string;
  count?: string;
}

interface GetReputationArgs {
  address: string;
}

interface AgentTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, { type: string; description: string }>;
    required?: string[];
  };
  handler: (args: unknown) => Promise<unknown>;
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

async function getAgent(args: GetAgentArgs): Promise<unknown> {
  const { agentId } = args;

  const agent = (await publicClient.readContract({
    address: CONTRACTS.erc8004Registry,
    abi: IDENTITY_REGISTRY_ABI,
    functionName: 'getAgent',
    args: [BigInt(agentId)],
  })) as any;

  const metadata = decodeAgentMetadata(agent.agentURI);
  const reputation = (await publicClient.readContract({
    address: CONTRACTS.erc8004Reputation,
    abi: REPUTATION_ABI,
    functionName: 'getAgentReputation',
    args: [agent.owner],
  })) as any;

  return {
    id: agentId,
    owner: agent.owner,
    agentWallet: agent.agentWallet,
    isActive: agent.isActive,
    metadata: metadata || { rawUri: agent.agentURI },
    reputation: {
      average: Number(reputation.average) / 10,
      total: reputation.total.toString(),
      providers: reputation.providers.toString(),
    },
    profileUrl: `https://kokonut.network/identity/${agentId}`,
  };
}

async function getAgentByAddress(args: GetAgentByAddressArgs): Promise<unknown> {
  const { address } = args;

  const isAgent = (await publicClient.readContract({
    address: CONTRACTS.erc8004Registry,
    abi: IDENTITY_REGISTRY_ABI,
    functionName: 'isAgent',
    args: [address as `0x${string}`],
  })) as boolean;

  if (!isAgent) {
    return {
      isRegistered: false,
      address,
      message: 'This address is not registered as an agent',
    };
  }

  const currentAgentId = (await publicClient.readContract({
    address: CONTRACTS.erc8004Registry,
    abi: IDENTITY_REGISTRY_ABI,
    functionName: 'getCurrentAgentId',
    args: [],
  })) as bigint;

  let agentId: bigint | null = null;
  let agent: any = null;

  for (let i = BigInt(1); i <= currentAgentId; i++) {
    try {
      const result = (await publicClient.readContract({
        address: CONTRACTS.erc8004Registry,
        abi: IDENTITY_REGISTRY_ABI,
        functionName: 'getAgent',
        args: [i],
      })) as any;

      if (result.owner.toLowerCase() === address.toLowerCase()) {
        agentId = i;
        agent = result;
        break;
      }
    } catch {
      // Skip invalid agents
    }
  }

  if (!agent) {
    return {
      isRegistered: false,
      address,
      message: 'Agent not found',
    };
  }

  const metadata = decodeAgentMetadata(agent.agentURI);
  const reputation = (await publicClient.readContract({
    address: CONTRACTS.erc8004Reputation,
    abi: REPUTATION_ABI,
    functionName: 'getAgentReputation',
    args: [agent.owner],
  })) as any;

  return {
    id: agentId?.toString(),
    owner: agent.owner,
    agentWallet: agent.agentWallet,
    isActive: agent.isActive,
    metadata: metadata || { rawUri: agent.agentURI },
    reputation: {
      average: Number(reputation.average) / 10,
      total: reputation.total.toString(),
      providers: reputation.providers.toString(),
    },
    profileUrl: `https://kokonut.network/identity/${agentId}`,
  };
}

async function listAgents(args: ListAgentsArgs): Promise<unknown> {
  const start = BigInt(args.start || '0');
  const count = BigInt(args.count || '20');

  const currentAgentId = (await publicClient.readContract({
    address: CONTRACTS.erc8004Registry,
    abi: IDENTITY_REGISTRY_ABI,
    functionName: 'getCurrentAgentId',
    args: [],
  })) as bigint;

  const totalAgents = Number(currentAgentId);
  const agents = [];

  for (
    let i = totalAgents - Number(start);
    i > Math.max(totalAgents - Number(start) - Number(count), 0);
    i--
  ) {
    try {
      const agent = (await publicClient.readContract({
        address: CONTRACTS.erc8004Registry,
        abi: IDENTITY_REGISTRY_ABI,
        functionName: 'getAgent',
        args: [BigInt(i)],
      })) as any;

      const metadata = decodeAgentMetadata(agent.agentURI);

      agents.push({
        id: i.toString(),
        owner: agent.owner,
        name: metadata?.name || 'Unknown',
        isActive: agent.isActive,
      });
    } catch {
      // Skip invalid agents
    }
  }

  return {
    total: totalAgents,
    agents,
  };
}

async function getReputation(args: GetReputationArgs): Promise<unknown> {
  const { address } = args;

  const isAgent = (await publicClient.readContract({
    address: CONTRACTS.erc8004Registry,
    abi: IDENTITY_REGISTRY_ABI,
    functionName: 'isAgent',
    args: [address as `0x${string}`],
  })) as boolean;

  if (!isAgent) {
    return {
      address,
      isRegistered: false,
      message: 'This address is not registered as an agent',
    };
  }

  const reputation = (await publicClient.readContract({
    address: CONTRACTS.erc8004Reputation,
    abi: REPUTATION_ABI,
    functionName: 'getAgentReputation',
    args: [address as `0x${string}`],
  })) as any;

  const average = Number(reputation.average) / 10;
  const total = Number(reputation.total);

  let tier = 'Newcomer';
  if (total >= 50 && average >= 4.5) tier = 'Gold';
  else if (total >= 20 && average >= 4.0) tier = 'Silver';
  else if (total >= 10 && average >= 3.5) tier = 'Bronze';

  return {
    address,
    isRegistered: true,
    averageRating: average.toFixed(1),
    totalFeedbacks: total.toString(),
    providers: reputation.providers.toString(),
    tier,
    score: average * 10,
  };
}

export const agentsTools: AgentTool[] = [
  {
    name: 'agents_get',
    description: 'Get details of a specific agent by ID',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: { type: 'string', description: 'The agent ID (uint256 as string)' },
      },
      required: ['agentId'],
    },
    handler: getAgent,
  },
  {
    name: 'agents_get_by_address',
    description: 'Look up an agent by their Ethereum address',
    inputSchema: {
      type: 'object',
      properties: {
        address: { type: 'string', description: "Agent's Ethereum address" },
      },
      required: ['address'],
    },
    handler: getAgentByAddress,
  },
  {
    name: 'agents_list',
    description: 'List registered agents on the platform',
    inputSchema: {
      type: 'object',
      properties: {
        start: { type: 'string', description: 'Starting index (default: 0)' },
        count: {
          type: 'string',
          description: 'Number of agents to return (default: 20, max: 100)',
        },
      },
    },
    handler: listAgents,
  },
  {
    name: 'agents_reputation',
    description: 'Get the reputation and rating of an agent',
    inputSchema: {
      type: 'object',
      properties: {
        address: { type: 'string', description: "Agent's Ethereum address" },
      },
      required: ['address'],
    },
    handler: getReputation,
  },
];
