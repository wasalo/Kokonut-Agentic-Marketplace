// Shared API utilities for hooks
// Eliminates duplicate fetchWithBackoff and cache logic across useAgents.ts, useKokonutAgents.ts, etc.

import { debugLog } from '@/lib/debug';

const DEFAULT_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const DEFAULT_RETRIES = 3;
const DEFAULT_BACKOFF_MS = 1000;

// ============================================================================
// CACHE HELPERS
// ============================================================================

export interface CacheOptions {
  duration?: number;
  key?: string;
}

export function getCachedData<T>(key: string): T | null {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);
    const isExpired = Date.now() - timestamp > DEFAULT_CACHE_DURATION;

    if (isExpired) {
      localStorage.removeItem(key);
      return null;
    }

    return data as T;
  } catch {
    return null;
  }
}

export function setCachedData<T>(key: string, data: T): void {
  try {
    localStorage.setItem(
      key,
      JSON.stringify({
        data,
        timestamp: Date.now(),
      })
    );
  } catch (error) {
    debugLog('cache', 'Failed to set cache:', error);
  }
}

export function createCacheKey(prefix: string, ...parts: (string | number)[]): string {
  return `kokonut_${prefix}_${parts.join('_')}`;
}

// ============================================================================
// API FETCHING
// ============================================================================

export interface FetchOptions extends RequestInit {
  retries?: number;
  backoffMs?: number;
  signal?: AbortSignal;
}

export async function fetchWithBackoff(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const { retries = DEFAULT_RETRIES, backoffMs = DEFAULT_BACKOFF_MS, ...fetchOptions } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers: {
          'Content-Type': 'application/json',
          ...fetchOptions.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      lastError = error as Error;
      debugLog('api', `Fetch attempt ${attempt + 1} failed:`, error);

      if (attempt < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, backoffMs * Math.pow(2, attempt)));
      }
    }
  }

  throw lastError || new Error('Fetch failed after retries');
}

// ============================================================================
// API CLIENTS
// ============================================================================

const ERC8004_API_BASE = 'https://8004scan.io/api/v1/public';

export interface AgentResponse {
  token_id: string;
  owner_address: string;
  agent_uri: string;
  created_at: string;
}

export async function fetchAgentsFromAPI(
  page: number = 1,
  limit: number = 20
): Promise<AgentResponse[]> {
  const response = await fetchWithBackoff(
    `${ERC8004_API_BASE}/agents?page=${page}&limit=${limit}`,
    { retries: 3 }
  );

  const data = await response.json();
  return data.agents || data.data || [];
}

export async function fetchAgentById(agentId: number): Promise<AgentResponse | null> {
  try {
    const response = await fetchWithBackoff(`${ERC8004_API_BASE}/agent/${agentId}`);
    const data = await response.json();
    return data.agent || data;
  } catch {
    return null;
  }
}

export async function fetchAgentsByOwner(ownerAddress: string): Promise<AgentResponse[]> {
  const response = await fetchWithBackoff(
    `${ERC8004_API_BASE}/owner/${ownerAddress}/agents`
  );
  const data = await response.json();
  return data.agents || data.data || [];
}