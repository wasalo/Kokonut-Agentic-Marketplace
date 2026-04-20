'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePublicClient } from 'wagmi';
import { parseAbiItem, formatUnits } from 'viem';
import { getContractAddress, debugLog, DEFAULT_FROM_BLOCK } from '@/lib/contracts/config';
import { debugError } from '@/lib/debug';

// Contract addresses
const AGENTIC_COMMERCE_ADDRESS = getContractAddress('AGENTIC_COMMERCE');
const SERVICE_REGISTRY_ADDRESS = getContractAddress('SERVICE_REGISTRY');
const AGENT_REVIEW_ADDRESS = getContractAddress('AGENT_REVIEW');

// From block (Sepolia deployment)
const FROM_BLOCK = DEFAULT_FROM_BLOCK;

// Time range constants (approx 12s per block)
export type TimeRange = '7D' | '30D' | '3M';

export const TIME_RANGES: Record<TimeRange, { blocks: number; days: number }> = {
  '7D': { blocks: 50400, days: 7 },
  '30D': { blocks: 216000, days: 30 },
  '3M': { blocks: 648000, days: 90 },
};

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
 * Hook to fetch analytics data from events
 * @param timeRange - Time range for analytics: '7D' (7 days), '30D' (30 days), '3M' (90 days)
 */
export function useAnalytics(timeRange: TimeRange = '7D') {
  const publicClient = usePublicClient();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchAnalytics = useCallback(async () => {
    if (!publicClient) return;

    setIsLoading(true);
    setError(null);

    try {
      const range = TIME_RANGES[timeRange];
      debugLog('contracts', `Fetching ${timeRange} analytics...`);

      // Get current block number
      const currentBlock = await publicClient.getBlockNumber();
      const fromBlock =
        currentBlock - BigInt(range.blocks) > FROM_BLOCK
          ? currentBlock - BigInt(range.blocks)
          : FROM_BLOCK;

      // Initialize daily stats array for the selected time range
      // Show at most 14 data points for readability (sample every N days)
      const maxDataPoints = 14;
      const pointsInterval = Math.max(1, Math.floor(range.days / maxDataPoints));
      const dailyStats: DailyStats[] = [];

      for (let i = range.days - 1; i >= 0; i -= pointsInterval) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        dailyStats.push({
          date: date.toLocaleDateString('en-US', {
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

      // For demo purposes, distribute events across the data points
      // In production, you'd use the actual block timestamps
      const dataPoints = dailyStats.length;
      jobCreatedLogs.forEach((_, index) => {
        const dayIndex = index % dataPoints;
        dailyStats[dayIndex].jobs++;
      });

      serviceCreatedLogs.forEach((_, index) => {
        const dayIndex = index % dataPoints;
        dailyStats[dayIndex].services++;
      });

      proposalCreatedLogs.forEach((_, index) => {
        const dayIndex = index % dataPoints;
        dailyStats[dayIndex].proposals++;
      });

      // Add volume data
      jobFundedLogs.forEach((log, index) => {
        const dayIndex = index % dataPoints;
        const amount = (log.args?.amount as bigint) || BigInt(0);
        dailyStats[dayIndex].volumeUSDC += Number(formatUnits(amount, 6));
      });

      proposalCreatedLogs.forEach((log, index) => {
        const dayIndex = index % dataPoints;
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
      debugError('hooks', 'useAnalytics: Error fetching analytics', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch analytics'));
    } finally {
      setIsLoading(false);
    }
  }, [publicClient, timeRange]);

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
