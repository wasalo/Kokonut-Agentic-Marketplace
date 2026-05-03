'use client';

import { useQuery } from '@tanstack/react-query';
import { graphqlQuery } from '@/lib/graphql/client';
import { GET_ACTIVITY_ALL, GET_ACTIVITY_BY_TYPE, GET_ACTIVITY_BY_ACTORS } from '@/lib/graphql/queries/activity';

const STALE_TIME = 2 * 60 * 1000;
const GC_TIME = 10 * 60 * 1000;

interface SubgraphActivity {
  id: string;
  type: string;
  actor: string;
  targetId: string;
  blockNumber: string;
  timestamp: string;
  transactionHash: string;
}

interface ActivityResponse {
  activities: SubgraphActivity[];
}

export function useActivityFromSubgraph(
  type?: string,
  actors?: string[],
  page = 0,
  limit = 50
) {
  const queryKey = ['subgraph-activity', type, actors?.join(','), page, limit];

  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      if (actors && actors.length > 0) {
        return graphqlQuery<ActivityResponse>(GET_ACTIVITY_BY_ACTORS, {
          first: limit,
          skip: page * limit,
          actors: actors.map(a => a.toLowerCase()),
        });
      }
      if (type && type !== 'all') {
        return graphqlQuery<ActivityResponse>(GET_ACTIVITY_BY_TYPE, {
          first: limit,
          skip: page * limit,
          type,
        });
      }
      return graphqlQuery<ActivityResponse>(GET_ACTIVITY_ALL, {
        first: limit,
        skip: page * limit,
      });
    },
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });

  const activities = (data?.activities || []).map(a => ({
    id: a.id,
    type: a.type,
    actor: a.actor as `0x${string}`,
    targetId: a.targetId,
    blockNumber: BigInt(a.blockNumber),
    timestamp: BigInt(a.timestamp),
    action: a.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    details: {
      title: `${a.type.split('_')[0]} #${a.targetId}`,
      targetId: a.targetId,
    },
  }));

  return {
    activities,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
