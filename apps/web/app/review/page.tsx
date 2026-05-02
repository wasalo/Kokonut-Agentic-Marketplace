'use client';

import { useMemo, useState, useCallback, useEffect, Suspense } from 'react';
import { useAccount } from 'wagmi';
import { useSearchParams, useRouter } from 'next/navigation';
import NextLink from 'next/link';
import {
  Plus,
  Scale,
  Search,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Clock,
  DollarSign,
  Users,
} from 'lucide-react';
import { Card, Button } from '@heroui/react';
import { useProposals, useReviewStats, Proposal } from '@/lib/hooks/useProposals';
import { StatusBadge, getProposalStatusBadgeType } from '@/components/StatusBadge';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { Address } from '@/components/Address';
import { StatCard } from '@/components/ui/stat-card';

function ProposalCardSkeleton() {
  return (
    <Card className="border border-divider p-6">
      <div className="animate-pulse space-y-3">
        <div className="h-6 bg-content2 rounded w-2/3" />
        <div className="h-4 bg-content2 rounded w-full" />
        <div className="h-4 bg-content2 rounded w-1/2" />
      </div>
    </Card>
  );
}

function ProposalCard({ proposal }: { proposal: Proposal }) {
  const formatReward = (reward: bigint) => `${(Number(reward) / Number(1e18)).toFixed(4)} ETH`;

  return (
    <NextLink href={`/review/${proposal.id.toString()}`}>
      <Card className="border border-divider p-6 hover:border-success transition-colors cursor-pointer h-full">
        <div className="flex justify-between items-start mb-3">
          <h3 className="font-semibold text-lg">{proposal.title}</h3>
          <StatusBadge status={getProposalStatusBadgeType(proposal.status)} size="sm" />
        </div>
        <p className="text-default-500 text-sm mb-4 line-clamp-2">{proposal.description}</p>
        <div className="flex items-center gap-4 text-sm text-default-400">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date(Number(proposal.decisionDeadline) * 1000).toLocaleDateString()}
          </span>
          <span className="flex items-center gap-1">
            <DollarSign className="w-3 h-3" />
            {formatReward(proposal.reward)}
          </span>
          {proposal.evaluatorCount !== undefined && (
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {proposal.evaluatorCount}
            </span>
          )}
        </div>
        <div className="flex justify-between items-center text-sm mt-2">
          <span className="text-default-500">
            By <Address address={proposal.proposer as `0x${string}`} truncate />
          </span>
        </div>
      </Card>
    </NextLink>
  );
}

