import { useEffect, useRef, useCallback } from 'react';
import { useWatchContractEvent } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { AGENTIC_COMMERCE_ABI } from '@/lib/contracts/abis';
import { CONTRACT_ADDRESSES } from '@/lib/contracts/config';

const AGENTIC_COMMERCE_ADDRESS = CONTRACT_ADDRESSES.sepolia.agenticCommerce;

/**
 * Hook to watch job events
 * Uses 30-second polling interval via wagmi's built-in polling
 */
export function useJobEvents(jobId?: bigint) {
  const queryClient = useQueryClient();

  // Watch JobCreated events
  useWatchContractEvent({
    address: AGENTIC_COMMERCE_ADDRESS,
    abi: AGENTIC_COMMERCE_ABI,
    eventName: 'JobCreated',
    onLogs: logs => {
      logs.forEach((log: any) => {
        const jobId = log.args?.jobId;
        console.log('[Events] Job created:', jobId);

        // Invalidate jobs list
        queryClient.invalidateQueries({ queryKey: ['jobs'] });
        queryClient.invalidateQueries({ queryKey: ['userJobs'] });
      });
    },
  });

  // Watch JobStatusChanged events
  useWatchContractEvent({
    address: AGENTIC_COMMERCE_ADDRESS,
    abi: AGENTIC_COMMERCE_ABI,
    eventName: 'JobStatusChanged',
    onLogs: logs => {
      logs.forEach((log: any) => {
        const jobId = log.args?.jobId;
        const oldStatus = log.args?.oldStatus;
        const newStatus = log.args?.newStatus;

        console.log('[Events] Job status changed:', {
          jobId: jobId?.toString(),
          oldStatus,
          newStatus,
        });

        // Invalidate specific job and lists
        if (jobId) {
          queryClient.invalidateQueries({ queryKey: ['job', jobId.toString()] });
        }
        queryClient.invalidateQueries({ queryKey: ['jobs'] });
      });
    },
  });

  // Watch JobFunded events
  useWatchContractEvent({
    address: AGENTIC_COMMERCE_ADDRESS,
    abi: AGENTIC_COMMERCE_ABI,
    eventName: 'JobFunded',
    onLogs: logs => {
      logs.forEach((log: any) => {
        const jobId = log.args?.jobId;
        const amount = log.args?.amount;

        console.log('[Events] Job funded:', {
          jobId: jobId?.toString(),
          amount: amount?.toString(),
        });

        if (jobId) {
          queryClient.invalidateQueries({ queryKey: ['job', jobId.toString()] });
        }
      });
    },
  });

  // Watch PaymentReleased events
  useWatchContractEvent({
    address: AGENTIC_COMMERCE_ADDRESS,
    abi: AGENTIC_COMMERCE_ABI,
    eventName: 'PaymentReleased',
    onLogs: logs => {
      logs.forEach((log: any) => {
        const jobId = log.args?.jobId;
        const amount = log.args?.amount;

        console.log('[Events] Payment released:', {
          jobId: jobId?.toString(),
          amount: amount?.toString(),
        });

        if (jobId) {
          queryClient.invalidateQueries({ queryKey: ['job', jobId.toString()] });
          queryClient.invalidateQueries({ queryKey: ['jobs'] });
        }
      });
    },
  });
}

/**
 * Hook to watch specific job for real-time updates
 */
export function useWatchJob(jobId: bigint) {
  const queryClient = useQueryClient();

  useWatchContractEvent({
    address: AGENTIC_COMMERCE_ADDRESS,
    abi: AGENTIC_COMMERCE_ABI,
    eventName: 'JobStatusChanged',
    onLogs: logs => {
      logs.forEach((log: any) => {
        const eventJobId = log.args?.jobId;
        if (eventJobId === jobId) {
          queryClient.invalidateQueries({ queryKey: ['job', jobId.toString()] });
        }
      });
    },
  });
}

/**
 * Hook to watch job limit exceeded warnings
 */
export function useJobLimitWarnings(userAddress?: string) {
  useWatchContractEvent({
    address: AGENTIC_COMMERCE_ADDRESS,
    abi: AGENTIC_COMMERCE_ABI,
    eventName: 'JobLimitExceeded',
    onLogs: logs => {
      logs.forEach((log: any) => {
        const client = log.args?.client;
        const attemptedCount = log.args?.attemptedCount;
        const maxAllowed = log.args?.maxAllowed;

        console.warn('[Events] Job limit exceeded:', {
          client,
          attemptedCount: attemptedCount?.toString(),
          maxAllowed: maxAllowed?.toString(),
        });
      });
    },
  });
}
