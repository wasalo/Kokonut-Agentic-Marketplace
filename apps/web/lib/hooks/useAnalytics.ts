'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePublicClient } from 'wagmi';
import { parseAbiItem, formatUnits } from 'viem';
import { CONTRACT_ADDRESSES, getContractAddress, debugLog } from '@/lib/contracts/config';

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

// 7 days worth of blocks (approx 12s per block = ~50,400 blocks)
const BLOCKS_PER_7_DAYS = 50400;

export interface DailyStats {
  date: string;
  jobs: number;
  services: number;
  proposals: number;
  volumeUSDC: number;
  volumeETH: number;
}

export interface AnalyticsData {
  dailyStats: DailyStats[];
  totals: {
    totalJobs: number;
    totalServices: number;
    totalProposals: number;
    totalVolumeUSDC: number;
    totalVolumeETH: number;
    activeJobs: number;
    activeServices: number;
  };
  statusDistribution: {
    open: number;
    funded: number;
    submitted: number;
    completed: number;
    rejected: number;
  };
}

/**
 * Hook to fetch 7-day analytics data from events
 */
export function useAnalytics() {
  const publicClient = usePublicClient();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchAnalytics = useCallback(async () => {
    if (!publicClient) return;

    setIsLoading(true);
    setError(null);

    try {
      debugLog('contracts', 'Fetching 7-day analytics...');

      // Get current block number
      const currentBlock = await publicClient.getBlockNumber();
      const fromBlock =
        currentBlock - BigInt(BLOCKS_PER_7_DAYS) > FROM_BLOCK
          ? currentBlock - BigInt(BLOCKS_PER_7_DAYS)
          : FROM_BLOCK;

      // Initialize daily stats array for last 7 days
      const dailyStats: DailyStats[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        dailyStats.push({
          date: date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          }),
          jobs: 0,
          services: 0,
          proposals: 0,
          volumeUSDC: 0,
          volumeETH: 0,
        });
      }

      // Fetch JobCreated events
      const jobCreatedLogs = await publicClient.getLogs({
        address: AGENTIC_COMMERCE_ADDRESS,
        event: parseAbiItem(
          'event JobCreated(uint256 indexed jobId, address indexed client, address indexed provider, address evaluator, uint256 serviceId, uint256 expiredAt)'
        ),
        fromBlock,
        toBlock: 'latest',
      });

      // Fetch JobFunded events for volume
      const jobFundedLogs = await publicClient.getLogs({
        address: AGENTIC_COMMERCE_ADDRESS,
        event: parseAbiItem(
          'event JobFunded(uint256 indexed jobId, address indexed client, uint256 amount)'
        ),
        fromBlock,
        toBlock: 'latest',
      });

      // Fetch ServiceCreated events
      const serviceCreatedLogs = await publicClient.getLogs({
        address: SERVICE_REGISTRY_ADDRESS,
        event: parseAbiItem(
          'event ServiceCreated(uint256 indexed serviceId, address indexed provider, uint256 indexed agentId)'
        ),
        fromBlock,
        toBlock: 'latest',
      });

      // Fetch ProposalCreated events
      const proposalCreatedLogs = await publicClient.getLogs({
        address: AGENT_REVIEW_ADDRESS,
        event: parseAbiItem(
          'event ProposalCreated(uint256 indexed proposalId, address indexed proposer, uint256 reward)'
        ),
        fromBlock,
        toBlock: 'latest',
      });

      // Calculate totals
      const totals = {
        totalJobs: jobCreatedLogs.length,
        totalServices: serviceCreatedLogs.length,
        totalProposals: proposalCreatedLogs.length,
        totalVolumeUSDC: jobFundedLogs.reduce((sum, log) => {
          const amount = (log.args?.amount as bigint) || BigInt(0);
          return sum + Number(formatUnits(amount, 6));
        }, 0),
        totalVolumeETH: proposalCreatedLogs.reduce((sum, log) => {
          const reward = (log.args?.reward as bigint) || BigInt(0);
          return sum + Number(formatUnits(reward, 18));
        }, 0),
        activeJobs: 0, // Would need additional logic
        activeServices: 0, // Would need additional logic
      };

      // Status distribution (mock data for now - would need to fetch actual statuses)
      const statusDistribution = {
        open: Math.floor(jobCreatedLogs.length * 0.3),
        funded: Math.floor(jobCreatedLogs.length * 0.25),
        submitted: Math.floor(jobCreatedLogs.length * 0.2),
        completed: Math.floor(jobCreatedLogs.length * 0.15),
        rejected: Math.floor(jobCreatedLogs.length * 0.1),
      };

      // For demo purposes, distribute events across the 7 days
      // In production, you'd use the actual block timestamps
      jobCreatedLogs.forEach((_, index) => {
        const dayIndex = index % 7;
        dailyStats[dayIndex].jobs++;
      });

      serviceCreatedLogs.forEach((_, index) => {
        const dayIndex = index % 7;
        dailyStats[dayIndex].services++;
      });

      proposalCreatedLogs.forEach((_, index) => {
        const dayIndex = index % 7;
        dailyStats[dayIndex].proposals++;
      });

      // Add volume data
      jobFundedLogs.forEach((log, index) => {
        const dayIndex = index % 7;
        const amount = (log.args?.amount as bigint) || BigInt(0);
        dailyStats[dayIndex].volumeUSDC += Number(formatUnits(amount, 6));
      });

      proposalCreatedLogs.forEach((log, index) => {
        const dayIndex = index % 7;
        const reward = (log.args?.reward as bigint) || BigInt(0);
        dailyStats[dayIndex].volumeETH += Number(formatUnits(reward, 18));
      });

      setData({
        dailyStats,
        totals,
        statusDistribution,
      });

      debugLog(
        'contracts',
        `Analytics loaded: ${totals.totalJobs} jobs, ${totals.totalServices} services`
      );
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch analytics'));
    } finally {
      setIsLoading(false);
    }
  }, [publicClient]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchAnalytics,
  };
}

export default useAnalytics;
