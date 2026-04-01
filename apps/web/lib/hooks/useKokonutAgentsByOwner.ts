'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePublicClient } from 'wagmi';
import { decodeAgentMetadata } from '@/lib/metadata';
import { CONTRACT_ADDRESSES, getContractAddress } from '@/lib/contracts/config';
import { debugLog, debugError } from '@/lib/debug';
import { ERC8004_ABI } from '@/lib/8004contracts';

const API_KEY = '8004_4GfnYe6f2Zmt1cjkXbuh9hXh3yf6wpBZ_06be725a';
const API_BASE = 'https://8004scan.io/api/v1/public';
const ERC8004_ADDRESS = getContractAddress(
  process.env.NEXT_PUBLIC_8004_REGISTRY_ADDRESS,
  CONTRACT_ADDRESSES.sepolia.erc8004Registry
);

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
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook to fetch agents owned by a specific wallet address
 * Uses 8004scan API + Multicall fallback for reliable metadata fetching
 *
 * FIXED: Uses multicall to fetch tokenURIs since API doesn't return agent_uri field
 */
export function useKokonutAgentsByOwner(
  ownerAddress: `0x${string}` | undefined
): UseKokonutAgentsByOwnerReturn {
  const publicClient = usePublicClient();
  const [agents, setAgents] = useState<AgentByOwner[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchAgents = useCallback(async () => {
    debugLog('hooks', 'useKokonutAgentsByOwner: fetchAgents called', {
      ownerAddress,
      hasPublicClient: !!publicClient,
    });

    if (!ownerAddress) {
      debugLog('hooks', 'useKokonutAgentsByOwner: No ownerAddress, returning empty');
      setAgents([]);
      return;
    }

    if (!publicClient) {
      debugLog('hooks', 'useKokonutAgentsByOwner: No publicClient yet, waiting...');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      debugLog('hooks', `useKokonutAgentsByOwner: Step 1 - Fetching from API for ${ownerAddress}`);

      // Step 1: Fetch agents from API filtered by owner
      const response = await fetch(
        `${API_BASE}/agents?chainId=11155111&ownerAddress=${ownerAddress}&limit=100`,
        {
          headers: {
            'X-API-Key': API_KEY,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const apiAgents = data.data || [];

      debugLog('hooks', `useKokonutAgentsByOwner: API returned ${apiAgents.length} agents`);

      if (apiAgents.length === 0) {
        setAgents([]);
        setIsLoading(false);
        return;
      }

      debugLog('hooks', 'useKokonutAgentsByOwner: Step 2 - Multicall for tokenURIs');

      // Step 2: Use multicall to fetch tokenURIs (API doesn't return agent_uri)
      const tokenIds = apiAgents.map((agent: any) => BigInt(agent.token_id));

      debugLog(
        'hooks',
        'useKokonutAgentsByOwner: Token IDs:',
        tokenIds.map((id: bigint) => id.toString())
      );

      const calls = tokenIds.map((id: bigint) => ({
        address: ERC8004_ADDRESS,
        abi: ERC8004_ABI,
        functionName: 'tokenURI' as const,
        args: [id] as const,
      }));

      debugLog('hooks', `useKokonutAgentsByOwner: Making ${calls.length} multicall requests`);

      const results = await publicClient.multicall({ contracts: calls });

      debugLog('hooks', `useKokonutAgentsByOwner: Multicall returned ${results.length} results`);

      // Step 3: Process results and filter by source
      const mappedAgents: AgentByOwner[] = [];

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const apiAgent = apiAgents[i];

        debugLog('hooks', `useKokonutAgentsByOwner: Processing agent ${apiAgent.token_id}:`, {
          status: result.status,
          hasResult: !!result.result,
        });

        if (result.status === 'success' && result.result) {
          const uri = result.result as string;
          debugLog(
            'hooks',
            `useKokonutAgentsByOwner: Agent ${apiAgent.token_id} URI:`,
            uri.substring(0, 100) + '...'
          );

          const metadata = decodeAgentMetadata(uri);

          debugLog('hooks', `useKokonutAgentsByOwner: Agent ${apiAgent.token_id} metadata:`, {
            hasMetadata: !!metadata,
            source: metadata?.source,
            name: metadata?.name,
          });

          // Check if this is a Kokonut agent
          if (metadata?.source === 'kokonut-marketplace') {
            debugLog('hooks', `useKokonutAgentsByOwner: ✓ Agent ${apiAgent.token_id} is Kokonut!`);
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
          } else {
            debugLog(
              'hooks',
              `useKokonutAgentsByOwner: ✗ Agent ${apiAgent.token_id} is NOT Kokonut (source: ${metadata?.source})`
            );
          }
        } else {
          debugError(
            'hooks',
            `useKokonutAgentsByOwner: ✗ Agent ${apiAgent.token_id} multicall failed`,
            result
          );
        }
      }

      debugLog(
        'hooks',
        `useKokonutAgentsByOwner: Final result: ${mappedAgents.length} Kokonut agents`
      );
      setAgents(mappedAgents);
    } catch (err) {
      debugError('hooks', 'useKokonutAgentsByOwner: Error', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch agents'));
    } finally {
      setIsLoading(false);
    }
  }, [ownerAddress, publicClient]);

  useEffect(() => {
    debugLog('hooks', 'useKokonutAgentsByOwner: useEffect triggered', {
      ownerAddress,
      hasPublicClient: !!publicClient,
    });

    if (ownerAddress && publicClient) {
      fetchAgents();
    }
  }, [ownerAddress, publicClient, fetchAgents]);

  const refetch = useCallback(() => {
    fetchAgents();
  }, [fetchAgents]);

  return {
    agents,
    isLoading,
    error,
    refetch,
  };
}
