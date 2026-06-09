import { useReadContract, useReadContracts } from 'wagmi';
import { AGENTIC_COMMERCE_ABI, BIDDING_SYSTEM_ABI } from '@/lib/contracts/abis';
import { getContractAddress } from '@/lib/contracts/config';
import type { Job, JobStatusType, JobTypeType, Bid } from '@/lib/types/contracts';
import { JobStatus, JobType } from '@/lib/types/contracts';

const AGENTIC_COMMERCE_ADDRESS = getContractAddress('AGENTIC_COMMERCE');
const BIDDING_SYSTEM_ADDRESS = getContractAddress('BIDDING_SYSTEM');
const MAX_JOB_BATCH = 200;

export type { Job, JobStatusType, JobTypeType, Bid };
export { JobStatus, JobType };

interface JobStruct {
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

function mapJobData(data: unknown): Job | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const arr = data as unknown[];
  const isArray = Array.isArray(data);
  const jobStruct = isArray ? null : (data as JobStruct);
  const id = isArray ? arr[0] : jobStruct?.id;
  const client = isArray ? arr[1] : jobStruct?.client;
  if (!id || !client) return undefined;
  if (typeof client === 'string' && client === '0x0000000000000000000000000000000000000000') return undefined;
  return {
    id: (isArray ? arr[0] : jobStruct!.id) as bigint,
    client: (isArray ? arr[1] : jobStruct!.client) as `0x${string}`,
    provider: (isArray ? arr[2] : jobStruct!.provider) as `0x${string}`,
    evaluator: (isArray ? arr[3] : jobStruct!.evaluator) as `0x${string}`,
    serviceId: (isArray ? arr[4] : jobStruct!.serviceId) as bigint,
    paymentToken: (isArray ? arr[5] : jobStruct!.paymentToken) as `0x${string}`,
    description: (isArray ? arr[6] : jobStruct!.description) as string,
    budget: (isArray ? arr[7] : jobStruct!.budget) as bigint,
    expiredAt: (isArray ? arr[8] : jobStruct!.expiredAt) as bigint,
    status: (isArray ? arr[9] : jobStruct!.status) as number,
    hook: (isArray ? arr[10] : jobStruct!.hook) as `0x${string}`,
    deliverable: (isArray ? arr[11] : jobStruct!.deliverable) as `0x${string}`,
  };
}

export function useJob(jobId: number | bigint | undefined) {
  const id = jobId !== undefined ? (typeof jobId === 'bigint' ? jobId : BigInt(jobId)) : undefined;

  const { data, isLoading, error, refetch } = useReadContract({
    address: AGENTIC_COMMERCE_ADDRESS,
    abi: AGENTIC_COMMERCE_ABI,
    functionName: 'jobs',
    args: id !== undefined ? [id] : undefined,
    query: { retry: 2, staleTime: 10 * 1000, enabled: id !== undefined },
  });

  return { job: mapJobData(data), isLoading, error, refetch };
}

export function useJobs(start: number = 0, count: number = 20) {
  const { data: jobCounter } = useReadContract({
    address: AGENTIC_COMMERCE_ADDRESS,
    abi: AGENTIC_COMMERCE_ABI,
    functionName: 'jobCounter',
    query: { staleTime: 10 * 1000 },
  });

  const totalJobs = jobCounter ? Number(jobCounter) : 0;
  const safeCount = Math.min(count, MAX_JOB_BATCH);

  const jobQueries = [];
  const startId = totalJobs - start;
  const endId = Math.max(1, startId - safeCount + 1);

  if (totalJobs > 0 && startId >= 1) {
    for (let i = startId; i >= endId; i--) {
      jobQueries.push({
        address: AGENTIC_COMMERCE_ADDRESS,
        abi: AGENTIC_COMMERCE_ABI,
        functionName: 'jobs' as const,
        args: [BigInt(i)],
      });
    }
  }

  const { data: results, isLoading, error, refetch } = useReadContracts({
    contracts: jobQueries,
    query: { retry: 2, staleTime: 30 * 1000, enabled: jobQueries.length > 0 },
  });

  if (!results || results.length === 0) {
    return { jobs: [] as Job[], isLoading: isLoading || (!jobCounter && totalJobs === 0), error, refetch, totalCount: totalJobs };
  }

  const jobs: Job[] = [];
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === 'success') {
      const mapped = mapJobData(result.result);
      if (mapped) jobs.push(mapped);
    }
  }

  return { jobs, isLoading, error, refetch, totalCount: totalJobs };
}

