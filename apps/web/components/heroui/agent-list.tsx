'use client';

import { useAgents } from '@/lib/hooks/useAgents';
import { AgentCard } from './agent-card';
import { Shield, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, Button } from '@heroui/react';
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

function EmptyState() {
  return (
    <div className="text-center py-16">
      <div className="w-16 h-16 rounded-full bg-content2 flex items-center justify-center mx-auto mb-4">
        <Shield className="w-8 h-8 text-default-400" />
      </div>
      <h3 className="text-lg font-semibold mb-2">No Agents Registered</h3>
      <p className="text-default-500 max-w-md mx-auto">
        Be the first to register an agent in the economy. Connect your wallet to get started.
      </p>
    </div>
  );
}

const ITEMS_PER_PAGE = 12;

interface AgentListProps {
  className?: string;
}

export function AgentList({ className }: AgentListProps) {
  const [page, setPage] = useState(0);
  const { agents, totalCount, isLoading, error, refetch } = useAgents(
    page * ITEMS_PER_PAGE,
    ITEMS_PER_PAGE
  );

  const totalPages = Math.ceil((totalCount || 0) / ITEMS_PER_PAGE);

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-danger mb-2">Error loading agents</p>
        <p className="text-default-500 text-sm">{error.message}</p>
        <button
          onClick={() => {
            void refetch();
          }}
          className="mt-4 px-4 py-2 bg-content2 rounded-lg text-sm hover:bg-content3 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (isLoading) {
    return <AgentListSkeleton />;
  }

  if (agents.length === 0) {
    return <EmptyState />;
  }

  return (
    <div>
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className || ''}`}>
        {agents.map(agent => (
          <AgentCard
            key={agent.id}
            id={agent.id.toString()}
            name={agent.metadata?.name || `Agent #${agent.id}`}
            description={agent.metadata?.description}
            owner={agent.owner}
            capabilities={agent.metadata?.capabilities}
            agentURI={agent.metadata ? undefined : undefined}
            isActive={agent.isActive}
          />
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
    </div>
  );
}
