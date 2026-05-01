'use client';

import { useReadContract, useWriteContract } from 'wagmi';
import { getContractAddress } from '@/lib/contracts/config';
import { AGENTIC_COMMERCE_ABI } from '@/lib/contracts/abis';

const AGENTIC_COMMERCE_ADDRESS = getContractAddress('AGENTIC_COMMERCE');

const AGENTIC_COMMERCE_ABI_TYPED = AGENTIC_COMMERCE_ABI as typeof AGENTIC_COMMERCE_ABI &
  readonly (
    | { name: 'platformTreasury' }
    | { name: 'owner' }
    | { name: 'setPlatformTreasury' }
  )[];

/**
 * Hook to get the platform treasury address
 * @returns Treasury address
 */
export function usePlatformTreasury() {
  const { data, isLoading, error, refetch } = useReadContract({
    address: AGENTIC_COMMERCE_ADDRESS,
    abi: AGENTIC_COMMERCE_ABI_TYPED,
    functionName: 'platformTreasury',
    query: {
      retry: 2,
      staleTime: 60 * 1000,
    },
  });

  return {
    treasury: data,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to get the contract owner
 * @returns Owner address
 */
export function useAgenticCommerceOwner() {
  const { data, isLoading, error, refetch } = useReadContract({
    address: AGENTIC_COMMERCE_ADDRESS,
    abi: AGENTIC_COMMERCE_ABI_TYPED,
    functionName: 'owner',
    query: {
      retry: 2,
      staleTime: 60 * 1000,
    },
  });

  return {
    owner: data,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to set the platform treasury address (owner only)
 * @returns Write action result
 */
export function useSetPlatformTreasury() {
  const { writeContract, ...rest } = useWriteContract();

  const setTreasury = (treasury: `0x${string}`) => {
    writeContract({
      address: AGENTIC_COMMERCE_ADDRESS,
      abi: AGENTIC_COMMERCE_ABI_TYPED,
      functionName: 'setPlatformTreasury',
      args: [treasury] as const,
    });
  };

  return {
    setTreasury,
    ...rest,
  };
}

/**
 * Hook to set the platform fee (owner only)
 * @param feeBP - Fee in basis points (e.g., 100 = 1%)
 * @param treasury - Treasury address to receive fees
 * @returns Write action result
 */
/**
 * @deprecated V9 has no setPlatformFee function. Platform fee is hardcoded at 100 bps in _releasePayment().
 */
export function useSetPlatformFee() {
  const setFee = (_feeBP: bigint, _treasury: `0x${string}`) => {
    console.warn('useSetPlatformFee is deprecated - V9 has no setPlatformFee function. Fee is hardcoded at 100 bps.');
  };

  return {
    setFee,
    isPending: false,
    error: null,
    reset: () => {},
  };
}

/**
 * Hook to get the current platform fee
 * @returns Platform fee in basis points
 */
/**
 * @deprecated V9 has no platformFeeBP function. Fee is hardcoded at 100 bps in _releasePayment().
 */
export function usePlatformFee() {
  return {
    feeBP: BigInt(100),
    feePercent: 1,
    isLoading: false,
    error: null,
    refetch: () => {},
  };
}

/**
 * Hook to get the evaluator fee basis points
 * @returns Evaluator fee in basis points
 */
export function useEvaluatorFeeBP() {
  const { data, isLoading, error, refetch } = useReadContract({
    address: AGENTIC_COMMERCE_ADDRESS,
    abi: AGENTIC_COMMERCE_ABI,
    functionName: 'EVALUATOR_FEE_BP',
    query: {
      retry: 2,
      staleTime: 60 * 1000,
    },
  });

  return {
    evaluatorFeeBP: data,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to get fee denominator
 * @returns Fee denominator (typically 10000)
 */
export function useFeeDenominator() {
  const { data, isLoading, error, refetch } = useReadContract({
    address: AGENTIC_COMMERCE_ADDRESS,
    abi: AGENTIC_COMMERCE_ABI,
    functionName: 'FEE_DENOMINATOR',
    query: {
      retry: 2,
      staleTime: 60 * 1000,
    },
  });

  return {
    denominator: data,
    isLoading,
    error,
    refetch,
  };
}