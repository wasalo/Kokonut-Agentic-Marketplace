'use client';

import { useCallback, useState } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { getContractAddress } from '@/lib/contracts/config';
import { AGENTIC_COMMERCE_ABI } from '@/lib/contracts/abis';

const AGENTIC_COMMERCE_ADDRESS = getContractAddress('AGENTIC_COMMERCE');

export function useEvaluatorPoolSize() {
  const { data, isLoading, error, refetch } = useReadContract({
    address: AGENTIC_COMMERCE_ADDRESS,
    abi: AGENTIC_COMMERCE_ABI,
    functionName: 'getEvaluatorPoolSize',
    query: { retry: 2, staleTime: 30_000 },
  });

  return { size: data ? Number(data) : 0, isLoading, error, refetch };
}

export function useMinEvaluatorStake() {
  const { data, isLoading, error, refetch } = useReadContract({
    address: AGENTIC_COMMERCE_ADDRESS,
    abi: AGENTIC_COMMERCE_ABI,
    functionName: 'minEvaluatorStake',
    query: { retry: 2, staleTime: 60_000 },
  });

  return { minStake: data as bigint | undefined, isLoading, error, refetch };
}

export function useEvaluatorPoolAdmin() {
  const [error, setError] = useState<string | null>(null);
  const { writeContract: cleanup, data: cleanupHash } = useWriteContract();
  const { isLoading: isCleaning, isSuccess: cleanupSuccess } = useWaitForTransactionReceipt({
    hash: cleanupHash,
  });

  const handleCleanupStale = useCallback(
    (maxIterations: bigint) => {
      try {
        setError(null);
        cleanup({
          address: AGENTIC_COMMERCE_ADDRESS,
          abi: AGENTIC_COMMERCE_ABI,
          functionName: 'cleanupStaleEvaluators',
          args: [maxIterations],
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to cleanup stale evaluators');
      }
    },
    [cleanup]
  );

  return {
    cleanupStaleEvaluators: handleCleanupStale,
    isCleaning,
    cleanupSuccess,
    error,
  };
}
