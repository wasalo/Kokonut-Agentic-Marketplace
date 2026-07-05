'use client';

import { useQuery } from '@tanstack/react-query';
import { graphqlQuery } from '@/lib/graphql/client';
import { GET_AGENTS_BY_OWNER_FULL } from '@/lib/graphql/queries/owners';

const STALE_TIME = 5 * 60 * 1000;
const GC_TIME = 30 * 60 * 1000;

interface SubgraphAgentByOwner {
  id: string;
  agentId: string;
  owner: string;
  name: string | null;
  description: string | null;
  source: string | null;
  metadataURI: string | null;
  isActive: boolean;
  createdAt: string;
}

interface OwnerResponse {
  agents: SubgraphAgentByOwner[];
}

export function useAgentsByOwnerFromSubgraph(ownerAddress: string | undefined) {
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['subgraph-agents-by-owner', ownerAddress],
    queryFn: () => graphqlQuery<OwnerResponse>(GET_AGENTS_BY_OWNER_FULL, {
      owner: ownerAddress?.toLowerCase(),
      first: 100,
    }),
    enabled: !!ownerAddress,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });

  const agents = (data?.agents || []).map(a => ({
    id: Number(a.agentId),
    owner: a.owner as `0x${string}`,
    agentURI: a.metadataURI || '',
    name: a.name || `Agent #${a.agentId}`,
    description: a.description || '',
    source: a.source || '',
    isActive: a.isActive,
    createdAt: new Date(Number(a.createdAt) * 1000).toISOString(),
    totalScore: 0,
    starCount: 0,
    totalFeedbacks: 0,
  }));

  return {
    agents,
    isLoading: isLoading || isFetching,
    isFetching,
    error: error as Error | null,
    refetch,
  };
}
