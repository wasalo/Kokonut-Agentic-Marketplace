'use client';

import { useMemo } from 'react';
import { useKokonutAgents } from './useKokonutAgents';
import { useReadContracts } from 'wagmi';
import { ERC8004_ABI } from '@/lib/8004contracts';
import { getContractAddress } from '@/lib/contracts/config';
import { useBiddingSessionCount } from './useBiddingSystem';
import { useJobs } from './useJobs';

const ERC8004_REPUTATION_ADDRESS = getContractAddress('ERC8004_REPUTATION');

export interface BiddingMetrics {
  activeSessions: number;
  totalCommitted: bigint;        // total staked across all active sessions
  noShowRate: number;            // ratio of slashed : accepted (0..1)
}

interface KokonutStats {
  totalAgents: number;
  activeAgents: number;
  totalReviews: number;
  averageRating: number;
  isLoading: boolean;
  error: Error | null;
  // Phase 45d: bidding metrics
  bidding: BiddingMetrics;
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

    return {
      totalAgents,
      activeAgents,
      totalReviews: 0,
      averageRating: 0,
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

  // Phase 45d: bidding metrics
  const { count: totalSessions } = useBiddingSessionCount();
  const { jobs } = useJobs(0, 100); // sample for no-show rate

  const bidding: BiddingMetrics = useMemo(() => {
    // Approximate no-show rate: ratio of jobs that were rejected
    // (post-acceptance) to jobs that were accepted
    const completed = jobs.filter(j => j.status === 6 /* PendingClientApproval */ || j.status === 2 /* Submitted */);
    const rejected = jobs.filter(j => j.status === 4 /* Rejected */);
    const noShowRate = completed.length + rejected.length > 0
      ? rejected.length / (completed.length + rejected.length)
      : 0;

    return {
      activeSessions: totalSessions,
      totalCommitted: 0n, // requires iterating session list for live totals
      noShowRate,
    };
  }, [totalSessions, jobs]);

  const isLoading = isAgentsLoading || isRepLoading;

  return {
    totalAgents: stats.totalAgents,
    activeAgents: stats.activeAgents,
    totalReviews: reputationStats.totalReviews,
    averageRating: reputationStats.averageRating,
    isLoading,
    error: agentsError,
    bidding,
  };
}
