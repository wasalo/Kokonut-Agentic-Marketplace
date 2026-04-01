'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePublicClient } from 'wagmi';
import { decodeAgentMetadata, type AgentMetadata8004 } from '@/lib/metadata';
import { debugLog } from '@/lib/contracts/config';
import { ERC8004_ABI } from '@/lib/8004contracts';

const API_KEY = process.env.NEXT_PUBLIC_8004_API_KEY || '';
const API_BASE = 'https://8004scan.io/api/v1/public';

// Validate API key is configured
if (!API_KEY && process.env.NODE_ENV === 'production') {
  console.error(
    '[useKokonutAgents] ERROR: 8004scan API key not configured. Set NEXT_PUBLIC_8004_API_KEY in your .env file'
  );
}
const CACHE_KEY = 'kokonut_agents_cache_v2';
const CACHE_DURATION = 1 * 60 * 1000; // 1 minute - reduced for faster updates

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

// Fetch agents from 8004scan API
async function fetchAgentsFromAPI(page: number, limit: number): Promise<any[]> {
  try {
    const response = await fetch(
      `${API_BASE}/agents?chainId=11155111&page=${page}&limit=${limit}`,
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
    return data.data || [];
  } catch (error) {
    debugLog('errors', 'Failed to fetch agents from API', error);
    return [];
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
  const cachedAgents = useMemo(() => {
    if (skipCache) return null;
    return getCachedAgents();
  }, [skipCache]);

  // Fetch and filter agents
  const fetchAndFilterAgents = useCallback(async () => {
    if (!publicClient) return;

    // Use cache if available
    if (cachedAgents && !skipCache) {
      setAllKokonutAgents(cachedAgents.agents);
      setTotalToScan(cachedAgents.totalCount);
      setScannedCount(cachedAgents.totalCount);
      return;
    }

    setIsScanning(true);
    setError(null);

    try {
      // Step 1: Fetch agents from API
      const apiAgents = await fetchAgentsFromAPI(1, 1000); // Get all agents
      setTotalToScan(apiAgents.length);

      if (apiAgents.length === 0) {
        setAllKokonutAgents([]);
        setIsScanning(false);
        return;
      }

      // Step 2: Batch fetch tokenURIs using multicall
      const batchSize = 50; // Process 50 at a time
      const kokonutAgents: KokonutAgent[] = [];

      for (let i = 0; i < apiAgents.length; i += batchSize) {
        const batch = apiAgents.slice(i, i + batchSize);
        const tokenIds = batch.map((agent: any) => BigInt(agent.token_id));

        // Create multicall for tokenURIs
        const calls = tokenIds.map(id => ({
          address: '0x8004A818BFB912233c491871b3d84c89A494BD9e' as `0x${string}`,
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

        setScannedCount(Math.min(i + batchSize, apiAgents.length));
      }

      setAllKokonutAgents(kokonutAgents);
      setCachedAgents(kokonutAgents, kokonutAgents.length);
      debugLog('contracts', `Found ${kokonutAgents.length} Kokonut agents`);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch agents'));
      debugLog('errors', 'Error in fetchAndFilterAgents', err);
    } finally {
      setIsScanning(false);
    }
  }, [publicClient, cachedAgents, skipCache]);

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
