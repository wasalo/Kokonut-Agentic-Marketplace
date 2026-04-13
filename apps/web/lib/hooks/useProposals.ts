'use client';

import { useState, useEffect, useCallback } from 'react';
import { useReadContract, useWriteContract, usePublicClient } from 'wagmi';
import { AGENT_REVIEW_ABI } from '@/lib/contracts/abis';
import { getContractAddress, debugLog } from '@/lib/contracts/config';
import { debugError } from '@/lib/debug';
import { getQueryConfig } from '@/lib/queryConfig';

/* eslint-disable @typescript-eslint/no-explicit-any */
// Add new function names to the ABI type
const AGENT_REVIEW_ABI_WITH_NEW = AGENT_REVIEW_ABI as typeof AGENT_REVIEW_ABI & readonly (
  | { name: 'finalizeDecision' }
  | { name: 'calculateMedianScore' }
  | { name: 'slashTreasury' }
)[];

const AGENT_REVIEW_ADDRESS = getContractAddress('AGENT_REVIEW');

export interface Proposal {
  id: bigint;
  proposer: `0x${string}`;
  title: string;
  description: string;
  criteriaURI: string;
  reward: bigint;
  status: number;
  createdAt: bigint;
  decisionDeadline: bigint;
  winningEvaluator: `0x${string}`;
  evaluatorCount?: number;
}

export interface ReviewStats {
  totalProposals: number;
  activeProposals: number;
  completedProposals: number;
  totalRewards: bigint;
  totalEvaluations: number;
}

// Proposal Status Enum
export const ProposalStatus = {
  Open: 0,
  UnderReview: 1,
  Decided: 2,
  Cancelled: 3,
} as const;

export function getProposalStatusLabel(status: number): string {
  switch (status) {
    case ProposalStatus.Open:
      return 'Open';
    case ProposalStatus.UnderReview:
      return 'Under Review';
    case ProposalStatus.Decided:
      return 'Decided';
    case ProposalStatus.Cancelled:
      return 'Cancelled';
    default:
      return 'Unknown';
  }
}

export function getProposalStatusColor(status: number): string {
  switch (status) {
    case ProposalStatus.Open:
      return 'success';
    case ProposalStatus.UnderReview:
      return 'warning';
    case ProposalStatus.Decided:
      return 'primary';
    case ProposalStatus.Cancelled:
      return 'danger';
    default:
      return 'default';
  }
}

function mapProposalData(id: bigint, data: unknown): Proposal | null {
  if (!data) {
    console.error('[mapProposalData] Error: data is null/undefined');
    return null;
  }

  // Handle object format (viem returns object when ABI defines struct/tuple)
  if (typeof data === 'object' && !Array.isArray(data)) {
    const obj = data as Record<string, unknown>;

    if ('proposer' in obj && 'title' in obj) {
      return {
        id,
        proposer: obj.proposer as `0x${string}`,
        title: (obj.title as string) || '',
        description: (obj.description as string) || '',
        criteriaURI: (obj.criteriaURI as string) || '',
        reward: (obj.reward as bigint) || BigInt(0),
        status: Number(obj.status || 0),
        createdAt: (obj.createdAt as bigint) || BigInt(0),
        decisionDeadline: (obj.decisionDeadline as bigint) || BigInt(0),
        winningEvaluator: obj.winningEvaluator as `0x${string}`,
      };
    }

    console.error('[mapProposalData] Error: Object format missing expected properties', obj);
    return null;
  }

  // Handle array format
  if (Array.isArray(data) && data.length >= 10) {
    const [
      _proposalId,
      proposer,
      title,
      description,
      criteriaURI,
      reward,
      status,
      createdAt,
      decisionDeadline,
      winningEvaluator,
    ] = data;

    return {
      id,
      proposer: proposer as `0x${string}`,
      title: title || '',
      description: description || '',
      criteriaURI: criteriaURI || '',
      reward: reward || BigInt(0),
      status: Number(status || 0),
      createdAt: createdAt || BigInt(0),
      decisionDeadline: decisionDeadline || BigInt(0),
      winningEvaluator: winningEvaluator as `0x${string}`,
    };
  }

  console.error('[mapProposalData] Error: Unknown data format', data);
  return null;
}

export function useProposalCount() {
  const config = getQueryConfig('stats');

  const { data, isLoading, error, refetch } = useReadContract({
    address: AGENT_REVIEW_ADDRESS,
    abi: AGENT_REVIEW_ABI,
    functionName: 'getProposalCount',
    query: {
      retry: 2,
      staleTime: config.staleTime,
      gcTime: config.gcTime,
    },
  });

  return {
    count: data ? Number(data) : 0,
    isLoading,
    error,
    refetch,
  };
}

