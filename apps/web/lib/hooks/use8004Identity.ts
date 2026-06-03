'use client';

import { useCallback, useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ERC8004_ABI } from '@/lib/8004contracts';

const ERC8004_ADDRESS = (process.env.NEXT_PUBLIC_8004_REGISTRY_ADDRESS ||
  '0x8004A818BFB912233c491871b3d84c89A494BD9e') as `0x${string}`;
const SEPOLIA_CHAIN_ID = 11155111;

export function useRegisterAgent() {
  const [error, setError] = useState<string | null>(null);
  const { writeContract, data: txHash, isPending, error: txError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const register = useCallback(
    (agentURI: string) => {
      try {
        setError(null);
        writeContract({
          chainId: SEPOLIA_CHAIN_ID,
          address: ERC8004_ADDRESS,
          abi: ERC8004_ABI,
          functionName: 'register',
          args: [agentURI],
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to register agent');
      }
    },
    [writeContract]
  );

  return {
    register,
    txHash,
    isPending,
    isConfirming,
    isConfirmed,
    error: error ?? txError?.message ?? null,
  };
}

export function useSetAgentURI() {
  const [error, setError] = useState<string | null>(null);
  const { writeContract, data: txHash, isPending, error: txError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const setAgentURI = useCallback(
    (agentId: bigint, newURI: string) => {
      try {
        setError(null);
        writeContract({
          chainId: SEPOLIA_CHAIN_ID,
          address: ERC8004_ADDRESS,
          abi: ERC8004_ABI,
          functionName: 'setAgentURI',
          args: [agentId, newURI],
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to set agent URI');
      }
    },
    [writeContract]
  );

  return {
    setAgentURI,
    txHash,
    isPending,
    isConfirming,
    isConfirmed,
    error: error ?? txError?.message ?? null,
  };
}

export function useSetAgentMetadata() {
  const [error, setError] = useState<string | null>(null);
  const { writeContract, data: txHash, isPending, error: txError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const setAgentMetadata = useCallback(
    (agentId: bigint, metadataKey: string, metadataValue: `0x${string}`) => {
      try {
        setError(null);
        writeContract({
          chainId: SEPOLIA_CHAIN_ID,
          address: ERC8004_ADDRESS,
          abi: ERC8004_ABI,
          functionName: 'setMetadata',
          args: [agentId, metadataKey, metadataValue],
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to set agent metadata');
      }
    },
    [writeContract]
  );

  return {
    setAgentMetadata,
    txHash,
    isPending,
    isConfirming,
    isConfirmed,
    error: error ?? txError?.message ?? null,
  };
}
