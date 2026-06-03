'use client';

import { useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Card, Skeleton, Badge } from '@heroui/react';
import { Wallet, Plus, ArrowLeft, ExternalLink, Settings, Package, Star } from 'lucide-react';
import NextLink from 'next/link';
import { useWalletAgentsFromSubgraph } from '@/lib/hooks';
import { useProviderServices } from '@/lib/hooks/useServices';
import { card, btn } from '@/lib/design-system';

import { useAgentReputation } from '@/lib/hooks/useAgentReputation';

function WalletConnectPrompt() {
  return (
    <div className="container mx-auto px-4 py-16 text-center">
      <Wallet className="h-16 w-16 text-default-400 mx-auto mb-4" />
      <h1 className="text-2xl font-bold mb-2">Connect Your Wallet</h1>
      <p className="text-default-500">Connect your wallet to manage your agents</p>
    </div>
  );
}

function AgentCard({
  agent,
  owner,
}: {
  agent: {
    id: number;
    metadata?: { name?: string; description?: string; capabilities?: string[] } | null;
    hasKokonutTag: boolean;
  };
  owner: `0x${string}` | undefined;
}) {
  const { services, isLoading: isLoadingServices } = useProviderServices(owner);
  const { normalizedRating } = useAgentReputation(owner);
  const capabilities = agent.metadata?.capabilities || [];

  return (
    <Card className={card('interactive')}>
      <div className="flex items-center gap-3 mb-3">
        <div className="size-10 rounded-full bg-gradient-to-br from-[#009F4D] to-[#FFCD00] flex items-center justify-center text-white font-semibold">
          #{agent.id}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">
            {agent.metadata?.name || `Agent #${agent.id}`}
          </h3>
          {agent.hasKokonutTag && (
            <Badge color="success" size="sm">
              Kokonut
            </Badge>
          )}
        </div>
      </div>

      {agent.metadata?.description && (
        <p className="text-sm text-default-500 mb-3 line-clamp-2">{agent.metadata.description}</p>
      )}

      <div className="grid grid-cols-2 gap-2 mb-3 p-2 bg-content2 rounded-lg">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-default-400">
            <Package className="size-3.5" />
          </div>
          <p className="text-sm font-semibold">{isLoadingServices ? '-' : services.length}</p>
          <p className="text-xs text-default-400">Services</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-default-400">
            <Star className="size-3.5" />
          </div>
          <p className="text-sm font-semibold">
            {normalizedRating ? normalizedRating.toFixed(1) : '-'}
          </p>
          <p className="text-xs text-default-400">Rating</p>
        </div>
      </div>

      {capabilities.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {capabilities.slice(0, 3).map(cap => (
            <span
              key={cap}
              className="text-xs px-2 py-0.5 bg-content2 rounded-full text-default-500"
            >
              {cap}
            </span>
          ))}
          {capabilities.length > 3 && (
            <span className="text-xs px-2 py-0.5 text-default-400">
              +{capabilities.length - 3}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-divider">
        <NextLink
          href={`/identity/${agent.id}`}
          className="flex items-center gap-1.5 text-sm text-default-500 hover:text-primary transition-colors"
        >
          <ExternalLink className="size-4" />
          Profile
        </NextLink>
        <NextLink
          href={`/identity/settings?agentId=${agent.id}`}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:opacity-90 transition-opacity"
        >
          <Settings className="size-4" />
          Manage
        </NextLink>
      </div>
    </Card>
  );
}

function AgentCardSkeleton() {
  return (
    <Card className={card('padded')}>
      <div className="flex items-center gap-3 mb-3">
        <Skeleton className="size-10 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-5 w-32 mb-1" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-2/3 mb-4" />
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-divider">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-9 rounded-lg" />
      </div>
    </Card>
  );
}

export default function DashboardAgentsPage() {
  useEffect(() => {
    document.title = 'Manage Agents | Kokonut Agent Economy';
  }, []);

  const { isConnected, address } = useAccount();
  const { agents, isLoading, error, refetch } = useWalletAgentsFromSubgraph(address);

  if (!isConnected) {
    return <WalletConnectPrompt />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <NextLink
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-default-500 hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="size-4" />
          Back to Dashboard
        </NextLink>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Your Agents</h1>
            <p className="text-default-500 mt-1">
              {isLoading
                ? 'Loading…'
                : `${agents.length} agent${agents.length !== 1 ? 's' : ''} registered`}
            </p>
          </div>
          <NextLink
            href="/identity/register"
            className={btn('primary')}
          >
            <Plus className="size-4" />
            Register New Agent
          </NextLink>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-danger-50 border border-danger-200 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p className="text-danger font-medium">Error loading agents</p>
              <p className="text-danger-600 text-sm mt-1">{error.message}</p>
              <button type="button"
                 onClick={() => refetch()}
                className="mt-3 px-4 py-2 bg-danger text-white rounded-lg text-sm font-medium hover:bg-danger-600 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AgentCardSkeleton />
          <AgentCardSkeleton />
          <AgentCardSkeleton />
        </div>
      ) : agents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map(agent => (
            <AgentCard key={agent.id} agent={agent} owner={address} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Wallet className="h-12 w-12 text-default-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Agents Yet</h3>
          <p className="text-sm text-default-500 mb-6">Register your first agent identity</p>
          <NextLink
            href="/identity/register"
            className={btn('primary')}
          >
            <Plus className="size-4" />
            Register First Agent
          </NextLink>
        </div>
      )}
    </div>
  );
}
