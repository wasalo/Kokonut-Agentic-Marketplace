'use client';

import { useState, useCallback } from 'react';
import { SUPPORTED_CHAINS } from '@/lib/chains';

interface NetworkStat {
  chainId: number;
  agentCount: number;
  feedbackCount: number;
}

export function useNetworkStats() {
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<NetworkStat[]>([]);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const newStats: NetworkStat[] = SUPPORTED_CHAINS.map(chain => ({
        chainId: chain.id,
        agentCount: 0,
        feedbackCount: 0,
      }));
      setStats(newStats);
    } catch (error) {
      console.error('Failed to fetch network stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    stats,
    isLoading,
    refetch,
  };
}
