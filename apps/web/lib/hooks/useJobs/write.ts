import { useWriteContract } from 'wagmi';
import { AGENTIC_COMMERCE_ABI, BIDDING_SYSTEM_ABI } from '@/lib/contracts/abis';
import { getContractAddress, SEPOLIA_CHAIN_ID } from '@/lib/contracts/config';

const AGENTIC_COMMERCE_ADDRESS = getContractAddress('AGENTIC_COMMERCE');

export function useFundJob() {
  const { writeContract, data, isPending, error, reset } = useWriteContract();
  return {
    fundJob: (jobId: bigint, expectedBudget?: bigint) =>
      writeContract({
        chainId: SEPOLIA_CHAIN_ID,
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
        chainId: SEPOLIA_CHAIN_ID,
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
        chainId: SEPOLIA_CHAIN_ID,
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
        chainId: SEPOLIA_CHAIN_ID,
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
        chainId: SEPOLIA_CHAIN_ID,
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
        chainId: SEPOLIA_CHAIN_ID,
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
        chainId: SEPOLIA_CHAIN_ID,
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

export function useSetPaymentToken() {
  const { writeContract, data, isPending, error, reset } = useWriteContract();
  return {
    setPaymentToken: (jobId: bigint, paymentToken: `0x${string}`) =>
      writeContract({
        chainId: SEPOLIA_CHAIN_ID,
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

export function useCompleteAfterTimeout() {
  const { writeContract, data, isPending, error, reset } = useWriteContract();
  return {
    completeAfterTimeout: (jobId: bigint, reason: `0x${string}` = '0x' as `0x${string}`) =>
      writeContract({
        chainId: SEPOLIA_CHAIN_ID,
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
        chainId: SEPOLIA_CHAIN_ID,
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
        chainId: SEPOLIA_CHAIN_ID,
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

export function useRegisterAsEvaluator() {
  const { writeContract, data, isPending, error, reset } = useWriteContract();
  return {
    registerAsEvaluator: () =>
      writeContract({
        chainId: SEPOLIA_CHAIN_ID,
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
        chainId: SEPOLIA_CHAIN_ID,
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

export function useWithdrawStake() {
  const { writeContract, data, isPending, error, reset } = useWriteContract();
  return {
    withdrawStake: (sessionId: bigint) =>
      writeContract({
        chainId: SEPOLIA_CHAIN_ID,
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

export function useFinalizeRandomEvaluator() {
  const { writeContract, data, isPending, error, reset } = useWriteContract();
  return {
    finalizeRandomEvaluator: (jobId: bigint) =>
      writeContract({
        chainId: SEPOLIA_CHAIN_ID,
        address: AGENTIC_COMMERCE_ADDRESS,
        abi: AGENTIC_COMMERCE_ABI,
        functionName: 'finalizeRandomEvaluator',
        args: [jobId],
      }),
    hash: data,
    isPending,
    error,
    reset,
  };
}
