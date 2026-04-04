'use client';

import { useEffect, useCallback } from 'react';
import { usePublicClient, useAccount } from 'wagmi';
import { parseAbiItem } from 'viem';
import { CONTRACT_ADDRESSES, getContractAddress, debugLog } from '@/lib/contracts/config';
import { AGENTIC_COMMERCE_ABI } from '@/lib/contracts/abis';
import { useNotifications, useNotificationActions } from '@/lib/hooks/useNotifications';

const AGENTIC_COMMERCE_ADDRESS = getContractAddress(
  process.env.NEXT_PUBLIC_AGENTIC_COMMERCE_ADDRESS,
  CONTRACT_ADDRESSES.sepolia.agenticCommerce
);

const FROM_BLOCK = BigInt(9989393);

interface ContractEvent {
  jobId?: bigint;
  client?: `0x${string}`;
  provider?: `0x${string}`;
  budget?: bigint;
  amount?: bigint;
  serviceId?: bigint;
  description?: string;
}

export function useNotificationEvents() {
  const publicClient = usePublicClient();
  const { address } = useAccount();
  const { addNotification } = useNotifications();
  const { notifyJobCreated, notifyJobFunded, notifyJobSubmitted, notifyPaymentReceived } =
    useNotificationActions();

  const handleJobCreated = useCallback(
    (event: ContractEvent) => {
      if (event.jobId && event.client) {
        if (address && event.client.toLowerCase() === address.toLowerCase()) {
          addNotification({
            type: 'job',
            action: 'job.created',
            title: 'Job Created',
            message: `You created job #${event.jobId}`,
            link: `/jobs/${event.jobId}`,
            metadata: { jobId: event.jobId.toString() },
          });
        }
      }
    },
    [address, addNotification]
  );

  const handleJobFunded = useCallback(
    (event: ContractEvent) => {
      if (event.jobId && event.budget) {
        notifyJobFunded(event.jobId, event.budget);
      }
    },
    [notifyJobFunded]
  );

  const handleJobSubmitted = useCallback(
    (event: ContractEvent) => {
      if (event.jobId && event.provider) {
        notifyJobSubmitted(event.jobId, event.provider);
      }
    },
    [notifyJobSubmitted]
  );

  const handlePaymentReleased = useCallback(
    (event: ContractEvent) => {
      if (event.jobId && event.amount) {
        notifyPaymentReceived(event.jobId, event.amount);
      }
    },
    [notifyPaymentReceived]
  );

  useEffect(() => {
    if (!publicClient) return;

    let lastProcessedBlock = FROM_BLOCK;
    let pollingInterval: ReturnType<typeof setInterval>;

    const processEvents = async () => {
      try {
        const currentBlock = await publicClient.getBlockNumber();

        if (currentBlock <= lastProcessedBlock) return;

        const logs = await publicClient.getLogs({
          address: AGENTIC_COMMERCE_ADDRESS,
          event: parseAbiItem(
            'event JobCreated(uint256 indexed jobId, address indexed client, address indexed provider, address evaluator, uint256 serviceId, uint256 expiredAt)'
          ),
          fromBlock: lastProcessedBlock + BigInt(1),
          toBlock: currentBlock,
        });

        for (const log of logs) {
          if (log.args.jobId && log.args.client) {
            handleJobCreated({
              jobId: log.args.jobId,
              client: log.args.client,
              provider: log.args.provider,
            });
          }
        }

        lastProcessedBlock = currentBlock;
      } catch (error) {
        console.error('Error processing contract events:', error);
      }
    };

    processEvents();
    pollingInterval = setInterval(processEvents, 30000);

    return () => {
      clearInterval(pollingInterval);
    };
  }, [publicClient, handleJobCreated, handleJobFunded, handleJobSubmitted, handlePaymentReleased]);

  return {
    handleJobCreated,
    handleJobFunded,
    handleJobSubmitted,
    handlePaymentReleased,
  };
}

export function usePersonalNotifications() {
  const publicClient = usePublicClient();
  const { address } = useAccount();
  const { addNotification } = useNotifications();

  useEffect(() => {
    if (!publicClient || !address) return;

    let lastProcessedBlock = FROM_BLOCK;
    let pollingInterval: ReturnType<typeof setInterval>;

    const processEvents = async () => {
      try {
        const currentBlock = await publicClient.getBlockNumber();

        if (currentBlock <= lastProcessedBlock) return;

        const jobFundedLogs = await publicClient.getLogs({
          address: AGENTIC_COMMERCE_ADDRESS,
          event: parseAbiItem('event JobFunded(uint256 indexed jobId, uint256 amount)'),
          fromBlock: lastProcessedBlock + BigInt(1),
          toBlock: currentBlock,
        });

        const jobSubmittedLogs = await publicClient.getLogs({
          address: AGENTIC_COMMERCE_ADDRESS,
          event: parseAbiItem('event JobSubmitted(uint256 indexed jobId, bytes32 deliverable)'),
          fromBlock: lastProcessedBlock + BigInt(1),
          toBlock: currentBlock,
        });

        const jobCompletedLogs = await publicClient.getLogs({
          address: AGENTIC_COMMERCE_ADDRESS,
          event: parseAbiItem(
            'event JobCompleted(uint256 indexed jobId, uint256 payment, address recipient)'
          ),
          fromBlock: lastProcessedBlock + BigInt(1),
          toBlock: currentBlock,
        });

        for (const log of jobCompletedLogs) {
          if (log.args.jobId && log.args.recipient?.toLowerCase() === address.toLowerCase()) {
            const payment = log.args.payment || BigInt(0);
            addNotification({
              type: 'payment',
              action: 'payment.received',
              title: 'Payment Received',
              message: `You received ${Number(payment) / 1e6} USDC`,
              link: `/jobs/${log.args.jobId}`,
              metadata: {
                jobId: log.args.jobId?.toString(),
                amount: payment.toString(),
              },
              persistent: true,
            });
          }
        }

        for (const log of jobSubmittedLogs) {
          addNotification({
            type: 'job',
            action: 'job.submitted',
            title: 'Work Submitted',
            message: `Work submitted for job #${log.args.jobId}`,
            link: `/jobs/${log.args.jobId}`,
            metadata: { jobId: log.args.jobId?.toString() },
          });
        }

        for (const log of jobFundedLogs) {
          const amount = log.args.amount || BigInt(0);
          addNotification({
            type: 'job',
            action: 'job.funded',
            title: 'Job Funded',
            message: `Job #${log.args.jobId} funded with ${Number(amount) / 1e6} USDC`,
            link: `/jobs/${log.args.jobId}`,
            metadata: {
              jobId: log.args.jobId?.toString(),
              amount: amount.toString(),
            },
          });
        }

        lastProcessedBlock = currentBlock;
      } catch (error) {
        debugLog('errors', `Error processing personal events: ${error}`);
      }
    };

    processEvents();
    pollingInterval = setInterval(processEvents, 15000);

    return () => {
      clearInterval(pollingInterval);
    };
  }, [publicClient, address, addNotification]);
}
