'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePublicClient } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { decodeAgentMetadata, type AgentMetadata8004 } from '@/lib/metadata';
import { debugLog, CONTRACT_ADDRESSES } from '@/lib/contracts/config';
import { ERC8004_ABI } from '@/lib/8004contracts';

const API_KEY = process.env.NEXT_PUBLIC_8004_API_KEY || '';
const API_BASE = 'https://8004scan.io/api/v1/public';
const MAX_RETRIES = 3;

// Validate API key is configured
if (!API_KEY && process.env.NODE_ENV === 'production') {
  console.error(
    '[useKokonutAgents] ERROR: 8004scan API key not configured. Set NEXT_PUBLIC_8004_API_KEY in your .env file'
  );
}
const CACHE_KEY = 'kokonut_agents_cache_v2';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const STALE_TIME = 5 * 60 * 1000; // 5 minutes
const GC_TIME = 30 * 60 * 1000; // 30 minutes

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

interface CacheEntry {
  agents: KokonutAgent[];
  timestamp: number;
  totalCount: number;
}

function getCachedAgents(): CacheEntry | null {
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

function setCachedAgents(agents: KokonutAgent[], totalCount: number) {
  if (typeof window === 'undefined') return;

  try {
    const entry: CacheEntry = {
      agents,
      timestamp: Date.now(),
      totalCount,
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
    debugLog('contracts', `Cached ${agents.length} Kokonut agents`);
  } catch (error) {
    debugLog('errors', 'Failed to cache agents', error);
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

// Fetch agents from 8004scan API with pagination info
async function fetchAgentsFromAPI(
  page: number,
  limit: number
): Promise<{ agents: any[]; hasMore: boolean; total: number }> {
  try {
    const response = await fetchWithBackoff(
      `${API_BASE}/agents?chainId=11155111&page=${page}&limit=${limit}`,
      {
        headers: {
          'X-API-Key': API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();
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

// Cache for API results (React Query handles the caching)
let cachedApiResults: CacheEntry | null = null;

export function useKokonutAgents(
  page = 0,
  itemsPerPage = 12,
  showAll = false
): UseKokonutAgentsReturn {
  const publicClient = usePublicClient();
  const [allKokonutAgents, setAllKokonutAgents] = useState<KokonutAgent[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedCount, setScannedCount] = useState(0);
  const [totalToScan, setTotalToScan] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  const [skipCache, setSkipCache] = useState(false);

  // Check cache on mount
  const cachedAgentsRef = useMemo(() => {
    if (skipCache) return null;
    return cachedApiResults || getCachedAgents();
  }, [skipCache]);

  // Use React Query for caching and retry logic
  const { refetch: queryRefetch } = useQuery({
    queryKey: ['kokonut-agents-scan'],
    queryFn: async () => {
      if (!publicClient) return null;
      return cachedAgentsRef && !skipCache ? cachedAgentsRef : null;
    },
    enabled: false, // Manual trigger only
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    retry: MAX_RETRIES,
    retryDelay: attemptIndex => Math.min(1000 * Math.pow(2, attemptIndex), 30000),
  });

  // Fetch and filter agents
  const fetchAndFilterAgents = useCallback(async () => {
    if (!publicClient) return;

    // Use cache if available
    if (cachedAgentsRef && !skipCache) {
      setAllKokonutAgents(cachedAgentsRef.agents);
      setTotalToScan(cachedAgentsRef.totalCount);
      setScannedCount(cachedAgentsRef.totalCount);
      return;
    }

    setIsScanning(true);
    setError(null);

    try {
      // Step 1: Fetch ALL agents from API by paginating through all pages
      const allApiAgents: any[] = [];
      let currentPage = 1;
      let hasMorePages = true;

      while (hasMorePages && currentPage <= 50) {
        // Limit to 50 pages (5000 agents) to prevent infinite loops
        const { agents, hasMore, total } = await fetchAgentsFromAPI(currentPage, 100);

        if (currentPage === 1) {
          setTotalToScan(total);
        }

        allApiAgents.push(...agents);
        hasMorePages = hasMore;
        currentPage++;

        // Update scanned count to show progress
        setScannedCount(allApiAgents.length);
      }

      if (allApiAgents.length === 0) {
        setAllKokonutAgents([]);
        setIsScanning(false);
        return;
      }

      debugLog('contracts', `Fetched ${allApiAgents.length} total agents from API`);

      // Step 2: Batch fetch tokenURIs using multicall
      const batchSize = 50; // Process 50 at a time
      const kokonutAgents: KokonutAgent[] = [];

      for (let i = 0; i < allApiAgents.length; i += batchSize) {
        const batch = allApiAgents.slice(i, i + batchSize);
        const tokenIds = batch.map((agent: any) => BigInt(agent.token_id));

        // Create multicall for tokenURIs
        const calls = tokenIds.map((id: bigint) => ({
          address: CONTRACT_ADDRESSES.sepolia.erc8004Registry,
          abi: ERC8004_ABI,
          functionName: 'tokenURI' as const,
          args: [id] as const,
        }));

        const results = await publicClient.multicall({ contracts: calls });

        // Process results and filter by source
        for (let j = 0; j < results.length; j++) {
          const result = results[j];
          const apiAgent = batch[j];

          if (result.status === 'success' && result.result) {
            const uri = result.result as string;
            const metadata = decodeAgentMetadata(uri);

            // Check if this is a Kokonut agent
            if (metadata?.source === 'kokonut-marketplace') {
              kokonutAgents.push({
                id: apiAgent.token_id,
                owner: apiAgent.owner_address as `0x${string}`,
                agentURI: uri,
                metadata,
                source: metadata.source,
                isActive: true, // Agents from API are considered active
                totalScore: apiAgent.total_score || 0,
                starCount: apiAgent.star_count || 0,
                totalFeedbacks: apiAgent.total_feedbacks || 0,
                createdAt: apiAgent.created_at,
              });
            }
          }
        }

        setScannedCount(allApiAgents.length + Math.min(i + batchSize, allApiAgents.length));
      }

      // Cache the results
      cachedApiResults = {
        agents: kokonutAgents,
        timestamp: Date.now(),
        totalCount: kokonutAgents.length,
      };
      setAllKokonutAgents(kokonutAgents);
      setCachedAgents(kokonutAgents, kokonutAgents.length);
      debugLog('contracts', `Found ${kokonutAgents.length} Kokonut agents`);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch agents'));
      debugLog('errors', 'Error in fetchAndFilterAgents', err);
    } finally {
      setIsScanning(false);
    }
  }, [publicClient, cachedAgentsRef, skipCache]);

  // Trigger fetch on mount
  useEffect(() => {
    fetchAndFilterAgents();
  }, [fetchAndFilterAgents]);

  // Paginate results
  const paginatedAgents = useMemo(() => {
    if (showAll) return allKokonutAgents;
    return allKokonutAgents.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
  }, [allKokonutAgents, page, itemsPerPage, showAll]);

  const refetch = useCallback(() => {
    localStorage.removeItem(CACHE_KEY);
    cachedApiResults = null;
    setSkipCache(true);
    setAllKokonutAgents([]);
    fetchAndFilterAgents();
  }, [fetchAndFilterAgents]);

  const isLoading = isScanning && allKokonutAgents.length === 0;

  return {
    agents: paginatedAgents,
    totalCount: allKokonutAgents.length,
    isLoading,
    isScanning,
    scannedCount,
    totalToScan,
    error,
    refetch,
  };
}
