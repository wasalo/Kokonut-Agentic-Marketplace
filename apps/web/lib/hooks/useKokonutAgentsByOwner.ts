'use client';

import { useState, useEffect, useCallback } from 'react';
import { decodeAgentMetadata } from '@/lib/metadata';
import { debugLog } from '@/lib/contracts/config';

const API_KEY = '8004_4GfnYe6f2Zmt1cjkXbuh9hXh3yf6wpBZ_06be725a';
const API_BASE = 'https://8004scan.io/api/v1/public';

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
 * Uses 8004scan API for efficient querying
 */
export function useKokonutAgentsByOwner(
  ownerAddress: `0x${string}` | undefined
): UseKokonutAgentsByOwnerReturn {
  const [agents, setAgents] = useState<AgentByOwner[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchAgents = useCallback(async () => {
    if (!ownerAddress) {
      setAgents([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      debugLog('contracts', `Fetching agents for owner: ${ownerAddress}`);

      // Fetch agents from API filtered by owner
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

      // Map API response to our interface
      const mappedAgents: AgentByOwner[] = apiAgents.map((apiAgent: any) => {
        const metadata = decodeAgentMetadata(apiAgent.agent_uri || '');

        return {
          id: apiAgent.token_id,
          owner: apiAgent.owner_address as `0x${string}`,
          agentURI: apiAgent.agent_uri || '',
          name: apiAgent.name || metadata?.name || `Agent #${apiAgent.token_id}`,
          description: apiAgent.description || metadata?.description,
          source: metadata?.source,
          isActive: true, // Assume active if returned by API
          createdAt: apiAgent.created_at,
          totalScore: apiAgent.total_score || 0,
          starCount: apiAgent.star_count || 0,
          totalFeedbacks: apiAgent.total_feedbacks || 0,
        };
      });

      // Filter for Kokonut agents only
      const kokonutAgents = mappedAgents.filter(agent => agent.source === 'kokonut-marketplace');

      setAgents(kokonutAgents);
      debugLog('contracts', `Found ${kokonutAgents.length} Kokonut agents for ${ownerAddress}`);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch agents'));
      debugLog('errors', 'Error fetching agents by owner', err);
    } finally {
      setIsLoading(false);
    }
  }, [ownerAddress]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

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
