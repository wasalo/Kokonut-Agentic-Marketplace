'use client';

import { useState, useCallback } from 'react';
import { SUPPORTED_CHAINS } from '@/lib/chains';
import { withRetry } from '@/lib/utils/retry';
import { useNetworkStatus } from '@/lib/hooks/useNetworkStatus';

interface NetworkStat {
  chainId: number;
  agentCount: number;
  feedbackCount: number;
}

export function useNetworkStats() {
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<NetworkStat[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const networkStatus = useNetworkStatus();

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
  };
}
