import { useMemo } from 'react';
import { useUserJobsFromEvents } from './useJobsEvents';

// From AGENTIC_COMMERCE_V4 contract
export const MAX_JOBS_PER_CLIENT = 100;

export interface ClientJobCountResult {
  count: number;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  // Helper properties
  remainingJobs: number;
  isAtLimit: boolean;
  isNearLimit: boolean;
  percentageUsed: number;
}

/**
 * Hook to get the number of jobs created by a client
 * Used for job limit warnings (MAX_JOBS_PER_CLIENT = 100)
 *
 * Note: This counts jobs where the user is the client
 */
export function useClientJobCount(clientAddress: `0x${string}` | undefined): ClientJobCountResult {
  const { jobs, isLoading, error, refetch } = useUserJobsFromEvents(clientAddress);

  // Count only jobs where user is the client
  const count = useMemo(() => {
    if (!clientAddress || !jobs) return 0;
    return jobs.filter(job => job.client.toLowerCase() === clientAddress.toLowerCase()).length;
  }, [jobs, clientAddress]);

  const remainingJobs = Math.max(0, MAX_JOBS_PER_CLIENT - count);
  const isAtLimit = count >= MAX_JOBS_PER_CLIENT;
  const isNearLimit = count >= MAX_JOBS_PER_CLIENT * 0.8; // 80% threshold
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
