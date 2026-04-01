import { useReadContract, useReadContracts, useWriteContract } from 'wagmi';
import { AGENTIC_COMMERCE_ABI } from '@/lib/contracts/abis';
import { CONTRACT_ADDRESSES, getContractAddress, debugLog } from '@/lib/contracts/config';

const AGENTIC_COMMERCE_ADDRESS = getContractAddress(
  process.env.NEXT_PUBLIC_AGENTIC_COMMERCE_ADDRESS,
  CONTRACT_ADDRESSES.sepolia.agenticCommerce
);

export interface Job {
  id: bigint;
  client: `0x${string}`;
  provider: `0x${string}`;
  evaluator: `0x${string}`;
  serviceId: bigint;
  paymentToken: `0x${string}`;
  description: string;
  budget: bigint;
  expiredAt: bigint;
  status: number;
  hook: `0x${string}`;
  deliverable: `0x${string}`;
}

export const JobStatus = {
  Open: 0,
  Funded: 1,
  Submitted: 2,
  Completed: 3,
  Rejected: 4,
  Expired: 5,
} as const;

export type JobStatusType = (typeof JobStatus)[keyof typeof JobStatus];

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
    job: data as Job | undefined,
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

export function useCreateJobFromService() {
  const { writeContract, data, isPending, error, reset } = useWriteContract();
  return {
    createJobFromService: (
      serviceId: bigint,
      evaluator: `0x${string}`,
      expiredAt: bigint,
      description: string
    ) =>
      writeContract({
        address: AGENTIC_COMMERCE_ADDRESS,
        abi: AGENTIC_COMMERCE_ABI,
        functionName: 'createJobFromService',
        args: [serviceId, evaluator, expiredAt, description],
      }),
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
      description: string
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
