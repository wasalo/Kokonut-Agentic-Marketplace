'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePublicClient } from 'wagmi';
import { parseAbiItem, formatUnits } from 'viem';
import { CONTRACT_ADDRESSES, getContractAddress, debugLog } from '@/lib/contracts/config';
import { AGENTIC_COMMERCE_ABI, AGENT_REVIEW_ABI, SERVICE_REGISTRY_ABI } from '@/lib/contracts/abis';

// Contract addresses
const AGENTIC_COMMERCE_ADDRESS = getContractAddress(
  process.env.NEXT_PUBLIC_AGENTIC_COMMERCE_ADDRESS,
  CONTRACT_ADDRESSES.sepolia.agenticCommerce
);
const SERVICE_REGISTRY_ADDRESS = getContractAddress(
  process.env.NEXT_PUBLIC_SERVICE_REGISTRY_ADDRESS,
  CONTRACT_ADDRESSES.sepolia.serviceRegistry
);
const AGENT_REVIEW_ADDRESS = getContractAddress(
  process.env.NEXT_PUBLIC_AGENT_REVIEW_ADDRESS,
  CONTRACT_ADDRESSES.sepolia.agentReview
);

// From block (Sepolia deployment)
const FROM_BLOCK = BigInt(9989393);

export type ActivityType = 'job' | 'service' | 'proposal' | 'all';

export interface Activity {
  id: string;
  type: ActivityType;
  action: string;
  timestamp: bigint;
  actor: `0x${string}`;
  details: {
    title?: string;
    description?: string;
    amount?: string;
    currency?: string;
    targetId?: string;
    metadata?: Record<string, unknown>;
  };
  blockNumber: bigint;
  transactionHash: `0x${string}`;
}

/**
 * Hook to fetch platform-wide activity feed from events
 * Aggregates events from Jobs, Services, and Proposals
 */
