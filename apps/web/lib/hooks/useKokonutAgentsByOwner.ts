'use client';

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePublicClient } from 'wagmi';
import { decodeAgentMetadata } from '@/lib/metadata';
import { getContractAddress } from '@/lib/contracts/config';
import { debugLog, debugError } from '@/lib/debug';
import { ERC8004_ABI } from '@/lib/8004contracts';

const API_KEY = process.env.NEXT_PUBLIC_8004_API_KEY || '';
const API_BASE = 'https://8004scan.io/api/v1/public';
const ERC8004_ADDRESS = getContractAddress('ERC8004_REGISTRY');

const STALE_TIME = 5 * 60 * 1000; // 5 minutes
const GC_TIME = 30 * 60 * 1000; // 30 minutes
const MAX_RETRIES = 3;

export interface AgentByOwner {
  id: number;
  owner: `0x${string}`;
  agentURI: string;
  name: string;
  description?: string;
  source?: string;
  isActive: boolean;
  createdAt: string;
  totalScore: number;
  starCount: number;
  totalFeedbacks: number;
}

interface UseKokonutAgentsByOwnerReturn {
  agents: AgentByOwner[];
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  refetch: () => void;
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
        `useKokonutAgentsByOwner: Rate limited, retrying in ${delay}ms (attempt ${i + 1}/${retries})`
      );
      await new Promise(resolve => setTimeout(resolve, delay));
      continue;
    }

    throw new Error(`API error: ${response.status}`);
  }

  throw new Error('Rate limited after maximum retries');
}

async function fetchAgentsByOwner(
  ownerAddress: `0x${string}`,
  publicClient: ReturnType<typeof usePublicClient>
): Promise<AgentByOwner[]> {
  if (!ownerAddress) {
    return [];
  }

  debugLog('hooks', `useKokonutAgentsByOwner: Fetching agents for ${ownerAddress}`);

  // Step 1: Fetch agents from API filtered by owner
  const response = await fetchWithBackoff(
    `${API_BASE}/agents?chainId=11155111&ownerAddress=${ownerAddress}&limit=100`,
    {
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json',
      },
    }
  );

  const data = await response.json();
  const apiAgents = data.data || [];

  debugLog('hooks', `useKokonutAgentsByOwner: API returned ${apiAgents.length} agents`);

  if (apiAgents.length === 0 || !publicClient) {
    return [];
  }

  // Step 2: Use multicall to fetch tokenURIs (API doesn't return agent_uri)
  const tokenIds = apiAgents.map((agent: any) => BigInt(agent.token_id));

  const calls = tokenIds.map((id: bigint) => ({
    address: ERC8004_ADDRESS,
    abi: ERC8004_ABI,
    functionName: 'tokenURI' as const,
    args: [id] as const,
  }));

  const results = await publicClient.multicall({ contracts: calls });

  // Step 3: Process results and filter by source
  const mappedAgents: AgentByOwner[] = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const apiAgent = apiAgents[i];

    if (result.status === 'success' && result.result) {
      const uri = result.result as string;
      const metadata = decodeAgentMetadata(uri);

      // Check if this is a Kokonut agent
      if (metadata?.source === 'kokonut-marketplace') {
        mappedAgents.push({
          id: apiAgent.token_id,
          owner: apiAgent.owner_address as `0x${string}`,
          agentURI: uri,
          name: apiAgent.name || metadata?.name || `Agent #${apiAgent.token_id}`,
          description: apiAgent.description || metadata?.description,
          source: metadata.source,
          isActive: true,
          createdAt: apiAgent.created_at,
          totalScore: apiAgent.total_score || 0,
          starCount: apiAgent.star_count || 0,
          totalFeedbacks: apiAgent.total_feedbacks || 0,
        });
      }
    }
  }

  debugLog('hooks', `useKokonutAgentsByOwner: Final result: ${mappedAgents.length} Kokonut agents`);
  return mappedAgents;
}

/**
 * Hook to fetch agents owned by a specific wallet address
 * Uses 8004scan API + Multicall fallback for reliable metadata fetching
 *
 * Features:
 * - React Query caching with 5-minute stale time
 * - Exponential backoff retry for rate limiting (429)
 * - Automatic deduplication of concurrent requests
 */
export function useKokonutAgentsByOwner(
  ownerAddress: `0x${string}` | undefined
): UseKokonutAgentsByOwnerReturn {
  const publicClient = usePublicClient();
  const queryClient = useQueryClient();

  const {
    data: agents = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ['kokonut-agents-by-owner', ownerAddress],
    queryFn: async () => {
      if (!ownerAddress || !publicClient) {
        return [];
      }
      return fetchAgentsByOwner(ownerAddress, publicClient);
    },
    enabled: !!ownerAddress && !!publicClient,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    retry: MAX_RETRIES,
    retryDelay: attemptIndex => Math.min(1000 * Math.pow(2, attemptIndex), 30000),
  });

  return {
    agents,
    isLoading,
    isFetching,
    error: error as Error | null,
    refetch,
  };
}
