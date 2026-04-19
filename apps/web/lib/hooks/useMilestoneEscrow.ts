import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { MILESTONE_ESCROW_ABI, MILESTONE_ESCROW_EVENTS } from '@/lib/contracts/abis';
import { getContractAddress, debugLog } from '@/lib/contracts/config';
import { parseEventLogs } from 'viem';

const MILESTONE_ESCROW_ADDRESS = getContractAddress('MILESTONE_ESCROW');

export const ARBITER_STAKE_ETH = 0.01;
export const ARBITER_FEE_ETH = 0.001;

export interface Milestone {
  description: string;
  amount: bigint;
  dueDate: bigint;
  completed: boolean;
  released: boolean;
  proofHash: string;
}

export interface JobMilestones {
  client: string;
  provider: string;
  paymentToken: string;
  totalBudget: bigint;
  usesMilestones: boolean;
}

export interface Dispute {
  jobId: bigint;
  flaggler: string;
  arbiter: string;
  flaggedAt: bigint;
  resolved: boolean;
  releaseToProvider: boolean;
}

// ============ Constants ============

export function useMilestoneConstants() {
  const { data, isLoading } = useReadContract({
    address: MILESTONE_ESCROW_ADDRESS,
    abi: MILESTONE_ESCROW_ABI,
    functionName: 'ARBITER_STAKE',
  });

  return {
    arbiterStake: data ?? BigInt(0),
    isLoading,
  };
}

// ============ Milestone Read Hooks ============

export function useJobMilestones(jobId: number | bigint | undefined) {
  const id = jobId !== undefined ? (typeof jobId === 'bigint' ? jobId : BigInt(jobId)) : undefined;

  const { data, isLoading, error, refetch } = useReadContract({
    address: MILESTONE_ESCROW_ADDRESS,
    abi: MILESTONE_ESCROW_ABI,
    functionName: 'getJobMilestones',
    args: id !== undefined ? [id] : undefined,
    query: {
      retry: 2,
      staleTime: 30 * 1000,
      enabled: id !== undefined,
    },
  });

  return {
    milestones: data as Milestone[] | undefined,
    isLoading,
    error,
    refetch,
  };
}

export function useMilestoneCount(jobId: number | bigint | undefined) {
  const id = jobId !== undefined ? (typeof jobId === 'bigint' ? jobId : BigInt(jobId)) : undefined;

  const { data, isLoading, refetch } = useReadContract({
    address: MILESTONE_ESCROW_ADDRESS,
    abi: MILESTONE_ESCROW_ABI,
    functionName: 'getMilestoneCount',
    args: id !== undefined ? [id] : undefined,
    query: {
      retry: 2,
      staleTime: 30 * 1000,
      enabled: id !== undefined,
    },
  });

  return {
    count: data ? Number(data) : 0,
    isLoading,
    refetch,
  };
}

export function useJobMilestonesDetails(jobId: number | bigint | undefined) {
  const id = jobId !== undefined ? (typeof jobId === 'bigint' ? jobId : BigInt(jobId)) : undefined;

  const { data, isLoading, error, refetch } = useReadContract({
    address: MILESTONE_ESCROW_ADDRESS,
    abi: MILESTONE_ESCROW_ABI,
    functionName: 'jobMilestones',
    args: id !== undefined ? [id] : undefined,
    query: {
      retry: 2,
      staleTime: 30 * 1000,
      enabled: id !== undefined,
    },
  });

  return {
    details: data as JobMilestones | undefined,
    isLoading,
    error,
    refetch,
  };
}

// ============ Arbiter Read Hooks ============

export function useArbiterCount() {
  const { data, isLoading, refetch } = useReadContract({
    address: MILESTONE_ESCROW_ADDRESS,
    abi: MILESTONE_ESCROW_ABI,
    functionName: 'getArbiterCount',
    query: {
      retry: 2,
      staleTime: 60 * 1000,
    },
  });

  return {
    count: data ? Number(data) : 0,
    isLoading,
    refetch,
  };
}

export function useIsArbiter(address: string | undefined) {
  const { data, isLoading, refetch } = useReadContract({
    address: MILESTONE_ESCROW_ADDRESS,
    abi: MILESTONE_ESCROW_ABI,
    functionName: 'isArbiter',
    args: address ? [address as `0x${string}`] : undefined,
    query: {
      retry: 2,
      staleTime: 60 * 1000,
      enabled: address !== undefined,
    },
  });

  return {
    isArbiter: data ?? false,
    isLoading,
    refetch,
  };
}

export function useArbiterStake(address: string | undefined) {
  const { data, isLoading, refetch } = useReadContract({
    address: MILESTONE_ESCROW_ADDRESS,
    abi: MILESTONE_ESCROW_ABI,
    functionName: 'getArbiterStake',
    args: address ? [address as `0x${string}`] : undefined,
    query: {
      retry: 2,
      staleTime: 60 * 1000,
      enabled: address !== undefined,
    },
  });

  return {
    stake: data ?? BigInt(0),
    isLoading,
    refetch,
  };
}

// ============ Dispute Read Hooks ============

export function useDispute(jobId: number | bigint | undefined) {
  const id = jobId !== undefined ? (typeof jobId === 'bigint' ? jobId : BigInt(jobId)) : undefined;

  const { data, isLoading, error, refetch } = useReadContract({
    address: MILESTONE_ESCROW_ADDRESS,
    abi: MILESTONE_ESCROW_ABI,
    functionName: 'getDispute',
    args: id !== undefined ? [id] : undefined,
    query: {
      retry: 2,
      staleTime: 30 * 1000,
      enabled: id !== undefined,
    },
  });

  return {
    dispute: data as Dispute | undefined,
    isLoading,
    error,
    refetch,
  };
}

