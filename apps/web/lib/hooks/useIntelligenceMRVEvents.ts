'use client';

import { useQuery } from '@tanstack/react-query';
import { useIntelligenceClient } from './useIntelligenceClient';
import type { IntelligenceMRVEvent } from '@/lib/intelligence/client';

const STALE_TIME = 60 * 1000;

interface UseIntelligenceMRVEventsReturn {
  events: IntelligenceMRVEvent[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useIntelligenceMRVEvents(farmId?: string): UseIntelligenceMRVEventsReturn {
  const client = useIntelligenceClient();

  const { data, isLoading, error, refetch } = useQuery<IntelligenceMRVEvent[]>({
    queryKey: ['intelligence-mrv-events', farmId ?? null],
    queryFn: () =>
      farmId
        ? client.listMRVByFarm(farmId, { limit: 20 })
        : client.listMRVEvents({ limit: 20 }),
    staleTime: STALE_TIME,
    retry: 2,
  });

  return {
    events: data ?? [],
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
