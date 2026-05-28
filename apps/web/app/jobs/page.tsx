'use client';

import { Plus } from 'lucide-react';
import NextLink from 'next/link';
import { GridSkeleton } from '@/components/Skeletons';
import { useEffect, Suspense } from 'react';
import { EmptyStateJobs } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { useJobsDirectory } from '@/lib/hooks/useJobsDirectory';
import { JobDirectoryCard } from '@/components/jobs/directory/JobDirectoryCard';
import { JobsCommandBar } from '@/components/jobs/directory/JobsCommandBar';
import { JobsStatsStrip } from '@/components/jobs/directory/JobsStatsStrip';

const ITEMS_PER_PAGE = 10;

function JobsContent() {
  const {
    isConnected,
    jobs,
    isLoading,
    stats,
    isStatsLoading,
    searchQuery,
    setSearchQuery,
    isSearching,
    statusFilter,
    setStatusFilter,
    roleFilter,
    setRoleFilter,
    minBudget,
    setMinBudget,
    maxBudget,
    setMaxBudget,
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
  } = useJobsDirectory({ pageSize: ITEMS_PER_PAGE });

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
          <Plus className="size-4" />
          Post Job Request
        </NextLink>
      </div>

      <JobsStatsStrip stats={stats} isLoading={isStatsLoading} />

      <JobsCommandBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isSearching={isSearching}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(!showFilters)}
        isConnected={isConnected}
        roleFilter={roleFilter}
        onRoleFilterChange={setRoleFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        minBudget={minBudget}
        onMinBudgetChange={setMinBudget}
        maxBudget={maxBudget}
        onMaxBudgetChange={setMaxBudget}
      />

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
              <JobDirectoryCard key={job.id.toString()} job={job} />
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

export default function JobsPage(): JSX.Element {
  useEffect(() => { document.title = 'Jobs | Kokonut'; }, []);

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <JobsContent />
    </Suspense>
  );
}
