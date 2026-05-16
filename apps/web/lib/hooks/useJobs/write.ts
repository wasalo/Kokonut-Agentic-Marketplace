import { useWriteContract } from 'wagmi';
import { AGENTIC_COMMERCE_ABI, MILESTONE_ESCROW_ABI, BIDDING_SYSTEM_ABI } from '@/lib/contracts/abis';
import { getContractAddress } from '@/lib/contracts/config';

const AGENTIC_COMMERCE_ADDRESS = getContractAddress('AGENTIC_COMMERCE');

export function useCreateJob() {
  const { writeContract, data, isPending, error, reset } = useWriteContract();
  return {
    createJob: (
      provider: `0x${string}`,
      evaluator: `0x${string}`,
      expiredAt: bigint,
      description: string,
      hook: `0x${string}` = '0x0000000000000000000000000000000000000000',
      evaluatorFee: boolean = false,
      clientReview: boolean = true
    ) =>
      writeContract({
        address: AGENTIC_COMMERCE_ADDRESS,
        abi: AGENTIC_COMMERCE_ABI,
        functionName: 'createJobV7',
        args: [provider, evaluator, expiredAt, description, hook, evaluatorFee, clientReview],
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
    fundJob: (jobId: bigint, expectedBudget?: bigint) =>
      writeContract({
        address: AGENTIC_COMMERCE_ADDRESS,
        abi: AGENTIC_COMMERCE_ABI,
        functionName: 'fund',
        args: [jobId, expectedBudget ?? BigInt(0)],
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

export function useApproveByClient() {
  const { writeContract, data, isPending, error, reset } = useWriteContract();
  return {
    approveByClient: (jobId: bigint) =>
      writeContract({
        address: AGENTIC_COMMERCE_ADDRESS,
        abi: AGENTIC_COMMERCE_ABI,
        functionName: 'approveByClient',
        args: [jobId],
      }),
    hash: data,
    isPending,
    error,
    reset,
  };
}

export function useFinalizeByEvaluator() {
  const { writeContract, data, isPending, error, reset } = useWriteContract();
  return {
    finalizeByEvaluator: (jobId: bigint, reason: `0x${string}`) =>
      writeContract({
        address: AGENTIC_COMMERCE_ADDRESS,
        abi: AGENTIC_COMMERCE_ABI,
        functionName: 'finalizeByEvaluator',
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
  return {
    setBudget: (_jobId: bigint, _amount: bigint) => {},
    hash: undefined,
    isPending: false,
    error: null,
    reset: () => {},
  };
}

export function useSetPaymentToken() {
  return {
    setPaymentToken: (_jobId: bigint, _paymentToken: `0x${string}`) => {},
    hash: undefined,
    isPending: false,
    error: null,
    reset: () => {},
  };
}

export function useFundJobWithETH() {
  const { writeContract, data, isPending, error, reset } = useWriteContract();
  return {
    fundJob: (jobId: bigint, value: bigint, expectedBudget?: bigint) =>
      writeContract({
        address: AGENTIC_COMMERCE_ADDRESS,
        abi: AGENTIC_COMMERCE_ABI,
        functionName: 'fund',
        args: [jobId, expectedBudget ?? BigInt(0)],
        value,
      }),
    hash: data,
    isPending,
    error,
    reset,
  };
}

export function useCompleteAfterTimeout() {
  const { writeContract, data, isPending, error, reset } = useWriteContract();
  return {
    completeAfterTimeout: (jobId: bigint, reason: `0x${string}` = '0x' as `0x${string}`) =>
      writeContract({
        address: AGENTIC_COMMERCE_ADDRESS,
        abi: AGENTIC_COMMERCE_ABI,
        functionName: 'completeAfterTimeout',
        args: [jobId, reason],
      }),
    hash: data,
    isPending,
    error,
    reset,
  };
}

export function useRefundExpired() {
  const { writeContract, data, isPending, error, reset } = useWriteContract();
  return {
    refundExpired: (jobId: bigint) =>
      writeContract({
        address: AGENTIC_COMMERCE_ADDRESS,
        abi: AGENTIC_COMMERCE_ABI,
        functionName: 'refundExpired',
        args: [jobId],
      }),
    hash: data,
    isPending,
    error,
    reset,
  };
}

export function useCreateJobWithRandomEvaluator() {
  const { writeContract, data, isPending, error, reset } = useWriteContract();
  return {
    createJobWithRandomEvaluator: (
      provider: `0x${string}`,
      expiredAt: bigint,
      description: string,
      hook: `0x${string}` = '0x0000000000000000000000000000000000000000',
      evaluatorFee: boolean = false,
      clientReview: boolean = true
    ) =>
      writeContract({
        address: AGENTIC_COMMERCE_ADDRESS,
        abi: AGENTIC_COMMERCE_ABI,
        functionName: 'createJobWithRandomEvaluator',
        args: [provider, expiredAt, description, hook, evaluatorFee, clientReview],
      }),
    hash: data,
    isPending,
    error,
    reset,
  };
}

export function useCreateJobV8() {
  const { writeContract, data, isPending, error, reset } = useWriteContract();
  return {
    createJob: (
      provider: `0x${string}`,
      budget: bigint,
      paymentToken: `0x${string}`,
      serviceId: bigint,
      expiredAt: bigint,
      description: string,
      evaluator: `0x${string}`,
      hook: `0x${string}`,
      evaluatorFee: boolean,
      clientReview: boolean,
      fundNow: boolean,
      fundAmount: bigint
    ) =>
      writeContract({
        address: AGENTIC_COMMERCE_ADDRESS,
        abi: AGENTIC_COMMERCE_ABI,
        functionName: 'createJob',
        args: [provider, budget, paymentToken, serviceId, expiredAt, description, evaluator, hook, evaluatorFee, clientReview, fundNow, fundAmount],
        value: (fundNow && paymentToken === '0x0000000000000000000000000000000000000000') ? fundAmount : 0n,
      }),
    hash: data,
    isPending,
    error,
    reset,
  };
}

export function useCreateJobV7() {
  const { writeContract, data, isPending, error, reset } = useWriteContract();
  return {
    createJobV7: (
      provider: `0x${string}`,
      evaluator: `0x${string}`,
      expiredAt: bigint,
      description: string,
      hook: `0x${string}`,
      evaluatorFee: boolean,
      clientReview: boolean
    ) =>
      writeContract({
        address: AGENTIC_COMMERCE_ADDRESS,
        abi: AGENTIC_COMMERCE_ABI,
        functionName: 'createJobV7',
        args: [provider, evaluator, expiredAt, description, hook, evaluatorFee, clientReview],
      }),
    hash: data,
    isPending,
    error,
    reset,
  };
}

export function useRegisterAsEvaluator() {
  const { writeContract, data, isPending, error, reset } = useWriteContract();
  return {
    registerAsEvaluator: () =>
      writeContract({
        address: AGENTIC_COMMERCE_ADDRESS,
        abi: AGENTIC_COMMERCE_ABI,
        functionName: 'registerAsEvaluator',
        value: BigInt(0.01e18),
      }),
    hash: data,
    isPending,
    error,
    reset,
  };
}

export function useUnregisterAsEvaluator() {
  const { writeContract, data, isPending, error, reset } = useWriteContract();
  return {
    unregisterAsEvaluator: () =>
      writeContract({
        address: AGENTIC_COMMERCE_ADDRESS,
        abi: AGENTIC_COMMERCE_ABI,
        functionName: 'unregisterAsEvaluator',
      }),
    hash: data,
    isPending,
    error,
    reset,
  };
}

export function useEnableJobMilestones() {
  const { writeContract, data, isPending, error, reset } = useWriteContract();
  return {
    enableJobMilestones: (
      jobId: bigint,
      client: `0x${string}`,
      provider: `0x${string}`,
      paymentToken: `0x${string}`,
      totalBudget: bigint
    ) =>
      writeContract({
        address: getContractAddress('MILESTONE_ESCROW'),
        abi: MILESTONE_ESCROW_ABI,
        functionName: 'enableMilestones',
        args: [jobId, client, provider, paymentToken, totalBudget],
      }),
    hash: data,
    isPending,
    error,
    reset,
  };
}

export function useWithdrawStake() {
  const { writeContract, data, isPending, error, reset } = useWriteContract();
  return {
    withdrawStake: (sessionId: bigint) =>
      writeContract({
        address: getContractAddress('BIDDING_SYSTEM'),
        abi: BIDDING_SYSTEM_ABI,
        functionName: 'withdrawStake',
        args: [sessionId],
      }),
    hash: data,
    isPending,
    error,
    reset,
  };
}
