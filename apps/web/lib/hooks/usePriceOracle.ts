import { useReadContract } from 'wagmi';
import { getContractAddress } from '@/lib/contracts/config';
import { PRICE_ORACLE_ABI } from '@/lib/contracts/abis';

/* eslint-disable @typescript-eslint/no-explicit-any */

const PRICE_ORACLE_ADDRESS = getContractAddress('PRICE_ORACLE');

/**
 * Hook to get the current USDC price from the oracle
 * @returns USDC price with 8 decimals (1 USDC = 100000000)
 */
export function useUSDCPrice() {
  const { data, isLoading, error, refetch } = useReadContract({
    address: PRICE_ORACLE_ADDRESS,
    abi: PRICE_ORACLE_ABI,
    functionName: 'getUSDCPrice',
    query: {
      retry: 2,
      staleTime: 60 * 1000, // 1 minute
    },
  });

  return {
    price: data,
    priceInUsd: data ? Number(data) / 1e8 : undefined,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to get the current ETH rate from the oracle
 * @returns ETH rate with 8 decimals
 */
export function useETHRate() {
  const { data, isLoading, error, refetch } = useReadContract({
    address: PRICE_ORACLE_ADDRESS,
    abi: PRICE_ORACLE_ABI,
    functionName: 'getETHRate',
    query: {
      retry: 2,
      staleTime: 60 * 1000,
    },
  });

  return {
    rate: data,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to check if the price oracle data is stale
 * @returns boolean indicating if price data is stale (> 1 hour old)
 */
export function usePriceOracleStale() {
  const { data, isLoading, error, refetch } = useReadContract({
    address: PRICE_ORACLE_ADDRESS,
    abi: PRICE_ORACLE_ABI,
    functionName: 'isStale',
    query: {
      retry: 2,
      staleTime: 30 * 1000,
    },
  });

  return {
    isStale: data,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to get the price of a specific token
 * @param tokenAddress The token address to query
 * @returns Token price in USD with 8 decimals
 */
export function useTokenPrice(tokenAddress: `0x${string}` | undefined) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: PRICE_ORACLE_ADDRESS,
    abi: PRICE_ORACLE_ABI,
    functionName: 'getUsdPriceOfToken',
    args: tokenAddress ? [tokenAddress] : undefined,
    query: {
      enabled: !!tokenAddress,
      retry: 2,
      staleTime: 60 * 1000,
    },
  });

  return {
    price: data,
    priceInUsd: data ? Number(data) / 1e8 : undefined,
    isLoading,
    error,
    refetch,
  };
}
