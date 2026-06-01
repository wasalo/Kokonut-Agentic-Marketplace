'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAccount } from 'wagmi';
import {
  SessionStatus,
  useBiddingSessions,
  type BiddingSession,
} from '@/lib/hooks/useBiddingSystem';

interface UseBiddingDirectoryOptions {
  routePath?: string;
  pageSize?: number;
  /**
   * If set, filters to sessions where the given address is the bidder (via
   * `getUserBid`). When supplied, the hook expects an additional `getUserBid`
   * loader to be available via the same `useBiddingSessions` flow.
   */
  bidder?: `0x${string}`;
  /**
   * If set, restricts the returned sessions to a list of session ids (e.g. for
   * "My Bids" panels that already know the user's session ids).
   */
  sessionIds?: bigint[];
}

export function useBiddingDirectory({
  routePath = '/bidding',
  pageSize = 10,
  bidder,
  sessionIds,
}: UseBiddingDirectoryOptions = {}) {
  const { isConnected } = useAccount();
  const router = useRouter();
  const searchParams = useSearchParams();

  const sortBy = searchParams.get('sort') || 'newest';
  const sortOrder = searchParams.get('order') || 'desc';
  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQueryState] = useState('');
  const [statusFilter, setStatusFilterState] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  const { sessions, totalCount, isLoading } = useBiddingSessions();

  const handleSortChange = useCallback(
    (newSortBy: string, newSortOrder: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('sort', newSortBy);
      params.set('order', newSortOrder);
      router.push(`${routePath}?${params.toString()}`);
    },
    [routePath, searchParams, router]
  );

  const setSearchQuery = useCallback((value: string) => {
    setSearchQueryState(value);
    setPage(0);
  }, []);

  const setStatusFilter = useCallback((value: string) => {
    setStatusFilterState(value);
    setPage(0);
  }, []);

  const filteredSessions = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    const idFilter = sessionIds ? new Set(sessionIds.map(id => id.toString())) : null;

    const filtered = sessions.filter(session => {
      if (idFilter && !idFilter.has(session.id.toString())) {
        return false;
      }
      if (statusFilter !== 'all' && session.status !== Number(statusFilter)) {
        return false;
      }
      if (bidder) {
        const lower = bidder.toLowerCase();
        if (session.creator.toLowerCase() !== lower && session.winner.toLowerCase() !== lower) {
          return false;
        }
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

    filtered.sort((a: BiddingSession, b: BiddingSession) => {
      const multiplier = sortOrder === 'asc' ? 1 : -1;

      switch (sortBy) {
        case 'budget':
          if (a.maxBudget === b.maxBudget) return 0;
          return a.maxBudget > b.maxBudget ? multiplier : -multiplier;
        case 'newest':
        default:
          if (a.id === b.id) return 0;
          return a.id > b.id ? multiplier : -multiplier;
      }
    });

    return filtered;
  }, [searchQuery, sessions, sortBy, sortOrder, statusFilter, sessionIds, bidder]);

  const totalPages = Math.ceil(filteredSessions.length / pageSize);
  const paginatedSessions = filteredSessions.slice(page * pageSize, (page + 1) * pageSize);
  const activeCount = filteredSessions.filter(session => session.status === SessionStatus.Active).length;
  const inProgressCount = filteredSessions.filter(
    session => session.status === SessionStatus.WinnerSelected
  ).length;

  const handleNextPage = useCallback(() => {
    if (page + 1 < totalPages) {
      setPage(page + 1);
    }
  }, [page, totalPages]);

  const handlePrevPage = useCallback(() => {
    if (page > 0) {
      setPage(page - 1);
    }
  }, [page]);

  return {
    isConnected,
    sessions,
    totalCount,
    isLoading,
    sortBy,
    sortOrder,
    handleSortChange,
    page,
    setPage,
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
  };
}
