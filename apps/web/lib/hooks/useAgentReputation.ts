"use client";

import { useReadContract } from 'wagmi';
import { getContractAddress } from '@/lib/contracts/config';
import { ADMIN_REGISTRY_ABI } from '@/lib/contracts/abis';

export interface DecayedReputation {
  score: number;
  initialScore: number;
  decayFactor: number;
  halfLifeDays: number;
  isLoading: boolean;
  error?: Error;
  daysElapsed: number;
  normalizedRating: number;
  feedbackCount: number;
}

/**
 * Calculate decayed reputation score based on time elapsed
 * Uses exponential decay formula: score = initialScore * (1 - decayFactor)
 * where decayFactor = min(daysElapsed / halfLifeDays, 1)
 */
export function useAgentReputation(
  agent: `0x${string}` | undefined,
  initialRating: number = 1000
) {
  const adminRegistryAddress = getContractAddress('ADMIN_REGISTRY');

  // Get half-life days from AdminRegistry (global default)
  const { data: halfLifeDays, isLoading: isLoadingHalfLife } = useReadContract({
    address: adminRegistryAddress,
    abi: ADMIN_REGISTRY_ABI,
    functionName: 'getHalfLifeDays',
    query: {
      enabled: agent !== undefined,
    },
  });

  // Use effective half-life, default to 30 days
  const effectiveHalfLifeDays = typeof halfLifeDays === 'bigint' 
    ? Number(halfLifeDays) 
    : 30;

  const currentTimestamp = BigInt(Math.floor(Date.now() / 1000));
  const daysElapsed = currentTimestamp / 86400n;
  const decayFactor = Math.min(Number(daysElapsed * 100n / BigInt(effectiveHalfLifeDays)) / 100, 1);
  const decayedScore = Math.floor(initialRating * (1 - decayFactor * 100)) / 100;

  return {
    score: decayedScore,
    initialScore: initialRating,
    decayFactor: decayFactor * 100,
    halfLifeDays: effectiveHalfLifeDays,
    daysElapsed: Number(daysElapsed),
    isLoading: isLoadingHalfLife,
    error: undefined,
    normalizedRating: decayedScore / 10, // Convert to 0-100 scale
    feedbackCount: 0, // Would need separate query to get feedback count
  };
}

/**
 * Get current reputation score with decay applied
 */
export function useCurrentReputation(
  agent: `0x${string}` | undefined,
  initialRating: number = 1000
) {
  const { score, isLoading, error, decayFactor, halfLifeDays, daysElapsed } = useAgentReputation(agent, initialRating);
  
  return {
    reputation: {
      score,
      initialScore: 1000,
      decayed: score,
      decayFactor,
      halfLifeDays,
      daysElapsed,
      isLoading,
      error,
    },
    isLoading,
    error,
  };
}