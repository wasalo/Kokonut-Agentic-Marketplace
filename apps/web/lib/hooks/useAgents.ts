'use client';

import { useQuery } from '@tanstack/react-query';
import { graphqlQuery } from '@/lib/graphql/client';
import { decodeAgentMetadata, type AgentMetadata8004 } from '@/lib/metadata';

const STALE_TIME = 5 * 60 * 1000;
const GC_TIME = 30 * 60 * 1000;

interface SubgraphAgent {
  id: string;
  agentId: string;
  owner: string;
  name: string | null;
  metadataURI: string | null;
  isActive: boolean;
  source: string | null;
  createdAt: string;
}

export interface AgentListItem {
  id: bigint;
  owner: `0x${string}`;
  name: string;
  metadataURI: string;
  isActive: boolean;
  source: string | null;
  metadata: AgentMetadata8004 | null;
}

interface UseAgentsReturn {
  agents: AgentListItem[];
  totalCount: number;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useAgents(start: number = 0, count: number = 12): UseAgentsReturn {
  const queryKey = ['agents-list', start, count];

  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: () => graphqlQuery<{ agents: SubgraphAgent[]; _meta?: { totalCount?: number } }>(
      `query GetAgents($first: Int!, $skip: Int!) {
        agents(
          first: $first
          skip: $skip
          orderBy: createdAt
          orderDirection: desc
        ) {
          id agentId owner name metadataURI isActive source createdAt
        }
        _meta {
          totalCount
        }
      }`,
      { first: count, skip: start }
    ),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });

  const agents: AgentListItem[] = (data?.agents ?? []).map(a => {
    const metadata = a.metadataURI ? decodeAgentMetadata(a.metadataURI) : null;
    return {
      id: BigInt(a.agentId),
      owner: a.owner as `0x${string}`,
      name: metadata?.name || a.name || `Agent #${a.agentId}`,
      metadataURI: a.metadataURI || '',
      isActive: a.isActive,
      source: a.source,
      metadata,
    };
  });

  return {
    agents,
    totalCount: data?._meta?.totalCount ?? 0,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
