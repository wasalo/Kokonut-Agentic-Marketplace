'use client';

import { useEffect, useCallback, useRef } from 'react';
import { usePublicClient, useAccount } from 'wagmi';
import { parseAbiItem } from 'viem';
import { getContractAddress, debugLog } from '@/lib/contracts/config';
import { useNotifications } from '@/lib/hooks/useNotifications';
import { triggerWebhooks, getWebhookEventFromNotification } from '@/lib/webhooks/trigger';
import { sendNotificationEmail } from '@/lib/emails/notification-bridge';

const AGENTIC_COMMERCE_ADDRESS = getContractAddress('AGENTIC_COMMERCE');
const SERVICE_REGISTRY_ADDRESS = getContractAddress('SERVICE_REGISTRY');
const AGENT_REVIEW_ADDRESS = getContractAddress('AGENT_REVIEW');

const STORAGE_KEY = 'kokonut_last_notification_block';

function getLastProcessedBlock(): bigint {
  if (typeof window === 'undefined') return BigInt(9989393);
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? BigInt(stored) : BigInt(9989393);
}

function setLastProcessedBlock(block: bigint) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, block.toString());
}

const EVENT_ABI_ITEMS = {
  jobCreated: parseAbiItem(
    'event JobCreated(uint256 indexed jobId, address indexed client, address indexed provider, address evaluator, uint256 serviceId, uint256 expiredAt)'
  ),
  jobFunded: parseAbiItem('event JobFunded(uint256 indexed jobId, uint256 amount)'),
  jobSubmitted: parseAbiItem('event JobSubmitted(uint256 indexed jobId, bytes32 deliverable)'),
  jobCompleted: parseAbiItem(
    'event JobCompleted(uint256 indexed jobId, uint256 payment, address recipient)'
  ),
  jobRejected: parseAbiItem('event JobRejected(uint256 indexed jobId, string reason)'),
  paymentReleased: parseAbiItem(
    'event PaymentReleased(uint256 indexed jobId, uint256 amount, address recipient)'
  ),
  serviceCreated: parseAbiItem(
    'event ServiceCreated(uint256 indexed serviceId, address indexed provider, uint256 indexed agentId, string name, uint256 price)'
  ),
  serviceUpdated: parseAbiItem('event ServiceUpdated(uint256 indexed serviceId)'),
  serviceDeactivated: parseAbiItem('event ServiceDeactivated(uint256 indexed serviceId)'),
  proposalCreated: parseAbiItem(
    'event ProposalCreated(uint256 indexed proposalId, address indexed proposer, uint256 reward)'
  ),
  evaluationSubmitted: parseAbiItem(
    'event EvaluationSubmitted(uint256 indexed proposalId, address indexed evaluator, int256 confidenceScore)'
  ),
  proposalDecided: parseAbiItem(
    'event ProposalDecided(uint256 indexed proposalId, address indexed winner)'
  ),
} as const;

