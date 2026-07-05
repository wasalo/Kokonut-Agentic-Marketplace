'use client';

import { useQuery } from '@tanstack/react-query';
import { getFollowing, type EfpFollowing } from '@/lib/efp';

const STALE_TIME = 5 * 60 * 1000;
const GC_TIME = 30 * 60 * 1000;

interface UseEfpFollowingOpts {
  limit?: number;
  offset?: number;
  tags?: string;
  sort?: string;
}

interface UseEfpFollowingReturn {
  following: EfpFollowing[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useEfpFollowing(
  address: string | undefined,
  opts: UseEfpFollowingOpts = {}
): UseEfpFollowingReturn {
  const { limit = 10, offset = 0, tags, sort } = opts;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['efp-following', address, limit, offset, tags, sort],
    queryFn: () =>
      getFollowing(address!, {
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
    following: data ?? [],
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