export function useEvaluatorCount(proposalId: bigint | undefined) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: AGENT_REVIEW_ADDRESS,
    abi: AGENT_REVIEW_ABI,
    functionName: 'getEvaluatorCount',
    args: proposalId ? [proposalId] : undefined,
    query: {
      enabled: !!proposalId,
      retry: 2,
      staleTime: 30000,
    },
  });

  return {
    count: data ? Number(data) : 0,
    isLoading,
    error,
    refetch,
  };
}

export function useReviewStats() {
  const { count: totalProposals, isLoading: isCountLoading } = useProposalCount();
  const publicClient = usePublicClient();
  const [stats, setStats] = useState<ReviewStats>({
    totalProposals: 0,
    activeProposals: 0,
    completedProposals: 0,
    totalRewards: BigInt(0),
    totalEvaluations: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchStats = useCallback(async () => {
    if (!publicClient || totalProposals === 0) {
      setStats({
        totalProposals: 0,
        activeProposals: 0,
        completedProposals: 0,
        totalRewards: BigInt(0),
        totalEvaluations: 0,
      });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      debugLog('contracts', `useReviewStats: Fetching stats for ${totalProposals} proposals`);

      // Fetch all proposals to calculate stats
      const proposalCalls = Array.from({ length: Math.min(totalProposals, 100) }, (_, i) => ({
        address: AGENT_REVIEW_ADDRESS,
        abi: AGENT_REVIEW_ABI,
        functionName: 'getProposal' as const,
        args: [BigInt(i + 1)],
      }));

      const proposalResults = await publicClient.multicall({ contracts: proposalCalls });

      let activeCount = 0;
      let completedCount = 0;
      let totalRewards = BigInt(0);

      proposalResults.forEach((result, index) => {
        if (result.status === 'success' && result.result) {
          const proposal = mapProposalData(BigInt(index + 1), result.result);
          if (proposal) {
            totalRewards += proposal.reward;
            if (
              proposal.status === ProposalStatus.Open ||
              proposal.status === ProposalStatus.UnderReview
            ) {
              activeCount++;
            } else if (proposal.status === ProposalStatus.Decided) {
              completedCount++;
            }
          }
        }
      });

      // Fetch evaluations count for each proposal
      const evaluationCalls = Array.from({ length: Math.min(totalProposals, 100) }, (_, i) => ({
        address: AGENT_REVIEW_ADDRESS,
        abi: AGENT_REVIEW_ABI,
        functionName: 'getProposalEvaluations' as const,
        args: [BigInt(i + 1)],
      }));

      const evaluationResults = await publicClient.multicall({ contracts: evaluationCalls });

      let totalEvaluations = 0;
      evaluationResults.forEach(result => {
        if (result.status === 'success' && result.result) {
          const evaluators = result.result as `0x${string}`[];
          totalEvaluations += evaluators.length;
        }
      });

      const statsData = {
        totalProposals,
        activeProposals: activeCount,
        completedProposals: completedCount,
        totalRewards,
        totalEvaluations,
      };

      debugLog('contracts', 'useReviewStats: Stats calculated', statsData);
      setStats(statsData);
    } catch (err) {
      debugError('contracts', 'useReviewStats: Error fetching stats', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch stats'));
    } finally {
      setIsLoading(false);
    }
  }, [totalProposals, publicClient]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    isLoading: isLoading || isCountLoading,
    error,
    refetch: fetchStats,
  };
}

export function useProposals(offset: number = 0, limit: number = 20) {
  const { count: totalCount, isLoading: isCountLoading } = useProposalCount();
  const publicClient = usePublicClient();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProposals = useCallback(async () => {
    if (!publicClient || totalCount === 0) {
      setProposals([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      debugLog('contracts', `useProposals: Fetching proposals from ${offset} to ${offset + limit}`);

      // Calculate actual range (proposals are 1-indexed)
      const startId = Math.max(1, totalCount - offset);
      const endId = Math.max(1, startId - limit + 1);

      // Fetch proposals and evaluator counts in parallel
      const proposalCalls = [];
      for (let i = startId; i >= endId; i--) {
        proposalCalls.push({
          address: AGENT_REVIEW_ADDRESS,
          abi: AGENT_REVIEW_ABI,
          functionName: 'getProposal' as const,
          args: [BigInt(i)],
        });
      }

      const evaluatorCountCalls = [];
      for (let i = startId; i >= endId; i--) {
        evaluatorCountCalls.push({
          address: AGENT_REVIEW_ADDRESS,
          abi: AGENT_REVIEW_ABI,
          functionName: 'getEvaluatorCount' as const,
          args: [BigInt(i)],
        });
      }

      const [proposalResults, evaluatorResults] = await Promise.all([
        publicClient.multicall({ contracts: proposalCalls }),
        publicClient.multicall({ contracts: evaluatorCountCalls }),
      ]);

      const mappedProposals: Proposal[] = [];
      proposalResults.forEach((result, index) => {
        if (result.status === 'success' && result.result) {
          const proposalId = BigInt(startId - index);
          const proposal = mapProposalData(proposalId, result.result);
          if (proposal) {
            // Add evaluator count if available
            const evaluatorResult = evaluatorResults[index];
            if (evaluatorResult.status === 'success' && evaluatorResult.result) {
              proposal.evaluatorCount = Number(evaluatorResult.result);
            }
            mappedProposals.push(proposal);
          }
        }
      });

      debugLog('contracts', `useProposals: Mapped ${mappedProposals.length} proposals`);
      setProposals(mappedProposals);
    } catch (err) {
      debugError('contracts', 'useProposals: Error fetching proposals', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch proposals'));
      setProposals([]);
    } finally {
      setIsLoading(false);
    }
  }, [totalCount, offset, limit, publicClient]);

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  return {
    proposals,
    totalCount,
    isLoading: isLoading || isCountLoading,
    error,
    refetch: fetchProposals,
  };
}

export function useProposal(id: bigint | undefined) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: AGENT_REVIEW_ADDRESS,
    abi: AGENT_REVIEW_ABI,
    functionName: 'getProposal',
    args: id ? [id] : undefined,
    query: {
      enabled: !!id,
      retry: 2,
    },
  });

  const proposal = id && data ? mapProposalData(id, data) : null;

  return {
    proposal,
    isLoading,
    error,
    refetch,
  };
}

export function useCreateProposal() {
  const { writeContract, isPending, error, reset, data: hash } = useWriteContract();

  const createProposal = useCallback(
    (
      title: string,
      description: string,
      criteriaURI: string,
      reward: bigint,
      decisionDeadline: bigint
    ) => {
      debugLog('contracts', 'useCreateProposal: Creating proposal', {
        title,
        reward: reward.toString(),
        decisionDeadline: decisionDeadline.toString(),
      });

      writeContract({
        address: AGENT_REVIEW_ADDRESS,
        abi: AGENT_REVIEW_ABI,
        functionName: 'createProposal',
        args: [title, description, criteriaURI, reward, decisionDeadline],
        value: reward, // Must send ETH equal to reward
      });
    },
    [writeContract]
  );

  return {
    createProposal,
    hash,
    isPending,
    error,
    reset,
  };
}

export function useSubmitEvaluation() {
  const { writeContract, isPending, error, reset, data: hash } = useWriteContract();

  const submitEvaluation = useCallback(
    (proposalId: bigint, confidenceScore: bigint, reasoningURI: string, stakeAmount: bigint) => {
      debugLog('contracts', 'useSubmitEvaluation: Submitting evaluation', {
        proposalId: proposalId.toString(),
        confidenceScore: confidenceScore.toString(),
        stakeAmount: stakeAmount.toString(),
      });

      writeContract({
        address: AGENT_REVIEW_ADDRESS,
        abi: AGENT_REVIEW_ABI,
        functionName: 'submitEvaluation',
        args: [proposalId, confidenceScore, reasoningURI],
        value: stakeAmount,
      });
    },
    [writeContract]
  );

  return {
    submitEvaluation,
    hash,
    isPending,
    error,
    reset,
  };
}

export function useAttestDecision() {
  const { writeContract, isPending, error, reset, data: hash } = useWriteContract();

  const attestDecision = useCallback(
    (proposalId: bigint, winningEvaluator: `0x${string}`) => {
      debugLog('contracts', 'useAttestDecision: Attesting decision', {
        proposalId: proposalId.toString(),
        winningEvaluator,
      });

      writeContract({
        address: AGENT_REVIEW_ADDRESS,
        abi: AGENT_REVIEW_ABI,
        functionName: 'attestDecision',
        args: [proposalId, winningEvaluator],
      });
    },
    [writeContract]
  );

  return {
    attestDecision,
    hash,
    isPending,
    error,
    reset,
  };
}

// NOTE: cancelProposal function is not available in the current contract ABI
// This would need to be added to the AgentReview contract
// export function useCancelProposal() { ... }

export function useClaimReward() {
  const { writeContract, isPending, error, reset, data: hash } = useWriteContract();

  const claimReward = useCallback(
    (proposalId: bigint) => {
      debugLog('contracts', 'useClaimReward: Claiming reward', {
        proposalId: proposalId.toString(),
      });

      writeContract({
        address: AGENT_REVIEW_ADDRESS,
        abi: AGENT_REVIEW_ABI,
        functionName: 'claimReward',
        args: [proposalId],
      });
    },
    [writeContract]
  );

  return {
    claimReward,
    hash,
    isPending,
    error,
    reset,
  };
}

export function useReleaseStake() {
  const { writeContract, isPending, error, reset, data: hash } = useWriteContract();

  const releaseStake = useCallback(
    (proposalId: bigint) => {
      debugLog('contracts', 'useReleaseStake: Releasing stake', {
        proposalId: proposalId.toString(),
      });

      writeContract({
        address: AGENT_REVIEW_ADDRESS,
        abi: AGENT_REVIEW_ABI,
        functionName: 'releaseStake',
        args: [proposalId],
      });
    },
    [writeContract]
  );

  return {
    releaseStake,
    hash,
    isPending,
    error,
    reset,
  };
}

export function useProposalEvaluations(proposalId: bigint | undefined) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: AGENT_REVIEW_ADDRESS,
    abi: AGENT_REVIEW_ABI,
    functionName: 'getProposalEvaluations',
    args: proposalId ? [proposalId] : undefined,
    query: {
      enabled: !!proposalId,
      retry: 2,
    },
  });

  return {
    evaluators: (data as `0x${string}`[]) || [],
    isLoading,
    error,
    refetch,
  };
}

