'use client';

import { useCallback, useEffect } from 'react';
import { useWriteContract, useSwitchChain, useWaitForTransactionReceipt } from 'wagmi';
import { padHex } from 'viem';
import { EFP_CHAIN_ID, EFP_CONTRACTS, EFP_ACCOUNT_METADATA_ABI } from '@/lib/efp/contracts';
import { useEfpListStatus } from './useEfpListStatus';

interface UseEfpSetPrimaryReturn {
  setPrimaryList: (tokenId: bigint) => Promise<`0x${string}` | undefined>;
  isPending: boolean;
  isConfirming: boolean;
  isConfirmed: boolean;
  hash: `0x${string}` | undefined;
  error: Error | null;
  hasPrimaryList: boolean;
}

export function useEfpSetPrimary(address: string | undefined): UseEfpSetPrimaryReturn {
  const { switchChainAsync } = useSwitchChain();
  const { refetch, hasPrimaryList } = useEfpListStatus(address);

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

  useEffect(() => {
    if (isConfirmed) {
      const timer = setTimeout(() => refetch(), 2000);
      return () => clearTimeout(timer);
    }
  }, [isConfirmed, refetch]);

  const setPrimaryList = useCallback(async (tokenId: bigint) => {
    try {
      await switchChainAsync({ chainId: EFP_CHAIN_ID });

      const key = 'primary-list';
      const value = padHex(`0x${tokenId.toString(16).padStart(64, '0')}`, { size: 32 });

      const txHash = await writeContractAsync({
        address: EFP_CONTRACTS.EFPAccountMetadata,
        abi: EFP_ACCOUNT_METADATA_ABI,
        functionName: 'setValue',
        args: [key, value],
      });

      return txHash;
    } catch (err) {
      throw err;
    }
  }, [switchChainAsync, writeContractAsync]);

  return {
    setPrimaryList,
    isPending,
    isConfirming,
    isConfirmed,
    hash,
    error: writeError as Error | null,
    hasPrimaryList,
  };
}