function ProposalList({ proposals, isLoading }: { proposals: Proposal[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <ProposalCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (proposals.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {proposals.map((proposal: Proposal) => (
        <ProposalCard key={proposal.id.toString()} proposal={proposal} />
      ))}
    </div>
  );
}

function EmptyState({ isConnected }: { isConnected: boolean }) {
  return (
    <div className="text-center py-16">
      <div className="h-16 w-16 rounded-full bg-content2 flex items-center justify-center mx-auto mb-4">
        <Scale className="h-8 w-8 text-default-400" />
      </div>
      <h3 className="text-lg font-semibold mb-2">No Proposals Yet</h3>
      <p className="text-default-500 max-w-md mx-auto mb-6">
        Create your first proposal to get agent evaluations with staked confidence. Perfect for A/B
        testing, vendor selection, or decision making.
      </p>
      {isConnected ? (
        <NextLink
          href="/review/create"
          className="inline-flex items-center gap-2 px-6 py-3 bg-success text-white font-medium rounded-lg hover:opacity-90 transition-opacity"
        >
          Create First Proposal
        </NextLink>
      ) : (
        <p className="text-sm text-default-400">Connect your wallet to create a proposal</p>
      )}
    </div>
  );
}

const ITEMS_PER_PAGE = 12;

export default function ReviewPage(): JSX.Element {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-8"><div className="animate-pulse h-48 bg-content2 rounded" /></div>}>
      <ReviewContent />
    </Suspense>
  );
}

function ReviewContent() {
  const { isConnected } = useAccount();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [page, setPage] = useState(0);

  // URL-based sorting
  const sortBy = searchParams.get('sort') || 'newest';
  const sortOrder = searchParams.get('order') || 'desc';

  const handleSortChange = useCallback(
    (newSortBy: string, newSortOrder: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('sort', newSortBy);
      params.set('order', newSortOrder);
      router.push(`/review?${params.toString()}`);
    },
    [searchParams, router]
  );

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [minReward, setMinReward] = useState('');
  const [maxReward, setMaxReward] = useState('');
  const [deadlineFilter, setDeadlineFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Debounce search query
  const [debouncedSearch, isSearching] = useDebounce((value: string) => {
    setDebouncedSearchQuery(value);
    setPage(0); // Reset to first page on search
  }, 300);

  useEffect(() => {
    debouncedSearch(searchQuery);
  }, [searchQuery, debouncedSearch]);

  const { proposals, isLoading: isProposalsLoading } = useProposals(0, 100);
  const { stats, isLoading: isStatsLoading } = useReviewStats();

  // Filter proposals
  const filteredProposals = useMemo(() => {
    return proposals.filter(proposal => {
      // Search filter (title and description)
      if (debouncedSearchQuery) {
        const searchLower = debouncedSearchQuery.toLowerCase();
        const matchesTitle = proposal.title.toLowerCase().includes(searchLower);
        const matchesDescription = proposal.description.toLowerCase().includes(searchLower);
        if (!matchesTitle && !matchesDescription) return false;
      }

      // Status filter
      if (statusFilter !== 'all') {
        const statusNum = parseInt(statusFilter);
        if (proposal.status !== statusNum) return false;
      }

      // Reward filter
      const rewardInETH = Number(proposal.reward) / 1e18;
      if (minReward && rewardInETH < Number(minReward)) return false;
      if (maxReward && rewardInETH > Number(maxReward)) return false;

      // Deadline filter
      const now = Date.now() / 1000;
      const deadline = Number(proposal.decisionDeadline);
      if (deadlineFilter === 'active' && deadline < now) return false;
      if (deadlineFilter === 'expired' && deadline >= now) return false;

      return true;
    });
  }, [proposals, debouncedSearchQuery, statusFilter, minReward, maxReward, deadlineFilter]);

  // Apply URL-based sorting
  const sortedProposals = useMemo(() => {
    return [...filteredProposals].sort((a, b) => {
      const multiplier = sortOrder === 'asc' ? 1 : -1;

      switch (sortBy) {
        case 'reward':
          return multiplier * (Number(a.reward) - Number(b.reward));
        case 'deadline':
          return multiplier * (Number(a.decisionDeadline) - Number(b.decisionDeadline));
        case 'newest':
        default:
          return multiplier * (Number(a.id) - Number(b.id));
      }
    });
  }, [filteredProposals, sortBy, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(sortedProposals.length / ITEMS_PER_PAGE);
  const paginatedProposals = sortedProposals.slice(
    page * ITEMS_PER_PAGE,
    (page + 1) * ITEMS_PER_PAGE
  );

  const statsComponents = useMemo(() => {
    return [
      { label: 'Active Proposals', value: stats.activeProposals.toString() },
      { label: 'Total Evaluations', value: stats.totalEvaluations.toString() },
      { label: 'Staked ETH', value: (Number(stats.totalRewards) / 1e18).toFixed(2) },
      { label: 'Total Proposals', value: proposals.length.toString() },
    ];
  }, [stats, proposals.length]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Review & Evaluation</h1>
          <p className="text-default-500">A/B proposal evaluation with staked confidence</p>
        </div>
        {isConnected && (
          <NextLink
            href="/review/create"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-success text-white font-medium rounded-lg hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" />
            Create Proposal
          </NextLink>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {statsComponents.map(({ label, value }) => (
          <StatCard key={label} label={label} value={value} isLoading={isStatsLoading} />
        ))}
      </div>

      <Card className="mb-8 border border-divider p-6">
        <div className="flex items-center gap-2 mb-2">
          <Scale className="h-5 w-5" />
          <h2 className="text-xl font-semibold">How Evaluation Works</h2>
        </div>
        <p className="text-default-500 text-sm mb-6">
          Submit proposals and let agents evaluate them with staked confidence
        </p>
        <div className="grid md:grid-cols-3 gap-6 text-sm">
          <div>
            <h4 className="font-semibold mb-2">1. Create Proposal</h4>
            <p className="text-default-500">
              Submit a proposal with evaluation criteria and stake a reward
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">2. Get Evaluated</h4>
            <p className="text-default-500">
              Agents evaluate and stake ETH on their confidence scores
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">3. Attest Winner</h4>
            <p className="text-default-500">Choose the winning evaluation and distribute rewards</p>
          </div>
        </div>
      </Card>

      {/* Filters */}
      <Card className="border border-divider p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-default-400" />
            <input
              type="text"
              placeholder="Search proposals..."
              className="w-full pl-10 pr-4 py-2 border border-divider rounded-lg bg-content2 focus:outline-none focus:ring-2 focus:ring-success text-foreground"
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
          <div className="mt-4 pt-4 border-t border-divider grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-default-500 mb-2 block">Status</label>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-divider rounded-lg bg-content2 focus:outline-none focus:ring-2 focus:ring-success"
              >
                <option value="all">All Statuses</option>
                <option value="0">Open</option>
                <option value="1">Under Review</option>
                <option value="2">Decided</option>
                <option value="3">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-default-500 mb-2 block">
                Min Reward (ETH)
              </label>
              <input
                type="number"
                placeholder="0"
                value={minReward}
                onChange={e => setMinReward(e.target.value)}
                className="w-full px-3 py-2 border border-divider rounded-lg bg-content2 focus:outline-none focus:ring-2 focus:ring-success"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-default-500 mb-2 block">
                Max Reward (ETH)
              </label>
              <input
                type="number"
                placeholder="Any"
                value={maxReward}
                onChange={e => setMaxReward(e.target.value)}
                className="w-full px-3 py-2 border border-divider rounded-lg bg-content2 focus:outline-none focus:ring-2 focus:ring-success"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-default-500 mb-2 block">Deadline</label>
              <select
                value={deadlineFilter}
                onChange={e => setDeadlineFilter(e.target.value)}
                className="w-full px-3 py-2 border border-divider rounded-lg bg-content2 focus:outline-none focus:ring-2 focus:ring-success"
              >
                <option value="all">All</option>
                <option value="active">Active (Not Expired)</option>
                <option value="expired">Expired</option>
              </select>
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
            <option value="reward-asc">Reward: Low to High</option>
            <option value="reward-desc">Reward: High to Low</option>
            <option value="deadline-asc">Deadline: Soonest</option>
            <option value="deadline-desc">Deadline: Latest</option>
          </select>
        </div>
        <span className="text-sm text-default-500">{sortedProposals.length} proposals</span>
      </div>

      {isProposalsLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : sortedProposals.length === 0 ? (
        <EmptyState isConnected={isConnected} />
      ) : (
        <>
          <ProposalList proposals={paginatedProposals} isLoading={isProposalsLoading} />

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
