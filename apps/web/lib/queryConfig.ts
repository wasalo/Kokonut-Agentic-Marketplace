/**
 * Phase 3: Query Configuration
 * Optimized caching strategies for different data types
 * Balances freshness with RPC cost efficiency
 */

export const QUERY_CONFIGS = {
  // Services: Change infrequently, cache aggressively
  services: {
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    refetchInterval: false, // Only on events/mutation
  },

  // Jobs: Change frequently, moderate caching
  jobs: {
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    // Use events instead of polling
    refetchInterval: false,
  },

  // Job details: Cache longer, refetch on events
  jobDetails: {
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  },

  // Agent list: Cache aggressively, refetch on focus
  agents: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  },

  // Agent details: Cache heavily
  agentDetails: {
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  },

  // Prices: Short cache, frequent updates
  prices: {
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  },

  // User profile: Cache heavily, manual invalidation
  userProfile: {
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  },

  // Proposals: Moderate caching
  proposals: {
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  },

  // Reputation: Cache heavily
  reputation: {
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  },

  // Stats/Aggregates: Long cache
  stats: {
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  },
} as const;

/**
 * Get query config for a specific data type
 */
export function getQueryConfig<T extends keyof typeof QUERY_CONFIGS>(
  type: T
): (typeof QUERY_CONFIGS)[T] {
  return QUERY_CONFIGS[type];
}

/**
 * Cache version for cache invalidation on schema changes
 */
export const CACHE_VERSION = 'v3.1-phase3';

/**
 * Check if cached data is still valid
 */
export function isCacheValid(timestamp: number, maxAge: number): boolean {
  return Date.now() - timestamp < maxAge;
}
