import { useReadContract, useReadContracts, useWriteContract } from 'wagmi';
import { AGENTIC_COMMERCE_ABI } from '@/lib/contracts/abis';
import { getContractAddress, debugLog } from '@/lib/contracts/config';
import type { Job, JobStatus, JobStatusType, JobType, JobTypeType, Bid } from '@/lib/types/contracts';

/* eslint-disable @typescript-eslint/no-explicit-any */
// Add new function names to the ABI type
const AGENTIC_COMMERCE_ABI_WITH_NEW = AGENTIC_COMMERCE_ABI as typeof AGENTIC_COMMERCE_ABI & readonly (
  | { name: 'completeAfterTimeout' }
  | { name: 'refundExpired' }
  | { name: 'createJobWithRandomEvaluator' }
  | { name: 'registerAsEvaluator' }
  | { name: 'unregisterAsEvaluator' }
)[];

const AGENTIC_COMMERCE_ADDRESS = getContractAddress('AGENTIC_COMMERCE');

// Re-export from centralized types for backward compatibility
export type { Job, JobStatusType, JobTypeType, Bid };
export { JobStatus, JobType };

// ============ Read Hooks ============

export function useJobCount() {
  debugLog('contracts', 'useJobCount: Fetching jobCounter from', AGENTIC_COMMERCE_ADDRESS);

  const { data, isLoading, error, refetch } = useReadContract({
    address: AGENTIC_COMMERCE_ADDRESS,
    abi: AGENTIC_COMMERCE_ABI,
    functionName: 'jobCounter',
    query: {
      retry: 2,
      staleTime: 30 * 1000,
    },
  });

  if (error) {
    debugLog('errors', 'useJobCount: Error fetching jobCounter', error);
  }

  if (data) {
    debugLog('contracts', 'useJobCount: Retrieved jobCounter', Number(data));
  }

  return {
    count: data ? Number(data) : 0,
    isLoading,
    error,
    refetch,
  };
}

export function useJob(jobId: number | bigint | undefined) {
  const id = jobId !== undefined ? (typeof jobId === 'bigint' ? jobId : BigInt(jobId)) : undefined;

  const { data, isLoading, error, refetch } = useReadContract({
    address: AGENTIC_COMMERCE_ADDRESS,
    abi: AGENTIC_COMMERCE_ABI,
    functionName: 'getJob',
    args: id !== undefined ? [id] : undefined,
    query: {
      retry: 2,
      staleTime: 10 * 1000,
      enabled: id !== undefined,
    },
  });

  return {
    job: data,
    isLoading,
    error,
    refetch,
  };
}

export function useJobs(start: number = 0, count: number = 20) {
  const {
    count: totalCount,
    isLoading: isCountLoading,
    error: countError,
    refetch: refetchCount,
  } = useJobCount();

  const jobQueries = [];
  const safeCount = totalCount ?? 0;
  for (let i = start; i < Math.min(start + count, safeCount); i++) {
    jobQueries.push({
      address: AGENTIC_COMMERCE_ADDRESS,
      abi: AGENTIC_COMMERCE_ABI,
      functionName: 'getJob' as const,
      args: [BigInt(i)],
    });
  }

  const {
    data: results,
    isLoading,
    error,
    refetch,
  } = useReadContracts({
    contracts: jobQueries,
    query: {
      enabled: jobQueries.length > 0 && !isCountLoading,
      retry: 2,
      staleTime: 30 * 1000,
    },
  });

  if (!results || results.length === 0) {
    return {
      jobs: [] as Job[],
      isLoading: isCountLoading,
      error: countError,
      refetch: refetchCount,
    };
  }

  const jobs: Job[] = [];
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === 'success') {
      jobs.push(result.result as unknown as Job);
    }
  }

  return {
    jobs,
    isLoading,
    error: error || countError,
    refetch: () => {
      refetch();
      refetchCount();
    },
  };
}