export function useEvaluation(
  proposalId: bigint | undefined,
  evaluator: `0x${string}` | undefined
) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: AGENT_REVIEW_ADDRESS,
    abi: AGENT_REVIEW_ABI,
    functionName: 'getEvaluation',
    args: proposalId && evaluator ? [proposalId, evaluator] : undefined,
    query: {
      enabled: !!proposalId && !!evaluator,
      retry: 2,
    },
  });

  const evaluation = data
    ? {
        proposalId: (data as any)[0],
        evaluator: (data as any)[1],
        confidenceScore: (data as any)[2],
        reasoningURI: (data as any)[3],
        stakeAmount: (data as any)[4],
        isFinal: (data as any)[5],
        rewardClaimed: (data as any)[6],
        stakeReleased: (data as any)[7],
        submittedAt: (data as any)[8],
      }
    : null;

  return {
    evaluation,
    isLoading,
    error,
    refetch,
  };
}

export function useCancelProposal() {
  const { writeContract, data, isPending, error, reset } = useWriteContract();

  return {
    cancelProposal: (proposalId: bigint) =>
      writeContract({
        address: AGENT_REVIEW_ADDRESS,
        abi: AGENT_REVIEW_ABI,
        functionName: 'cancelProposal',
        args: [proposalId],
      }),
    hash: data,
    isPending,
    error,
    reset,
  };
}

