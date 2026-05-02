'use client';

import { useState, useEffect, useCallback } from 'react';
import { useReadContract, useWriteContract } from 'wagmi';
import { ERC8004_ABI } from '@/lib/8004contracts';
import { decodeAgentMetadata, type AgentMetadata8004 } from '@/lib/metadata';
import { getContractAddress, debugLog } from '@/lib/contracts/config';
import type { AgentListResponse, AgentResponse } from '@/lib/types/api';

const ERC8004_ADDRESS = getContractAddress('ERC8004_REGISTRY');

export interface Agent {
  id: number;
  owner: `0x${string}`;
  agentURI: string;
  metadata: AgentMetadata8004 | null;
  isActive?: boolean;
  createdAt?: string;
}

// ============ Read Hooks (ERC721 Standard) ============

export function useAgentOwner(agentId: bigint | undefined) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: ERC8004_ADDRESS,
    abi: ERC8004_ABI,
    functionName: 'ownerOf',
    args: agentId !== undefined ? [agentId] : undefined,
    query: {
      enabled: agentId !== undefined,
      retry: 2,
      staleTime: 30 * 1000,
    },
  });

  return {
    owner: data,
    isLoading,
    error,
    refetch,
  };
}

export function useAgentTokenURI(agentId: bigint | undefined) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: ERC8004_ADDRESS,
    abi: ERC8004_ABI,
    functionName: 'tokenURI',
    args: agentId !== undefined ? [agentId] : undefined,
    query: {
      enabled: agentId !== undefined,
      retry: 2,
      staleTime: 30 * 1000,
    },
  });

  const metadata = data ? decodeAgentMetadata(data) : null;

  return {
    uri: data,
    metadata,
    isLoading,
    error,
    refetch,
  };
}

export function useAgentMetadata(agentId: bigint | undefined, key: string) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: ERC8004_ADDRESS,
    abi: ERC8004_ABI,
    functionName: 'getMetadata',
    args: agentId !== undefined && key ? [agentId, key] : undefined,
    query: {
      enabled: agentId !== undefined && !!key,
      retry: 2,
      staleTime: 60 * 1000,
    },
  });

  return {
    metadata: data,
    isLoading,
    error,
    refetch,
  };
}

export function useAgentWallet(agentId: bigint | undefined) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: ERC8004_ADDRESS,
    abi: ERC8004_ABI,
    functionName: 'getAgentWallet',
    args: agentId !== undefined ? [agentId] : undefined,
    query: {
      enabled: agentId !== undefined,
      retry: 2,
      staleTime: 30 * 1000,
    },
  });

  return {
    wallet: data,
    isLoading,
    error,
    refetch,
  };
}

// ============ Write Hooks ============

export function useRegisterAgent() {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();

  return {
    register: (agentURI: string) =>
      writeContract({
        address: ERC8004_ADDRESS,
        abi: ERC8004_ABI,
        functionName: 'register',
        args: [agentURI],
      }),
    hash,
    isPending,
    error,
    reset,
  };
}

export function useSetAgentURI() {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();

  return {
    setAgentURI: (agentId: bigint, newURI: string) =>
      writeContract({
        address: ERC8004_ADDRESS,
        abi: ERC8004_ABI,
        functionName: 'setAgentURI',
        args: [agentId, newURI],
      }),
    hash,
    isPending,
    error,
    reset,
  };
}

export function useSetAgentMetadata() {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();

  return {
    setMetadata: (agentId: bigint, key: string, value: `0x${string}`) =>
      writeContract({
        address: ERC8004_ADDRESS,
        abi: ERC8004_ABI,
        functionName: 'setMetadata',
        args: [agentId, key, value],
      }),
    hash,
    isPending,
    error,
    reset,
  };
}

export function useSetAgentWallet() {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();

  return {
    setAgentWallet: (
      agentId: bigint,
      newWallet: `0x${string}`,
      deadline: bigint,
      signature: `0x${string}`
    ) =>
      writeContract({
        address: ERC8004_ADDRESS,
        abi: ERC8004_ABI,
        functionName: 'setAgentWallet',
        args: [agentId, newWallet, deadline, signature],
      }),
    hash,
    isPending,
    error,
    reset,
  };
}

// ============ Agent Stats ============

export interface AgentStats {
  jobsCompleted: number;
  totalEarned: number;
  rating: number;
  feedbackCount: number;
  memberSince: Date;
  isLoading: boolean;
}

export function useAgentStats(_agentId: bigint | undefined): AgentStats {
  // Simplified stats - would need events indexing for accurate data
  return {
    jobsCompleted: 0,
    totalEarned: 0,
    rating: 0,
    feedbackCount: 0,
    memberSince: new Date(),
    isLoading: false,
  };
}

// ============ Deactivate Agent ============

export function useDeactivateAgent() {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();

  return {
    deactivateAgent: (agentId: bigint) =>
      writeContract({
        address: ERC8004_ADDRESS,
        abi: ERC8004_ABI,
        functionName: 'burn',
        args: [agentId],
      }),
    hash,
    isPending,
    error,
    reset,
  };
}

