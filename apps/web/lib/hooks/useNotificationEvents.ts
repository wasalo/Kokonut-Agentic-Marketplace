'use client';

import { useEffect, useCallback, useRef } from 'react';
import { usePublicClient, useAccount } from 'wagmi';
import { parseAbiItem, type Address, type Log } from 'viem';
import { getContractAddress, debugLog, DEFAULT_FROM_BLOCK } from '@/lib/contracts/config';
import { AGENTIC_COMMERCE_ABI } from '@/lib/contracts/abis';
import { graphqlQuery } from '@/lib/graphql/client';
import { GET_ACTIVITY_ALL } from '@/lib/graphql/queries/activity';
import { useNotifications } from '@/lib/hooks/useNotifications';
import { triggerWebhooks } from '@/lib/webhooks/trigger';
import { sendNotificationEmail } from '@/lib/emails/notification-bridge';
import { withRetry } from '@/lib/utils/retry';
import { useNetworkStatus } from '@/lib/hooks/useNetworkStatus';
import { formatAmount, getTokenByAddress } from '@/lib/tokenUtils';

const CONTRACTS = {
  AGENTIC_COMMERCE: getContractAddress('AGENTIC_COMMERCE'),
  SERVICE_REGISTRY: getContractAddress('SERVICE_REGISTRY'),
  MILESTONE_ESCROW: getContractAddress('MILESTONE_ESCROW'),
} as const;

const STORAGE_KEY = 'kokonut_last_notification_block';

function getLastProcessedBlock(): bigint {
  if (typeof window === 'undefined') return DEFAULT_FROM_BLOCK;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? BigInt(stored) : DEFAULT_FROM_BLOCK;
  } catch {
    return DEFAULT_FROM_BLOCK;
  }
}

function setLastProcessedBlock(block: bigint): boolean {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(STORAGE_KEY, block.toString());
    return true;
  } catch {
    return false;
  }
}

interface NotificationAction {
  type: 'job' | 'service' | 'payment' | 'system';
  action: string;
  title: string;
  message: string;
  link: string;
  metadata?: Record<string, string>;
  persistent?: boolean;
}

interface EventHandler {
  notification?: (args: Record<string, unknown>, userAddress: Address | undefined) => NotificationAction | null;
  webhook?: (args: Record<string, unknown>) => { event: string; data: Record<string, unknown> } | null;
}

function sameAddress(a: unknown, b: string | undefined): boolean {
  return typeof a === 'string' && !!b && a.toLowerCase() === b.toLowerCase();
}

function formatEventAmount(args: Record<string, unknown>, key: string): string {
  const rawAmount = args[key];
  const amount = typeof rawAmount === 'bigint'
    ? rawAmount
    : BigInt(String(rawAmount ?? 0));
  const token = getTokenByAddress(args.paymentToken as string | undefined);
  return formatAmount(amount, token, {
    includeSymbol: true,
    minFractionDigits: token.symbol === 'USDC' ? 2 : 0,
    maxFractionDigits: token.symbol === 'USDC' ? 2 : 6,
  });
}

