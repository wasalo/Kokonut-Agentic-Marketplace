'use client';

import { useEffect, useCallback, useRef } from 'react';
import { usePublicClient, useAccount } from 'wagmi';
import { parseAbiItem } from 'viem';
import { getContractAddress, debugLog, DEFAULT_FROM_BLOCK } from '@/lib/contracts/config';
import { useNotifications } from '@/lib/hooks/useNotifications';
import { triggerWebhooks } from '@/lib/webhooks/trigger';
import { sendNotificationEmail } from '@/lib/emails/notification-bridge';
import { withRetry } from '@/lib/utils/retry';
import { useNetworkStatus } from '@/lib/hooks/useNetworkStatus';

const AGENTIC_COMMERCE_ADDRESS = getContractAddress('AGENTIC_COMMERCE');
const SERVICE_REGISTRY_ADDRESS = getContractAddress('SERVICE_REGISTRY');
const AGENT_REVIEW_ADDRESS = getContractAddress('AGENT_REVIEW');
const MILESTONE_ESCROW_ADDRESS = getContractAddress('MILESTONE_ESCROW');

const STORAGE_KEY = 'kokonut_last_notification_block';

function getLastProcessedBlock(): bigint {
  if (typeof window === 'undefined') return DEFAULT_FROM_BLOCK;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? BigInt(stored) : DEFAULT_FROM_BLOCK;
  } catch (error) {
    debugLog('errors', `Error reading last notification block: ${error}`);
    return DEFAULT_FROM_BLOCK;
  }
}

function setLastProcessedBlock(block: bigint): boolean {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(STORAGE_KEY, block.toString());
    return true;
  } catch (error) {
    debugLog('errors', `Error saving last notification block: ${error}`);
    return false;
  }
}

