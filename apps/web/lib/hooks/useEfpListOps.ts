'use client';

import { useCallback } from 'react';
import { useWriteContract, useSwitchChain, useWaitForTransactionReceipt } from 'wagmi';
import { parseAbi } from 'viem';
import { EFP_CHAIN_ID } from '@/lib/efp/contracts';
import { buildFollowOp, buildUnfollowOp } from '@/lib/efp/list-ops';
import { ListRecordContracts } from 'ethereum-identity-kit';

const LIST_RECORDS_ABI = parseAbi([
  'function applyListOp(bytes calldata _listOp) external',
] as const);

const EFP_LIST_RECORDS = ListRecordContracts[EFP_CHAIN_ID] as `0x${string}`;

interface UseEfpFollowReturn {
  follow: (targetAddress: `0x${string}`) => Promise<`0x${string}` | undefined>;
  unfollow: (targetAddress: `0x${string}`) => Promise<`0x${string}` | undefined>;
  isPending: boolean;
  isConfirming: boolean;
  isConfirmed: boolean;
  hash: `0x${string}` | undefined;
  error: Error | null;
}

export function useEfpFollow(): UseEfpFollowReturn {
  const { switchChainAsync } = useSwitchChain();

  const {
    writeContractAsync,
    data: hash,
    error: writeError,
    isPending,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
  } = useWaitForTransactionReceipt({ hash });

  const follow = useCallback(async (targetAddress: `0x${string}`) => {
    await switchChainAsync({ chainId: EFP_CHAIN_ID });

    const listOpData = buildFollowOp(targetAddress);

    const txHash = await writeContractAsync({
      address: EFP_LIST_RECORDS,
      abi: LIST_RECORDS_ABI,
      functionName: 'applyListOp',
      args: [listOpData],
    });

    return txHash;
  }, [switchChainAsync, writeContractAsync]);

  const unfollow = useCallback(async (targetAddress: `0x${string}`) => {
    await switchChainAsync({ chainId: EFP_CHAIN_ID });

    const listOpData = buildUnfollowOp(targetAddress);

    const txHash = await writeContractAsync({
      address: EFP_LIST_RECORDS,
      abi: LIST_RECORDS_ABI,
      functionName: 'applyListOp',
      args: [listOpData],
    });

    return txHash;
  }, [switchChainAsync, writeContractAsync]);

  return {
    follow,
    unfollow,
    isPending,
    isConfirming,
    isConfirmed,
    hash,
    error: writeError as Error | null,
  };
}
