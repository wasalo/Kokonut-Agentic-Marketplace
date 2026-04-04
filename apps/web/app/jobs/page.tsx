'use client';

import { useAccount } from 'wagmi';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Briefcase,
  Clock,
  Plus,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Search,
  SlidersHorizontal,
  DollarSign,
  ArrowUpDown,
  Bookmark,
} from 'lucide-react';
import { Card, Button } from '@heroui/react';
import NextLink from 'next/link';
import { formatUnits } from 'viem';
import {
  useJobsFromEvents,
  getJobStatusLabel,
  getJobStatusColor,
  JobStatus,
} from '@/lib/hooks/useJobsEvents';
import { useJobEvents } from '@/lib/hooks/useJobEvents';
import { useJobBookmarks, useBookmarkCounts } from '@/lib/hooks/useBookmarks';
import { useService } from '@/lib/hooks/useServices';
import { useState, useCallback, useEffect } from 'react';
import { StatusBadge, getJobStatusBadgeType } from '@/components/StatusBadge';
import { useDebounce } from '@/lib/hooks/useDebounce';

function JobCard({ job, isConnected }: { job: any; isConnected: boolean }) {
  const { service } = useService(job.serviceId ?? BigInt(0));
  const { isBookmarked, toggleBookmark } = useJobBookmarks();
  const { getJobCount } = useBookmarkCounts();
  const formattedBudget = formatUnits(job.budget, 6);
  const isOpen = job.status === JobStatus.Open;
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
              {formattedBudget} USDC
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

        {isOpen && (
          <div className="shrink-0">
            {isConnected ? (
              <NextLink
                href={`/jobs/${jobIdStr}/proposal`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#009F4D] to-[#00c853] text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
              >
                Submit Proposal
              </NextLink>
            ) : (
              <span className="text-xs text-default-400 bg-content2 px-3 py-2 rounded-lg">
                Connect wallet to propose
              </span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

const ITEMS_PER_PAGE = 10;

export default function JobsPage(): JSX.Element {
  const [page, setPage] = useState(0);
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const searchParams = useSearchParams();

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
  const [roleFilter, setRoleFilter] = useState<string>('all'); // all, myJobs, openForBidding
  const [minBudget, setMinBudget] = useState('');
  const [maxBudget, setMaxBudget] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Debounce search query
  const [debouncedSearch, isSearching] = useDebounce((value: string) => {
    setDebouncedSearchQuery(value);
    setPage(0); // Reset to first page on search
  }, 300);

  useEffect(() => {
    debouncedSearch(searchQuery);
  }, [searchQuery, debouncedSearch]);

  const { jobs, isLoading } = useJobsFromEvents();

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
    } else if (roleFilter === 'openForBidding') {
      // Show only open jobs (no provider assigned - bidding jobs)
      if (job.status !== JobStatus.Open) return false;
      if (job.provider && job.provider !== '0x0000000000000000000000000000000000000000')
        return false;
    }

    // Status filter
    if (statusFilter !== 'all') {
      const statusNum = parseInt(statusFilter);
      if (job.status !== statusNum) return false;
    }

    // Budget filter
    const budgetInUSDC = Number(job.budget) / 1e6;
    if (minBudget && budgetInUSDC < Number(minBudget)) return false;
    if (maxBudget && budgetInUSDC > Number(maxBudget)) return false;

    return true;
  });

  // Apply URL-based sorting
  const sortedJobs = [...filteredJobs].sort((a, b) => {
    const multiplier = sortOrder === 'asc' ? 1 : -1;

    switch (sortBy) {
      case 'budget':
        return multiplier * (Number(a.budget) - Number(b.budget));
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
            {jobs.filter(j => j.status === JobStatus.Open).length}
          </div>
        </Card>
        <Card className="border border-divider p-4">
          <div className="text-sm text-default-500">In Progress</div>
          <div className="text-2xl font-bold">
            {
              jobs.filter(j => j.status === JobStatus.Funded || j.status === JobStatus.Submitted)
                .length
            }
          </div>
        </Card>
        <Card className="border border-divider p-4">
          <div className="text-sm text-default-500">Completed</div>
          <div className="text-2xl font-bold">
            {jobs.filter(j => j.status === JobStatus.Completed).length}
          </div>
        </Card>
        <Card className="border border-divider p-4">
          <div className="text-sm text-default-500">Total Jobs</div>
          <div className="text-2xl font-bold">{jobs.length}</div>
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
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-default-400" />
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
                  <option value="openForBidding">Open for Bidding</option>
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
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : sortedJobs.length === 0 ? (
        <div className="text-center py-16">
          <div className="h-16 w-16 rounded-full bg-content2 flex items-center justify-center mx-auto mb-4">
            <Briefcase className="h-8 w-8 text-default-400" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No Jobs Found</h3>
          <p className="text-default-500 max-w-md mx-auto mb-6">
            {jobs.length === 0
              ? 'No jobs have been posted yet. Be the first to create a job request!'
              : 'No jobs match your current filters. Try adjusting your search criteria.'}
          </p>
          <NextLink
            href="/jobs/create"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#009F4D] to-[#00c853] text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Post First Job
          </NextLink>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {paginatedJobs.map(job => (
              <JobCard key={job.id.toString()} job={job} isConnected={isConnected} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-8">
              <Button
                variant="ghost"
                size="sm"
                isDisabled={page === 0}
                onPress={() => setPage(p => Math.max(0, p - 1))}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>

              <span className="text-sm text-default-500">
                Page {page + 1} of {totalPages}
              </span>

              <Button
                variant="ghost"
                size="sm"
                isDisabled={page >= totalPages - 1}
                onPress={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
