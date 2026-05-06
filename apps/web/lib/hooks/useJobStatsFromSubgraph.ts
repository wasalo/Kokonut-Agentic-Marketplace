'use client';

import { useQuery } from '@tanstack/react-query';
import { graphqlQuery } from '@/lib/graphql/client';
import { GET_JOB_STATS } from '@/lib/graphql/queries/stats';

interface JobStatsData {
  platformStats: { totalJobs: number }[] | null;
  jobs: { status: number }[];
}

export interface JobStats {
  totalJobs: number;
  openJobs: number;
  inProgressJobs: number;
  completedJobs: number;
}

export function useJobStatsFromSubgraph() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['subgraph-job-stats'],
    queryFn: async () => {
      const result = await graphqlQuery<JobStatsData>(GET_JOB_STATS);
      const statsRaw = result?.platformStats;
      const stats = Array.isArray(statsRaw) ? statsRaw[0] : statsRaw;
      const totalJobs = stats?.totalJobs || 0;
      const jobs = result?.jobs || [];

      const openJobs = jobs.filter(j => j.status === 0).length;
      const inProgressJobs = jobs.filter(j => j.status === 1 || j.status === 2).length;
      const completedJobs = jobs.filter(j => j.status === 3).length;

      return { totalJobs, openJobs, inProgressJobs, completedJobs } satisfies JobStats;
    },
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return {
    stats: data || { totalJobs: 0, openJobs: 0, inProgressJobs: 0, completedJobs: 0 },
    isLoading,
    error,
    refetch,
  };
}
