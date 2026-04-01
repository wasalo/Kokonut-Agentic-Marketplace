import { useReadContract, useReadContracts, useWriteContract } from 'wagmi';
import { AGENT_REVIEW_ABI } from '@/lib/contracts/abis';
import { CONTRACT_ADDRESSES, getContractAddress, debugLog } from '@/lib/contracts/config';

const AGENT_REVIEW_ADDRESS = getContractAddress(
  process.env.NEXT_PUBLIC_AGENT_REVIEW_ADDRESS,
  CONTRACT_ADDRESSES.sepolia.agentReview
);

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
}

export interface Evaluation {
  proposalId: bigint;
  evaluator: `0x${string}`;
  confidenceScore: bigint;
  reasoningURI: string;
  stakeAmount: bigint;
  isFinal: boolean;
  submittedAt: bigint;
}

export interface ReviewStats {
  activeProposals: number;
  totalEvaluations: number;
  totalRewards: bigint;
}

function mapProposalData(
  id: bigint,
  data:
    | readonly [bigint, string, string, string, string, bigint, number, bigint, bigint, string]
    | undefined
): Proposal | null {
  if (!data || !Array.isArray(data) || data.length < 10) return null;

  const [
    ,
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
    title,
    description,
    criteriaURI,
    reward,
    status,
    createdAt,
    decisionDeadline,
    winningEvaluator: winningEvaluator as `0x${string}`,
  };
}

export function useProposalCount() {
  const { data, isLoading, error, refetch } = useReadContract({
    address: AGENT_REVIEW_ADDRESS,
    abi: AGENT_REVIEW_ABI,
    functionName: 'getProposalCount',
    query: {
      retry: 2,
      staleTime: 30 * 1000,
    },
  });

  return {
    count: data ? Number(data) : 0,
    isLoading,
    error,
    refetch,
  };
}

export function useProposal(proposalId: number | bigint) {
  const id = typeof proposalId === 'bigint' ? proposalId : BigInt(proposalId);

  const { data, isLoading, error, refetch } = useReadContract({
    address: AGENT_REVIEW_ADDRESS,
    abi: AGENT_REVIEW_ABI,
    functionName: 'getProposal',
    args: [id],
    query: {
      retry: 2,
      staleTime: 30 * 1000,
    },
  });

  return {
    proposal: mapProposalData(
      id,
      data as unknown as
        | readonly [bigint, string, string, string, string, bigint, number, bigint, bigint, string]
        | undefined
    ),
    isLoading,
    error,
    refetch,
  };
}

export function useProposals(start: number = 0, count: number = 20) {
  // Always call useProposalCount
  const {
    count: totalCount,
    isLoading: isCountLoading,
    error: countError,
    refetch: refetchCount,
  } = useProposalCount();

  // Always compute proposalQueries (empty array if no proposals)
  const safeCount = totalCount ?? 0;
  const startIndex = Math.max(0, safeCount - start - count);
  const endIndex = safeCount - start;

  const proposalQueries = [];
  for (let i = startIndex; i < endIndex; i++) {
    proposalQueries.push({
      address: AGENT_REVIEW_ADDRESS,
      abi: AGENT_REVIEW_ABI,
      functionName: 'getProposal' as const,
      args: [BigInt(i)],
    });
  }

  // Always call useReadContracts, control via enabled
  const {
    data: results,
    isLoading,
    error,
    refetch,
  } = useReadContracts({
    contracts: proposalQueries,
    query: {
      enabled: proposalQueries.length > 0 && !isCountLoading,
      retry: 2,
      staleTime: 30 * 1000,
    },
  });

  // Handle empty results after hooks are called
  if (!results || results.length === 0) {
    return {
      proposals: [] as Proposal[],
      isLoading: isCountLoading,
      error: countError,
      refetch: refetchCount,
    };
  }

  const proposals: Proposal[] = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === 'success') {
      const proposal = mapProposalData(
        BigInt(startIndex + i),
        result.result as unknown as readonly [
          bigint,
          string,
          string,
          string,
          string,
          bigint,
          number,
          bigint,
          bigint,
          string,
        ]
      );
      if (proposal) {
        proposals.push(proposal);
      }
    }
  }

  return {
    proposals,
    isLoading,
    error: error || countError,
    refetch: () => {
      refetch();
      refetchCount();
    },
  };
}

