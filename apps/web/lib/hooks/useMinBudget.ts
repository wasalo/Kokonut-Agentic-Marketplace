import { useReadContract } from 'wagmi';
import { AGENTIC_COMMERCE_ABI } from '@/lib/contracts/abis';
import { getContractAddress } from '@/lib/contracts/config';
import { formatUnits } from 'viem';

const AGENTIC_COMMERCE_ADDRESS = getContractAddress('AGENTIC_COMMERCE');

/**
 * Hook to fetch the minimum budget for a specific payment token.
 * Uses the contract's getMinBudget() which handles:
 * - Per-token overrides
 * - Stablecoin detection (USDC/USDT = $1 pegged)
 * - ETH fallback via price oracle
 * 
 * Returns minimum budget in human-readable format (e.g., 5.0 for USDC)
 */
export function useMinBudget(tokenAddress: `0x${string}`, decimals: number = 6) {
  const { data: minBudgetRaw, isLoading, error } = useReadContract({
    address: AGENTIC_COMMERCE_ADDRESS,
    abi: AGENTIC_COMMERCE_ABI,
    functionName: 'getMinBudget',
    args: [tokenAddress, decimals],
    query: {
      enabled: !!tokenAddress,
    },
  });

  const minBudget = minBudgetRaw ? parseFloat(formatUnits(minBudgetRaw as bigint, decimals)) : 0;

  return {
    minBudget,
    minBudgetRaw: minBudgetRaw as bigint | undefined,
    isLoading,
    error,
  };
}

/**
 * Hook to fetch the global minimum budget in USD (from contract state).
 * Returns value in USD (e.g., 5.0 for $5 minimum)
 */
export function useMinBudgetUsd() {
  const { data: minBudgetUsdRaw, isLoading, error } = useReadContract({
    address: AGENTIC_COMMERCE_ADDRESS,
    abi: AGENTIC_COMMERCE_ABI,
    functionName: 'minBudgetUsd',
    query: {
      enabled: true,
    },
  });

  // minBudgetUsd is stored with 6 decimals (same as USDC)
  const minBudgetUsd = minBudgetUsdRaw ? Number(formatUnits(minBudgetUsdRaw as bigint, 6)) : 5;

  return {
    minBudgetUsd,
    minBudgetUsdRaw: minBudgetUsdRaw as bigint | undefined,
    isLoading,
    error,
  };
}
