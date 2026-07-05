'use client';

import { useQuery } from '@tanstack/react-query';
import { getFollowState, type EfpFollowState } from '@/lib/efp';

const STALE_TIME = 5 * 60 * 1000;
const GC_TIME = 30 * 60 * 1000;

const DEFAULT_STATE: EfpFollowState = {
  is_following: false,
  is_blocked: false,
  is_muted: false,
  is_followed_back: false,
};

interface UseEfpFollowStateReturn {
  followState: EfpFollowState;
  isFollowing: boolean;
  isBlocked: boolean;
  isMuted: boolean;
  isFollowedBack: boolean;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useEfpFollowState(
  fromAddress: string | undefined,
  toAddress: string | undefined
): UseEfpFollowStateReturn {
  const enabled = !!fromAddress && !!toAddress && fromAddress !== toAddress;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['efp-follow-state', fromAddress, toAddress],
    queryFn: () => getFollowState(fromAddress!, toAddress!),
    enabled,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    retry: 3,
  });

  const state = data ?? DEFAULT_STATE;

  return {
    followState: state,
    isFollowing: state.is_following,
    isBlocked: state.is_blocked,
    isMuted: state.is_muted,
    isFollowedBack: state.is_followed_back,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