const EVENT_HANDLERS: Record<string, EventHandler> = {
  JobCreated: {
    notification: (args, userAddress) =>
      sameAddress(args.client, userAddress)
        ? { type: 'job', action: 'job.needs_funding', title: 'Job Created', message: `Job #${args.jobId} is ready for funding (${formatEventAmount(args, 'budget')})`, link: `/jobs/${args.jobId}`, metadata: { jobId: String(args.jobId), amount: String(args.budget ?? 0) } }
        : sameAddress(args.provider, userAddress)
        ? { type: 'job', action: 'job.assigned', title: 'New Job Assigned', message: `Job #${args.jobId} was created for you`, link: `/jobs/${args.jobId}`, metadata: { jobId: String(args.jobId), amount: String(args.budget ?? 0) } }
        : null,
    webhook: (args) => ({ event: 'job.created', data: { jobId: String(args.jobId), client: args.client, provider: args.provider } }),
  },
  JobFunded: {
    notification: (args, userAddress) =>
      sameAddress(args.provider, userAddress)
        ? { type: 'job', action: 'job.ready_to_work', title: 'Funded Job Ready', message: `Job #${args.jobId} escrow is funded with ${formatEventAmount(args, 'amount')}`, link: `/jobs/${args.jobId}`, metadata: { jobId: String(args.jobId), amount: String(args.amount) } }
        : sameAddress(args.client, userAddress)
        ? { type: 'job', action: 'job.funded', title: 'Escrow Funded', message: `Job #${args.jobId} is funded with ${formatEventAmount(args, 'amount')}`, link: `/jobs/${args.jobId}`, metadata: { jobId: String(args.jobId), amount: String(args.amount) } }
        : null,
    webhook: (args) => ({ event: 'job.funded', data: { jobId: String(args.jobId), amount: String(args.amount) } }),
  },
  JobSubmitted: {
    notification: (args, userAddress) =>
      sameAddress(args.client, userAddress)
        ? { type: 'job', action: 'job.awaiting_review', title: 'Deliverable Awaiting Review', message: `Job #${args.jobId} has a deliverable ready for approval`, link: `/jobs/${args.jobId}`, metadata: { jobId: String(args.jobId) } }
        : null,
    webhook: (args) => ({ event: 'job.submitted', data: { jobId: String(args.jobId), deliverable: args.deliverable } }),
  },
  JobCompleted: {
    notification: (args, userAddress) =>
      sameAddress(args.client, userAddress)
        ? { type: 'job', action: 'job.completed', title: 'Job Completed', message: `Job #${args.jobId} has been completed`, link: `/jobs/${args.jobId}`, metadata: { jobId: String(args.jobId) }, persistent: true }
        : null,
    webhook: (args) => ({ event: 'job.completed', data: { jobId: String(args.jobId), provider: args.provider, completedBy: args.by } }),
  },
  JobRejected: {
    notification: (args, userAddress) =>
      sameAddress(args.provider, userAddress)
        ? { type: 'job', action: 'job.rejected', title: 'Job Rejected', message: `Job #${args.jobId} was rejected`, link: `/jobs/${args.jobId}`, metadata: { jobId: String(args.jobId), reason: String(args.reason || 'No reason provided') } }
        : null,
    webhook: (args) => ({ event: 'job.rejected', data: { jobId: String(args.jobId), reason: String(args.reason || 'No reason provided') } }),
  },
  JobExpired: {
    notification: (args, userAddress) =>
      sameAddress(args.client, userAddress)
        ? { type: 'job', action: 'job.expired', title: 'Job Expired', message: `Job #${args.jobId} has expired`, link: `/jobs/${args.jobId}`, metadata: { jobId: String(args.jobId) } }
        : null,
    webhook: (args) => ({ event: 'job.expired', data: { jobId: String(args.jobId) } }),
  },
  PaymentReleased: {
    notification: (args, userAddress) =>
      sameAddress(args.provider, userAddress)
        ? { type: 'payment', action: 'payment.received', title: 'Payment Released', message: `${formatEventAmount(args, 'providerAmount')} released for job #${args.jobId}`, link: `/jobs/${args.jobId}`, metadata: { jobId: String(args.jobId), amount: String(args.providerAmount) } }
        : null,
    webhook: (args) => ({ event: 'payment.received', data: { jobId: String(args.jobId), amount: String(args.providerAmount), recipient: args.provider } }),
  },
  ServiceCreated: {
    notification: (args, userAddress) =>
      args.provider && userAddress && (args.provider as string).toLowerCase() === userAddress.toLowerCase()
        ? { type: 'service', action: 'service.created', title: 'Service Created', message: `Your service "${args.name}" is now live`, link: `/marketplace/${args.serviceId}`, metadata: { serviceId: String(args.serviceId), name: String(args.name) } }
        : null,
    webhook: (args) => ({ event: 'service.created', data: { serviceId: String(args.serviceId), provider: args.provider, agentId: String(args.agentId || 0), name: args.name, price: String(args.price) } }),
  },
};

const EVENT_ABI_ITEMS = {
  jobCreated: parseAbiItem('event JobCreated(uint256 indexed jobId, address indexed client, address provider, uint256 budget, uint256 expiredAt, bool evaluatorFee, bool clientReview, bool randomEvaluator)'),
  jobFunded: parseAbiItem('event JobFunded(uint256 indexed jobId, address indexed client, uint256 amount)'),
  jobSubmitted: parseAbiItem('event JobSubmitted(uint256 indexed jobId, address indexed provider, bytes32 deliverable)'),
  jobCompleted: parseAbiItem('event JobCompleted(uint256 indexed jobId, address indexed by, address indexed provider, uint256 evaluatorFee)'),
  jobRejected: parseAbiItem('event JobRejected(uint256 indexed jobId, address indexed rejector, bytes32 reason)'),
  jobExpired: parseAbiItem('event JobExpired(uint256 indexed jobId)'),
  paymentReleased: parseAbiItem('event PaymentReleased(uint256 indexed jobId, uint256 providerAmount, uint256 platformFee, uint256 evaluatorFee)'),
  serviceCreated: parseAbiItem('event ServiceCreated(uint256 indexed serviceId, address indexed provider, uint256 indexed agentId, string name, uint256 price)'),
} as const;

