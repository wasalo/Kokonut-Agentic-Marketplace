import { useReadContract } from 'wagmi';
import { CONTRACT_ADDRESSES, getContractAddress } from '@/lib/contracts/config';
import { AGENTIC_COMMERCE_ABI } from '@/lib/contracts/abis';

const AGENTIC_COMMERCE_ADDRESS = getContractAddress(
  process.env.NEXT_PUBLIC_AGENTIC_COMMERCE_ADDRESS,
  CONTRACT_ADDRESSES.sepolia.agenticCommerce
);

export const MAX_JOBS_PER_CLIENT = 100;

export interface ClientJobCountResult {
  count: number;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  remainingJobs: number;
  isAtLimit: boolean;
  isNearLimit: boolean;
  percentageUsed: number;
}

export function useClientJobCount(clientAddress: `0x${string}` | undefined): ClientJobCountResult {
  const { data, isLoading, error, refetch } = useReadContract({
    address: AGENTIC_COMMERCE_ADDRESS,
    abi: AGENTIC_COMMERCE_ABI,
    functionName: 'getClientJobCount',
    args: clientAddress ? [clientAddress] : undefined,
    query: {
      enabled: !!clientAddress,
      retry: 2,
      staleTime: 30000,
    },
  });

  const count = data ? Number(data) : 0;
  const remainingJobs = Math.max(0, MAX_JOBS_PER_CLIENT - count);
  const isAtLimit = count >= MAX_JOBS_PER_CLIENT;
  const isNearLimit = count >= MAX_JOBS_PER_CLIENT * 0.8;
  const percentageUsed = Math.min(100, (count / MAX_JOBS_PER_CLIENT) * 100);

  return {
    count,
    isLoading,
    error: error as Error | null,
    refetch,
    remainingJobs,
    isAtLimit,
    isNearLimit,
    percentageUsed,
  };
}

export default useClientJobCount;
