'use client';

import { useQuery } from '@tanstack/react-query';
import { useReadContracts } from 'wagmi';
import { SUPPORTED_CHAINS } from '@/lib/chains';
import { withRetry } from '@/lib/utils/retry';
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
  const { count: totalBiddingSessions } = useBiddingSessionCount();
  const { count: evaluatorPoolSize } = useEvaluatorPoolSize();

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

  const query = useQuery<NetworkStat[]>({
    queryKey: ['network-stats'],
    queryFn: async () => {
      return withRetry(
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
    },
    enabled: false,
  });

  return {
    stats: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    bidPoolStats: {
      totalSessions: totalBiddingSessions,
      activeSessions: 0,
    },
    disputeCount,
    evaluatorPoolSize,
  } satisfies {
    stats: NetworkStat[];
    isLoading: boolean;
    error: Error | null;
    refetch: () => Promise<unknown>;
    bidPoolStats: { totalSessions: number; activeSessions: number };
    disputeCount: number;
    evaluatorPoolSize: number;
  };
}