export function useNotificationEvents() {
  const publicClient = usePublicClient();
  const { address } = useAccount();
  const { addNotification } = useNotifications();
  const lastBlockRef = useRef<bigint>(getLastProcessedBlock());

  const notifyAndEmail = useCallback(
    async (notification: Parameters<typeof addNotification>[0]) => {
      addNotification(notification);

      if (address) {
        await sendNotificationEmail({
          address,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          link: notification.link,
          metadata: notification.metadata,
        });
      }
    },
    [address, addNotification]
  );

  const processAgenticCommerceEvents = useCallback(
    async (fromBlock: bigint, toBlock: bigint) => {
      if (!publicClient) return toBlock;

      try {
        const logs = await publicClient.getLogs({
          address: AGENTIC_COMMERCE_ADDRESS,
          events: Object.values(EVENT_ABI_ITEMS).slice(0, 6),
          fromBlock,
          toBlock,
        });

        for (const log of logs) {
          const event = log.eventName;

          if (event === 'JobCreated' && log.args.client && log.args.jobId) {
            if (address && log.args.client.toLowerCase() === address.toLowerCase()) {
              await notifyAndEmail({
                type: 'job',
                action: 'job.created',
                title: 'Job Created',
                message: `You created job #${log.args.jobId}`,
                link: `/jobs/${log.args.jobId}`,
                metadata: { jobId: log.args.jobId.toString() },
              });
            }
            triggerWebhooks({
              event: 'job.created',
              data: {
                jobId: log.args.jobId.toString(),
                client: log.args.client,
                provider: log.args.provider,
              },
            });
          }

          if (event === 'JobFunded' && log.args.jobId && log.args.amount) {
            const amount = Number(log.args.amount) / 1e6;
            if (address) {
              await notifyAndEmail({
                type: 'job',
                action: 'job.funded',
                title: 'Job Funded',
                message: `Job #${log.args.jobId} funded with ${amount.toFixed(2)} USDC`,
                link: `/jobs/${log.args.jobId}`,
                metadata: {
                  jobId: log.args.jobId.toString(),
                  amount: log.args.amount.toString(),
                },
              });
            }
            triggerWebhooks({
              event: 'job.funded',
              data: {
                jobId: log.args.jobId.toString(),
                amount: log.args.amount.toString(),
              },
            });
          }

          if (event === 'JobSubmitted' && log.args.jobId) {
            if (address) {
              await notifyAndEmail({
                type: 'job',
                action: 'job.submitted',
                title: 'Work Submitted',
                message: `Work submitted for job #${log.args.jobId}`,
                link: `/jobs/${log.args.jobId}`,
                metadata: { jobId: log.args.jobId.toString() },
              });
            }
            triggerWebhooks({
              event: 'job.submitted',
              data: {
                jobId: log.args.jobId.toString(),
                deliverable: log.args.deliverable,
              },
            });
          }

          if (
            event === 'JobCompleted' &&
            log.args.jobId &&
            log.args.recipient &&
            log.args.payment
          ) {
            if (address && log.args.recipient.toLowerCase() === address.toLowerCase()) {
              const amount = Number(log.args.payment) / 1e6;
              await notifyAndEmail({
                type: 'payment',
                action: 'payment.received',
                title: 'Payment Received',
                message: `You received ${amount.toFixed(2)} USDC for job #${log.args.jobId}`,
                link: `/jobs/${log.args.jobId}`,
                metadata: {
                  jobId: log.args.jobId.toString(),
                  amount: log.args.payment.toString(),
                },
                persistent: true,
              });
            }
            triggerWebhooks({
              event: 'job.completed',
              data: {
                jobId: log.args.jobId.toString(),
                payment: log.args.payment.toString(),
                recipient: log.args.recipient,
              },
            });
          }

          if (event === 'JobRejected' && log.args.jobId) {
            if (address) {
              await notifyAndEmail({
                type: 'job',
                action: 'job.rejected',
                title: 'Job Rejected',
                message: `Job #${log.args.jobId} was rejected`,
                link: `/jobs/${log.args.jobId}`,
                metadata: {
                  jobId: log.args.jobId.toString(),
                  reason: log.args.reason || 'No reason provided',
                },
              });
            }
            triggerWebhooks({
              event: 'job.rejected',
              data: {
                jobId: log.args.jobId.toString(),
                reason: log.args.reason || 'No reason provided',
              },
            });
          }

          if (
            event === 'PaymentReleased' &&
            log.args.jobId &&
            log.args.recipient &&
            log.args.amount
          ) {
            if (address && log.args.recipient.toLowerCase() === address.toLowerCase()) {
              const amount = Number(log.args.amount) / 1e6;
              await notifyAndEmail({
                type: 'payment',
                action: 'payment.received',
                title: 'Payment Released',
                message: `${amount.toFixed(2)} USDC released for job #${log.args.jobId}`,
                link: `/jobs/${log.args.jobId}`,
                metadata: {
                  jobId: log.args.jobId.toString(),
                  amount: log.args.amount.toString(),
                },
              });
            }
            triggerWebhooks({
              event: 'payment.received',
              data: {
                jobId: log.args.jobId.toString(),
                amount: log.args.amount.toString(),
                recipient: log.args.recipient,
              },
            });
          }
        }
      } catch (error) {
        debugLog('errors', `Error processing AgenticCommerce events: ${error}`);
      }

      return toBlock;
    },
    [publicClient, address, addNotification, notifyAndEmail]
  );

  const processServiceRegistryEvents = useCallback(
    async (fromBlock: bigint, toBlock: bigint) => {
      if (!publicClient) return toBlock;

      try {
        const logs = await publicClient.getLogs({
          address: SERVICE_REGISTRY_ADDRESS,
          events: [
            EVENT_ABI_ITEMS.serviceCreated,
            EVENT_ABI_ITEMS.serviceUpdated,
            EVENT_ABI_ITEMS.serviceDeactivated,
          ],
          fromBlock,
          toBlock,
        });

        for (const log of logs) {
          const event = log.eventName;

          if (
            event === 'ServiceCreated' &&
            log.args.serviceId &&
            log.args.provider &&
            log.args.name
          ) {
            if (address && log.args.provider.toLowerCase() === address.toLowerCase()) {
              await notifyAndEmail({
                type: 'service',
                action: 'service.created',
                title: 'Service Created',
                message: `Your service "${log.args.name}" is now live`,
                link: `/marketplace/${log.args.serviceId}`,
                metadata: {
                  serviceId: log.args.serviceId.toString(),
                  name: log.args.name,
                },
              });
            }
            triggerWebhooks({
              event: 'service.created',
              data: {
                serviceId: log.args.serviceId.toString(),
                provider: log.args.provider,
                agentId: log.args.agentId?.toString(),
                name: log.args.name,
                price: log.args.price?.toString(),
              },
            });
          }

          if (event === 'ServiceUpdated' && log.args.serviceId) {
            if (address) {
              await notifyAndEmail({
                type: 'service',
                action: 'service.updated',
                title: 'Service Updated',
                message: `Service #${log.args.serviceId} was updated`,
                link: `/marketplace/${log.args.serviceId}`,
                metadata: { serviceId: log.args.serviceId.toString() },
              });
            }
            triggerWebhooks({
              event: 'service.updated',
              data: {
                serviceId: log.args.serviceId.toString(),
              },
            });
          }

          if (event === 'ServiceDeactivated' && log.args.serviceId) {
            if (address) {
              await notifyAndEmail({
                type: 'service',
                action: 'service.deactivated',
                title: 'Service Deactivated',
                message: `Service #${log.args.serviceId} was deactivated`,
                link: `/marketplace/${log.args.serviceId}`,
                metadata: { serviceId: log.args.serviceId.toString() },
              });
            }
            triggerWebhooks({
              event: 'service.deactivated',
              data: {
                serviceId: log.args.serviceId.toString(),
              },
            });
          }
        }
      } catch (error) {
        debugLog('errors', `Error processing ServiceRegistry events: ${error}`);
      }

      return toBlock;
    },
    [publicClient, address, addNotification, notifyAndEmail]
  );

  const processAgentReviewEvents = useCallback(
    async (fromBlock: bigint, toBlock: bigint) => {
      if (!publicClient) return toBlock;

      try {
        const logs = await publicClient.getLogs({
          address: AGENT_REVIEW_ADDRESS,
          events: [
            EVENT_ABI_ITEMS.proposalCreated,
            EVENT_ABI_ITEMS.evaluationSubmitted,
            EVENT_ABI_ITEMS.proposalDecided,
          ],
          fromBlock,
          toBlock,
        });

        for (const log of logs) {
          const event = log.eventName;

          if (
            event === 'ProposalCreated' &&
            log.args.proposalId &&
            log.args.proposer &&
            log.args.reward
          ) {
            if (address && log.args.proposer.toLowerCase() === address.toLowerCase()) {
              const reward = Number(log.args.reward) / 1e18;
              await notifyAndEmail({
                type: 'proposal',
                action: 'proposal.created',
                title: 'Proposal Created',
                message: `Your proposal #${log.args.proposalId} (${reward.toFixed(4)} ETH reward) is now open`,
                link: `/review/${log.args.proposalId}`,
                metadata: {
                  proposalId: log.args.proposalId.toString(),
                  reward: log.args.reward.toString(),
                },
              });
            }
            triggerWebhooks({
              event: 'proposal.created',
              data: {
                proposalId: log.args.proposalId.toString(),
                proposer: log.args.proposer,
                reward: log.args.reward.toString(),
              },
            });
          }

          if (event === 'EvaluationSubmitted' && log.args.proposalId && log.args.evaluator) {
            if (address && log.args.evaluator.toLowerCase() === address.toLowerCase()) {
              await notifyAndEmail({
                type: 'proposal',
                action: 'proposal.evaluation_submitted',
                title: 'Evaluation Submitted',
                message: `You submitted evaluation for proposal #${log.args.proposalId}`,
                link: `/review/${log.args.proposalId}`,
                metadata: {
                  proposalId: log.args.proposalId.toString(),
                  score: log.args.confidenceScore?.toString(),
                },
              });
            }
            triggerWebhooks({
              event: 'proposal.evaluation_submitted',
              data: {
                proposalId: log.args.proposalId.toString(),
                evaluator: log.args.evaluator,
                confidenceScore: log.args.confidenceScore?.toString(),
              },
            });
          }

          if (event === 'ProposalDecided' && log.args.proposalId && log.args.winner) {
            if (address) {
              await notifyAndEmail({
                type: 'proposal',
                action: 'proposal.decided',
                title: 'Proposal Decided',
                message: `Proposal #${log.args.proposalId} has been decided`,
                link: `/review/${log.args.proposalId}`,
                metadata: {
                  proposalId: log.args.proposalId.toString(),
                  winner: log.args.winner,
                },
              });
            }
            triggerWebhooks({
              event: 'proposal.decided',
              data: {
                proposalId: log.args.proposalId.toString(),
                winner: log.args.winner,
              },
            });
          }
        }
      } catch (error) {
        debugLog('errors', `Error processing AgentReview events: ${error}`);
      }

      return toBlock;
    },
    [publicClient, address, addNotification, notifyAndEmail]
  );

  useEffect(() => {
    if (!publicClient) return;

    let pollingInterval: ReturnType<typeof setInterval>;

    const processAllEvents = async () => {
      try {
        const currentBlock = await publicClient.getBlockNumber();
        let fromBlock = lastBlockRef.current;

        if (currentBlock <= fromBlock) return;

        const safeFromBlock = fromBlock + BigInt(1);
        const toBlock = currentBlock;

        const blocks = await Promise.all([
          processAgenticCommerceEvents(safeFromBlock, toBlock),
          processServiceRegistryEvents(safeFromBlock, toBlock),
          processAgentReviewEvents(safeFromBlock, toBlock),
        ]);

        lastBlockRef.current = blocks[0];
        setLastProcessedBlock(blocks[0]);
      } catch (error) {
        debugLog('errors', `Error in notification polling: ${error}`);
      }
    };

    processAllEvents();
    pollingInterval = setInterval(processAllEvents, 15000);

    return () => {
      clearInterval(pollingInterval);
    };
  }, [
    publicClient,
    processAgenticCommerceEvents,
    processServiceRegistryEvents,
    processAgentReviewEvents,
  ]);
}

export function usePersonalNotifications() {
  useNotificationEvents();
}
