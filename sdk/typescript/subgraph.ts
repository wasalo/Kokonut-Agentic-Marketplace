/**
 * Kokonut Agent SDK - Subgraph Module
 * GraphQL queries for indexed blockchain data via TheGraph
 */

const SUBGRAPH_URL = 'https://api.studio.thegraph.com/query/1721897/kokonut-sepolia/v0.2.1';

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

async function query<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch(SUBGRAPH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) throw new Error(`GraphQL error: ${response.status}`);

  const json = (await response.json()) as GraphQLResponse<T>;
  if (json.errors) throw new Error(`GraphQL error: ${json.errors[0].message}`);

  return json.data as T;
}

export interface SubgraphAgent {
  id: string;
  agentId: string;
  owner: string;
  name: string | null;
  capabilities: string[] | null;
  source: string | null;
  isActive: boolean;
}

export interface SubgraphJob {
  id: string;
  jobId: string;
  client: string;
  provider: string | null;
  status: number;
  budget: string;
  createdAt: string;
}

export interface SubgraphStats {
  totalAgents: number;
  totalJobs: number;
  totalServices: number;
}

const GET_AGENTS = `
  query GetAgents($first: Int!, $skip: Int!) {
    agents(first: $first, skip: $skip, orderBy: createdAt, orderDirection: desc) {
      id agentId owner name capabilities source isActive
    }
  }
`;

const GET_AGENTS_BY_SOURCE = `
  query GetAgentsBySource($first: Int!, $skip: Int!, $source: String!) {
    agents(first: $first, skip: $skip, where: { source: $source }, orderBy: createdAt, orderDirection: desc) {
      id agentId owner name capabilities source isActive
    }
  }
`;

const GET_JOBS = `
  query GetJobs($first: Int!, $skip: Int!) {
    jobs(first: $first, skip: $skip, orderBy: createdAt, orderDirection: desc) {
      id jobId client provider status budget createdAt
    }
  }
`;

const GET_STATS = `
  query GetStats {
    platformStats(id: "platform") {
      totalAgents totalJobs totalServices
    }
  }
`;

export class SubgraphModule {
  async getAgents(first = 20, skip = 0): Promise<SubgraphAgent[]> {
    const data = await query<{ agents: SubgraphAgent[] }>(GET_AGENTS, { first, skip });
    return data.agents;
  }

  async getKokonutAgents(first = 20, skip = 0): Promise<SubgraphAgent[]> {
    const data = await query<{ agents: SubgraphAgent[] }>(GET_AGENTS_BY_SOURCE, {
      first,
      skip,
      source: 'kokonut-marketplace',
    });
    return data.agents;
  }

  async getJobs(first = 20, skip = 0): Promise<SubgraphJob[]> {
    const data = await query<{ jobs: SubgraphJob[] }>(GET_JOBS, { first, skip });
    return data.jobs;
  }

  async getStats(): Promise<SubgraphStats> {
    const data = await query<{ platformStats: SubgraphStats }>(GET_STATS);
    return data.platformStats;
  }
}
