'use client';

import { useAccount } from 'wagmi';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Clock,
  Plus,
  DollarSign,
  Search,
  SlidersHorizontal,
  Bookmark,
} from 'lucide-react';
import { Card } from '@heroui/react';
import NextLink from 'next/link';
import {
  useJobs,
} from '@/lib/hooks/useJobs';
import { JobStatus } from '@/lib/types/contracts';
import { useJobEvents } from '@/lib/hooks/useJobEvents';
import { useJobBookmarks, useBookmarkCounts } from '@/lib/hooks/useBookmarks';
import { useService } from '@/lib/hooks/useServices';
import { GridSkeleton } from '@/components/Skeletons';
import { useState, useCallback, useEffect, memo } from 'react';
import { StatusBadge, getJobStatusBadgeType } from '@/components/StatusBadge';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { EmptyStateJobs } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { useJobStatsFromSubgraph } from '@/lib/hooks/useJobStatsFromSubgraph';
import { formatAmount, getTokenByAddress, tokenAmountToUsd } from '@/lib/tokenUtils';

const JobCard = memo(function JobCard({ job }: { job: any }) {
  const { service } = useService(job.serviceId ?? BigInt(0));
  const { isBookmarked, toggleBookmark } = useJobBookmarks();
  const { getJobCount } = useBookmarkCounts();
  const token = getTokenByAddress(job.paymentToken);
  const formattedBudget = formatAmount(job.budget, token, {
    includeSymbol: true,
    minFractionDigits: token.symbol === 'USDC' ? 2 : 0,
    maxFractionDigits: token.symbol === 'USDC' ? 2 : 6,
  });
  const jobIdStr = job.id.toString();
  const bookmarked = isBookmarked(jobIdStr);
  const bookmarkCount = getJobCount(jobIdStr);

  const handleBookmark = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleBookmark(jobIdStr);
  };

  return (
    <Card className="border border-divider p-4 hover:border-success/30 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <NextLink href={`/jobs/${jobIdStr}`} className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">Job #{jobIdStr}</h3>
            <StatusBadge status={getJobStatusBadgeType(job.status)} size="sm" />
          </div>
          <p className="text-sm text-default-500 mt-0.5 truncate">{job.description}</p>
          {service && Number(service.id) > 0 && (
            <p className="text-xs text-default-400 mt-0.5">Service: {service.name}</p>
          )}
          <div className="flex items-center gap-4 mt-2 text-xs text-default-400">
            <span className="flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              {formattedBudget}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(Number(job.expiredAt) * 1000).toLocaleDateString()}
            </span>
          </div>
        </NextLink>

        <div className="flex flex-col items-end gap-2">
          <button
            onClick={handleBookmark}
            className={`p-2 rounded-lg transition-colors ${
              bookmarked
                ? 'text-[#009F4D] hover:bg-[#009F4D]/10'
                : 'text-default-400 hover:text-default-600 hover:bg-default-100'
            }`}
            title={bookmarked ? 'Remove bookmark' : 'Bookmark this job'}
          >
            <Bookmark className={`w-5 h-5 ${bookmarked ? 'fill-current' : ''}`} />
          </button>
          {bookmarkCount > 0 && <span className="text-xs text-default-400">{bookmarkCount}</span>}
        </div>
      </div>
    </Card>
  );
});

const ITEMS_PER_PAGE = 10;

