'use client';

import { useQuery } from '@tanstack/react-query';
import { useIntelligenceClient } from './useIntelligenceClient';
import type { IntelligenceAgent } from '@/lib/intelligence/client';

const STALE_TIME = 60 * 1000;

interface UseIntelligenceAgentsReturn {
  agents: IntelligenceAgent[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useIntelligenceAgents(): UseIntelligenceAgentsReturn {
  const client = useIntelligenceClient();

  const { data, isLoading, error, refetch } = useQuery<IntelligenceAgent[]>({
    queryKey: ['intelligence-agents'],
    queryFn: () => client.listAgents(),
    staleTime: STALE_TIME,
    retry: 2,
  });

  return {
    agents: data ?? [],
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
