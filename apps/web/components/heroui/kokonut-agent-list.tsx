'use client';

import { useKokonutAgents } from '@/lib/hooks/useKokonutAgents';
import { AgentCard } from './agent-card';
import { Shield, ChevronLeft, ChevronRight, Loader2, RefreshCw } from 'lucide-react';
import { Card, Button, Badge } from '@heroui/react';
import { useState } from 'react';

function AgentListSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(6)].map((_, i) => (
        <Card key={i} className="border border-divider p-4">
          <div className="animate-pulse">
            <div className="flex gap-4 mb-4">
              <div className="w-12 h-12 bg-content2 rounded-full" />
              <div className="flex-1">
                <div className="h-5 bg-content2 rounded w-2/3 mb-2" />
                <div className="h-4 bg-content2 rounded w-1/2" />
              </div>
            </div>
            <div className="h-12 bg-content2 rounded mb-4" />
            <div className="flex gap-2">
              <div className="h-6 bg-content2 rounded w-16" />
              <div className="h-6 bg-content2 rounded w-16" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

interface ScanningStateProps {
  scannedCount: number;
  totalToScan: number;
}

function ScanningState({ scannedCount, totalToScan }: ScanningStateProps) {
  const progress = totalToScan > 0 ? (scannedCount / totalToScan) * 100 : 0;

  return (
    <div className="text-center py-12">
      <div className="mb-4">
        <Loader2 className="w-10 h-10 animate-spin mx-auto text-success mb-4" />
        <h3 className="text-lg font-semibold mb-2">Scanning for Kokonut Agents</h3>
        <p className="text-default-500 text-sm">
          Checking {scannedCount.toLocaleString()} of {totalToScan.toLocaleString()} agents...
        </p>
      </div>

      {/* Progress bar */}
      <div className="max-w-md mx-auto mb-4">
        <div className="h-2 bg-content2 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#009F4D] to-[#00c853] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-default-400 mt-2">{Math.round(progress)}% complete</p>
      </div>

      <p className="text-xs text-default-400">
        This may take a moment while we filter for agents registered via the Kokonut UI
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16">
      <div className="w-16 h-16 rounded-full bg-content2 flex items-center justify-center mx-auto mb-4">
        <Shield className="w-8 h-8 text-default-400" />
      </div>
      <h3 className="text-lg font-semibold mb-2">No Kokonut-Registered Agents Found</h3>
      <p className="text-default-500 max-w-md mx-auto mb-6">
        No agents with Kokonut Marketplace registration were found. Be the first to register an
        agent through our UI!
      </p>
      <p className="text-sm text-default-400">
        Agents registered through the Kokonut UI are automatically tagged for easy discovery.
      </p>
    </div>
  );
}

interface KokonutBadgeProps {
  show?: boolean;
}

function KokonutBadge({ show = true }: KokonutBadgeProps) {
  if (!show) return null;

  return (
    <Badge color="success" variant="soft" className="ml-2">
      <span className="flex items-center gap-1">
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
        Kokonut
      </span>
    </Badge>
  );
}

const ITEMS_PER_PAGE = 12;

interface KokonutAgentListProps {
  className?: string;
}

export function KokonutAgentList({ className }: KokonutAgentListProps) {
  const [page, setPage] = useState(0);
  const [showAll, setShowAll] = useState(false);

  const { agents, totalCount, isLoading, isScanning, scannedCount, totalToScan, error, refetch } =
    useKokonutAgents(page, ITEMS_PER_PAGE, showAll);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-danger mb-2">Error loading agents</p>
        <p className="text-default-500 text-sm">{error.message}</p>
        <button
          onClick={() => refetch()}
          className="mt-4 px-4 py-2 bg-content2 rounded-lg text-sm hover:bg-content3 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // Show scanning state while loading initial data
  if (isScanning && agents.length === 0) {
    return <ScanningState scannedCount={scannedCount} totalToScan={totalToScan} />;
  }

  if (isLoading && agents.length === 0) {
    return <AgentListSkeleton />;
  }

  if (agents.length === 0) {
    return <EmptyState />;
  }

  return (
    <div>
      {/* Header with count, refresh button, and show all toggle */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <h2 className="text-lg font-semibold">Kokonut-Registered Agents</h2>
          <KokonutBadge />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onPress={() => refetch()}
            isDisabled={isScanning}
            className="text-default-500"
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${isScanning ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          {totalCount > ITEMS_PER_PAGE && (
            <Button
              variant="ghost"
              size="sm"
              onPress={() => {
                setShowAll(!showAll);
                setPage(0);
              }}
            >
              {showAll ? 'Show Paginated' : `Show All (${totalCount})`}
            </Button>
          )}
        </div>
      </div>

      {/* Scanning indicator (when updating) */}
      {isScanning && (
        <div className="mb-4 p-3 bg-content2 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-default-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>
              Updating... {scannedCount.toLocaleString()} of {totalToScan.toLocaleString()} scanned
            </span>
          </div>
        </div>
      )}

      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className || ''}`}>
        {agents.map(agent => (
          <div key={agent.id} className="relative">
            <AgentCard
              id={agent.id.toString()}
              name={agent.metadata?.name || `Agent #${agent.id}`}
              description={agent.metadata?.description}
              owner={agent.owner}
              capabilities={agent.metadata?.capabilities}
              agentURI={agent.metadata ? undefined : undefined}
              isActive={agent.isActive}
            />
            {/* Kokonut badge overlay */}
            <div className="absolute top-2 right-2">
              <Badge color="success" variant="soft" size="sm">
                Kokonut
              </Badge>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {!showAll && totalPages > 1 && (
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

      {/* Summary */}
      <p className="text-center text-sm text-default-500 mt-8">
        Showing {agents.length} Kokonut-registered {agents.length === 1 ? 'agent' : 'agents'}
        {showAll && totalCount > 0 && ` of ${totalCount} total`}
      </p>
    </div>
  );
}
