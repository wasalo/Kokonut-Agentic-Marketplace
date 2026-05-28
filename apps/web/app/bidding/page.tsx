'use client';

import {
  Gavel,
  Plus,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Card, Button } from '@heroui/react';
import NextLink from 'next/link';
import { Suspense, useEffect } from 'react';
import { useBiddingDirectory } from '@/lib/hooks/useBiddingDirectory';
import { BiddingCommandBar } from '@/components/bidding/BiddingCommandBar';
import { BiddingSessionCard } from '@/components/bidding/BiddingSessionCard';
import { BiddingStatsStrip } from '@/components/bidding/BiddingStatsStrip';

const ITEMS_PER_PAGE = 10;

function BiddingContent() {
  const {
    isConnected,
    totalCount,
    isLoading,
    sortBy,
    sortOrder,
    handleSortChange,
    page,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    showFilters,
    setShowFilters,
    filteredSessions,
    paginatedSessions,
    totalPages,
    activeCount,
    inProgressCount,
    handleNextPage,
    handlePrevPage,
  } = useBiddingDirectory({ pageSize: ITEMS_PER_PAGE });

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-[#009F4D] to-[#00c853] rounded-xl">
            <Gavel className="size-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Bidding Sessions</h1>
            <p className="text-default-500">Browse and participate in open bidding sessions</p>
          </div>
        </div>
        {isConnected && (
          <NextLink href="/bidding/create">
            <Button className="bg-[#009F4D] text-white font-medium">
              <Plus className="size-4 mr-1" />
              Create Session
            </Button>
          </NextLink>
        )}
      </div>

      <BiddingStatsStrip
        totalCount={totalCount}
        activeCount={activeCount}
        inProgressCount={inProgressCount}
        isLoading={isLoading}
      />

      <BiddingCommandBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(!showFilters)}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={handleSortChange}
      />

      {/* Sessions List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-[#009F4D]" />
        </div>
      ) : filteredSessions.length > 0 ? (
        <div className="space-y-4">
          {paginatedSessions.map(session => (
            <BiddingSessionCard key={session.id.toString()} session={session} isConnected={isConnected} />
          ))}
        </div>
      ) : (
        <Card className="border border-divider p-12 text-center">
          <Gavel className="size-122 mx-auto text-default-300 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No bidding sessions found</h3>
          <p className="text-default-500 mb-4">
            {searchQuery || statusFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Be the first to create a bidding session!'}
          </p>
          {isConnected && !searchQuery && statusFilter === 'all' && (
            <NextLink href="/bidding/create">
              <Button className="bg-[#009F4D] text-white">
                <Plus className="size-4 mr-1" />
                Create Session
              </Button>
            </NextLink>
          )}
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-8">
          <Button variant="ghost" size="sm" isDisabled={page === 0} onPress={handlePrevPage}>
            <ChevronLeft className="size-4 mr-1" />
            Previous
          </Button>
          <span className="text-sm text-default-500">
            Page {page + 1} of {totalPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            isDisabled={page + 1 >= totalPages}
            onPress={handleNextPage}
          >
            Next
            <ChevronRight className="size-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default function BiddingPage(): JSX.Element {
  useEffect(() => {
    document.title = 'Bidding | Kokonut Agent Economy';
  }, []);

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BiddingContent />
    </Suspense>
  );
}
