
import { useWatchContractEvent } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { AGENTIC_COMMERCE_ABI } from '@/lib/contracts/abis';
import { CONTRACT_ADDRESSES } from '@/lib/contracts/config';
import { debugLog, debugError } from '@/lib/debug';

/* eslint-disable @typescript-eslint/no-explicit-any */

const AGENTIC_COMMERCE_ADDRESS = CONTRACT_ADDRESSES.sepolia.agenticCommerce;

function invalidateJobQueries(queryClient: any, jobId: bigint) {
  if (jobId) {
    queryClient.invalidateQueries({ queryKey: ['job', jobId.toString()] });
  }
  queryClient.invalidateQueries({ queryKey: ['jobs'] });
  queryClient.invalidateQueries({ queryKey: ['userJobs'] });
}

/**
 * Hook to watch all job events for real-time updates
 * Watches 16 job lifecycle events including bids
 */
export function useJobEvents(_jobId?: bigint) {
  const queryClient = useQueryClient();

  // Watch JobCreated events
  useWatchContractEvent({
    address: AGENTIC_COMMERCE_ADDRESS,
    abi: AGENTIC_COMMERCE_ABI,
    eventName: 'JobCreated',
    onLogs: logs => {
      logs.forEach((log: any) => {
        const jobId = log.args?.jobId;
        debugLog('hooks', 'Job created:', jobId?.toString());
        invalidateJobQueries(queryClient, jobId);
      });
    },
  });

  // Watch OpenJobCreated events
  useWatchContractEvent({
    address: AGENTIC_COMMERCE_ADDRESS,
    abi: AGENTIC_COMMERCE_ABI,
    eventName: 'OpenJobCreated',
    onLogs: logs => {
      logs.forEach((log: any) => {
        const jobId = log.args?.jobId;
        debugLog('hooks', 'Open job created:', jobId?.toString());
        invalidateJobQueries(queryClient, jobId);
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

        debugLog('hooks', 'Job status changed:', {
          jobId: jobId?.toString(),
          oldStatus,
          newStatus,
        });

        invalidateJobQueries(queryClient, jobId);
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
        debugLog('[Events] Job funded:', jobId?.toString());
        invalidateJobQueries(queryClient, jobId);
      });
    },
  });

  // Watch JobSubmitted events
  useWatchContractEvent({
    address: AGENTIC_COMMERCE_ADDRESS,
    abi: AGENTIC_COMMERCE_ABI,
    eventName: 'JobSubmitted',
    onLogs: logs => {
      logs.forEach((log: any) => {
        const jobId = log.args?.jobId;
        debugLog('[Events] Job submitted:', jobId?.toString());
        invalidateJobQueries(queryClient, jobId);
      });
    },
  });

  // Watch JobCompleted events
  useWatchContractEvent({
    address: AGENTIC_COMMERCE_ADDRESS,
    abi: AGENTIC_COMMERCE_ABI,
    eventName: 'JobCompleted',
    onLogs: logs => {
      logs.forEach((log: any) => {
        const jobId = log.args?.jobId;
        debugLog('[Events] Job completed:', jobId?.toString());
        invalidateJobQueries(queryClient, jobId);
      });
    },
  });

  // Watch JobRejected events
  useWatchContractEvent({
    address: AGENTIC_COMMERCE_ADDRESS,
    abi: AGENTIC_COMMERCE_ABI,
    eventName: 'JobRejected',
    onLogs: logs => {
      logs.forEach((log: any) => {
        const jobId = log.args?.jobId;
        debugLog('[Events] Job rejected:', jobId?.toString());
        invalidateJobQueries(queryClient, jobId);
      });
    },
  });

  // Watch JobExpired events
  useWatchContractEvent({
    address: AGENTIC_COMMERCE_ADDRESS,
    abi: AGENTIC_COMMERCE_ABI,
    eventName: 'JobExpired',
    onLogs: logs => {
      logs.forEach((log: any) => {
        const jobId = log.args?.jobId;
        debugLog('[Events] Job expired:', jobId?.toString());
        invalidateJobQueries(queryClient, jobId);
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
        debugLog('[Events] Payment released:', jobId?.toString());
        invalidateJobQueries(queryClient, jobId);
      });
    },
  });

  // Watch Refunded events
  useWatchContractEvent({
    address: AGENTIC_COMMERCE_ADDRESS,
    abi: AGENTIC_COMMERCE_ABI,
    eventName: 'Refunded',
    onLogs: logs => {
      logs.forEach((log: any) => {
        const jobId = log.args?.jobId;
        debugLog('[Events] Job refunded:', jobId?.toString());
        invalidateJobQueries(queryClient, jobId);
      });
    },
  });

  // Watch ProviderSet events
  useWatchContractEvent({
    address: AGENTIC_COMMERCE_ADDRESS,
    abi: AGENTIC_COMMERCE_ABI,
    eventName: 'ProviderSet',
    onLogs: logs => {
      logs.forEach((log: any) => {
        const jobId = log.args?.jobId;
        debugLog('[Events] Provider set:', jobId?.toString());
        invalidateJobQueries(queryClient, jobId);
      });
    },
  });

  // Watch BudgetSet events
  useWatchContractEvent({
    address: AGENTIC_COMMERCE_ADDRESS,
    abi: AGENTIC_COMMERCE_ABI,
    eventName: 'BudgetSet',
    onLogs: logs => {
      logs.forEach((log: any) => {
        const jobId = log.args?.jobId;
        debugLog('[Events] Budget set:', jobId?.toString());
        invalidateJobQueries(queryClient, jobId);
      });
    },
  });

  // Watch BidCommitted events
  useWatchContractEvent({
    address: AGENTIC_COMMERCE_ADDRESS,
    abi: AGENTIC_COMMERCE_ABI,
    eventName: 'BidCommitted',
    onLogs: logs => {
      logs.forEach((log: any) => {
        const jobId = log.args?.jobId;
        debugLog('[Events] Bid committed:', jobId?.toString());
        invalidateJobQueries(queryClient, jobId);
      });
    },
  });

  // Watch BidRevealed events
  useWatchContractEvent({
    address: AGENTIC_COMMERCE_ADDRESS,
    abi: AGENTIC_COMMERCE_ABI,
    eventName: 'BidRevealed',
    onLogs: logs => {
      logs.forEach((log: any) => {
        const jobId = log.args?.jobId;
        debugLog('[Events] Bid revealed:', jobId?.toString());
        invalidateJobQueries(queryClient, jobId);
      });
    },
  });

  // Watch BidAccepted events
  useWatchContractEvent({
    address: AGENTIC_COMMERCE_ADDRESS,
    abi: AGENTIC_COMMERCE_ABI,
    eventName: 'BidAccepted',
    onLogs: logs => {
      logs.forEach((log: any) => {
        const jobId = log.args?.jobId;
        debugLog('[Events] Bid accepted:', jobId?.toString());
        invalidateJobQueries(queryClient, jobId);
      });
    },
  });

  // Watch StakesReturned events
  useWatchContractEvent({
    address: AGENTIC_COMMERCE_ADDRESS,
    abi: AGENTIC_COMMERCE_ABI,
    eventName: 'StakesReturned',
    onLogs: logs => {
      logs.forEach((log: any) => {
        const jobId = log.args?.jobId;
        debugLog('[Events] Stakes returned:', jobId?.toString());
        invalidateJobQueries(queryClient, jobId);
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
export function useJobLimitWarnings(_userAddress?: string) {
  useWatchContractEvent({
    address: AGENTIC_COMMERCE_ADDRESS,
    abi: AGENTIC_COMMERCE_ABI,
    eventName: 'JobLimitExceeded',
    onLogs: logs => {
      logs.forEach((log: any) => {
        const client = log.args?.client;
        const attemptedCount = log.args?.attemptedCount;
        const maxAllowed = log.args?.maxAllowed;

        debugLog('hooks', 'Job limit exceeded:', {
          client,
          attemptedCount: attemptedCount?.toString(),
          maxAllowed: maxAllowed?.toString(),
        });
      });
    },
  });
}
