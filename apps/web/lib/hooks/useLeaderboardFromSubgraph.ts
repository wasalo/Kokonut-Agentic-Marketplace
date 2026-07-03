'use client';

import { useQuery } from '@tanstack/react-query';
import { graphqlQuery } from '@/lib/graphql/client';
import { calculateHealthScore, type HealthScore } from '@/lib/healthScore';

const STALE_TIME = 10 * 60 * 1000;
const GC_TIME = 60 * 60 * 1000;

interface SubgraphAgent {
  id: string;
  agentId: string;
  owner: string;
  name: string | null;
  metadataURI: string | null;
  isActive: boolean;
  source: string | null;
  createdAt: string;
  services: { id: string }[];
  skills: { id: string }[];
}

interface LeaderboardResponse {
  agents: SubgraphAgent[];
}

export interface LeaderboardEntry {
  agentId: bigint;
  owner: `0x${string}`;
  name: string;
  healthScore: HealthScore;
  servicesCount: number;
  skillsCount: number;
}

export function useLeaderboardFromSubgraph(page: number, limit: number) {
  const queryKey = ['subgraph-leaderboard', page, limit];

  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: () => graphqlQuery<LeaderboardResponse>(
      `query GetLeaderboardAgents($first: Int!, $skip: Int!) {
        agents(
          first: $first
          skip: $skip
          where: { source_in: ["kokonut-marketplace", "kokonut-intelligence"], isActive: true }
          orderBy: createdAt
          orderDirection: desc
        ) {
          id agentId owner name isActive source createdAt
          services { id }
          skills { id }
        }
      }`,
      { first: limit, skip: page * limit }
    ),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });

  const agents = data?.agents || [];

  const entries: LeaderboardEntry[] = agents.map(a => {
    const servicesCount = a.services?.length || 0;
    const skillsCount = a.skills?.length || 0;

    const healthScore = calculateHealthScore({
      rating: 0.5 + Math.min(skillsCount * 0.1, 0.5),
      completionRate: 0.5,
      activeServices: servicesCount,
      recentActivity: 0,
      followers: 0,
    });

    return {
      agentId: BigInt(a.agentId),
      owner: a.owner as `0x${string}`,
      name: a.name || `Agent #${a.agentId}`,
      healthScore,
      servicesCount,
      skillsCount,
    };
  });

  entries.sort((a, b) => b.healthScore.score - a.healthScore.score);

  return {
    entries,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
