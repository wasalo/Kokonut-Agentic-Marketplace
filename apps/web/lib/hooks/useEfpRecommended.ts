'use client';

import { useQuery } from '@tanstack/react-query';
import { getRecommended, type EfpRecommended } from '@/lib/efp';

const STALE_TIME = 10 * 60 * 1000;
const GC_TIME = 60 * 60 * 1000;

interface UseEfpRecommendedReturn {
  recommended: EfpRecommended[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useEfpRecommended(
  address: string | undefined,
  limit = 10
): UseEfpRecommendedReturn {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['efp-recommended', address, limit],
    queryFn: () => getRecommended(address!, { limit }).catch(() => []),
    enabled: !!address,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    retry: 3,
  });

  return {
    recommended: data ?? [],
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
