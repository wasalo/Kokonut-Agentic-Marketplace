'use client';

import { useState, useEffect, useCallback } from 'react';
import { SUPPORTED_CHAINS, ChainConfig } from '@/lib/chains';

interface NetworkStats {
  chainId: number;
  agentCount: number;
  feedbackCount: number;
  lastUpdated: Date;
}

interface UseNetworkStatsReturn {
  stats: NetworkStats[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  getChain: (chainId: number) => ChainConfig | undefined;
}

const API_CACHE_KEY = 'kokonut_network_stats_cache';
const CACHE_DURATION_MS = 5 * 60 * 1000;

function loadCache(): { stats: NetworkStats[]; timestamp: number } | null {
  if (typeof window === 'undefined') return null;
  try {
    const data = localStorage.getItem(API_CACHE_KEY);
    if (!data) return null;
    const parsed = JSON.parse(data);
    return {
      stats: parsed.stats.map((s: NetworkStats & { lastUpdated?: string }) => ({
        ...s,
        lastUpdated: new Date(s.lastUpdated || Date.now()),
      })),
      timestamp: parsed.timestamp,
    };
  } catch {
    return null;
  }
}

function saveCache(stats: NetworkStats[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      API_CACHE_KEY,
      JSON.stringify({
        stats,
        timestamp: Date.now(),
      })
    );
  } catch (e) {
    console.error('Failed to cache network stats:', e);
  }
}

export function useNetworkStats(): UseNetworkStatsReturn {
  const [stats, setStats] = useState<NetworkStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const cached = loadCache();
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
      setStats(cached.stats);
      setIsLoading(false);
      return;
    }

    try {
      const fetchedStats: NetworkStats[] = [];

      for (const chain of SUPPORTED_CHAINS) {
        try {
          const response = await fetch(`https://api.8004scan.io/stats?chain=${chain.id}`, {
            headers: {
              Accept: 'application/json',
            },
            signal: AbortSignal.timeout(5000),
          });

          if (response.ok) {
            const data = await response.json();
            fetchedStats.push({
              chainId: chain.id,
              agentCount: data.agentCount || 0,
              feedbackCount: data.feedbackCount || 0,
              lastUpdated: new Date(),
            });
          } else {
            fetchedStats.push({
              chainId: chain.id,
              agentCount: 0,
              feedbackCount: 0,
              lastUpdated: new Date(),
            });
          }
        } catch {
          fetchedStats.push({
            chainId: chain.id,
            agentCount: 0,
            feedbackCount: 0,
            lastUpdated: new Date(),
          });
        }
      }

      setStats(fetchedStats);
      saveCache(fetchedStats);
    } catch (err) {
      console.error('Failed to fetch network stats:', err);

      if (cached) {
        setStats(cached.stats);
      } else {
        setError(err instanceof Error ? err : new Error('Failed to fetch network stats'));
        const fallbackStats = SUPPORTED_CHAINS.map(chain => ({
          chainId: chain.id,
          agentCount: 0,
          feedbackCount: 0,
          lastUpdated: new Date(),
        }));
        setStats(fallbackStats);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const getChain = useCallback((chainId: number): ChainConfig | undefined => {
    return SUPPORTED_CHAINS.find(c => c.id === chainId);
  }, []);

  return {
    stats,
    isLoading,
    error,
    refetch: fetchStats,
    getChain,
  };
}

export function useChainStats(chainId: number): NetworkStats | null {
  const { stats } = useNetworkStats();
  return stats.find(s => s.chainId === chainId) || null;
}
