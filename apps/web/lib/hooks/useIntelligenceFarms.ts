'use client';

import { useQuery } from '@tanstack/react-query';
import { useIntelligenceClient } from './useIntelligenceClient';
import type { IntelligenceFarm } from '@/lib/intelligence/client';

const STALE_TIME = 60 * 1000;

interface UseIntelligenceFarmsReturn {
  farms: IntelligenceFarm[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useIntelligenceFarms(): UseIntelligenceFarmsReturn {
  const client = useIntelligenceClient();

  const { data, isLoading, error, refetch } = useQuery<IntelligenceFarm[]>({
    queryKey: ['intelligence-farms'],
    queryFn: () => client.listFarms({ limit: 50 }),
    staleTime: STALE_TIME,
    retry: 2,
  });

  return {
    farms: data ?? [],
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
