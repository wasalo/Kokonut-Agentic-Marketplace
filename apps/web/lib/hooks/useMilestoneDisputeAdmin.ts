'use client';

import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usePublicClient, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { getContractAddress } from '@/lib/contracts/config';
import { MILESTONE_ESCROW_ABI } from '@/lib/contracts/abis';

const MILESTONE_ESCROW_ADDRESS = getContractAddress('MILESTONE_ESCROW');

export interface MilestoneDispute {
  jobId: bigint;
  milestoneIndex: bigint;
}

export function useActiveDisputes() {
  const publicClient = usePublicClient();

  const query = useQuery<MilestoneDispute[]>({
    queryKey: ['active-disputes'],
    queryFn: async () => {
      const result = (await publicClient!.readContract({
        address: MILESTONE_ESCROW_ADDRESS,
        abi: MILESTONE_ESCROW_ABI,
        functionName: 'getActiveDisputes',
      } as never)) as bigint[];
      return result.map((jobId, idx) => ({ jobId, milestoneIndex: BigInt(idx) }));
    },
    enabled: false,
  });

  return {
    load: query.refetch,
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
  };
}

export function useResolveDispute() {
  const [error, setError] = useState<string | null>(null);
  const { writeContract: resolve, data: resolveHash } = useWriteContract();
  const { isLoading: isResolving, isSuccess: resolveSuccess } = useWaitForTransactionReceipt({
    hash: resolveHash,
  });

  const handleResolve = useCallback(
    (jobId: bigint, releaseToProvider: boolean) => {
      try {
        setError(null);
        resolve({
          address: MILESTONE_ESCROW_ADDRESS,
          abi: MILESTONE_ESCROW_ABI,
          functionName: 'resolveDispute',
          args: [jobId, releaseToProvider],
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to resolve dispute');
      }
    },
    [resolve]
  );

  return { resolveDispute: handleResolve, isResolving, resolveSuccess, error };
}
