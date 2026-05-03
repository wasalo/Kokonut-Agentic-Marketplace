'use client';

import { useQuery } from '@tanstack/react-query';
import { getUserStats, type EfpStats } from '@/lib/efp';

const STALE_TIME = 5 * 60 * 1000;
const GC_TIME = 30 * 60 * 1000;

interface UseEfpStatsReturn {
  stats: EfpStats | null;
  followersCount: number;
  followingCount: number;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useEfpStats(address: string | undefined): UseEfpStatsReturn {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['efp-stats', address],
    queryFn: () => getUserStats(address!),
    enabled: !!address,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    retry: 3,
  });

  return {
    stats: data ?? null,
    followersCount: data ? Number(data.followers_count) : 0,
    followingCount: data ? Number(data.following_count) : 0,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
