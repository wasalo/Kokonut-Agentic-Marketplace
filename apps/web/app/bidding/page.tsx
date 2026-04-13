'use client';

import { useAccount } from 'wagmi';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Gavel,
  Clock,
  Plus,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Search,
  SlidersHorizontal,
  DollarSign,
  Users,
} from 'lucide-react';
import { Card, Button } from '@heroui/react';
import NextLink from 'next/link';
import { formatEther } from 'viem';
import {
  useBiddingSessions,
  SessionStatus,
  SessionStatusType,
} from '@/lib/hooks/useBiddingSystem';
import { useState, useCallback, useMemo } from 'react';
import { StatusBadge } from '@/components/StatusBadge';

const ITEMS_PER_PAGE = 10;

const SESSION_STATUS_BADGE: Record<SessionStatusType, string> = {
  [SessionStatus.Active]: 'active',
  [SessionStatus.BiddingClosed]: 'pending',
  [SessionStatus.WinnerSelected]: 'under-review',
  [SessionStatus.JobCreated]: 'under-review',
  [SessionStatus.Completed]: 'completed',
  [SessionStatus.Cancelled]: 'cancelled',
};

function SessionCard({ session, isConnected }: { session: any; isConnected: boolean }) {
  const sessionIdStr = session.id.toString();
  const isActive = session.status === SessionStatus.Active;
  const maxBudgetEth = Number(formatEther(session.maxBudget));
  const deadlineDate = new Date(Number(session.deadline) * 1000);

  return (
    <Card className="border border-divider p-4 hover:border-[#009F4D]/30 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <NextLink href={`/bidding/${sessionIdStr}`} className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">Session #{sessionIdStr}</h3>
            <StatusBadge
              status={SESSION_STATUS_BADGE[session.status as SessionStatusType] as any}
              size="sm"
            />
          </div>
          <p className="text-sm text-default-500 mt-0.5 truncate">Evaluator: {session.evaluator}</p>
          <div className="flex items-center gap-4 mt-2 text-xs text-default-400">
            <span className="flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              Max: {maxBudgetEth.toFixed(4)} ETH
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Deadline: {deadlineDate.toLocaleDateString()}
            </span>
            {session.serviceId > 0 && (
              <span className="flex items-center gap-1">
                Service #{session.serviceId.toString()}
              </span>
            )}
          </div>
        </NextLink>

        {isActive && (
          <div className="shrink-0">
            {isConnected ? (
              <NextLink
                href={`/bidding/${sessionIdStr}`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#009F4D] to-[#00c853] text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
              >
                View Session
              </NextLink>
            ) : (
              <span className="text-xs text-default-400 bg-content2 px-3 py-2 rounded-lg">
                Connect wallet to bid
              </span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

export default function BiddingPage(): JSX.Element {
  const [page, setPage] = useState(0);
  const { isConnected } = useAccount();
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL-based sorting
  const sortBy = searchParams.get('sort') || 'newest';
  const sortOrder = searchParams.get('order') || 'desc';

  const handleSortChange = useCallback(
    (newSortBy: string, newSortOrder: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('sort', newSortBy);
      params.set('order', newSortOrder);
      router.push(`/bidding?${params.toString()}`);
    },
    [searchParams, router]
  );

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  const { sessions, totalCount, isLoading } = useBiddingSessions();

  const filteredSessions = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    const filtered = sessions.filter(session => {
      if (statusFilter !== 'all' && session.status !== Number(statusFilter)) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return (
        session.id.toString().includes(normalizedSearch) ||
        session.creator.toLowerCase().includes(normalizedSearch) ||
        session.evaluator.toLowerCase().includes(normalizedSearch)
      );
    });

    filtered.sort((a, b) => {
      const multiplier = sortOrder === 'asc' ? 1 : -1;

      switch (sortBy) {
        case 'budget':
          return multiplier * Number(a.maxBudget - b.maxBudget);
        case 'newest':
        default:
          return multiplier * Number(a.id - b.id);
      }
    });

    return filtered;
  }, [searchQuery, sessions, sortBy, sortOrder, statusFilter]);

  const totalPages = Math.ceil(filteredSessions.length / ITEMS_PER_PAGE);
  const paginatedSessions = filteredSessions.slice(
    page * ITEMS_PER_PAGE,
    (page + 1) * ITEMS_PER_PAGE
  );

  // Handle pagination
  const handleNextPage = () => {
    if ((page + 1) * ITEMS_PER_PAGE < totalCount) {
      setPage(page + 1);
    }
  };

  const handlePrevPage = () => {
    if (page > 0) {
      setPage(page - 1);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-[#009F4D] to-[#00c853] rounded-xl">
            <Gavel className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Bidding Sessions</h1>
            <p className="text-default-500">Browse and participate in open bidding sessions</p>
          </div>
        </div>
        {isConnected && (
          <NextLink href="/bidding/create">
            <Button className="bg-[#009F4D] text-white font-medium">
              <Plus className="w-4 h-4 mr-1" />
              Create Session
            </Button>
          </NextLink>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="border border-divider p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#009F4D]/10 rounded-lg">
              <Gavel className="w-5 h-5 text-[#009F4D]" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : totalCount}
              </p>
              <p className="text-sm text-default-500">Total Sessions</p>
            </div>
          </div>
        </Card>
        <Card className="border border-divider p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-success/10 rounded-lg">
              <Clock className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {isLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  filteredSessions.filter(s => s.status === SessionStatus.Active).length
                )}
              </p>
              <p className="text-sm text-default-500">Active Sessions</p>
            </div>
          </div>
        </Card>
        <Card className="border border-divider p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {isLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  filteredSessions.filter(s => s.status === SessionStatus.WinnerSelected).length
                )}
              </p>
              <p className="text-sm text-default-500">In Progress</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border border-divider p-4 mb-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-default-400" />
              <input
                type="text"
                placeholder="Search sessions..."
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setPage(0);
                }}
                className="w-full pl-10 pr-4 py-2 bg-content1 border border-divider rounded-lg focus:outline-none focus:border-[#009F4D]"
              />
            </div>

            {/* Filter Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onPress={() => setShowFilters(!showFilters)}
              className={showFilters ? 'bg-[#009F4D]/20' : ''}
            >
              <SlidersHorizontal className="w-4 h-4 mr-1" />
              Filters
            </Button>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-default-500">Sort:</span>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={e => {
                const [newSort, newOrder] = e.target.value.split('-');
                handleSortChange(newSort, newOrder);
              }}
              className="bg-content1 border border-divider rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#009F4D]"
            >
              <option value="newest-desc">Newest First</option>
              <option value="newest-asc">Oldest First</option>
              <option value="budget-desc">Budget (High to Low)</option>
              <option value="budget-asc">Budget (Low to High)</option>
            </select>
          </div>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-divider">
            <div className="flex items-center gap-4">
              <div>
                <label className="text-sm text-default-500 mb-1 block">Status</label>
                <select
                  value={statusFilter}
                  onChange={e => {
                    setStatusFilter(e.target.value);
                    setPage(0);
                  }}
                  className="bg-content1 border border-divider rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#009F4D]"
                >
                  <option value="all">All Statuses</option>
                  <option value="0">Active</option>
                  <option value="1">Bidding Closed</option>
                  <option value="2">Winner Selected</option>
                  <option value="3">Job Created</option>
                  <option value="4">Completed</option>
                  <option value="5">Cancelled</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Sessions List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#009F4D]" />
        </div>
      ) : filteredSessions.length > 0 ? (
        <div className="space-y-4">
          {paginatedSessions.map(session => (
            <SessionCard key={session.id.toString()} session={session} isConnected={isConnected} />
          ))}
        </div>
      ) : (
        <Card className="border border-divider p-12 text-center">
          <Gavel className="w-12 h-12 mx-auto text-default-300 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No bidding sessions found</h3>
          <p className="text-default-500 mb-4">
            {searchQuery || statusFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Be the first to create a bidding session!'}
          </p>
          {isConnected && !searchQuery && statusFilter === 'all' && (
            <NextLink href="/bidding/create">
              <Button className="bg-[#009F4D] text-white">
                <Plus className="w-4 h-4 mr-1" />
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
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>
          <span className="text-sm text-default-500">
            Page {page + 1} of {totalPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            isDisabled={(page + 1) * ITEMS_PER_PAGE >= totalCount}
            onPress={handleNextPage}
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
