'use client';

import { useQuery } from '@tanstack/react-query';
import { graphqlQuery } from '@/lib/graphql/client';
import { GET_ACTIVITY_IN_RANGE, GET_JOB_STATUSES } from '@/lib/graphql/queries/analytics';

const STALE_TIME = 5 * 60 * 1000;
const GC_TIME = 30 * 60 * 1000;

export type TimeRange = '7D' | '30D' | '3M';

export const TIME_RANGES: Record<TimeRange, { days: number }> = {
  '7D': { days: 7 },
  '30D': { days: 30 },
  '3M': { days: 90 },
};

interface SubgraphActivity {
  id: string;
  type: string;
  timestamp: string;
  blockNumber: string;
}

interface ActivityResponse {
  activities: SubgraphActivity[];
  platformStats: {
    totalAgents: number;
    totalServices: number;
    totalJobs: number;
    totalProposals: number;
    totalReviews: number;
  } | null;
}

interface JobStatusResponse {
  jobs: { id: string; status: number; budget: string }[];
}

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
    totalReviews: number;
    totalAgents: number;
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

function getActivityTypePrefix(type: string): 'JOB' | 'SERVICE' | 'PROPOSAL' | null {
  if (type.startsWith('JOB_')) return 'JOB';
  if (type.startsWith('SERVICE_')) return 'SERVICE';
  if (type.startsWith('PROPOSAL_') || type.startsWith('AGENT_')) return 'PROPOSAL';
  return null;
}

export function useAnalyticsFromSubgraph(timeRange: TimeRange = '7D') {
  const now = Math.floor(Date.now() / 1000);
  const range = TIME_RANGES[timeRange];
  const fromTimestamp = now - range.days * 86400;

  const queryKey = ['subgraph-analytics', timeRange, fromTimestamp];

  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const [activityData, jobsData] = await Promise.all([
        graphqlQuery<ActivityResponse>(GET_ACTIVITY_IN_RANGE, {
          from: fromTimestamp.toString(),
          to: now.toString(),
        }),
        graphqlQuery<JobStatusResponse>(GET_JOB_STATUSES, { first: 500 }),
      ]);

      const activities = activityData?.activities || [];
      const statsRaw = activityData?.platformStats;
      const stats = Array.isArray(statsRaw) ? statsRaw[0] : statsRaw;

      const totalVolumeUSDC = 0;
      const totalVolumeETH = 0;

      const totals = {
        totalJobs: stats?.totalJobs || 0,
        totalServices: stats?.totalServices || 0,
        totalProposals: stats?.totalProposals || 0,
        totalReviews: stats?.totalReviews || 0,
        totalAgents: stats?.totalAgents || 0,
        totalVolumeUSDC,
        totalVolumeETH,
        activeJobs: 0,
        activeServices: 0,
      };

      const maxDataPoints = 14;
      const pointsInterval = Math.max(1, Math.floor(range.days / maxDataPoints));
      const dailyStats: DailyStats[] = [];

      for (let i = range.days - 1; i >= 0; i -= pointsInterval) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        dailyStats.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          jobs: 0,
          services: 0,
          proposals: 0,
          volumeUSDC: 0,
          volumeETH: 0,
        });
      }

      for (const activity of activities) {
        const ts = Number(activity.timestamp) * 1000;
        const dayLabel = new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const dayIndex = dailyStats.findIndex(d => d.date === dayLabel);
        if (dayIndex === -1) continue;

        const prefix = getActivityTypePrefix(activity.type);
        if (prefix === 'JOB') dailyStats[dayIndex].jobs++;
        else if (prefix === 'SERVICE') dailyStats[dayIndex].services++;
        else if (prefix === 'PROPOSAL') dailyStats[dayIndex].proposals++;
      }

      const jobs = jobsData?.jobs || [];
      let open = 0, funded = 0, submitted = 0, completed = 0, rejected = 0;
      for (const job of jobs) {
        if (job.status === 0) open++;
        else if (job.status === 1) funded++;
        else if (job.status === 2) submitted++;
        else if (job.status === 3) completed++;
        else if (job.status >= 4) rejected++;
      }

      const statusDistribution = { open, funded, submitted, completed, rejected };

      return {
        dailyStats,
        totals,
        statusDistribution,
      } as AnalyticsData;
    },
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });

  return {
    data: data ?? null,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