const EVENT_ABI_ITEMS = {
  jobCreated: parseAbiItem(
    'event JobCreated(uint256 indexed jobId, address indexed client, address indexed provider, address evaluator, uint256 serviceId, uint256 expiredAt)'
  ),
  openJobCreated: parseAbiItem(
    'event OpenJobCreated(uint256 indexed jobId, address indexed client, address indexed evaluator, uint256 maxBudget, uint256 expiredAt)'
  ),
  jobFunded: parseAbiItem('event JobFunded(uint256 indexed jobId, uint256 amount)'),
  jobSubmitted: parseAbiItem('event JobSubmitted(uint256 indexed jobId, bytes32 deliverable)'),
  jobCompleted: parseAbiItem(
    'event JobCompleted(uint256 indexed jobId, uint256 payment, address recipient)'
  ),
  jobRejected: parseAbiItem('event JobRejected(uint256 indexed jobId, string reason)'),
  jobExpired: parseAbiItem('event JobExpired(uint256 indexed jobId)'),
  paymentReleased: parseAbiItem(
    'event PaymentReleased(uint256 indexed jobId, uint256 amount, address recipient)'
  ),
  refunded: parseAbiItem('event Refunded(uint256 indexed jobId, address indexed recipient, uint256 amount)'),
  permissionlessRefund: parseAbiItem('event PermissionlessRefund(uint256 indexed jobId, address indexed caller, uint256 amount)'),
  jobStatusChanged: parseAbiItem(
    'event JobStatusChanged(uint256 indexed jobId, uint8 indexed oldStatus, uint8 indexed newStatus, uint256 timestamp)'
  ),
  jobUpdated: parseAbiItem(
    'event JobUpdated(uint256 indexed jobId, bytes32 indexed updateType, uint256 timestamp)'
  ),
  jobLimitExceeded: parseAbiItem(
    'event JobLimitExceeded(address indexed client, uint256 attemptedCount, uint256 maxAllowed)'
  ),
  evaluatorSlashedForInactivity: parseAbiItem(
    'event EvaluatorSlashedForInactivity(uint256 indexed jobId, address indexed evaluator, uint256 slashAmount)'
  ),
  evaluatorRegistered: parseAbiItem('event EvaluatorRegistered(address indexed evaluator)'),
  evaluatorUnregistered: parseAbiItem('event EvaluatorUnregistered(address indexed evaluator)'),
  evaluatorRandomlySelected: parseAbiItem(
    'event EvaluatorRandomlySelected(uint256 indexed jobId, address indexed evaluator)'
  ),
  serviceCreated: parseAbiItem(
    'event ServiceCreated(uint256 indexed serviceId, address indexed provider, uint256 indexed agentId, string name, uint256 price)'
  ),
  serviceUpdated: parseAbiItem('event ServiceUpdated(uint256 indexed serviceId)'),
  serviceDeactivated: parseAbiItem('event ServiceDeactivated(uint256 indexed serviceId)'),
  serviceActivated: parseAbiItem('event ServiceActivated(uint256 indexed serviceId)'),
  serviceBondDeposited: parseAbiItem(
    'event ServiceBondDeposited(uint256 indexed serviceId, address indexed provider, uint256 amount)'
  ),
  serviceBondRefunded: parseAbiItem(
    'event ServiceBondRefunded(uint256 indexed serviceId, address indexed recipient, uint256 amount)'
  ),
  proposalCreated: parseAbiItem(
    'event ProposalCreated(uint256 indexed proposalId, address indexed proposer, uint256 reward)'
  ),
  evaluationSubmitted: parseAbiItem(
    'event EvaluationSubmitted(uint256 indexed proposalId, address indexed evaluator, int256 confidenceScore)'
  ),
  proposalDecided: parseAbiItem(
    'event ProposalDecided(uint256 indexed proposalId, address indexed winner)'
  ),
  proposalStatusChanged: parseAbiItem(
    'event ProposalStatusChanged(uint256 indexed proposalId, uint8 indexed oldStatus, uint8 indexed newStatus)'
  ),
  evaluatorSlashed: parseAbiItem(
    'event EvaluatorSlashed(address indexed evaluator, uint256 indexed proposalId, uint256 slashAmount)'
  ),
  evaluationFinalized: parseAbiItem(
    'event EvaluationFinalized(uint256 indexed proposalId, address indexed winner, int256 medianScore)'
  ),
  rewardClaimed: parseAbiItem(
    'event RewardClaimed(uint256 indexed proposalId, address indexed evaluator, uint256 amount)'
  ),
  stakeReleased: parseAbiItem(
    'event StakeReleased(uint256 indexed proposalId, address indexed evaluator, uint256 amount)'
  ),
  decisionAttested: parseAbiItem(
    'event DecisionAttested(uint256 indexed proposalId, address indexed evaluator, address winner)'
  ),
  proposalCancelledByProposer: parseAbiItem(
    'event ProposalCancelledByProposer(uint256 indexed proposalId, address indexed proposer)'
  ),
  // MilestoneEscrow events
  milestoneEnabled: parseAbiItem('event MilestoneEnabled(uint256 indexed jobId)'),
  milestoneAdded: parseAbiItem(
    'event MilestoneAdded(uint256 indexed jobId, uint256 indexed milestoneIndex, string description, uint256 amount)'
  ),
  milestoneCompleted: parseAbiItem(
    'event MilestoneCompleted(uint256 indexed jobId, uint256 indexed milestoneIndex, bytes32 proofHash)'
  ),
  milestoneReleased: parseAbiItem(
    'event MilestoneReleased(uint256 indexed jobId, uint256 indexed milestoneIndex, uint256 amount)'
  ),
  milestoneAutoReleased: parseAbiItem(
    'event MilestoneAutoReleased(uint256 indexed jobId, uint256 indexed milestoneIndex, uint256 amount)'
  ),
  arbiterRegistered: parseAbiItem('event ArbiterRegistered(address indexed arbiter, uint256 stake)'),
  arbiterUnregistered: parseAbiItem(
    'event ArbiterUnregistered(address indexed arbiter, uint256 refundedStake)'
  ),
  disputeFlagged: parseAbiItem(
    'event DisputeFlagged(uint256 indexed jobId, address indexed flaggler, uint256 fee)'
  ),
  evidenceSubmitted: parseAbiItem(
    'event EvidenceSubmitted(uint256 indexed jobId, address indexed submitter, bytes32 evidenceHash)'
  ),
  disputeResolved: parseAbiItem(
    'event DisputeResolved(uint256 indexed jobId, bool releasedToProvider, address indexed arbiter, uint256 arbiterFee)'
  ),
  arbiterSlashed: parseAbiItem(
    'event ArbiterSlashed(address indexed arbiter, uint256 slashedAmount, string reason)'
  ),
} as const;