export default function JobsPage(): JSX.Element {
  useEffect(() => { document.title = 'Jobs | Kokonut'; }, []);
  const { address, isConnected } = useAccount();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Enable event-driven updates for real-time job status
  useJobEvents();

  // URL-based sorting
  const sortBy = searchParams.get('sort') || 'newest';
  const sortOrder = searchParams.get('order') || 'desc';

  const handleSortChange = useCallback(
    (newSortBy: string, newSortOrder: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('sort', newSortBy);
      params.set('order', newSortOrder);
      router.push(`/jobs?${params.toString()}`);
    },
    [searchParams, router]
  );

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all'); // all, myJobs
  const [minBudget, setMinBudget] = useState('');
  const [maxBudget, setMaxBudget] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(0);

  // Debounce search query
  const [debouncedSearch, isSearching] = useDebounce((value: string) => {
    setDebouncedSearchQuery(value);
    setPage(0); // Reset to first page on search
  }, 300);

  useEffect(() => {
    debouncedSearch(searchQuery);
  }, [searchQuery, debouncedSearch]);

  const { jobs, isLoading } = useJobs(0, 100);
  const { stats: subgraphStats, isLoading: isStatsLoading } = useJobStatsFromSubgraph();

  // Filter jobs
  const filteredJobs = jobs.filter(job => {
    // Search filter (debounced)
    if (
      debouncedSearchQuery &&
      !job.description.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
    ) {
      return false;
    }

// Role filter
    if (roleFilter === 'myJobs' && address) {
      // Show jobs where user is client, provider, or evaluator
      const isClient = job.client?.toLowerCase() === address.toLowerCase();
      const isProvider = job.provider?.toLowerCase() === address.toLowerCase();
      const isEvaluator = job.evaluator?.toLowerCase() === address.toLowerCase();
      if (!isClient && !isProvider && !isEvaluator) return false;
    }

    // Status filter
    if (statusFilter !== 'all') {
      const statusNum = parseInt(statusFilter);
      if (job.status !== statusNum) return false;
    }

    // Budget filter
    const token = getTokenByAddress(job.paymentToken);
    const budgetInUsd = tokenAmountToUsd(job.budget, token);
    if (minBudget && budgetInUsd < Number(minBudget)) return false;
    if (maxBudget && budgetInUsd > Number(maxBudget)) return false;

    return true;
  });

  // Apply URL-based sorting
  const sortedJobs = [...filteredJobs].sort((a, b) => {
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
  });

  // Pagination
  const totalPages = Math.ceil(sortedJobs.length / ITEMS_PER_PAGE);
  const paginatedJobs = sortedJobs.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Jobs Directory</h1>
          <p className="text-default-500">Browse open job requests and submit your proposal</p>
        </div>
        <NextLink
          href="/jobs/create"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#009F4D] to-[#00c853] text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Post Job Request
        </NextLink>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="border border-divider p-4">
          <div className="text-sm text-default-500">Open Jobs</div>
          <div className="text-2xl font-bold">
            {isStatsLoading ? '...' : subgraphStats.openJobs}
          </div>
        </Card>
        <Card className="border border-divider p-4">
          <div className="text-sm text-default-500">In Progress</div>
          <div className="text-2xl font-bold">
            {isStatsLoading ? '...' : subgraphStats.inProgressJobs}
          </div>
        </Card>
        <Card className="border border-divider p-4">
          <div className="text-sm text-default-500">Completed</div>
          <div className="text-2xl font-bold">
            {isStatsLoading ? '...' : subgraphStats.completedJobs}
          </div>
        </Card>
        <Card className="border border-divider p-4">
          <div className="text-sm text-default-500">Total Jobs</div>
          <div className="text-2xl font-bold">
            {isStatsLoading ? '...' : subgraphStats.totalJobs}
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border border-divider p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-default-400" />
            <input
              type="text"
              placeholder="Search jobs..."
              className="w-full pl-10 pr-10 py-2 border border-divider rounded-lg bg-content2 focus:outline-none focus:ring-2 focus:ring-success text-foreground"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {isSearching && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin rounded-full border-2 border-default-400 border-t-transparent" />
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 border border-divider rounded-lg hover:bg-content2 transition-colors ${showFilters ? 'bg-content2' : ''}`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">Filters</span>
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-divider grid grid-cols-1 sm:grid-cols-4 gap-4">
            {isConnected && (
              <div>
                <label className="text-sm font-medium text-default-500 mb-2 block">Role</label>
                <select
                  value={roleFilter}
                  onChange={e => {
                    setRoleFilter(e.target.value);
                    setPage(0);
                  }}
                  className="w-full px-3 py-2 border border-divider rounded-lg bg-content2 focus:outline-none focus:ring-2 focus:ring-success"
                >
                  <option value="all">All Jobs</option>
                  <option value="myJobs">My Jobs</option>
                </select>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-default-500 mb-2 block">Status</label>
              <select
                value={statusFilter}
                onChange={e => {
                  setStatusFilter(e.target.value);
                  setPage(0);
                }}
                className="w-full px-3 py-2 border border-divider rounded-lg bg-content2 focus:outline-none focus:ring-2 focus:ring-success"
              >
                <option value="all">All Statuses</option>
                <option value={JobStatus.Open.toString()}>Open</option>
                <option value={JobStatus.Funded.toString()}>Funded</option>
                <option value={JobStatus.Submitted.toString()}>In Progress</option>
                <option value={JobStatus.Completed.toString()}>Completed</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-default-500 mb-2 block">
                Min Budget (USDC)
              </label>
              <input
                type="number"
                placeholder="0"
                value={minBudget}
                onChange={e => {
                  setMinBudget(e.target.value);
                  setPage(0);
                }}
                className="w-full px-3 py-2 border border-divider rounded-lg bg-content2 focus:outline-none focus:ring-2 focus:ring-success"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-default-500 mb-2 block">
                Max Budget (USDC)
              </label>
              <input
                type="number"
                placeholder="Any"
                value={maxBudget}
                onChange={e => {
                  setMaxBudget(e.target.value);
                  setPage(0);
                }}
                className="w-full px-3 py-2 border border-divider rounded-lg bg-content2 focus:outline-none focus:ring-2 focus:ring-success"
              />
            </div>
          </div>
        )}
      </Card>

      {/* Sort Controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-sm text-default-500">Sort by:</span>
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={e => {
              const [newSortBy, newSortOrder] = e.target.value.split('-');
              handleSortChange(newSortBy, newSortOrder);
            }}
            className="px-3 py-2 border border-divider rounded-lg bg-content2 focus:outline-none focus:ring-2 focus:ring-success text-sm"
          >
            <option value="newest-desc">Newest First</option>
            <option value="newest-asc">Oldest First</option>
            <option value="budget-asc">Budget: Low to High</option>
            <option value="budget-desc">Budget: High to Low</option>
            <option value="deadline-asc">Deadline: Soonest</option>
            <option value="deadline-desc">Deadline: Latest</option>
          </select>
        </div>
        <span className="text-sm text-default-500">{sortedJobs.length} jobs</span>
      </div>

      {isLoading ? (
        <GridSkeleton count={8} />
      ) : sortedJobs.length === 0 ? (
        <EmptyStateJobs
          description={
            jobs.length === 0
              ? 'No jobs have been posted yet. Be the first to create a job request!'
              : 'No jobs match your current filters. Try adjusting your search criteria.'
          }
        />
      ) : (
        <>
          <div className="space-y-3">
            {paginatedJobs.map(job => (
              <JobCard key={job.id.toString()} job={job} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-8">
              <Pagination
                currentPage={page}
                totalItems={sortedJobs.length}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
