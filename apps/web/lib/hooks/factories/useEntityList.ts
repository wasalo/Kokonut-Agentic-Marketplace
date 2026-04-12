// Generic entity list factory for paginated entity lookups
// Eliminates duplicate useJobs, useServices, useProposals list patterns

import { useReadContracts } from 'wagmi';
import { useMemo } from 'react';
import type { EntityConfig, EntityResult } from './useEntity';

export interface EntityListConfig<T> {
  address: string;
  abi: unknown[];
  getFunction: string;
  mapData: (id: bigint, data: unknown) => T | null;
  countFunction: string;
  staleTime?: number;
  defaultCount?: number;
}

export interface EntityListResult<T> {
  entities: T[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  hasMore: boolean;
}

/**
 * Creates a generic entity list hook (useJobs, useServices, useProposals)
 * 
 * @example
 * const useJobs = createEntityListHook<Job>({
 *   address: AGENTIC_COMMERCE_ADDRESS,
 *   abi: AGENTIC_COMMERCE_ABI,
 *   getFunction: 'getJob',
 *   mapData: mapJobData,
 *   countFunction: 'jobCounter'
 * });
 */
export function createEntityListHook<T>(config: EntityListConfig<T>) {
  return function useEntityList(
    start: number = 0,
    count: number = 20
  ): EntityListResult<T> {
    const { data: totalData, isLoading: isCountLoading } = useReadContracts({
      contracts: [
        {
          address: config.address as `0x${string}`,
          abi: config.abi as readonly unknown[],
          functionName: config.countFunction,
          args: undefined,
        },
      ],
      query: {
        staleTime: config.staleTime || 30000,
      },
    });

    const total = totalData?.[0]?.result ? Number(totalData[0].result) : 0;

    const queries = useMemo(() => {
      const result = [];
      const effectiveCount = Math.min(count, total - start);
      if (effectiveCount <= 0) return result;

      for (let i = start; i < start + effectiveCount; i++) {
        result.push({
          address: config.address as `0x${string}`,
          abi: config.abi as readonly unknown[],
          functionName: config.getFunction,
          args: [BigInt(i)],
        });
      }
      return result;
    }, [config.address, config.abi, config.getFunction, start, count, total]);

    const { data: results, isLoading, error, refetch } = useReadContracts({
      contracts: queries,
      query: {
        staleTime: config.staleTime || 10000,
        enabled: queries.length > 0,
      },
    });

    const entities = useMemo(() => {
      if (!results) return [];

      return results
        .map((result, index) => {
          if (!result.result) return null;
          return config.mapData(BigInt(start + index), result.result);
        })
        .filter((entity): entity is T => entity !== null);
    }, [results, start, config]);

    return {
      entities,
      isLoading: isLoading || isCountLoading,
      error: error as Error | null,
      refetch,
      hasMore: start + count < total,
    };
  };
}

// ============================================================================
// PRE-CONFIGURED LIST HOOKS
// ============================================================================

/**
 * Jobs list hook - use in components like:
 * const { entities: jobs, isLoading } = useJobs(0, 20);
 */
// export const useJobs = createEntityListHook<Job>({ ... });

/**
 * Services list hook
 */
// export const useServices = createEntityListHook<Service>({ ... });

/**
 * Proposals list hook
 */
// export const useProposals = createEntityListHook<Proposal>({ ... });