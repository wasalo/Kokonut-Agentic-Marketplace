'use client';

import { useMemo } from 'react';
import { usePublicClient } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { decodeAgentMetadata, type AgentMetadata8004 } from '@/lib/metadata';
import { debugLog, CONTRACT_ADDRESSES } from '@/lib/contracts/config';
import { ERC8004_ABI } from '@/lib/8004contracts';

const API_PROXY = '/api/8004/proxy';
const MAX_RETRIES = 3;

export interface KokonutAgent {
  id: number;
  owner: `0x${string}`;
  agentURI: string;
  metadata: AgentMetadata8004 | null;
  source: string | null;
  isActive: boolean;
  totalScore: number;
  starCount: number;
  totalFeedbacks: number;
  createdAt: string;
}

async function fetchWithBackoff(
  url: string,
  options: RequestInit,
  retries = MAX_RETRIES
): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    const response = await fetch(url, options);

    if (response.ok) {
      return response;
    }

    if (response.status === 429) {
      const delay = Math.min(1000 * Math.pow(2, i), 30000);
      debugLog(
        'hooks',
        `useKokonutAgents: Rate limited, retrying in ${delay}ms (attempt ${i + 1}/${retries})`
      );
      await new Promise(resolve => setTimeout(resolve, delay));
      continue;
    }

    throw new Error(`API error: ${response.status}`);
  }

  throw new Error('Rate limited after maximum retries');
}

async function fetchAgentsFromAPI(
  page: number,
  limit: number
): Promise<{ agents: any[]; hasMore: boolean; total: number }> {
  const response = await fetchWithBackoff(
    `${API_PROXY}?chainId=11155111&page=${page}&limit=${limit}`,
    {}
  );

  const data = await response.json();
  return {
    agents: data.data || [],
    hasMore: data.meta?.pagination?.hasMore || false,
    total: data.meta?.pagination?.total || 0,
  };
}

interface UseKokonutAgentsReturn {
  agents: KokonutAgent[];
  totalCount: number;
  isLoading: boolean;
  isScanning: boolean;
  scannedCount: number;
  totalToScan: number;
  error: Error | null;
  refetch: () => void;
}

export function useKokonutAgents(
  page = 0,
  itemsPerPage = 12,
  showAll = false
): UseKokonutAgentsReturn {
  const publicClient = usePublicClient();

  const {
    data: allKokonutAgents = [],
    isLoading: queryIsLoading,
    isFetching,
    error,
    refetch,
  } = useQuery<KokonutAgent[]>({
    queryKey: ['kokonut-agents'],
    queryFn: async () => {
      // Step 1: Paginate through all API pages
      const allApiAgents: any[] = [];
      let currentPage = 1;
      let hasMorePages = true;

      while (hasMorePages && currentPage <= 50) {
        const { agents, hasMore } = await fetchAgentsFromAPI(currentPage, 100);
        allApiAgents.push(...agents);
        hasMorePages = hasMore;
        currentPage++;
      }

      if (allApiAgents.length === 0) return [];

      debugLog('contracts', `Fetched ${allApiAgents.length} total agents from API`);

      // Step 2: Batch multicall tokenURIs and filter by source
      const batchSize = 50;
      const kokonutAgents: KokonutAgent[] = [];

      for (let i = 0; i < allApiAgents.length; i += batchSize) {
        const batch = allApiAgents.slice(i, i + batchSize);
        const tokenIds = batch.map((agent: any) => BigInt(agent.token_id));

        const calls = tokenIds.map((id: bigint) => ({
          address: CONTRACT_ADDRESSES.sepolia.erc8004Registry,
          abi: ERC8004_ABI,
          functionName: 'tokenURI' as const,
          args: [id] as const,
        }));

        const results = await publicClient!.multicall({ contracts: calls });

        for (let j = 0; j < results.length; j++) {
          const result = results[j];
          const apiAgent = batch[j];

          if (result.status === 'success' && result.result) {
            const uri = result.result as string;
            const metadata = decodeAgentMetadata(uri);

            if (metadata?.source === 'kokonut-marketplace' || metadata?.source === 'kokonut-intelligence') {
              kokonutAgents.push({
                id: apiAgent.token_id,
                owner: apiAgent.owner_address as `0x${string}`,
                agentURI: uri,
                metadata,
                source: metadata.source,
                isActive: true,
                totalScore: apiAgent.total_score || 0,
                starCount: apiAgent.star_count || 0,
                totalFeedbacks: apiAgent.total_feedbacks || 0,
                createdAt: apiAgent.created_at,
              });
            }
          }
        }
      }

      debugLog('contracts', `Found ${kokonutAgents.length} Kokonut agents`);
      return kokonutAgents;
    },
    enabled: !!publicClient,
    staleTime: 5 * 60 * 1000, // 5 min
    gcTime: 30 * 60 * 1000, // 30 min
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * Math.pow(2, attemptIndex), 30000),
  });

  const paginatedAgents = useMemo(() => {
    if (showAll) return allKokonutAgents;
    return allKokonutAgents.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
  }, [allKokonutAgents, page, itemsPerPage, showAll]);

  const totalCount = allKokonutAgents.length;
  const isScanning = isFetching && totalCount === 0;

  return {
    agents: paginatedAgents,
    totalCount,
    isLoading: queryIsLoading,
    isScanning,
    scannedCount: totalCount,
    totalToScan: totalCount,
    error: error as Error | null,
    refetch,
  };
}