export function useProposalEvaluators(proposalId: number | bigint) {
  const id = typeof proposalId === 'bigint' ? proposalId : BigInt(proposalId);

  // Always call useReadContract - don't return early
  const {
    data: evaluatorAddresses,
    isLoading,
    error,
    refetch,
  } = useReadContract({
    address: AGENT_REVIEW_ADDRESS,
    abi: AGENT_REVIEW_ABI,
    functionName: 'getProposalEvaluations',
    args: [id],
    query: {
      retry: 2,
      staleTime: 30 * 1000,
    },
  });

  // Handle empty after hook is called
  if (!evaluatorAddresses || evaluatorAddresses.length === 0) {
    return {
      evaluators: [] as `0x${string}`[],
      isLoading,
      error,
      refetch,
    };
  }

  return {
    evaluators: evaluatorAddresses as `0x${string}`[],
    isLoading,
    error,
    refetch,
  };
}

export function useEvaluation(proposalId: number | bigint, evaluator: `0x${string}`) {
  const id = typeof proposalId === 'bigint' ? proposalId : BigInt(proposalId);

  const { data, isLoading, error, refetch } = useReadContract({
    address: AGENT_REVIEW_ADDRESS,
    abi: AGENT_REVIEW_ABI,
    functionName: 'getEvaluation',
    args: [id, evaluator],
    query: {
      retry: 2,
      staleTime: 30 * 1000,
    },
  });

  return {
    evaluation: data as Evaluation | undefined,
    isLoading,
    error,
    refetch,
  };
}

export function useReviewStats() {
  // Always call useProposals - don't return early
  const { proposals, isLoading } = useProposals(0, 100);

  const stats: ReviewStats = {
    activeProposals: 0,
    totalEvaluations: 0,
    totalRewards: BigInt(0),
  };

  // Compute stats from loaded data (no early return)
  if (proposals && proposals.length > 0) {
    for (const proposal of proposals) {
      if (proposal.status === 0 || proposal.status === 1) {
        stats.activeProposals++;
      }
      stats.totalRewards += proposal.reward;
    }
  }

  return { stats, isLoading };
}

// ============ Write Hooks ============

export function useSubmitEvaluation() {
  const { writeContract, data, isPending, error, reset } = useWriteContract();
  return {
    submitEvaluation: (
      proposalId: bigint,
      confidenceScore: bigint,
      reasoningURI: string,
      stakeAmount: bigint
    ) =>
      writeContract({
        address: AGENT_REVIEW_ADDRESS,
        abi: AGENT_REVIEW_ABI,
        functionName: 'submitEvaluation',
        args: [proposalId, confidenceScore, reasoningURI],
        value: stakeAmount,
      }),
    hash: data,
    isPending,
    error,
    reset,
  };
}

export function useAttestDecision() {
  const { writeContract, data, isPending, error, reset } = useWriteContract();
  return {
    attestDecision: (proposalId: bigint, winningEvaluator: `0x${string}`) =>
      writeContract({
        address: AGENT_REVIEW_ADDRESS,
        abi: AGENT_REVIEW_ABI,
        functionName: 'attestDecision',
        args: [proposalId, winningEvaluator],
      }),
    hash: data,
    isPending,
    error,
    reset,
  };
}

export function useClaimReward() {
  const { writeContract, data, isPending, error, reset } = useWriteContract();
  return {
    claimReward: (proposalId: bigint) =>
      writeContract({
        address: AGENT_REVIEW_ADDRESS,
        abi: AGENT_REVIEW_ABI,
        functionName: 'claimReward',
        args: [proposalId],
      }),
    hash: data,
    isPending,
    error,
    reset,
  };
}

export function useReleaseStake() {
  const { writeContract, data, isPending, error, reset } = useWriteContract();
  return {
    releaseStake: (proposalId: bigint) =>
      writeContract({
        address: AGENT_REVIEW_ADDRESS,
        abi: AGENT_REVIEW_ABI,
        functionName: 'releaseStake',
        args: [proposalId],
      }),
    hash: data,
    isPending,
    error,
    reset,
  };
}

export function useCreateProposal() {
  const { writeContract, data, isPending, error, reset } = useWriteContract();
  return {
    createProposal: (
      title: string,
      description: string,
      criteriaURI: string,
      reward: bigint,
      decisionDeadline: bigint
    ) =>
      writeContract({
        address: AGENT_REVIEW_ADDRESS,
        abi: AGENT_REVIEW_ABI,
        functionName: 'createProposal',
        args: [title, description, criteriaURI, reward, decisionDeadline],
        value: reward,
      }),
    hash: data,
    isPending,
    error,
    reset,
  };
}

export function useCancelProposal() {
  const { writeContract, data, isPending, error, reset } = useWriteContract();
  return {
    cancelProposal: (proposalId: bigint) =>
      writeContract({
        address: AGENT_REVIEW_ADDRESS,
        abi: AGENT_REVIEW_ABI as any,
        functionName: 'cancelProposal' as any,
        args: [proposalId],
      }),
    hash: data,
    isPending,
    error,
    reset,
  };
}
