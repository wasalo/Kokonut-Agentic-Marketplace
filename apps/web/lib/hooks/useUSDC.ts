import { useReadContract, useWriteContract } from 'wagmi';
import { getContractAddress } from '@/lib/contracts/config';
import { ERC20_ABI } from '@/lib/contracts/abis';

const USDC_ADDRESS = getContractAddress('USDC');

/**
 * Hook to get USDC balance for an address
 * @param address The address to check balance for
 * @returns USDC balance in smallest units (6 decimals)
 */
export function useUSDCBalance(address: `0x${string}` | undefined) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      retry: 2,
      staleTime: 30 * 1000,
    },
  });

  return {
    balance: data,
    formattedBalance: data ? Number(data) / 1e6 : undefined,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to get USDC allowance
 * @param owner The token owner address
 * @param spender The spender address (e.g., AgenticCommerce contract)
 * @returns Allowance amount in smallest units
 */
export function useUSDCAllowance(
  owner: `0x${string}` | undefined,
  spender: `0x${string}` | undefined
) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: owner && spender ? [owner, spender] : undefined,
    query: {
      enabled: !!owner && !!spender,
      retry: 2,
      staleTime: 30 * 1000,
    },
  });

  return {
    allowance: data,
    formattedAllowance: data ? Number(data) / 1e6 : undefined,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to approve USDC spending
 * @returns Approve function and transaction state
 */
export function useUSDCApprove() {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();

  return {
    approve: (spender: `0x${string}`, amount: bigint) =>
      writeContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [spender, amount],
      }),
    hash,
    isPending,
    error,
    reset,
  };
}

/**
 * Hook to get USDC token info (decimals, symbol, name)
 * Note: USDC is always 6 decimals on Ethereum, but this hook provides dynamic checking
 */
export function useUSDCInfo() {
  const { data: decimals, isLoading: isLoadingDecimals } = useReadContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'decimals',
    query: {
      retry: 2,
      staleTime: Infinity, // Decimals never change
    },
  });

  const { data: symbol, isLoading: isLoadingSymbol } = useReadContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'symbol',
    query: {
      retry: 2,
      staleTime: Infinity,
    },
  });

  const { data: name, isLoading: isLoadingName } = useReadContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'name',
    query: {
      retry: 2,
      staleTime: Infinity,
    },
  });

  return {
    decimals: decimals,
    symbol: symbol,
    name: name,
    isLoading: isLoadingDecimals || isLoadingSymbol || isLoadingName,
  };
}

/**
 * Convenience hook to check if sufficient USDC allowance exists
 * @param owner The token owner
 * @param spender The spender
 * @param requiredAmount The amount required
 * @returns Boolean indicating if allowance is sufficient
 */
export function useHasUSDCAllowance(
  owner: `0x${string}` | undefined,
  spender: `0x${string}` | undefined,
  requiredAmount: bigint | undefined
) {
  const { allowance, isLoading } = useUSDCAllowance(owner, spender);

  return {
    hasAllowance: !!allowance && !!requiredAmount && allowance >= requiredAmount,
    allowance,
    isLoading,
  };
}
