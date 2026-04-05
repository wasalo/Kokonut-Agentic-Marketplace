'use client';

import { useReadContract, useReadContracts } from 'wagmi';
import { ERC8004_ABI } from '@/lib/8004contracts';
import { useKokonutAgents } from './useKokonutAgents';
import { CONTRACT_ADDRESSES, getContractAddress, debugLog } from '@/lib/contracts/config';

/* eslint-disable @typescript-eslint/no-explicit-any */

const ERC8004_REPUTATION_ADDRESS = getContractAddress(
  process.env.NEXT_PUBLIC_8004_REPUTATION_ADDRESS,
  CONTRACT_ADDRESSES.sepolia.erc8004Reputation
);

export interface ReputationData {
  feedbackCount: number;
  cumulativeValue: number;
  valueDecimals: number;
  normalizedRating: number; // value / 10^decimals, for display
}

/**
 * Get reputation for a single agent from the official ERC-8004 reputation registry.
 * @param agentId The agent's token ID on the ERC-8004 identity registry
 */
export function useAgentReputation(agentId: bigint | undefined) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: ERC8004_REPUTATION_ADDRESS,
    abi: ERC8004_ABI,
    functionName: 'getSummary',
    args: agentId !== undefined ? [agentId, [], '', ''] : undefined,
    query: {
      retry: 2,
      staleTime: 30 * 1000,
      enabled: agentId !== undefined,
    },
  });

  const reputation: ReputationData = {
    feedbackCount: data ? Number((data as any)[0]) : 0,
    cumulativeValue: data ? Number((data as any)[1]) : 0,
    valueDecimals: data ? Number((data as any)[2]) : 0,
    normalizedRating:
      data && Number((data as any)[2]) > 0
        ? Number((data as any)[1]) / 10 ** Number((data as any)[2])
        : 0,
  };

  return {
    reputation,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Get aggregated global reputation stats from the official ERC-8004 registry.
 * Iterates all registered agents and aggregates their feedback counts.
 */
export function useGlobalReputation() {
  const {
    agents,
    isLoading: isAgentsLoading,
    error: agentsError,
    refetch: refetchAgents,
  } = useKokonutAgents(0, 1000, true);

  const agentQueries = agents.map((agent: { id: number }) => ({
    address: ERC8004_REPUTATION_ADDRESS,
    abi: ERC8004_ABI,
    functionName: 'getSummary' as const,
    args: [BigInt(agent.id), [] as readonly `0x${string}`[], '', ''] as const,
  }));

  const {
    data: results,
    isLoading,
    error,
    refetch,
  } = useReadContracts({
    contracts: agentQueries,
    query: {
      enabled: agentQueries.length > 0 && !isAgentsLoading,
      retry: 2,
      staleTime: 30 * 1000,
    },
  });

  let totalFeedbacks = 0;
  let totalNormalizedRating = 0;
  let ratedAgents = 0;

  if (results) {
    for (const result of results) {
      if (result.status === 'success' && result.result) {
        const data = result.result as unknown as [bigint, bigint, number];
        const count = Number(data[0]);
        const value = Number(data[1]);
        const decimals = Number(data[2]);
        if (count > 0 && decimals > 0) {
          totalFeedbacks += count;
          totalNormalizedRating += value / 10 ** decimals;
          ratedAgents++;
        }
      }
    }
  }

  return {
    totalAgents: agents.length,
    totalFeedbacks,
    averageRating: ratedAgents > 0 ? totalNormalizedRating / ratedAgents : 0,
    isLoading: isAgentsLoading || isLoading,
    error: error || agentsError,
    refetch: () => {
      refetch();
      refetchAgents();
    },
  };
}
