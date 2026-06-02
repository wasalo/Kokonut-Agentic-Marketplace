'use client';

import { useState, useCallback } from 'react';
import { useReadContracts } from 'wagmi';
import { SUPPORTED_CHAINS } from '@/lib/chains';
import { withRetry } from '@/lib/utils/retry';
import { useNetworkStatus } from '@/lib/hooks/useNetworkStatus';
import {
  useBiddingSessionCount,
} from '@/lib/hooks/useBiddingSystem';
import { useEvaluatorPoolSize } from '@/lib/hooks/useJobs';
import { getContractAddress } from '@/lib/contracts/config';

interface NetworkStat {
  chainId: number;
  agentCount: number;
  feedbackCount: number;
}

export interface NetworkStatsExtended extends NetworkStat {
  bidPoolStats: {
    totalSessions: number;
    activeSessions: number;
  };
  disputeCount: number;
  evaluatorPoolSize: number;
}

export function useNetworkStats() {
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<NetworkStat[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const networkStatus = useNetworkStatus();

  // Phase 45d expansion: live bidding + evaluator pool stats
  const { count: totalBiddingSessions } = useBiddingSessionCount();
  const { count: evaluatorPoolSize } = useEvaluatorPoolSize();

  // Pull dispute count from the milestone escrow (best-effort)
  const { data: disputeCountData } = useReadContracts({
    contracts: [
      {
        address: getContractAddress('MILESTONE_ESCROW'),
        abi: [
          {
            type: 'function',
            name: 'disputeCounter',
            stateMutability: 'view',
            inputs: [],
            outputs: [{ type: 'uint256' }],
          },
        ] as const,
        functionName: 'disputeCounter',
      },
    ],
    query: { staleTime: 60_000 },
  });
  const disputeCount = disputeCountData?.[0]?.result
    ? Number(disputeCountData[0].result as bigint)
    : 0;

  const refetch = useCallback(async () => {
    if (!networkStatus.isOnline) {
      setError(new Error('Network offline'));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const newStats: NetworkStat[] = await withRetry(
        async () => {
          return SUPPORTED_CHAINS.map(chain => ({
            chainId: chain.id,
            agentCount: 0,
            feedbackCount: 0,
          }));
        },
        { maxRetries: 3, initialDelay: 1000, onRetry: (attempt, err) => {
          console.warn(`Network stats retry ${attempt}: ${err.message}`);
        }}
      );
      setStats(newStats);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch network stats');
      console.error('Failed to fetch network stats:', error);
      setError(error);
    } finally {
      setIsLoading(false);
    }
  }, [networkStatus.isOnline]);

  return {
    stats,
    isLoading,
    error,
    refetch,
    // Phase 45d expansion
    bidPoolStats: {
      totalSessions: totalBiddingSessions,
      activeSessions: 0, // would require iterating session list; left as 0 for now
    },
    disputeCount,
    evaluatorPoolSize,
  } satisfies {
    stats: NetworkStat[];
    isLoading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
    bidPoolStats: { totalSessions: number; activeSessions: number };
    disputeCount: number;
    evaluatorPoolSize: number;
  };
}
