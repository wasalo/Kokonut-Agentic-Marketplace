'use client';

import { useReadContract, useWriteContract } from 'wagmi';
import { BIDDING_SYSTEM_ABI } from '@/lib/contracts/abis';
import { getContractAddress, debugLog } from '@/lib/contracts/config';

const BIDDING_SYSTEM_ADDRESS = getContractAddress('BIDDING_SYSTEM');

const BIDDING_SYSTEM_ABI_TYPED = BIDDING_SYSTEM_ABI as typeof BIDDING_SYSTEM_ABI &
  readonly (
    | { name: 'owner' }
    | { name: 'commerce' }
    | { name: 'treasury' }
    | { name: 'setCommerce' }
    | { name: 'setRevealWindow' }
    | { name: 'setPlatformFeeBP' }
    | { name: 'setMinStakeBP' }
    | { name: 'withdrawPlatformFees' }
  )[];

/**
 * Hook to get the BiddingSystem contract owner
 * @returns Owner address
 */
export function useBiddingOwner() {
  const { data, isLoading, error, refetch } = useReadContract({
    address: BIDDING_SYSTEM_ADDRESS,
    abi: BIDDING_SYSTEM_ABI_TYPED,
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
 * Hook to get the commerce contract address
 * @returns AgenticCommerce address
 */
export function useBiddingCommerce() {
  const { data, isLoading, error, refetch } = useReadContract({
    address: BIDDING_SYSTEM_ADDRESS,
    abi: BIDDING_SYSTEM_ABI_TYPED,
    functionName: 'commerce',
    query: {
      retry: 2,
      staleTime: 60 * 1000,
    },
  });

  return {
    commerce: data,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to get the treasury address
 * @returns Treasury address
 */
export function useBiddingTreasury() {
  const { data, isLoading, error, refetch } = useReadContract({
    address: BIDDING_SYSTEM_ADDRESS,
    abi: BIDDING_SYSTEM_ABI_TYPED,
    functionName: 'treasury',
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
 * Hook to get the reveal window duration
 * @returns Reveal window in seconds
 */
export function useBiddingRevealWindow() {
  const { data, isLoading, error, refetch } = useReadContract({
    address: BIDDING_SYSTEM_ADDRESS,
    abi: BIDDING_SYSTEM_ABI,
    functionName: 'revealWindow',
    query: {
      retry: 2,
      staleTime: 60 * 1000,
    },
  });

  return {
    revealWindow: data,
    revealWindowMinutes: data ? Number(data) / 60 : undefined,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to get the platform fee in basis points
 * @returns Platform fee BP
 */
export function useBiddingPlatformFeeBP() {
  const { data, isLoading, error, refetch } = useReadContract({
    address: BIDDING_SYSTEM_ADDRESS,
    abi: BIDDING_SYSTEM_ABI,
    functionName: 'platformFeeBP',
    query: {
      retry: 2,
      staleTime: 60 * 1000,
    },
  });

  return {
    platformFeeBP: data,
    platformFeePercent: data ? Number(data) / 100 : undefined,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to set the commerce contract address (owner only)
 * @returns Write action result
 */
export function useSetBiddingCommerce() {
  const { writeContract, ...rest } = useWriteContract();

  const setCommerce = (commerce: `0x${string}`) => {
    debugLog('contracts', 'useSetBiddingCommerce: Setting commerce to', commerce);
    writeContract({
      address: BIDDING_SYSTEM_ADDRESS,
      abi: BIDDING_SYSTEM_ABI_TYPED,
      functionName: 'setCommerce',
      args: [commerce],
    });
  };

  return {
    setCommerce,
    ...rest,
  };
}

/**
 * Hook to set the reveal window (owner only)
 * @param seconds - Reveal window in seconds
 * @returns Write action result
 */
export function useSetBiddingRevealWindow() {
  const { writeContract, ...rest } = useWriteContract();

  const setRevealWindow = (seconds: bigint) => {
    writeContract({
      address: BIDDING_SYSTEM_ADDRESS,
      abi: BIDDING_SYSTEM_ABI_TYPED,
      functionName: 'setRevealWindow',
      args: [seconds] as const,
    });
  };

  return {
    setRevealWindow,
    ...rest,
  };
}

/**
 * Hook to set the platform fee basis points (owner only)
 * @param feeBP - Fee in basis points
 * @returns Write action result
 */
export function useSetBiddingPlatformFeeBP() {
  const { writeContract, ...rest } = useWriteContract();

  const setPlatformFeeBP = (feeBP: bigint) => {
    writeContract({
      address: BIDDING_SYSTEM_ADDRESS,
      abi: BIDDING_SYSTEM_ABI_TYPED,
      functionName: 'setPlatformFeeBP',
      args: [feeBP] as const,
    });
  };

  return {
    setPlatformFeeBP,
    ...rest,
  };
}

/**
 * Hook to set the minimum stake basis points (owner only)
 * @param minStakeBP - Min stake in basis points
 * @returns Write action result
 */
export function useSetMinStakeBP() {
  const { writeContract, ...rest } = useWriteContract();

  const setMinStakeBP = (minStakeBP: bigint) => {
    writeContract({
      address: BIDDING_SYSTEM_ADDRESS,
      abi: BIDDING_SYSTEM_ABI_TYPED,
      functionName: 'setMinStakeBP',
      args: [minStakeBP] as const,
    });
  };

  return {
    setMinStakeBP,
    ...rest,
  };
}

/**
 * Hook to withdraw platform fees (owner only)
 * @param to - Recipient address
 * @param amount - Amount to withdraw
 * @returns Write action result
 */
export function useWithdrawBiddingFees() {
  const { writeContract, ...rest } = useWriteContract();

  const withdrawFees = (to: `0x${string}`, amount: bigint) => {
    writeContract({
      address: BIDDING_SYSTEM_ADDRESS,
      abi: BIDDING_SYSTEM_ABI_TYPED,
      functionName: 'withdrawPlatformFees',
      args: [to, amount] as const,
    });
  };

  return {
    withdrawFees,
    ...rest,
  };
}