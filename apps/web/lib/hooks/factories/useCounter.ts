// Generic counter factory for contract count functions
// Eliminates duplicate count hook patterns (useJobCount, useServiceCount, useProposalCount)

import { useReadContract } from 'wagmi';


export interface CounterConfig {
  address: string;
  abi: unknown[];
  functionName: string;
  staleTime?: number;
  enabled?: boolean;
}

export interface CounterResult {
  count: number;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Creates a generic counter hook for any contract's count function
 * 
 * @example
 * const useJobCount = createCounter({
 *   address: AGENTIC_COMMERCE_ADDRESS,
 *   abi: AGENTIC_COMMERCE_ABI,
 *   functionName: 'jobCounter'
 * });
 */
export function createCounter(config: CounterConfig) {
  return function useCounter(): CounterResult {
    const { data, isLoading, error, refetch } = useReadContract({
      address: config.address as `0x${string}`,
      abi: config.abi as readonly unknown[],
      functionName: config.functionName,
      query: {
        retry: 2,
        staleTime: config.staleTime || 30000,
        enabled: config.enabled !== false,
      },
    });

    return {
      count: data ? Number(data) : 0,
      isLoading,
      error: error as Error | null,
      refetch,
    };
  };
}

// ============================================================================
// PRE-CONFIGURED COUNTERS
// ============================================================================

// Import these from contracts config in actual usage
// import { getContractAddress } from '@/lib/contracts/config';
// import { AGENTIC_COMMERCE_ABI, SERVICE_REGISTRY_ABI, AGENT_REVIEW_ABI } from '@/lib/contracts/abis';

/**
 * Job counter hook
 * 
 * @example
 * const { count, isLoading } = useJobCount();
 */
export const useJobCount = createCounter({
  address: '', // Set from getContractAddress('AGENTIC_COMMERCE')
  abi: [], // Set from AGENTIC_COMMERCE_ABI
  functionName: 'jobCounter',
});

/**
 * Service counter hook
 * 
 * @example
 * const { count, isLoading } = useServiceCount();
 */
export const useServiceCount = createCounter({
  address: '', // Set from getContractAddress('SERVICE_REGISTRY')
  abi: [], // Set from SERVICE_REGISTRY_ABI
  functionName: 'getActiveServiceCount',
});

/**
 * Proposal counter hook
 * 
 * @example
 * const { count, isLoading } = useProposalCount();
 */
export const useProposalCount = createCounter({
  address: '', // Set from getContractAddress('AGENT_REVIEW')
  abi: [], // Set from AGENT_REVIEW_ABI
  functionName: 'proposalCounter',
});