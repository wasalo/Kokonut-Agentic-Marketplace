'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePublicClient } from 'wagmi';
import { parseAbiItem } from 'viem';
import { getContractAddress, debugLog, DEFAULT_FROM_BLOCK } from '@/lib/contracts/config';
import { AGENTIC_COMMERCE_ABI } from '@/lib/contracts/abis';

const AGENTIC_COMMERCE_ADDRESS = getContractAddress('AGENTIC_COMMERCE');

// From block 9989393 as specified by user
const FROM_BLOCK = DEFAULT_FROM_BLOCK;

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

/**
 * Fetch jobs using event logs
 */
export function useJobsFromEvents() {
  const publicClient = usePublicClient();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchJobs = useCallback(async () => {
    if (!publicClient) return;

    setIsLoading(true);
    setError(null);

    try {
      debugLog('contracts', 'Fetching jobs from events...');

      // Query JobCreated events
      // Note: Contract emits 6 parameters: jobId, client, provider, evaluator, serviceId, expiredAt
      // Only first 3 are indexed
      const logs = await publicClient.getLogs({
        address: AGENTIC_COMMERCE_ADDRESS,
        event: parseAbiItem(
          'event JobCreated(uint256 indexed jobId, address indexed client, address indexed provider, uint256 serviceId, uint256 expiredAt)'
        ),
        fromBlock: FROM_BLOCK,
        toBlock: 'latest',
      });

      debugLog('contracts', `Found ${logs.length} job creation events`);

      if (logs.length === 0) {
        setJobs([]);
        setIsLoading(false);
        return;
      }

      // Get unique job IDs
      const jobIds = [...new Set(logs.map(log => log.args.jobId))].filter(Boolean);

      // Batch fetch job details using multicall
      const calls = jobIds.map(id => ({
        address: AGENTIC_COMMERCE_ADDRESS,
        abi: AGENTIC_COMMERCE_ABI,
        functionName: 'getJob' as const,
        args: [id],
      }));

      const results = await publicClient.multicall({ contracts: calls });

      const fetchedJobs: Job[] = [];

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (result.status === 'success' && result.result) {
          const data = result.result as any;
          fetchedJobs.push({
            id: data.id || jobIds[i],
            client: data.client,
            provider: data.provider,
            evaluator: data.evaluator,
            serviceId: data.serviceId,
            paymentToken: data.paymentToken,
            description: data.description || '',
            budget: data.budget || BigInt(0),
            expiredAt: data.expiredAt || BigInt(0),
            status: Number(data.status) || 0,
            hook: data.hook || '0x0000000000000000000000000000000000000000',
            deliverable: data.deliverable || '',
          });
        }
      }

      // Sort by ID descending (newest first)
      fetchedJobs.sort((a, b) => Number(b.id) - Number(a.id));

      debugLog('contracts', `Loaded ${fetchedJobs.length} jobs`);
      setJobs(fetchedJobs);
    } catch (err) {
      console.error('Error fetching jobs:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch jobs'));
    } finally {
      setIsLoading(false);
    }
  }, [publicClient]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  return { jobs, isLoading, error, refetch: fetchJobs };
}

/**
 * Get jobs for a specific user (as client or provider)
 */
export function useUserJobsFromEvents(userAddress: `0x${string}` | undefined) {
  const { jobs, isLoading, error, refetch } = useJobsFromEvents();

  const userJobs = jobs.filter(
    job =>
      userAddress &&
      (job.client.toLowerCase() === userAddress.toLowerCase() ||
        job.provider.toLowerCase() === userAddress.toLowerCase())
  );

  return { jobs: userJobs, isLoading, error, refetch };
}

/**
 * Get count of all jobs
 */
export function useJobCountFromEvents() {
  const { jobs, isLoading, error } = useJobsFromEvents();

  return { count: jobs.length, isLoading, error };
}

// ============ Utility Functions ============

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
