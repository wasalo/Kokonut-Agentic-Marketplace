'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePublicClient } from 'wagmi';
import { ERC8004_ADDRESSES } from '@/lib/8004contracts';
import { debugLog, debugError } from '@/lib/debug';
import { calculateHealthScore, HealthScore } from '@/lib/healthScore';
import { getContractAddress, CONTRACT_ADDRESSES } from '@/lib/contracts/config';

const ERC8004_ABI = [
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'tokenURI',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

interface UseAgentHealthReturn {
  healthScore: HealthScore | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

interface AgentStats {
  completedJobs: number;
  totalJobs: number;
  averageRating: number;
  totalFeedbacks: number;
  activeServices: number;
  lastActivityTimestamp: number;
}

function getRegistryAddress(chainId: number): `0x${string}` {
  if (chainId === 11155111) {
    return ERC8004_ADDRESSES.sepolia;
  }
  if (chainId === 1) {
    return ERC8004_ADDRESSES.mainnet;
  }
  return getContractAddress(
    process.env.NEXT_PUBLIC_ERC8004_REGISTRY,
    CONTRACT_ADDRESSES.sepolia.erc8004Registry
  );
}

export function useAgentHealth(
  agentId: bigint | undefined,
  chainId: number = 11155111
): UseAgentHealthReturn {
  const [healthScore, setHealthScore] = useState<HealthScore | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const publicClient = usePublicClient();
  const REGISTRY_ADDRESS = getRegistryAddress(chainId);

  const fetchHealth = useCallback(async () => {
    if (!publicClient || !agentId) {
      setHealthScore(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      debugLog('hooks', `useAgentHealth: Fetching health for agent ${agentId}`);

      const stats = await fetchAgentStats(publicClient, REGISTRY_ADDRESS, agentId);

      const score = calculateHealthScore({
        rating: stats.averageRating,
        completionRate: stats.totalJobs > 0 ? stats.completedJobs / stats.totalJobs : 0,
        activeServices: stats.activeServices,
        recentActivity:
          stats.lastActivityTimestamp > 0
            ? Math.floor((Date.now() / 1000 - stats.lastActivityTimestamp) / 86400)
            : 999,
      });

      setHealthScore(score);
      debugLog('hooks', `useAgentHealth: Score ${score.score} for agent ${agentId}`);
    } catch (err) {
      debugError('hooks', 'useAgentHealth: Error', err);
      setError(err instanceof Error ? err : new Error('Failed to calculate health score'));
    } finally {
      setIsLoading(false);
    }
  }, [publicClient, agentId, REGISTRY_ADDRESS]);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  return {
    healthScore,
    isLoading,
    error,
    refetch: fetchHealth,
  };
}

async function fetchAgentStats(
  publicClient: NonNullable<ReturnType<typeof usePublicClient>>,
  registryAddress: `0x${string}`,
  agentId: bigint
): Promise<AgentStats> {
  try {
    const results = await publicClient.multicall({
      contracts: [
        {
          address: registryAddress,
          abi: ERC8004_ABI,
          functionName: 'ownerOf',
          args: [agentId],
        },
        {
          address: registryAddress,
          abi: ERC8004_ABI,
          functionName: 'tokenURI',
          args: [agentId],
        },
      ],
    });

    const ownerResult = results[0];

    if (ownerResult.status !== 'success') {
      throw new Error('Failed to fetch agent owner');
    }

    return {
      completedJobs: 0,
      totalJobs: 0,
      averageRating: 0.8,
      totalFeedbacks: 0,
      activeServices: 0,
      lastActivityTimestamp: 0,
    };
  } catch (err) {
    debugError('hooks', 'fetchAgentStats: Error', err);
    return {
      completedJobs: 0,
      totalJobs: 0,
      averageRating: 0,
      totalFeedbacks: 0,
      activeServices: 0,
      lastActivityTimestamp: 0,
    };
  }
}
