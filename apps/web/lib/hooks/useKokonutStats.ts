'use client';

import { useMemo } from 'react';
import { useKokonutAgents } from './useKokonutAgents';
import { useReadContracts } from 'wagmi';
import { ERC8004_ABI } from '@/lib/8004contracts';
import { getContractAddress, debugLog } from '@/lib/contracts/config';

const ERC8004_REPUTATION_ADDRESS = getContractAddress('ERC8004_REPUTATION');

interface KokonutStats {
  totalAgents: number;
  activeAgents: number;
  totalReviews: number;
  averageRating: number;
  isLoading: boolean;
  error: Error | null;
}

export function useKokonutStats(): KokonutStats {
  // Get all Kokonut agents (showAll = true to get complete list for stats)
  const {
    agents: kokonutAgents,
    isLoading: isAgentsLoading,
    error: agentsError,
  } = useKokonutAgents(
    0,
    1000, // Large number to get all
    true // Show all
  );

  // Calculate agent-based stats
  const stats = useMemo(() => {
    if (!kokonutAgents || kokonutAgents.length === 0) {
      return {
        totalAgents: 0,
        activeAgents: 0,
        totalReviews: 0,
        averageRating: 0,
      };
    }

    const totalAgents = kokonutAgents.length;
    const activeAgents = kokonutAgents.filter(a => a.isActive).length;

    // For reviews and ratings, we need to query the reputation registry
    // For now, we'll return 0 and implement reputation fetching separately

    return {
      totalAgents,
      activeAgents,
      totalReviews: 0, // Will be populated from reputation queries
      averageRating: 0, // Will be populated from reputation queries
    };
  }, [kokonutAgents]);

  // Query reputation for all Kokonut agents
  const reputationQueries = useMemo(() => {
    if (!kokonutAgents || kokonutAgents.length === 0) return [];

    return kokonutAgents.map(agent => ({
      address: ERC8004_REPUTATION_ADDRESS,
      abi: ERC8004_ABI,
      functionName: 'getSummary' as const,
      args: [BigInt(agent.id), [], '', ''] as const,
    }));
  }, [kokonutAgents]);

  const { data: reputationData, isLoading: isRepLoading } = useReadContracts({
    contracts: reputationQueries,
    query: {
      enabled: reputationQueries.length > 0 && !isAgentsLoading,
      retry: 2,
    },
  });

  // Calculate reputation stats
  const reputationStats = useMemo(() => {
    if (!reputationData || reputationData.length === 0) {
      return { totalReviews: 0, averageRating: 0 };
    }

    let totalReviews = 0;
    let totalRating = 0;
    let ratedAgents = 0;

    for (const result of reputationData) {
      if (result.status === 'success' && result.result) {
        const [count, cumulativeValue, decimals] = result.result as [bigint, bigint, number];

        totalReviews += Number(count);

        if (Number(count) > 0 && decimals > 0) {
          const rating = Number(cumulativeValue) / 10 ** decimals;
          totalRating += rating;
          ratedAgents++;
        }
      }
    }

    const averageRating = ratedAgents > 0 ? totalRating / ratedAgents : 0;

    return { totalReviews, averageRating };
  }, [reputationData]);

  const isLoading = isAgentsLoading || isRepLoading;

  return {
    totalAgents: stats.totalAgents,
    activeAgents: stats.activeAgents,
    totalReviews: reputationStats.totalReviews,
    averageRating: reputationStats.averageRating,
    isLoading,
    error: agentsError,
  };
}
