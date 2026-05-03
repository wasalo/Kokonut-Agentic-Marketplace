'use client';

import { useQuery } from '@tanstack/react-query';
import { getCommonFollowers, type EfpFollower } from '@/lib/efp';

const STALE_TIME = 5 * 60 * 1000;
const GC_TIME = 30 * 60 * 1000;

interface UseEfpMutualsReturn {
  mutuals: EfpFollower[];
  count: number;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useEfpMutuals(
  addressA: string | undefined,
  addressB: string | undefined,
  limit = 10
): UseEfpMutualsReturn {
  const enabled = !!addressA && !!addressB && addressA !== addressB;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['efp-mutuals', addressA, addressB],
    queryFn: () =>
      getCommonFollowers(addressA!, addressB!, { limit }),
    enabled,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    retry: 3,
  });

  return {
    mutuals: data ?? [],
    count: data?.length ?? 0,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
