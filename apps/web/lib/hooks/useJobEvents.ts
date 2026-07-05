
import { useWatchContractEvent } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { AGENTIC_COMMERCE_EVENTS } from '@/lib/contracts/abis';
import { CONTRACT_ADDRESSES } from '@/lib/contracts/config';
import { debugLog } from '@/lib/debug';

const AGENTIC_COMMERCE_ADDRESS = CONTRACT_ADDRESSES.sepolia.agenticCommerce;

function invalidateJobQueries(queryClient: any, jobId: bigint | undefined) {
  if (jobId) {
    queryClient.invalidateQueries({ queryKey: ['job', jobId.toString()] });
  }
  queryClient.invalidateQueries({ queryKey: ['jobs'] });
  queryClient.invalidateQueries({ queryKey: ['userJobs'] });
}

const JOB_LIFECYCLE_EVENTS = new Set([
  'JobCreated',
  'JobStatusChanged',
  'JobFunded',
  'JobSubmitted',
  'JobCompleted',
  'JobRejected',
  'JobExpired',
  'PaymentReleased',
  'Refunded',
  'PermissionlessRefund',
]);

/**
 * Hook to watch all job events for real-time updates
 * Single subscription over the events ABI dispatches per-event invalidation.
 */
export function useJobEvents() {
  const queryClient = useQueryClient();

  useWatchContractEvent({
    address: AGENTIC_COMMERCE_ADDRESS,
    abi: AGENTIC_COMMERCE_EVENTS,
    onLogs: logs => {
      for (const log of logs as Array<{ eventName?: string; args?: { jobId?: bigint } }>) {
        if (!log.eventName) continue;
        if (!JOB_LIFECYCLE_EVENTS.has(log.eventName)) continue;
        const jobId = log.args?.jobId;
        debugLog('hooks', `Job event ${log.eventName}:`, jobId?.toString());
        invalidateJobQueries(queryClient, jobId);
      }
    },
  });
}

/**
 * Hook to watch a specific job for real-time updates.
 * Invalidation is scoped to the requested jobId; other events are ignored.
 */
export function useWatchJob(jobId: bigint) {
  const queryClient = useQueryClient();

  useWatchContractEvent({
    address: AGENTIC_COMMERCE_ADDRESS,
    abi: AGENTIC_COMMERCE_EVENTS,
    onLogs: logs => {
      for (const log of logs as Array<{ eventName?: string; args?: { jobId?: bigint } }>) {
        if (!log.eventName) continue;
        if (!JOB_LIFECYCLE_EVENTS.has(log.eventName)) continue;
        const eventJobId = log.args?.jobId;
        if (eventJobId !== undefined && eventJobId === jobId) {
          queryClient.invalidateQueries({ queryKey: ['job', jobId.toString()] });
        }
      }
    },
  });
}

/**
 * Hook to watch job limit exceeded warnings.
 * Single subscription only — no per-event dispatcher needed.
 */
export function useJobLimitWarnings() {
  useWatchContractEvent({
    address: AGENTIC_COMMERCE_ADDRESS,
    abi: AGENTIC_COMMERCE_EVENTS,
    eventName: 'JobLimitExceeded',
    onLogs: logs => {
      for (const log of logs as Array<{ args?: { client: string; attemptedCount: bigint; maxAllowed: bigint } }>) {
        debugLog('hooks', 'Job limit exceeded:', {
          client: log.args?.client,
          attemptedCount: log.args?.attemptedCount?.toString(),
          maxAllowed: log.args?.maxAllowed?.toString(),
        });
      }
    },
  });
}