export function useSlashEvaluator() {
  const { writeContract, data, isPending, error, reset } = useWriteContract();

  return {
    slashEvaluator: (evaluator: `0x${string}`, proposalId: bigint, reason: string) =>
      writeContract({
        address: AGENT_REVIEW_ADDRESS,
        abi: AGENT_REVIEW_ABI,
        functionName: 'slashEvaluator',
        args: [evaluator, proposalId, reason],
      }),
    hash: data,
    isPending,
    error,
    reset,
  };
}

// ============ Phase 14/15 Missing Hooks ============

/**
 * Finalize a proposal after the 7-day grace period has passed.
 * This is a permissionless function - anyone can call it to finalize stuck proposals.
 * Uses the median evaluator as the winner when no consensus is reached.
 */
export function useFinalizeDecision() {
  const { writeContract, data, isPending, error, reset } = useWriteContract();

  return {
    finalizeDecision: (proposalId: bigint) =>
      writeContract({
        address: AGENT_REVIEW_ADDRESS,
        abi: AGENT_REVIEW_ABI_WITH_NEW,
        functionName: 'finalizeDecision' as 'finalizeDecision',
        args: [proposalId],
      }),
    hash: data,
    isPending,
    error,
    reset,
  };
}

/**
 * Calculate the median confidence score from all evaluators.
 * Useful for displaying the median score in the UI.
 */
export function useCalculateMedianScore(proposalId: bigint | undefined) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: AGENT_REVIEW_ADDRESS,
    abi: AGENT_REVIEW_ABI_WITH_NEW,
    functionName: 'calculateMedianScore' as 'calculateMedianScore',
    args: proposalId !== undefined ? [proposalId] : undefined,
    query: {
      enabled: proposalId !== undefined,
      retry: 2,
      staleTime: 30 * 1000,
    },
  });

  return {
    medianScore: data ?? BigInt(0),
    isLoading,
    error,
    refetch,
  };
}

/**
 * Get the slash treasury address.
 */
export function useSlashTreasury() {
  const { data, isLoading, error, refetch } = useReadContract({
    address: AGENT_REVIEW_ADDRESS,
    abi: AGENT_REVIEW_ABI_WITH_NEW,
    functionName: 'slashTreasury' as 'slashTreasury',
    query: {
      retry: 2,
      staleTime: 60 * 60 * 1000, // Rarely changes
    },
  });

  return {
    treasury: data ?? '0x0000000000000000000000000000000000000000',
    isLoading,
    error,
    refetch,
  };
}