export function useActivityFeed(type: ActivityType = 'all', limit: number = 50) {
  const publicClient = usePublicClient();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchActivities = useCallback(async () => {
    if (!publicClient) return;

    setIsLoading(true);
    setError(null);

    try {
      debugLog('contracts', 'Fetching activity feed...');

      const allActivities: Activity[] = [];

      // Fetch Job events
      if (type === 'all' || type === 'job') {
        const jobCreatedLogs = await publicClient.getLogs({
          address: AGENTIC_COMMERCE_ADDRESS,
          event: parseAbiItem(
            'event JobCreated(uint256 indexed jobId, address indexed client, address indexed provider, address evaluator, uint256 serviceId, uint256 expiredAt)'
          ),
          fromBlock: FROM_BLOCK,
          toBlock: 'latest',
        });

        jobCreatedLogs.forEach(log => {
          if (log.args) {
            allActivities.push({
              id: `job-created-${log.args.jobId}`,
              type: 'job',
              action: 'Job Created',
              timestamp: BigInt(log.blockNumber), // Use blockNumber as proxy for timestamp
              actor: log.args.client as `0x${string}`,
              details: {
                title: `Job #${log.args.jobId}`,
                description: `New job created by ${(log.args.client as string).slice(0, 6)}...${(log.args.client as string).slice(-4)}`,
                targetId: log.args.jobId?.toString(),
              },
              blockNumber: BigInt(log.blockNumber),
              transactionHash: log.transactionHash,
            });
          }
        });

        // JobFunded events
        const jobFundedLogs = await publicClient.getLogs({
          address: AGENTIC_COMMERCE_ADDRESS,
          event: parseAbiItem(
            'event JobFunded(uint256 indexed jobId, address indexed client, uint256 amount)'
          ),
          fromBlock: FROM_BLOCK,
          toBlock: 'latest',
        });

        jobFundedLogs.forEach(log => {
          if (log.args) {
            allActivities.push({
              id: `job-funded-${log.args.jobId}`,
              type: 'job',
              action: 'Job Funded',
              timestamp: BigInt(log.blockNumber),
              actor: log.args.client as `0x${string}`,
              details: {
                title: `Job #${log.args.jobId}`,
                description: `Job funded with ${formatUnits(log.args.amount as bigint, 6)} USDC`,
                amount: formatUnits(log.args.amount as bigint, 6),
                currency: 'USDC',
                targetId: log.args.jobId?.toString(),
              },
              blockNumber: BigInt(log.blockNumber),
              transactionHash: log.transactionHash,
            });
          }
        });
      }

      // Fetch Service events
      if (type === 'all' || type === 'service') {
        const serviceCreatedLogs = await publicClient.getLogs({
          address: SERVICE_REGISTRY_ADDRESS,
          event: parseAbiItem(
            'event ServiceCreated(uint256 indexed serviceId, address indexed provider, uint256 indexed agentId)'
          ),
          fromBlock: FROM_BLOCK,
          toBlock: 'latest',
        });

        serviceCreatedLogs.forEach(log => {
          if (log.args) {
            allActivities.push({
              id: `service-created-${log.args.serviceId}`,
              type: 'service',
              action: 'Service Listed',
              timestamp: BigInt(log.blockNumber),
              actor: log.args.provider as `0x${string}`,
              details: {
                title: `Service #${log.args.serviceId}`,
                description: `New service listed by ${(log.args.provider as string).slice(0, 6)}...${(log.args.provider as string).slice(-4)}`,
                targetId: log.args.serviceId?.toString(),
              },
              blockNumber: BigInt(log.blockNumber),
              transactionHash: log.transactionHash,
            });
          }
        });
      }

      // Fetch Proposal events
      if (type === 'all' || type === 'proposal') {
        const proposalCreatedLogs = await publicClient.getLogs({
          address: AGENT_REVIEW_ADDRESS,
          event: parseAbiItem(
            'event ProposalCreated(uint256 indexed proposalId, address indexed proposer, uint256 reward)'
          ),
          fromBlock: FROM_BLOCK,
          toBlock: 'latest',
        });

        proposalCreatedLogs.forEach(log => {
          if (log.args) {
            allActivities.push({
              id: `proposal-created-${log.args.proposalId}`,
              type: 'proposal',
              action: 'Proposal Created',
              timestamp: BigInt(log.blockNumber),
              actor: log.args.proposer as `0x${string}`,
              details: {
                title: `Proposal #${log.args.proposalId}`,
                description: `New proposal with ${formatUnits(log.args.reward as bigint, 18)} ETH reward`,
                amount: formatUnits(log.args.reward as bigint, 18),
                currency: 'ETH',
                targetId: log.args.proposalId?.toString(),
              },
              blockNumber: BigInt(log.blockNumber),
              transactionHash: log.transactionHash,
            });
          }
        });
      }

      // Sort by block number (descending) - newest first
      allActivities.sort((a, b) => Number(b.blockNumber - a.blockNumber));

      // Apply limit
      const limitedActivities = allActivities.slice(0, limit);

      debugLog('contracts', `Loaded ${limitedActivities.length} activities`);
      setActivities(limitedActivities);
    } catch (err) {
      console.error('Error fetching activity feed:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch activity feed'));
    } finally {
      setIsLoading(false);
    }
  }, [publicClient, type, limit]);

  useEffect(() => {
    void fetchActivities();
  }, [fetchActivities]);

  // Group activities by date for display
  const groupedActivities = useMemo(() => {
    const groups: Record<string, Activity[]> = {};

    activities.forEach(activity => {
      // Since we don't have actual timestamps, use blockNumber as proxy
      // Group by blocks in ranges of 1000
      const blockGroup = Math.floor(Number(activity.blockNumber) / 1000) * 1000;
      const groupKey = `Blocks ${blockGroup}-${blockGroup + 999}`;

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(activity);
    });

    return groups;
  }, [activities]);

  return {
    activities,
    groupedActivities,
    isLoading,
    error,
    refetch: fetchActivities,
  };
}

export default useActivityFeed;