export function useUserJobs(
  user: `0x${string}` | undefined,
  role: 'client' | 'provider' | 'evaluator' | 'all' = 'all'
) {
  const { jobs, isLoading, error, refetch } = useJobs(0, 100);

  if (!user) {
    return {
      jobs: [] as Job[],
      isLoading: false,
      error: null,
      refetch,
    };
  }

  const filteredJobs = jobs.filter(job => {
    if (role === 'all') {
      return job.client === user || job.provider === user || job.evaluator === user;
    }
    return job[role] === user;
  });

  return {
    jobs: filteredJobs,
    isLoading,
    error,
    refetch,
  };
}

export function useActiveJobCount() {
  const { jobs, isLoading: isJobsLoading } = useJobs(0, 100);
  const activeJobs = jobs.filter(
    job =>
      job.status === JobStatus.Open ||
      job.status === JobStatus.Funded ||
      job.status === JobStatus.Submitted
  );
  return { count: activeJobs.length, isLoading: isJobsLoading };
}

// ============ Write Hooks ============

/**
 * @deprecated createJobFromService is disabled in V6.1 for size optimization.
 * Use useCreateJob + useSetProvider + useSetBudget instead.
 * This function will revert with "createJobFromService disabled".
 */
export function useCreateJobFromService() {
  const { writeContract, data, isPending, error, reset } = useWriteContract();
  return {
    createJobFromService: (
      serviceId: bigint,
      evaluator: `0x${string}`,
      expiredAt: bigint,
      description: string,
      hook: `0x${string}` = '0x0000000000000000000000000000000000000000',
      evaluatorFee: boolean = false
    ) => {
      console.warn(
        'useCreateJobFromService is deprecated - createJobFromService disabled in V6.1. Use createJob + setProvider + setBudget instead.'
      );
      writeContract({
        address: AGENTIC_COMMERCE_ADDRESS,
        abi: AGENTIC_COMMERCE_ABI,
        functionName: 'createJobFromService',
        args: [serviceId, evaluator, expiredAt, description, hook, evaluatorFee],
      });
    },
    hash: data,
    isPending,
    error,
    reset,
  };
}

export function useCreateJob() {
  const { writeContract, data, isPending, error, reset } = useWriteContract();
  return {
    createJob: (
      provider: `0x${string}`,
      evaluator: `0x${string}`,
      expiredAt: bigint,
      description: string,
      evaluatorFee: boolean = false
    ) =>
      writeContract({
        address: AGENTIC_COMMERCE_ADDRESS,
        abi: AGENTIC_COMMERCE_ABI,
        functionName: 'createJob',
        args: [
          provider,
          evaluator,
          expiredAt,
          description,
          '0x0000000000000000000000000000000000000000',
          evaluatorFee,
        ],
      }),
    hash: data,
    isPending,
    error,
    reset,
  };
}

export function useFundJob() {
  const { writeContract, data, isPending, error, reset } = useWriteContract();
  return {
    fundJob: (jobId: bigint) =>
      writeContract({
        address: AGENTIC_COMMERCE_ADDRESS,
        abi: AGENTIC_COMMERCE_ABI,
        functionName: 'fund',
        args: [jobId],
      }),
    hash: data,
    isPending,
    error,
    reset,
  };
}

export function useSubmitJob() {
  const { writeContract, data, isPending, error, reset } = useWriteContract();
  return {
    submitJob: (jobId: bigint, deliverable: `0x${string}`) =>
      writeContract({
        address: AGENTIC_COMMERCE_ADDRESS,
        abi: AGENTIC_COMMERCE_ABI,
        functionName: 'submit',
        args: [jobId, deliverable],
      }),
    hash: data,
    isPending,
    error,
    reset,
  };
}

export function useCompleteJob() {
  const { writeContract, data, isPending, error, reset } = useWriteContract();
  return {
    completeJob: (jobId: bigint, reason: `0x${string}`) =>
      writeContract({
        address: AGENTIC_COMMERCE_ADDRESS,
        abi: AGENTIC_COMMERCE_ABI,
        functionName: 'complete',
        args: [jobId, reason],
      }),
    hash: data,
    isPending,
    error,
    reset,
  };
}

