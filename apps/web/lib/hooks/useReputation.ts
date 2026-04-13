'use client';

import { useReadContract, useReadContracts } from 'wagmi';
import { useKokonutAgents } from './useKokonutAgents';
import { getContractAddress } from '@/lib/contracts/config';
import { ERC8004_REPUTATION_ABI } from '@/lib/contracts/abis';

/* eslint-disable @typescript-eslint/no-explicit-any */

const ERC8004_REPUTATION_ADDRESS = getContractAddress('ERC8004_REPUTATION');

export interface ReputationData {
  average: number;
  total: number;
  providers: number;
  feedbackCount: number;
  normalizedRating: number;
}

/**
 * Get reputation for a single agent from the official ERC-8004 reputation registry.
 * @param agent The agent's wallet address
 */
export function useAgentReputation(agent: `0x${string}` | undefined) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: ERC8004_REPUTATION_ADDRESS,
    abi: ERC8004_REPUTATION_ABI,
    functionName: 'getAgentReputation',
    args: agent !== undefined ? [agent] : undefined,
    query: {
      retry: 2,
      staleTime: 30 * 1000,
      enabled: agent !== undefined,
    },
  });

  const reputation: ReputationData = {
    average: data ? Number(data[0]) : 0,
    total: data ? Number(data[1]) : 0,
    providers: data ? Number(data[2]) : 0,
    feedbackCount: data ? Number(data[1]) : 0,
    normalizedRating: data && Number(data[2]) > 0 ? Number(data[0]) / 10 ** 18 : 0,
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

  const agentQueries = agents.map((agent: { id: number; owner: `0x${string}` }) => ({
    address: ERC8004_REPUTATION_ADDRESS,
    abi: ERC8004_REPUTATION_ABI,
    functionName: 'getAgentReputation' as const,
    args: [agent.owner] as const,
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
        const [average, total, _providers] = result.result as [bigint, bigint, bigint];
        const count = Number(total);
        if (count > 0) {
          totalFeedbacks += count;
          totalNormalizedRating += Number(average) / 10 ** 18;
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