export function useUnsetAgentWallet() {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();

  return {
    unsetAgentWallet: (agentId: bigint) =>
      writeContract({
        address: ERC8004_ADDRESS,
        abi: ERC8004_ABI,
        functionName: 'unsetAgentWallet',
        args: [agentId],
      }),
    hash,
    isPending,
    error,
    reset,
  };
}

// ============ Aggregate Hooks ============

const API_PROXY = '/api/8004/proxy';
const MAX_RETRIES = 3;
const CACHE_KEY = 'kokonut_all_agents_cache_v1';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  agents: Agent[];
  timestamp: number;
  totalCount: number;
}

function getCachedAllAgents(): CacheEntry | null {
  if (typeof window === 'undefined') return null;

  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const entry: CacheEntry = JSON.parse(cached);
    const age = Date.now() - entry.timestamp;

    if (age > CACHE_DURATION) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }

    return entry;
  } catch {
    return null;
  }
}

function setCachedAllAgents(agents: Agent[], totalCount: number) {
  if (typeof window === 'undefined') return;

  try {
    const entry: CacheEntry = {
      agents,
      timestamp: Date.now(),
      totalCount,
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
    debugLog('contracts', `Cached ${agents.length} all agents`);
  } catch (error) {
    debugLog('errors', 'Failed to cache all agents', error);
  }
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
      await new Promise(resolve => setTimeout(resolve, delay));
      continue;
    }

    throw new Error(`API error: ${response.status}`);
  }

  throw new Error('Rate limited after maximum retries');
}

async function fetchAllAgentsFromAPI(
  page: number,
  limit: number
): Promise<{ agents: AgentResponse[]; hasMore: boolean; total: number }> {
  try {
    const response = await fetchWithBackoff(
      `${API_PROXY}?chainId=11155111&page=${page}&limit=${limit}`,
      {}
    );

    const data: AgentListResponse = await response.json();
    return {
      agents: data.data || [],
      hasMore: data.meta?.pagination?.hasMore || false,
      total: data.meta?.pagination?.total || 0,
    };
  } catch (error) {
    debugLog('errors', 'Failed to fetch agents from API', error);
    return { agents: [], hasMore: false, total: 0 };
  }
}

let cachedAllAgentsResults: CacheEntry | null = null;

/**
 * Hook to fetch all agents with pagination
 * Fetches from 8004scan API and decodes metadata onchain via multicall
 */
export function useAgents(start: number = 0, count: number = 20) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchAgents = async () => {
      // Check cache first
      const cached = getCachedAllAgents();
      if (cached) {
        cachedAllAgentsResults = cached;
        if (mounted) {
          setAgents(cached.agents.slice(start, start + count));
          setTotalCount(cached.totalCount);
          setIsLoading(false);
        }
        return;
      }

      if (cachedAllAgentsResults) {
        if (mounted) {
          setAgents(cachedAllAgentsResults.agents.slice(start, start + count));
          setTotalCount(cachedAllAgentsResults.totalCount);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Fetch all agents from API
        const allApiAgents: AgentResponse[] = [];
        let currentPage = 1;
        let hasMorePages = true;

        while (hasMorePages && currentPage <= 50) {
          const {
            agents: pageAgents,
            hasMore,
            total,
          } = await fetchAllAgentsFromAPI(currentPage, 100);

          if (currentPage === 1 && total) {
            if (mounted) setTotalCount(total);
          }

          allApiAgents.push(...pageAgents);
          hasMorePages = hasMore;
          currentPage++;
        }

        if (allApiAgents.length === 0) {
          if (mounted) {
            setAgents([]);
            setTotalCount(0);
            setIsLoading(false);
          }
          return;
        }

        debugLog('contracts', `Fetched ${allApiAgents.length} total agents from API`);

        // For now, return all agents (without filtering by source)
        // This ensures the hook works for both Kokonut and non-Kokonut agents
        const decodedAgents: Agent[] = allApiAgents.map((agent: AgentResponse) => ({
          id: parseInt(agent.token_id),
          owner: agent.owner_address as `0x${string}`,
          agentURI: agent.agent_uri || '',
          metadata: null,
          isActive: true,
          createdAt: agent.created_at,
        }));

        // Cache results
        const cacheEntry: CacheEntry = {
          agents: decodedAgents,
          timestamp: Date.now(),
          totalCount: decodedAgents.length,
        };
        cachedAllAgentsResults = cacheEntry;
        setCachedAllAgents(decodedAgents, decodedAgents.length);

        if (mounted) {
          setAgents(decodedAgents.slice(start, start + count));
          setTotalCount(decodedAgents.length);
          setIsLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Failed to fetch agents'));
          setIsLoading(false);
        }
      }
    };

    fetchAgents();

    return () => {
      mounted = false;
    };
  }, [start, count]);

  const refetch = useCallback(() => {
    localStorage.removeItem(CACHE_KEY);
    cachedAllAgentsResults = null;
    setAgents([]);
    setTotalCount(0);
  }, []);

  return {
    agents,
    totalCount,
    isLoading,
    error,
    refetch,
  };
}