export function useRejectJob() {
  const { writeContract, data, isPending, error, reset } = useWriteContract();
  return {
    rejectJob: (jobId: bigint, reason: `0x${string}`) =>
      writeContract({
        address: AGENTIC_COMMERCE_ADDRESS,
        abi: AGENTIC_COMMERCE_ABI,
        functionName: 'reject',
        args: [jobId, reason],
      }),
    hash: data,
    isPending,
    error,
    reset,
  };
}

export function useClaimRefund() {
  const { writeContract, data, isPending, error, reset } = useWriteContract();
  return {
    claimRefund: (jobId: bigint) =>
      writeContract({
        address: AGENTIC_COMMERCE_ADDRESS,
        abi: AGENTIC_COMMERCE_ABI,
        functionName: 'claimRefund',
        args: [jobId],
      }),
    hash: data,
    isPending,
    error,
    reset,
  };
}

export function useSetBudget() {
  const { writeContract, data, isPending, error, reset } = useWriteContract();

  return {
    setBudget: (jobId: bigint, amount: bigint) =>
      writeContract({
        address: AGENTIC_COMMERCE_ADDRESS,
        abi: AGENTIC_COMMERCE_ABI,
        functionName: 'setBudget',
        args: [jobId, amount],
      }),
    hash: data,
    isPending,
    error,
    reset,
  };
}

export function useSetProvider() {
  const { writeContract, data, isPending, error, reset } = useWriteContract();

  return {
    setProvider: (jobId: bigint, provider: `0x${string}`) =>
      writeContract({
        address: AGENTIC_COMMERCE_ADDRESS,
        abi: AGENTIC_COMMERCE_ABI,
        functionName: 'setProvider',
        args: [jobId, provider],
      }),
    hash: data,
    isPending,
    error,
    reset,
  };
}

export function useSetPaymentToken() {
  const { writeContract, data, isPending, error, reset } = useWriteContract();

  return {
    setPaymentToken: (jobId: bigint, paymentToken: `0x${string}`) =>
      writeContract({
        address: AGENTIC_COMMERCE_ADDRESS,
        abi: AGENTIC_COMMERCE_ABI,
        functionName: 'setPaymentToken',
        args: [jobId, paymentToken],
      }),
    hash: data,
    isPending,
    error,
    reset,
  };
}

// ============ Utility ============

export function getJobStatusLabel(status: number): string {
  switch (status) {
    case JobStatus.Open:
      return 'Open';
    case JobStatus.Funded:
      return 'Funded';
    case JobStatus.Submitted:
      return 'Submitted';
    case JobStatus.Completed:
      return 'Completed';
    case JobStatus.Rejected:
      return 'Rejected';
    case JobStatus.Expired:
      return 'Expired';
    default:
      return 'Unknown';
  }
}

export function getJobStatusColor(
  status: number
): 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' {
  switch (status) {
    case JobStatus.Open:
      return 'default';
    case JobStatus.Funded:
      return 'primary';
    case JobStatus.Submitted:
      return 'warning';
    case JobStatus.Completed:
      return 'success';
    case JobStatus.Rejected:
      return 'danger';
    case JobStatus.Expired:
      return 'danger';
    default:
      return 'default';
  }
}

// ============ V5 Open Job & Bidding Hooks ============

export function useJobConstants() {
  const { data: revealWindow, isLoading: isRevealLoading } = useReadContract({
    address: AGENTIC_COMMERCE_ADDRESS,
    abi: AGENTIC_COMMERCE_ABI,
    functionName: 'REVEAL_WINDOW',
    query: { staleTime: 60 * 60 * 1000 },
  });

  const { data: minEthPayment, isLoading: isMinEthLoading } = useReadContract({
    address: AGENTIC_COMMERCE_ADDRESS,
    abi: AGENTIC_COMMERCE_ABI,
    functionName: 'MIN_ETH_PAYMENT',
    query: { staleTime: 60 * 60 * 1000 },
  });

  return {
    revealWindow: revealWindow ? Number(revealWindow) : 3600, // Default 1 hour
    minEthPayment: minEthPayment ?? BigInt(5000000000000000), // Default 0.005 ETH
    isLoading: isRevealLoading || isMinEthLoading,
  };
}

