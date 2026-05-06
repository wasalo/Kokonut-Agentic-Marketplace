import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { MILESTONE_ESCROW_ABI } from '@/lib/contracts/abis';
import { getContractAddress, debugLog } from '@/lib/contracts/config';


const MILESTONE_ESCROW_ADDRESS = getContractAddress('MILESTONE_ESCROW');

// V2: Arbiter stake/fee are in ERC20 tokens, not ETH
// Use getArbiterStake/getArbiterFee to check per-token requirements

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
  flagger: string;
  arbiter: string;
  flaggedAt: bigint;
  resolved: boolean;
  releaseToProvider: boolean;
  feePaid: bigint;
  milestoneIndex: bigint;
}

// ============ Data Normalization Helpers ============
// viem v2 returns tuple/struct data as arrays, not objects with named properties.
// These mappers handle both array and object formats defensively.

function mapJobMilestonesDetails(data: unknown): JobMilestones | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const arr = data as unknown[];
  const isArray = Array.isArray(data);
  const client = isArray ? arr[0] : (data as any).client;
  if (!client || (typeof client === 'string' && client === '0x0000000000000000000000000000000000000000')) {
    return undefined;
  }
  return {
    client: client as string,
    provider: (isArray ? arr[1] : (data as any).provider) as string,
    paymentToken: (isArray ? arr[2] : (data as any).paymentToken) as string,
    totalBudget: (isArray ? arr[3] : (data as any).totalBudget) as bigint,
    usesMilestones: (isArray ? arr[4] : (data as any).usesMilestones) as boolean,
  };
}

function mapMilestone(data: unknown): Milestone | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const arr = data as unknown[];
  const isArray = Array.isArray(data);
  return {
    description: (isArray ? arr[0] : (data as any).description) as string,
    amount: (isArray ? arr[1] : (data as any).amount) as bigint,
    dueDate: (isArray ? arr[2] : (data as any).dueDate) as bigint,
    completed: (isArray ? arr[3] : (data as any).completed) as boolean,
    released: (isArray ? arr[4] : (data as any).released) as boolean,
    proofHash: (isArray ? arr[5] : (data as any).proofHash) as string,
  };
}

function mapDispute(data: unknown): Dispute | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const arr = data as unknown[];
  const isArray = Array.isArray(data);
  const flagger = isArray ? arr[1] : (data as any).flagger;
  if (!flagger || (typeof flagger === 'string' && flagger === '0x0000000000000000000000000000000000000000')) {
    return undefined;
  }
  return {
    jobId: (isArray ? arr[0] : (data as any).jobId) as bigint,
    flagger: flagger as string,
    arbiter: (isArray ? arr[2] : (data as any).arbiter) as string,
    flaggedAt: (isArray ? arr[3] : (data as any).flaggedAt) as bigint,
    resolved: (isArray ? arr[4] : (data as any).resolved) as boolean,
    releaseToProvider: (isArray ? arr[5] : (data as any).releaseToProvider) as boolean,
    feePaid: (isArray ? arr[6] : (data as any).feePaid) as bigint,
    milestoneIndex: (isArray ? arr[7] : (data as any).milestoneIndex) as bigint,
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

  // Normalize array-of-arrays from viem into Milestone objects
  const milestones: Milestone[] | undefined =
    data && Array.isArray(data)
      ? data
          .map(mapMilestone)
          .filter((m): m is Milestone => m !== undefined)
      : undefined;

  return {
    milestones,
    isLoading,
    error,
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
    details: mapJobMilestonesDetails(data),
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
    functionName: 'getArbiters',
    query: {
      retry: 2,
      staleTime: 60 * 1000,
    },
  });

  return {
    count: data ? (data as string[]).length : 0,
    isLoading,
    refetch,
  };
}

export function useIsArbiter(address: string | undefined) {
  const { data, isLoading, refetch } = useReadContract({
    address: MILESTONE_ESCROW_ADDRESS,
    abi: MILESTONE_ESCROW_ABI,
    functionName: 'isRegisteredArbiter',
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
    dispute: mapDispute(data),
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

  const enableMilestones = async (jobId: bigint, client: `0x${string}`, provider: `0x${string}`, paymentToken: `0x${string}`, totalBudget: bigint) => {
    debugLog('contracts', `useEnableMilestones: Enabling milestones for job ${Number(jobId)}`);

    writeContract({
      address: MILESTONE_ESCROW_ADDRESS,
      abi: MILESTONE_ESCROW_ABI,
      functionName: 'enableMilestones',
      args: [jobId, client, provider, paymentToken, totalBudget],
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

  const addMilestone = async (jobId: bigint, amount: bigint, description: string, dueDate: bigint) => {
    debugLog('contracts', `useAddMilestone: Adding milestone to job ${Number(jobId)}`);

    writeContract({
      address: MILESTONE_ESCROW_ADDRESS,
      abi: MILESTONE_ESCROW_ABI,
      functionName: 'addMilestone',
      args: [jobId, amount, description, dueDate],
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
    debugLog('contracts', `useCompleteMilestone: Submitting milestone ${Number(jobId)}-${Number(milestoneIndex)}`);

    writeContract({
      address: MILESTONE_ESCROW_ADDRESS,
      abi: MILESTONE_ESCROW_ABI,
      functionName: 'submitMilestone',
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

  const registerAsArbiter = async (token: `0x${string}`, amount: bigint) => {
    debugLog('contracts', `useRegisterAsArbiter: Registering as arbiter with ${amount} of token ${token}`);

    writeContract({
      address: MILESTONE_ESCROW_ADDRESS,
      abi: MILESTONE_ESCROW_ABI,
      functionName: 'registerAsArbiter',
      args: [token, amount],
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

  const flagDispute = async (jobId: bigint, milestoneIndex: bigint) => {
    debugLog('contracts', `useFlagDispute: Flagging dispute for job ${Number(jobId)}, milestone ${Number(milestoneIndex)}`);

    writeContract({
      address: MILESTONE_ESCROW_ADDRESS,
      abi: MILESTONE_ESCROW_ABI,
      functionName: 'flagDispute',
      args: [jobId, milestoneIndex],
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