export function useActiveDisputes() {
  const { data, isLoading, refetch } = useReadContract({
    address: MILESTONE_ESCROW_ADDRESS,
    abi: MILESTONE_ESCROW_ABI,
    functionName: 'getActiveDisputes',
    query: {
      retry: 2,
      staleTime: 60 * 1000,
    },
  });

  return {
    disputeIds: data as bigint[] | undefined,
    isLoading,
    refetch,
  };
}

// ============ Write Hooks ============

export function useEnableMilestones() {
  const { data: hash, isPending, writeContract, error: writeError } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const enableMilestones = async (jobId: bigint, provider: `0x${string}`, paymentToken: `0x${string}`, totalBudget: bigint) => {
    debugLog('contracts', `useEnableMilestones: Enabling milestones for job ${Number(jobId)}`);

    writeContract({
      address: MILESTONE_ESCROW_ADDRESS,
      abi: MILESTONE_ESCROW_ABI,
      functionName: 'enableMilestones',
      args: [jobId, provider, paymentToken, totalBudget],
    });
  };

  return {
    enableMilestones,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    writeError,
  };
}

export function useAddMilestone() {
  const { data: hash, isPending, writeContract, error: writeError } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const addMilestone = async (jobId: bigint, description: string, amount: bigint, dueDate: bigint) => {
    debugLog('contracts', `useAddMilestone: Adding milestone to job ${Number(jobId)}`);

    writeContract({
      address: MILESTONE_ESCROW_ADDRESS,
      abi: MILESTONE_ESCROW_ABI,
      functionName: 'addMilestone',
      args: [jobId, description, amount, dueDate],
    });
  };

  return {
    addMilestone,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    writeError,
  };
}

export function useCompleteMilestone() {
  const { data: hash, isPending, writeContract, error: writeError } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const completeMilestone = async (jobId: bigint, milestoneIndex: bigint, proofHash: `0x${string}`) => {
    debugLog('contracts', `useCompleteMilestone: Completing milestone ${Number(jobId)}-${Number(milestoneIndex)}`);

    writeContract({
      address: MILESTONE_ESCROW_ADDRESS,
      abi: MILESTONE_ESCROW_ABI,
      functionName: 'completeMilestone',
      args: [jobId, milestoneIndex, proofHash],
    });
  };

  return {
    completeMilestone,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    writeError,
  };
}

export function useReleaseMilestone() {
  const { data: hash, isPending, writeContract, error: writeError } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const releaseMilestone = async (jobId: bigint, milestoneIndex: bigint) => {
    debugLog('contracts', `useReleaseMilestone: Releasing milestone ${Number(jobId)}-${Number(milestoneIndex)}`);

    writeContract({
      address: MILESTONE_ESCROW_ADDRESS,
      abi: MILESTONE_ESCROW_ABI,
      functionName: 'releaseMilestone',
      args: [jobId, milestoneIndex],
    });
  };

  return {
    releaseMilestone,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    writeError,
  };
}

export function useRegisterAsArbiter() {
  const { data: hash, isPending, writeContract, error: writeError } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const registerAsArbiter = async () => {
    debugLog('contracts', 'useRegisterAsArbiter: Registering as arbiter with stake');

    writeContract({
      address: MILESTONE_ESCROW_ADDRESS,
      abi: MILESTONE_ESCROW_ABI,
      functionName: 'registerAsArbiter',
      value: BigInt(ARBITER_STAKE_ETH * 1e18),
    });
  };

  return {
    registerAsArbiter,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    writeError,
  };
}

export function useUnregisterAsArbiter() {
  const { data: hash, isPending, writeContract, error: writeError } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const unregisterAsArbiter = async () => {
    debugLog('contracts', 'useUnregisterAsArbiter: Unregistering as arbiter');

    writeContract({
      address: MILESTONE_ESCROW_ADDRESS,
      abi: MILESTONE_ESCROW_ABI,
      functionName: 'unregisterAsArbiter',
    });
  };

  return {
    unregisterAsArbiter,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    writeError,
  };
}

export function useFlagDispute() {
  const { data: hash, isPending, writeContract, error: writeError } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const flagDispute = async (jobId: bigint) => {
    debugLog('contracts', `useFlagDispute: Flagging dispute for job ${Number(jobId)}`);

    writeContract({
      address: MILESTONE_ESCROW_ADDRESS,
      abi: MILESTONE_ESCROW_ABI,
      functionName: 'flagDispute',
      args: [jobId],
      value: BigInt(ARBITER_FEE_ETH * 1e18),
    });
  };

  return {
    flagDispute,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    writeError,
  };
}

export function useSubmitEvidence() {
  const { data: hash, isPending, writeContract, error: writeError } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const submitEvidence = async (jobId: bigint, evidenceHash: `0x${string}`) => {
    debugLog('contracts', `useSubmitEvidence: Submitting evidence for job ${Number(jobId)}`);

    writeContract({
      address: MILESTONE_ESCROW_ADDRESS,
      abi: MILESTONE_ESCROW_ABI,
      functionName: 'submitEvidence',
      args: [jobId, evidenceHash],
    });
  };

  return {
    submitEvidence,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    writeError,
  };
}

export function useResolveDispute() {
  const { data: hash, isPending, writeContract, error: writeError } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const resolveDispute = async (jobId: bigint, releaseToProvider: boolean) => {
    debugLog('contracts', `useResolveDispute: Resolving dispute for job ${Number(jobId)} (releaseToProvider: ${releaseToProvider})`);

    writeContract({
      address: MILESTONE_ESCROW_ADDRESS,
      abi: MILESTONE_ESCROW_ABI,
      functionName: 'resolveDispute',
      args: [jobId, releaseToProvider],
    });
  };

  return {
    resolveDispute,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    writeError,
  };
}