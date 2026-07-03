'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { graphqlQuery } from '@/lib/graphql/client';
import { GET_AGENTS_BY_OWNER_FULL } from '@/lib/graphql/queries/owners';
import { decodeAgentMetadata } from '@/lib/metadata';

const STALE_TIME = 5 * 60 * 1000;
const GC_TIME = 30 * 60 * 1000;

interface SubgraphAgentFull {
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
  agents: SubgraphAgentFull[];
  agentEntities: { id: string }[];
}

export function useWalletAgentsFromSubgraph(ownerAddress: `0x${string}` | undefined) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['subgraph-wallet-agents', ownerAddress],
    queryFn: () => graphqlQuery<OwnerResponse>(GET_AGENTS_BY_OWNER_FULL, {
      owner: ownerAddress?.toLowerCase(),
      first: 100,
    }),
    enabled: !!ownerAddress,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });

  const agents = useMemo(() => {
    if (!data?.agents) return [];

    return data.agents.map(a => {
      const metadata = a.metadataURI ? decodeAgentMetadata(a.metadataURI) : null;
      return {
        id: Number(a.agentId),
        owner: a.owner as `0x${string}`,
        agentURI: a.metadataURI || '',
        metadata,
        hasKokonutTag: a.source === 'kokonut-marketplace' || a.source === 'kokonut-intelligence' || metadata?.source === 'kokonut-marketplace' || metadata?.source === 'kokonut-intelligence',
      };
    });
  }, [data]);

  const taggedAgents = useMemo(() => agents.filter(a => a.hasKokonutTag), [agents]);
  const untaggedAgents = useMemo(() => agents.filter(a => !a.hasKokonutTag), [agents]);

  return {
    agents,
    taggedAgents,
    untaggedAgents,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
