'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAccount } from 'wagmi';
import { useRouter, useSearchParams } from 'next/navigation';
import { JobStatus, useJobs, type Job } from '@/lib/hooks/useJobs';
import { useJobEvents } from '@/lib/hooks/useJobEvents';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { getTokenByAddress, tokenAmountToUsd } from '@/lib/tokenUtils';

interface UseJobsDirectoryOptions {
  routePath?: string;
  pageSize?: number;
  fetchCount?: number;
}

export function useJobsDirectory({
  routePath = '/jobs',
  pageSize = 10,
  fetchCount = 100,
}: UseJobsDirectoryOptions = {}) {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const searchParams = useSearchParams();

  useJobEvents();

  const sortBy = searchParams.get('sort') || 'newest';
  const sortOrder = searchParams.get('order') || 'desc';

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [minBudget, setMinBudget] = useState('');
  const [maxBudget, setMaxBudget] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(0);

  const [debouncedSearch, isSearching] = useDebounce((value: string) => {
    setDebouncedSearchQuery(value);
    setPage(0);
  }, 300);

  useEffect(() => {
    debouncedSearch(searchQuery);
  }, [searchQuery, debouncedSearch]);

  const { jobs, isLoading } = useJobs(0, fetchCount);

  const hookStats = useMemo(
    () => ({
      openJobs: jobs.filter(job => job.status === JobStatus.Open).length,
      inProgressJobs: jobs.filter(job => job.status === JobStatus.Submitted || job.status === JobStatus.Funded).length,
      completedJobs: jobs.filter(job => job.status === JobStatus.Completed).length,
      totalJobs: jobs.length,
    }),
    [jobs]
  );

  const handleSortChange = useCallback(
    (newSortBy: string, newSortOrder: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('sort', newSortBy);
      params.set('order', newSortOrder);
      router.replace(`${routePath}?${params.toString()}`);
    },
    [routePath, searchParams, router]
  );

  const filteredJobs = useMemo(
    () =>
      jobs.filter(job => {
        if (
          debouncedSearchQuery &&
          !job.description.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
        ) {
          return false;
        }

        if (roleFilter === 'myJobs' && address) {
          const isClient = job.client?.toLowerCase() === address.toLowerCase();
          const isProvider = job.provider?.toLowerCase() === address.toLowerCase();
          const isEvaluator = job.evaluator?.toLowerCase() === address.toLowerCase();
          if (!isClient && !isProvider && !isEvaluator) return false;
        }

        if (statusFilter !== 'all') {
          const statusNum = parseInt(statusFilter, 10);
          if (job.status !== statusNum) return false;
        }

        const token = getTokenByAddress(job.paymentToken);
        const budgetInUsd = tokenAmountToUsd(job.budget, token);
        if (minBudget && budgetInUsd < Number(minBudget)) return false;
        if (maxBudget && budgetInUsd > Number(maxBudget)) return false;

        return true;
      }),
    [jobs, debouncedSearchQuery, roleFilter, address, statusFilter, minBudget, maxBudget]
  );

  const sortedJobs = useMemo(
    () =>
      [...filteredJobs].sort((a: Job, b: Job) => {
        const multiplier = sortOrder === 'asc' ? 1 : -1;

        switch (sortBy) {
          case 'budget':
            return multiplier * (
              tokenAmountToUsd(a.budget, getTokenByAddress(a.paymentToken)) -
              tokenAmountToUsd(b.budget, getTokenByAddress(b.paymentToken))
            );
          case 'deadline':
            return multiplier * (Number(a.expiredAt) - Number(b.expiredAt));
          case 'newest':
          default:
            return multiplier * (Number(a.id) - Number(b.id));
        }
      }),
    [filteredJobs, sortBy, sortOrder]
  );

  const totalPages = Math.ceil(sortedJobs.length / pageSize);
  const paginatedJobs = useMemo(
    () => sortedJobs.slice(page * pageSize, (page + 1) * pageSize),
    [sortedJobs, page, pageSize]
  );

  const updateFilter = useCallback(
    (setter: (value: string) => void) => (value: string) => {
      setter(value);
      setPage(0);
    },
    []
  );

  return {
    address,
    isConnected,
    jobs,
    isLoading,
    stats: hookStats,
    searchQuery,
    setSearchQuery,
    isSearching,
    statusFilter,
    setStatusFilter: updateFilter(setStatusFilter),
    roleFilter,
    setRoleFilter: updateFilter(setRoleFilter),
    minBudget,
    setMinBudget: updateFilter(setMinBudget),
    maxBudget,
    setMaxBudget: updateFilter(setMaxBudget),
    showFilters,
    setShowFilters,
    sortBy,
    sortOrder,
    handleSortChange,
    sortedJobs,
    paginatedJobs,
    page,
    setPage,
    totalPages,
    pageSize,
    JobStatus,
  };
}