export function useUserJobs(
  user: `0x${string}` | undefined,
  role: 'client' | 'provider' | 'evaluator' | 'all' = 'all'
) {
  const { jobs, isLoading, error, refetch } = useJobs(0, 100);

  if (!user) {
    return { jobs: [] as Job[], isLoading: false, error: null, refetch };
  }

  const filteredJobs = jobs.filter(job => {
    if (role === 'all') {
      return job.client === user || job.provider === user || job.evaluator === user;
    }
    return job[role] === user;
  });

  return { jobs: filteredJobs, isLoading, error, refetch };
}

export function useEvaluatorFeeEnabled(_jobId: bigint | undefined) {
  return { isEvaluatorFeeEnabled: false, isLoading: false, error: null, refetch: () => {} };
}

export function useJobBidCount(_jobId: bigint | undefined) {
  return { count: 0, isLoading: false, error: null, refetch: () => {} };
}

export function useUserBid(jobId: number | bigint | undefined, user: `0x${string}` | undefined) {
  const id = jobId !== undefined ? (typeof jobId === 'bigint' ? jobId : BigInt(jobId)) : undefined;

  const { data, isLoading, error, refetch } = useReadContract({
    address: BIDDING_SYSTEM_ADDRESS,
    abi: BIDDING_SYSTEM_ABI,
    functionName: 'getUserBid',
    args: id !== undefined && user !== undefined ? [id, user] : undefined,
    query: { enabled: id !== undefined && user !== undefined, retry: 2, staleTime: 10 * 1000 },
  });

  const bidData = data as Bid | undefined;
  const hasBid = bidData && typeof bidData === 'object' && 'bidId' in bidData && bidData.bidId > BigInt(0);

  return { bid: bidData, hasBid, isLoading, error, refetch };
}

export function useEvaluatorPoolSize() {
  const { data, isLoading, error, refetch } = useReadContract({
    address: AGENTIC_COMMERCE_ADDRESS,
    abi: AGENTIC_COMMERCE_ABI,
    functionName: 'getEvaluatorPoolSize',
    query: { retry: 2, staleTime: 60 * 1000 },
  });

  return { count: data ? Number(data) : 0, isLoading, error, refetch };
}

export function useEvaluatorStatus(address: `0x${string}` | undefined) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: AGENTIC_COMMERCE_ADDRESS,
    abi: AGENTIC_COMMERCE_ABI,
    functionName: 'isRegisteredEvaluator',
    args: address ? [address] : undefined,
    query: { retry: 2, staleTime: 60 * 1000, enabled: !!address },
  });

  return { isEvaluator: data || false, isLoading, error, refetch };
}

// Phase 47: check if evaluator is assigned to any active job (Funded, Submitted, PendingClientApproval)
const ACTIVE_EVALUATOR_STATUSES: number[] = [JobStatus.Funded, JobStatus.Submitted, JobStatus.PendingClientApproval];

export function useHasActiveEvaluatorJobs(address: `0x${string}` | undefined) {
  const { jobs, isLoading, error, refetch } = useUserJobs(address, 'evaluator');

  const hasActive = jobs.some(job => ACTIVE_EVALUATOR_STATUSES.includes(job.status));

  return { hasActiveEvaluatorJobs: hasActive, isLoading, error, refetch };
}