/**
 * @deprecated Bidding is now handled by the standalone BiddingSystem contract.
 * Use useBiddingCalculateStake, useCreateBiddingSession, useBiddingCommitBid, etc. from useBiddingSystem.ts instead.
 * These functions will revert with "Bidding disabled in V6.1"
 */
export function useCalculateStake() {
  const { data, isLoading, error } = useReadContract({
    address: AGENTIC_COMMERCE_ADDRESS,
    abi: AGENTIC_COMMERCE_ABI,
    functionName: 'calculateStake',
    query: { staleTime: 60 * 60 * 1000 },
  });

  return {
    calculateStake: (maxBudget: bigint) => data ?? BigInt(0),
    stakeAmount: data ?? BigInt(0),
    isLoading,
    error,
  };
}

/**
 * @deprecated Use BiddingSystem for open job bidding instead.
 * This function will revert with "Bidding disabled in V6.1"
 */
export function useCreateOpenJob() {
  const { writeContract, data, isPending, error, reset } = useWriteContract();

  return {
    createOpenJob: (
      _maxBudget: bigint,
      _evaluator: `0x${string}`,
      _expiredAt: bigint,
      _description: string,
      _paymentToken: `0x${string}`,
      _evaluatorFee: boolean = false
    ) => {
      console.warn(
        'useCreateOpenJob is deprecated - bidding disabled in V6.1. Use BiddingSystem instead.'
      );
      writeContract({
        address: AGENTIC_COMMERCE_ADDRESS,
        abi: AGENTIC_COMMERCE_ABI,
        functionName: 'createOpenJob',
        args: [_maxBudget, _evaluator, _expiredAt, _description, _paymentToken, _evaluatorFee],
      });
    },
    hash: data,
    isPending,
    error,
    reset,
  };
}

/**
 * @deprecated Use BiddingSystem for bidding instead.
 * This function will revert with "Bidding disabled"
 */
export function useCommitBid() {
  const { writeContract, data, isPending, error, reset } = useWriteContract();

  return {
    commitBid: (_jobId: bigint, _commitHash: `0x${string}`, _value?: bigint) => {
      console.warn(
        'useCommitBid is deprecated - bidding disabled in V6.1. Use useBiddingCommitBid from useBiddingSystem.ts instead.'
      );
    },
    hash: data,
    isPending,
    error,
    reset,
  };
}

/**
 * @deprecated Use BiddingSystem for bidding instead.
 * This function will revert with "Bidding disabled"
 */
export function useRevealBid() {
  const { writeContract, data, isPending, error, reset } = useWriteContract();

  return {
    revealBid: (_jobId: bigint, _amount: bigint, _message: string, _salt: `0x${string}`) => {
      console.warn(
        'useRevealBid is deprecated - bidding disabled in V6.1. Use useBiddingRevealBid from useBiddingSystem.ts instead.'
      );
    },
    hash: data,
    isPending,
    error,
    reset,
  };
}

/**
 * @deprecated Use BiddingSystem for bidding instead.
 * This function will revert with "Bidding disabled"
 */
export function useAcceptBid() {
  const { writeContract, data, isPending, error, reset } = useWriteContract();

  return {
    acceptBid: (_jobId: bigint, _bidId: bigint) => {
      console.warn(
        'useAcceptBid is deprecated - bidding disabled in V6.1. Use useBiddingAcceptBid from useBiddingSystem.ts instead.'
      );
    },
    hash: data,
    isPending,
    error,
    reset,
  };
}

/**
 * @deprecated Bidding is now handled by the standalone BiddingSystem contract.
 * Use useBiddingUserBid from useBiddingSystem.ts instead.
 * This function always returns an empty bid (Bid {bidId: 0}) because bidding is disabled in V6.1.
 */
export function useUserBid(jobId: number | bigint | undefined, user: `0x${string}` | undefined) {
  const id = jobId !== undefined ? (typeof jobId === 'bigint' ? jobId : BigInt(jobId)) : undefined;

  const { data, isLoading, error, refetch } = useReadContract({
    address: AGENTIC_COMMERCE_ADDRESS,
    abi: AGENTIC_COMMERCE_ABI,
    functionName: 'getUserBid',
    args: id !== undefined && user !== undefined ? [id, user] : undefined,
    query: {
      enabled: id !== undefined && user !== undefined,
      retry: 2,
      staleTime: 10 * 1000,
    },
  });

  return {
    bid: data as Bid | undefined,
    hasBid: data && data.bidId > BigInt(0),
    isLoading,
    error,
    refetch,
  };
}