const CONTRACT_EVENTS: Record<string, readonly unknown[]> = {
  [CONTRACTS.AGENTIC_COMMERCE]: [
    EVENT_ABI_ITEMS.jobCreated, EVENT_ABI_ITEMS.jobFunded, EVENT_ABI_ITEMS.jobSubmitted,
    EVENT_ABI_ITEMS.jobCompleted, EVENT_ABI_ITEMS.jobRejected, EVENT_ABI_ITEMS.jobExpired,
    EVENT_ABI_ITEMS.paymentReleased,
  ],
  [CONTRACTS.SERVICE_REGISTRY]: [EVENT_ABI_ITEMS.serviceCreated],
  [CONTRACTS.MILESTONE_ESCROW]: [],
};

export function useNotificationEvents() {
  const publicClient = usePublicClient();
  const { address } = useAccount();
  const { addNotification } = useNotifications();
  const { isOnline } = useNetworkStatus();
  const lastBlockRef = useRef<bigint>(getLastProcessedBlock());
  const processedEventsRef = useRef<Set<string>>(new Set());

  const enrichJobArgs = useCallback(async (args: Record<string, unknown>) => {
    if (!publicClient || args.jobId === undefined) return args;

    try {
      const jobId = typeof args.jobId === 'bigint'
        ? args.jobId
        : BigInt(String(args.jobId));
      const job = await publicClient.readContract({
        address: CONTRACTS.AGENTIC_COMMERCE,
        abi: AGENTIC_COMMERCE_ABI,
        functionName: 'jobs',
        args: [jobId],
      });

      const data = job as unknown;
      const arr = Array.isArray(data) ? data : null;
      const obj = !arr && typeof data === 'object' && data !== null
        ? data as Record<string, unknown>
        : null;

      return {
        ...args,
        client: arr ? arr[1] : obj?.client ?? args.client,
        provider: arr ? arr[2] : obj?.provider ?? args.provider,
        paymentToken: arr ? arr[5] : obj?.paymentToken ?? args.paymentToken,
        budget: arr ? arr[7] : obj?.budget ?? args.budget,
        status: arr ? arr[9] : obj?.status ?? args.status,
      };
    } catch (error) {
      debugLog('errors', `Could not enrich job notification args: ${error}`);
      return args;
    }
  }, [publicClient]);

  const processLog = useCallback(async (log: Log) => {
    const typedLog = log as Log & { eventName?: string; args?: Record<string, unknown> };
    const eventName = typedLog.eventName;
    if (!eventName || !EVENT_HANDLERS[eventName]) return;

    const eventKey = `${log.transactionHash}:${log.logIndex}`;
    if (processedEventsRef.current.has(eventKey)) return;
    processedEventsRef.current.add(eventKey);

    const args = eventName.startsWith('Job') || eventName === 'PaymentReleased'
      ? await enrichJobArgs(typedLog.args || {})
      : typedLog.args || {};
    const handler = EVENT_HANDLERS[eventName];

    if (handler.notification) {
      const notification = handler.notification(args, address);
      if (notification) {
        addNotification(notification as any);
        if (address) {
          await sendNotificationEmail({ address, type: notification.type, title: notification.title, message: notification.message, link: notification.link, metadata: notification.metadata });
        }
      }
    }

    if (handler.webhook) {
      const webhook = handler.webhook(args);
      if (webhook) {
        triggerWebhooks({ event: webhook.event as any, data: webhook.data });
      }
    }
  }, [address, addNotification, enrichJobArgs]);

  const processAllContractEvents = useCallback(async (fromBlock: bigint, toBlock: bigint) => {
    if (!publicClient) return;

    for (const [contractAddress, events] of Object.entries(CONTRACT_EVENTS)) {
      if (events.length === 0) continue;
      try {
        const logs = await publicClient.getLogs({
          address: contractAddress as Address,
          events: events as any,
          fromBlock,
          toBlock,
        });
        for (const log of logs) {
          await processLog(log);
        }
      } catch (error) {
        debugLog('errors', `Error processing events for ${contractAddress}: ${error}`);
      }
    }
  }, [publicClient, processLog]);

  useEffect(() => {
    if (!publicClient) return;

    let pollingInterval: ReturnType<typeof setInterval>;

    const poll = async () => {
      if (!isOnline) return;
      try {
        const currentBlock = await withRetry(() => publicClient.getBlockNumber(), { maxRetries: 2, initialDelay: 500 }) as bigint;
        if (currentBlock <= lastBlockRef.current) return;
        await processAllContractEvents(lastBlockRef.current + 1n, currentBlock);
        lastBlockRef.current = currentBlock;
        setLastProcessedBlock(currentBlock);
      } catch (error) {
        debugLog('errors', `Error in notification polling: ${error}`);
      }
    };

    graphqlQuery(GET_ACTIVITY_ALL, { first: 20, skip: 0 }).catch(() => {});

    poll();
    pollingInterval = setInterval(poll, 60000);
    return () => clearInterval(pollingInterval);
  }, [publicClient, isOnline, processAllContractEvents]);
}

export function usePersonalNotifications() {
  useNotificationEvents();
}