export function useNotificationEvents() {
const publicClient = usePublicClient();
  const { address } = useAccount();
  const { addNotification } = useNotifications();
  const { isOnline } = useNetworkStatus();
  const lastBlockRef = useRef<bigint>(getLastProcessedBlock());
  const processedEventsRef = useRef<Set<string>>(new Set());

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
          events: [
            EVENT_ABI_ITEMS.jobCreated,
            EVENT_ABI_ITEMS.openJobCreated,
            EVENT_ABI_ITEMS.jobFunded,
            EVENT_ABI_ITEMS.jobSubmitted,
            EVENT_ABI_ITEMS.jobCompleted,
            EVENT_ABI_ITEMS.jobRejected,
            EVENT_ABI_ITEMS.jobExpired,
            EVENT_ABI_ITEMS.paymentReleased,
            EVENT_ABI_ITEMS.refunded,
            EVENT_ABI_ITEMS.permissionlessRefund,
            EVENT_ABI_ITEMS.jobStatusChanged,
            EVENT_ABI_ITEMS.jobUpdated,
            EVENT_ABI_ITEMS.jobLimitExceeded,
            EVENT_ABI_ITEMS.evaluatorSlashedForInactivity,
            EVENT_ABI_ITEMS.evaluatorRegistered,
            EVENT_ABI_ITEMS.evaluatorUnregistered,
            EVENT_ABI_ITEMS.evaluatorRandomlySelected,
          ],
          fromBlock,
          toBlock,
        });

        for (const log of logs) {
          const event = log.eventName;

          const eventKey = `${log.transactionHash}:${log.logIndex}`;
          if (processedEventsRef.current.has(eventKey)) continue;
          processedEventsRef.current.add(eventKey);

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

          if (event === 'JobExpired' && log.args.jobId) {
            if (address) {
              await notifyAndEmail({
                type: 'job',
                action: 'job.expired',
                title: 'Job Expired',
                message: `Job #${log.args.jobId} has expired`,
                link: `/jobs/${log.args.jobId}`,
                metadata: { jobId: log.args.jobId.toString() },
              });
            }
            triggerWebhooks({
              event: 'job.expired',
              data: { jobId: log.args.jobId.toString() },
            });
          }

          if (
            event === 'JobStatusChanged' &&
            log.args.jobId &&
            log.args.oldStatus !== undefined &&
            log.args.newStatus !== undefined
          ) {
            if (address) {
              const statusNames = ['Open', 'Funded', 'Submitted', 'Completed', 'Rejected', 'Expired'];
              await notifyAndEmail({
                type: 'job',
                action: 'job.status_changed',
                title: 'Job Status Changed',
                message: `Job #${log.args.jobId} changed from ${statusNames[Number(log.args.oldStatus)] || 'Unknown'} to ${statusNames[Number(log.args.newStatus)] || 'Unknown'}`,
                link: `/jobs/${log.args.jobId}`,
                metadata: {
                  jobId: log.args.jobId.toString(),
                  oldStatus: log.args.oldStatus.toString(),
                  newStatus: log.args.newStatus.toString(),
                },
              });
            }
            triggerWebhooks({
              event: 'job.status_changed',
              data: {
                jobId: log.args.jobId.toString(),
                oldStatus: log.args.oldStatus.toString(),
                newStatus: log.args.newStatus.toString(),
              },
            });
          }

          if (
            event === 'JobLimitExceeded' &&
            log.args.client &&
            log.args.attemptedCount &&
            log.args.maxAllowed !== undefined
          ) {
            if (address && log.args.client.toLowerCase() === address.toLowerCase()) {
              await notifyAndEmail({
                type: 'job',
                action: 'job.limit_exceeded',
                title: 'Job Limit Exceeded',
                message: `You have reached the maximum of ${log.args.maxAllowed} active jobs`,
                link: `/jobs`,
                metadata: {
                  attemptedCount: log.args.attemptedCount.toString(),
                  maxAllowed: log.args.maxAllowed.toString(),
                },
              });
            }
            triggerWebhooks({
              event: 'job.limit_exceeded',
              data: {
                client: log.args.client,
                attemptedCount: log.args.attemptedCount.toString(),
                maxAllowed: log.args.maxAllowed.toString(),
              },
            });
          }

          if (
            event === 'EvaluatorSlashedForInactivity' &&
            log.args.jobId &&
            log.args.evaluator &&
            log.args.slashAmount !== undefined
          ) {
            if (address && log.args.evaluator.toLowerCase() === address.toLowerCase()) {
              const amount = Number(log.args.slashAmount) / 1e18;
              await notifyAndEmail({
                type: 'proposal',
                action: 'evaluator.slashed',
                title: 'Evaluator Slashed',
                message: `You were slashed ${amount.toFixed(4)} ETH for inactivity on job #${log.args.jobId}`,
                link: `/jobs/${log.args.jobId}`,
                metadata: {
                  jobId: log.args.jobId.toString(),
                  slashAmount: log.args.slashAmount.toString(),
                },
              });
            }
            triggerWebhooks({
              event: 'evaluator.slashed',
              data: {
                jobId: log.args.jobId.toString(),
                evaluator: log.args.evaluator,
                slashAmount: log.args.slashAmount.toString(),
              },
            });
          }
        }
      } catch (error) {
        debugLog('errors', `Error processing AgenticCommerce events: ${error}`);
      }

      return toBlock;
    },
    [publicClient, address, notifyAndEmail]
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
            EVENT_ABI_ITEMS.serviceActivated,
          ],
          fromBlock,
          toBlock,
        });

        for (const log of logs) {
          const event = log.eventName;

          const eventKey = `${log.transactionHash}:${log.logIndex}`;
          if (processedEventsRef.current.has(eventKey)) continue;
          processedEventsRef.current.add(eventKey);

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

          if (event === 'ServiceActivated' && log.args.serviceId) {
            if (address) {
              await notifyAndEmail({
                type: 'service',
                action: 'service.activated',
                title: 'Service Activated',
                message: `Service #${log.args.serviceId} is now active`,
                link: `/marketplace/${log.args.serviceId}`,
                metadata: { serviceId: log.args.serviceId.toString() },
              });
            }
            triggerWebhooks({
              event: 'service.activated',
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
    [publicClient, address, notifyAndEmail]
  );

  const processMilestoneEscrowEvents = useCallback(
    async (fromBlock: bigint, toBlock: bigint) => {
      if (!publicClient) return toBlock;

      try {
        const logs = await publicClient.getLogs({
          address: MILESTONE_ESCROW_ADDRESS,
          events: [
            EVENT_ABI_ITEMS.milestoneEnabled,
            EVENT_ABI_ITEMS.milestoneAdded,
            EVENT_ABI_ITEMS.milestoneCompleted,
            EVENT_ABI_ITEMS.milestoneReleased,
            EVENT_ABI_ITEMS.milestoneAutoReleased,
            EVENT_ABI_ITEMS.arbiterRegistered,
            EVENT_ABI_ITEMS.arbiterUnregistered,
            EVENT_ABI_ITEMS.disputeFlagged,
            EVENT_ABI_ITEMS.evidenceSubmitted,
            EVENT_ABI_ITEMS.disputeResolved,
            EVENT_ABI_ITEMS.arbiterSlashed,
          ],
          fromBlock,
          toBlock,
        });

        for (const log of logs) {
          const event = log.eventName;

          const eventKey = `${log.transactionHash}:${log.logIndex}`;
          if (processedEventsRef.current.has(eventKey)) continue;
          processedEventsRef.current.add(eventKey);

          if (event === 'MilestoneEnabled' && log.args.jobId) {
            const jobId = log.args.jobId;
            triggerWebhooks({
              event: 'milestone.enabled',
              data: { jobId: jobId.toString() },
            });
          }

          if (event === 'MilestoneAdded' && log.args.jobId && log.args.milestoneIndex) {
            const amount = Number(log.args.amount || 0) / 1e6;
            triggerWebhooks({
              event: 'milestone.added',
              data: {
                jobId: log.args.jobId.toString(),
                milestoneIndex: log.args.milestoneIndex.toString(),
                description: log.args.description,
                amount: amount.toString(),
              },
            });
          }

          if (event === 'MilestoneCompleted' && log.args.jobId && log.args.milestoneIndex) {
            triggerWebhooks({
              event: 'milestone.completed',
              data: {
                jobId: log.args.jobId.toString(),
                milestoneIndex: log.args.milestoneIndex.toString(),
              },
            });
          }

          if (event === 'MilestoneReleased' && log.args.jobId && log.args.milestoneIndex) {
            const amount = Number(log.args.amount || 0) / 1e6;
            triggerWebhooks({
              event: 'milestone.released',
              data: {
                jobId: log.args.jobId.toString(),
                milestoneIndex: log.args.milestoneIndex.toString(),
                amount: amount.toString(),
              },
            });
          }

          if (event === 'MilestoneAutoReleased' && log.args.jobId && log.args.milestoneIndex) {
            const amount = Number(log.args.amount || 0) / 1e6;
            triggerWebhooks({
              event: 'milestone.auto_released',
              data: {
                jobId: log.args.jobId.toString(),
                milestoneIndex: log.args.milestoneIndex.toString(),
                amount: amount.toString(),
              },
            });
          }

          if (event === 'ArbiterRegistered' && log.args.arbiter) {
            const stake = Number(log.args.stake || 0) / 1e18;
            if (address && log.args.arbiter.toLowerCase() === address.toLowerCase()) {
              await notifyAndEmail({
                type: 'system',
                action: 'arbiter.registered',
                title: 'Registered as Arbiter',
                message: `You are now registered as an arbiter (${stake.toFixed(2)} ETH stake)`,
                link: '/dashboard',
              });
            }
            triggerWebhooks({
              event: 'arbiter.registered',
              data: { arbiter: log.args.arbiter, stake: stake.toString() },
            });
          }

          if (event === 'ArbiterUnregistered' && log.args.arbiter) {
            const refunded = Number(log.args.refundedStake || 0) / 1e18;
            if (address && log.args.arbiter.toLowerCase() === address.toLowerCase()) {
              await notifyAndEmail({
                type: 'system',
                action: 'arbiter.unregistered',
                title: 'Unregistered as Arbiter',
                message: `You have unregistered as an arbiter (${refunded.toFixed(2)} ETH refunded)`,
                link: '/dashboard',
              });
            }
            triggerWebhooks({
              event: 'arbiter.unregistered',
              data: { arbiter: log.args.arbiter, refundedStake: refunded.toString() },
            });
          }

          if (event === 'DisputeFlagged' && log.args.jobId && log.args.flaggler) {
            const fee = Number(log.args.fee || 0) / 1e18;
            triggerWebhooks({
              event: 'dispute.flagged',
              data: {
                jobId: log.args.jobId.toString(),
                flaggler: log.args.flaggler,
                fee: fee.toString(),
              },
            });
          }

          if (event === 'EvidenceSubmitted' && log.args.jobId && log.args.submitter) {
            triggerWebhooks({
              event: 'dispute.evidence_submitted',
              data: {
                jobId: log.args.jobId.toString(),
                submitter: log.args.submitter,
              },
            });
          }

          if (event === 'DisputeResolved' && log.args.jobId) {
            triggerWebhooks({
              event: 'dispute.resolved',
              data: {
                jobId: log.args.jobId.toString(),
                releasedToProvider: log.args.releasedToProvider,
                arbiter: log.args.arbiter,
                arbiterFee: log.args.arbiterFee?.toString(),
              },
            });
          }

          if (event === 'ArbiterSlashed' && log.args.arbiter) {
            const slashed = Number(log.args.slashedAmount || 0) / 1e18;
            if (address && log.args.arbiter.toLowerCase() === address.toLowerCase()) {
              await notifyAndEmail({
                type: 'system',
                action: 'dispute.resolved',
                title: 'Arbiter Slashed',
                message: `You have been slashed ${slashed.toFixed(4)} ETH for ${log.args.reason}`,
                link: '/dashboard',
              });
            }
            triggerWebhooks({
              event: 'dispute.arbiter_slashed',
              data: { arbiter: log.args.arbiter, slashedAmount: slashed.toString(), reason: log.args.reason },
            });
          }
        }
      } catch (error) {
        debugLog('errors', `Error processing MilestoneEscrow events: ${error}`);
      }

      return toBlock;
    },
    [publicClient, address, notifyAndEmail]
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
            EVENT_ABI_ITEMS.proposalStatusChanged,
          ],
          fromBlock,
          toBlock,
        });

        for (const log of logs) {
          const event = log.eventName;

          const eventKey = `${log.transactionHash}:${log.logIndex}`;
          if (processedEventsRef.current.has(eventKey)) continue;
          processedEventsRef.current.add(eventKey);

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

          if (
            event === 'ProposalStatusChanged' &&
            log.args.proposalId &&
            log.args.oldStatus !== undefined &&
            log.args.newStatus !== undefined
          ) {
            if (address) {
              const statusNames = ['Open', 'UnderReview', 'Decided', 'Cancelled'];
              await notifyAndEmail({
                type: 'proposal',
                action: 'proposal.status_changed',
                title: 'Proposal Status Changed',
                message: `Proposal #${log.args.proposalId} changed from ${statusNames[Number(log.args.oldStatus)] || 'Unknown'} to ${statusNames[Number(log.args.newStatus)] || 'Unknown'}`,
                link: `/review/${log.args.proposalId}`,
                metadata: {
                  proposalId: log.args.proposalId.toString(),
                  oldStatus: log.args.oldStatus.toString(),
                  newStatus: log.args.newStatus.toString(),
                },
              });
            }
            triggerWebhooks({
              event: 'proposal.status_changed',
              data: {
                proposalId: log.args.proposalId.toString(),
                oldStatus: log.args.oldStatus.toString(),
                newStatus: log.args.newStatus.toString(),
              },
            });
          }
        }
      } catch (error) {
        debugLog('errors', `Error processing AgentReview events: ${error}`);
      }

      return toBlock;
    },
    [publicClient, address, notifyAndEmail]
  );

  useEffect(() => {
    if (!publicClient) return;

    let pollingInterval: ReturnType<typeof setInterval>;

    const processAllEvents = async () => {
      if (!isOnline) {
        debugLog('network', 'Skipping notification polling - offline');
        return;
      }

      try {
        const currentBlock = await withRetry(
          () => publicClient.getBlockNumber(),
          { maxRetries: 2, initialDelay: 500 }
        );
        let fromBlock = lastBlockRef.current;

        if (currentBlock <= fromBlock) return;

        const safeFromBlock = fromBlock + BigInt(1);
        const toBlock = currentBlock;

        const blocks = await Promise.all([
          processAgenticCommerceEvents(safeFromBlock, toBlock),
          processServiceRegistryEvents(safeFromBlock, toBlock),
          processAgentReviewEvents(safeFromBlock, toBlock),
          processMilestoneEscrowEvents(safeFromBlock, toBlock),
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
    isOnline,
    processAgenticCommerceEvents,
    processServiceRegistryEvents,
    processAgentReviewEvents,
    processMilestoneEscrowEvents,
  ]);
}

export function usePersonalNotifications() {
  useNotificationEvents();
}