export function useFundJobWithETH() {
  const { writeContract, data, isPending, error, reset } = useWriteContract();

  return {
    fundJob: (jobId: bigint, value: bigint) =>
      writeContract({
        address: AGENTIC_COMMERCE_ADDRESS,
        abi: AGENTIC_COMMERCE_ABI,
        functionName: 'fund',
        args: [jobId],
        value,
      }),
    hash: data,
    isPending,
    error,
    reset,
  };
}

/**
 * @deprecated Bidding is now handled by the standalone BiddingSystem contract.
 * Use BiddingSystem to track bids on open jobs.
 * This function will revert with "Bidding disabled".
 */
export function useJobBidCount(jobId: bigint | undefined) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: AGENTIC_COMMERCE_ADDRESS,
    abi: AGENTIC_COMMERCE_ABI,
    functionName: 'jobBidCount',
    args: jobId !== undefined ? [jobId] : undefined,
    query: {
      enabled: jobId !== undefined,
      retry: 2,
      staleTime: 10 * 1000,
    },
  });

  return {
    count: data ? Number(data) : 0,
    isLoading,
    error,
    refetch,
  };
}

/**
 * @deprecated Bidding is now handled by the standalone BiddingSystem contract.
 * Use BiddingSystem to track bids on open jobs.
 * This function will revert with "Bidding disabled".
 */
export function useJobBid(jobId: bigint | undefined, index: number) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: AGENTIC_COMMERCE_ADDRESS,
    abi: AGENTIC_COMMERCE_ABI,
    functionName: 'jobBids',
    args: jobId !== undefined ? [jobId, BigInt(index)] : undefined,
    query: {
      enabled: jobId !== undefined,
      retry: 2,
      staleTime: 10 * 1000,
    },
  });

  return {
    bid: data as Bid | undefined,
    isLoading,
    error,
    refetch,
  };
}

/**
 * @deprecated Bidding is now handled by the standalone BiddingSystem contract.
 * Use useBiddingWithdrawStake from useBiddingSystem.ts instead.
 * This function will revert with "Bidding disabled".
 */
export function useWithdrawStake() {
  const { writeContract, data, isPending, error, reset } = useWriteContract();

  return {
    withdrawStake: (jobId: bigint) =>
      writeContract({
        address: AGENTIC_COMMERCE_ADDRESS,
        abi: AGENTIC_COMMERCE_ABI,
        functionName: 'withdrawStake',
        args: [jobId],
      }),
    hash: data,
    isPending,
    error,
    reset,
  };
}

export function useEvaluatorFeeEnabled(jobId: bigint | undefined) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: AGENTIC_COMMERCE_ADDRESS,
    abi: AGENTIC_COMMERCE_ABI,
    functionName: 'isEvaluatorFeeEnabled',
    args: jobId !== undefined ? [jobId] : undefined,
    query: {
      enabled: jobId !== undefined,
      retry: 2,
      staleTime: 30 * 1000,
    },
  });

  return {
    isEvaluatorFeeEnabled: data ?? false,
    isLoading,
    error,
    refetch,
  };
}

export function useTotalStakesHeld(address: `0x${string}` | undefined) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: AGENTIC_COMMERCE_ADDRESS,
    abi: AGENTIC_COMMERCE_ABI,
    functionName: 'totalStakesHeld',
    args: address !== undefined ? [address] : undefined,
    query: {
      enabled: address !== undefined,
      retry: 2,
      staleTime: 30 * 1000,
    },
  });

  return {
    totalStakes: data ?? BigInt(0),
    isLoading,
    error,
    refetch,
  };
}

// ============ Phase 14/15 Missing Hooks ============

/**
 * Complete a job after the dispute window has passed.
 * Used when the evaluator is unresponsive after the deadline.
 * Anyone can call this function - it's permissionless.
 */
