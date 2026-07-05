'use client';

import { useCallback, useState } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { getContractAddress } from '@/lib/contracts/config';
import { AGENTIC_COMMERCE_ABI } from '@/lib/contracts/abis';

const AGENTIC_COMMERCE_ADDRESS = getContractAddress('AGENTIC_COMMERCE');

export function useDefaultDisputeWindow() {
  const { data, isLoading, error, refetch } = useReadContract({
    address: AGENTIC_COMMERCE_ADDRESS,
    abi: AGENTIC_COMMERCE_ABI,
    functionName: 'DEFAULT_DISPUTE_WINDOW',
    query: { retry: 2, staleTime: 60_000 },
  });

  return { defaultWindow: data as bigint | undefined, isLoading, error, refetch };
}

export function useMilestoneConfigAdmin() {
  const [error, setError] = useState<string | null>(null);

  const { writeContract: setWindow, data: windowHash } = useWriteContract();
  const { isLoading: isSettingWindow, isSuccess: windowSuccess } = useWaitForTransactionReceipt({
    hash: windowHash,
  });

  const handleSetDisputeWindow = useCallback(
    (jobId: bigint, seconds: bigint) => {
      try {
        setError(null);
        setWindow({
          address: AGENTIC_COMMERCE_ADDRESS,
          abi: AGENTIC_COMMERCE_ABI,
          functionName: 'setDisputeWindow',
          args: [jobId, seconds],
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to set dispute window');
      }
    },
    [setWindow]
  );

  const { writeContract: setSlash, data: slashHash } = useWriteContract();
  const { isLoading: isSettingSlash, isSuccess: slashSuccess } = useWaitForTransactionReceipt({
    hash: slashHash,
  });

  const handleSetSlashBP = useCallback(
    (jobId: bigint, basisPoints: bigint) => {
      try {
        setError(null);
        setSlash({
          address: AGENTIC_COMMERCE_ADDRESS,
          abi: AGENTIC_COMMERCE_ABI,
          functionName: 'setNonResponsiveSlashBP',
          args: [jobId, basisPoints],
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to set slash basis points');
      }
    },
    [setSlash]
  );

  return {
    setDisputeWindow: handleSetDisputeWindow,
    isSettingWindow,
    windowSuccess,
    setSlashBP: handleSetSlashBP,
    isSettingSlash,
    slashSuccess,
    error,
  };
}
