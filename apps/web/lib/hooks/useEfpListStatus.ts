'use client';

import { useQuery } from '@tanstack/react-query';
import { getPrimaryList, getUserLists, type EfpListInfo } from '@/lib/efp';

const STALE_TIME = 5 * 60 * 1000;
const GC_TIME = 30 * 60 * 1000;

interface UseEfpListStatusReturn {
  hasList: boolean;
  hasPrimaryList: boolean;
  primaryListTokenId: string | null;
  lists: EfpListInfo[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useEfpListStatus(address: string | undefined): UseEfpListStatusReturn {
  const {
    data: primaryListTokenId,
    isLoading: isLoadingPrimary,
    error: primaryError,
    refetch: refetchPrimary,
  } = useQuery({
    queryKey: ['efp-primary-list', address],
    queryFn: () => getPrimaryList(address!),
    enabled: !!address,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    retry: 2,
  });

  const {
    data: lists,
    isLoading: isLoadingLists,
    error: listsError,
    refetch: refetchLists,
  } = useQuery({
    queryKey: ['efp-user-lists', address],
    queryFn: () => getUserLists(address!),
    enabled: !!address,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    retry: 2,
  });

  return {
    hasList: (lists?.length ?? 0) > 0,
    hasPrimaryList: !!primaryListTokenId,
    primaryListTokenId: primaryListTokenId ?? null,
    lists: lists ?? [],
    isLoading: isLoadingPrimary || isLoadingLists,
    error: (primaryError || listsError) as Error | null,
    refetch: () => {
      refetchPrimary();
      refetchLists();
    },
  };
}
