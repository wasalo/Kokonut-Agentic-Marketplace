'use client';

import { useQuery } from '@tanstack/react-query';
import { getFollowers, type EfpFollower } from '@/lib/efp';

const STALE_TIME = 5 * 60 * 1000;
const GC_TIME = 30 * 60 * 1000;

interface UseEfpFollowersOpts {
  limit?: number;
  offset?: number;
  tags?: string;
  sort?: string;
}

interface UseEfpFollowersReturn {
  followers: EfpFollower[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useEfpFollowers(
  address: string | undefined,
  opts: UseEfpFollowersOpts = {}
): UseEfpFollowersReturn {
  const { limit = 10, offset = 0, tags, sort } = opts;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['efp-followers', address, limit, offset, tags, sort],
    queryFn: () =>
      getFollowers(address!, {
        limit,
        offset,
        tags,
        sort,
      }),
    enabled: !!address,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    retry: 3,
  });

  return {
    followers: data ?? [],
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