export function useCompleteAfterTimeout() {
  const { writeContract, data, isPending, error, reset } = useWriteContract();

  return {
    completeAfterTimeout: (jobId: bigint) =>
      writeContract({
        address: AGENTIC_COMMERCE_ADDRESS,
        abi: AGENTIC_COMMERCE_ABI_WITH_NEW,
        functionName: 'completeAfterTimeout' as 'completeAfterTimeout',
        args: [jobId],
      }),
    hash: data,
    isPending,
    error,
    reset,
  };
}

/**
 * Trigger a refund for an expired job - permissionless function.
 * Anyone can call this to trigger a refund for jobs past their expiration date.
 * The client will be refunded, and if the provider was non-responsive, they may be slashed.
 */
export function useRefundExpired() {
  const { writeContract, data, isPending, error, reset } = useWriteContract();

  return {
    refundExpired: (jobId: bigint) =>
      writeContract({
        address: AGENTIC_COMMERCE_ADDRESS,
        abi: AGENTIC_COMMERCE_ABI_WITH_NEW,
        functionName: 'refundExpired' as 'refundExpired',
        args: [jobId],
      }),
    hash: data,
    isPending,
    error,
    reset,
  };
}

/**
 * Create a job with a randomly selected evaluator from the registered evaluator pool.
 * The evaluator is selected randomly from all registered evaluators.
 */
export function useCreateJobWithRandomEvaluator() {
  const { writeContract, data, isPending, error, reset } = useWriteContract();

  return {
    createJobWithRandomEvaluator: (
      provider: `0x${string}`,
      evaluator: `0x${string}`,
      serviceId: bigint,
      budget: bigint,
      expiredAt: bigint,
      description: string,
      hook: `0x${string}` = '0x0000000000000000000000000000000000000000'
    ) =>
      writeContract({
        address: AGENTIC_COMMERCE_ADDRESS,
        abi: AGENTIC_COMMERCE_ABI_WITH_NEW,
        functionName: 'createJobWithRandomEvaluator' as 'createJobWithRandomEvaluator',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        args: [provider, evaluator, serviceId, budget, expiredAt, description, hook] as any,
      }),
    hash: data,
    isPending,
    error,
    reset,
  };
}

/**
 * Register as an evaluator to be eligible for random evaluator selection.
 */
export function useRegisterAsEvaluator() {
  const { writeContract, data, isPending, error, reset } = useWriteContract();

  return {
    registerAsEvaluator: () =>
      writeContract({
        address: AGENTIC_COMMERCE_ADDRESS,
        abi: AGENTIC_COMMERCE_ABI_WITH_NEW,
        functionName: 'registerAsEvaluator' as 'registerAsEvaluator',
      }),
    hash: data,
    isPending,
    error,
    reset,
  };
}

/**
 * Unregister as an evaluator.
 */
export function useUnregisterAsEvaluator() {
  const { writeContract, data, isPending, error, reset } = useWriteContract();

  return {
    unregisterAsEvaluator: () =>
      writeContract({
        address: AGENTIC_COMMERCE_ADDRESS,
        abi: AGENTIC_COMMERCE_ABI_WITH_NEW,
        functionName: 'unregisterAsEvaluator' as 'unregisterAsEvaluator',
      }),
    hash: data,
    isPending,
    error,
    reset,
  };
}

// ============ Utility Functions ============

export function isOpenJob(job: Job): boolean {
  return job.provider === '0x0000000000000000000000000000000000000000';
}

export function getJobTypeLabel(jobType: number): string {
  return jobType === JobType.Open ? 'Open (Bidding)' : 'Direct';
}

export function formatStake(maxBudget: bigint): string {
  const stake = (maxBudget * BigInt(100)) / BigInt(10000); // 1%
  return formatAmount(stake, 6); // Assumes USDC decimals
}

export function formatAmount(amount: bigint, decimals: number = 6): string {
  const divisor = BigInt(10 ** decimals);
  const wholePart = amount / divisor;
  const fractionalPart = amount % divisor;
  const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
  return `${wholePart}.${fractionalStr.slice(0, 2)}`;
}
