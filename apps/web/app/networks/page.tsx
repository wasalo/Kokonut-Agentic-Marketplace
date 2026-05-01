'use client';

import { useState, useMemo } from 'react';
import NextLink from 'next/link';
import {
  Globe,
  Users,
  MessageSquare,
  Search,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { Card, Button } from '@heroui/react';
import { PRODUCTION_CHAINS, ChainConfig } from '@/lib/chains';
import { useNetworkStats } from '@/lib/hooks/useNetworkStats';

interface NetworkCardProps {
  chain: ChainConfig;
  stats: { agentCount: number; feedbackCount: number } | undefined;
  isLoading: boolean;
}

function NetworkCard({ chain, stats, isLoading }: NetworkCardProps) {
  return (
    <NextLink href={`/identity?chain=${chain.id}`}>
      <Card className="border border-divider p-6 hover:border-success transition-colors cursor-pointer h-full">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white"
              style={{ backgroundColor: chain.color }}
            >
              {chain.shortName.slice(0, 2)}
            </div>
            <div>
              <h3 className="font-semibold">{chain.name}</h3>
              <span className="text-xs text-default-400 font-mono">#{chain.id}</span>
            </div>
          </div>
          {chain.isTestnet && (
            <span className="px-2 py-0.5 bg-warning/10 text-warning text-xs rounded">Testnet</span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mb-4">
          <div>
            <div className="flex items-center gap-1 text-xs text-default-400 mb-1">
              <Users className="w-3 h-3" />
              <span>Agents</span>
            </div>
            {isLoading ? (
              <div className="h-6 w-16 bg-content2 rounded animate-pulse" />
            ) : (
              <p className="text-xl font-bold">{(stats?.agentCount || 0).toLocaleString()}</p>
            )}
          </div>
          <div>
            <div className="flex items-center gap-1 text-xs text-default-400 mb-1">
              <MessageSquare className="w-3 h-3" />
              <span>Feedbacks</span>
            </div>
            {isLoading ? (
              <div className="h-6 w-16 bg-content2 rounded animate-pulse" />
            ) : (
              <p className="text-xl font-bold">{(stats?.feedbackCount || 0).toLocaleString()}</p>
            )}
          </div>
        </div>

        {chain.explorerUrl && (
          <div className="flex items-center gap-2 text-xs text-default-400">
            <ExternalLink className="w-3 h-3" />
            <span className="truncate">{chain.explorerUrl.replace('https://', '')}</span>
          </div>
        )}
      </Card>
    </NextLink>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16">
      <div className="h-16 w-16 rounded-full bg-content2 flex items-center justify-center mx-auto mb-4">
        <Globe className="h-8 w-8 text-default-500" />
      </div>
      <h3 className="text-lg font-semibold mb-2">No Networks Found</h3>
      <p className="text-default-500 max-w-md mx-auto">
        No ERC-8004 networks match your search criteria.
      </p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(12)].map((_, i) => (
        <Card key={i} className="border border-divider p-6 animate-pulse">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-content2" />
              <div>
                <div className="h-5 bg-content2 rounded w-24 mb-2" />
                <div className="h-3 bg-content2 rounded w-12" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            <div>
              <div className="h-3 bg-content2 rounded w-12 mb-2" />
              <div className="h-6 bg-content2 rounded w-16" />
            </div>
            <div>
              <div className="h-3 bg-content2 rounded w-16 mb-2" />
              <div className="h-6 bg-content2 rounded w-16" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

export default function NetworksPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const { stats, isLoading, refetch } = useNetworkStats();

  const filteredChains = useMemo(() => {
    if (!searchQuery) return PRODUCTION_CHAINS;
    const query = searchQuery.toLowerCase();
    return PRODUCTION_CHAINS.filter(
      chain =>
        chain.name.toLowerCase().includes(query) ||
        chain.shortName.toLowerCase().includes(query) ||
        chain.id.toString().includes(query)
    );
  }, [searchQuery]);

  const totalAgents = useMemo(() => {
    return stats.reduce((sum: number, s: { agentCount: number }) => sum + s.agentCount, 0);
  }, [stats]);

  const totalFeedbacks = useMemo(() => {
    return stats.reduce((sum: number, s: { feedbackCount: number }) => sum + s.feedbackCount, 0);
  }, [stats]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Globe className="w-8 h-8 text-primary" />
            Networks
          </h1>
          <p className="text-default-500">ERC-8004 compatible blockchain networks</p>
        </div>
        <Button variant="ghost" size="sm" onPress={() => refetch()} isDisabled={isLoading}>
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 mb-8">
        <Card className="border border-divider p-6 flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Globe className="w-5 h-5 text-primary" />
            <span className="text-sm text-default-500">Networks</span>
          </div>
          <p className="text-3xl font-bold">{PRODUCTION_CHAINS.length}</p>
          <p className="text-xs text-default-400 mt-1">
            {PRODUCTION_CHAINS.filter(c => c.isProduction).length} production, {PRODUCTION_CHAINS.filter(c => c.isTestnet).length} testnet
          </p>
        </Card>
        <Card className="border border-divider p-6 flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-5 h-5 text-success" />
            <span className="text-sm text-default-500">Total Agents</span>
          </div>
          <p className="text-3xl font-bold">{totalAgents.toLocaleString()}</p>
        </Card>
        <Card className="border border-divider p-6 flex-1">
          <div className="flex items-center gap-3 mb-2">
            <MessageSquare className="w-5 h-5 text-warning" />
            <span className="text-sm text-default-500">Total Feedbacks</span>
          </div>
          <p className="text-3xl font-bold">{totalFeedbacks.toLocaleString()}</p>
        </Card>
      </div>

      <Card className="border border-divider p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-default-400" />
            <input
              type="text"
              placeholder="Search networks..."
              className="w-full pl-10 pr-4 py-2 border border-divider rounded-lg bg-content2 focus:outline-none focus:ring-2 focus:ring-success text-foreground"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <span className="text-sm text-default-400">
            {filteredChains.length} networks
          </span>
        </div>
      </Card>

      {isLoading ? (
        <LoadingSkeleton />
      ) : filteredChains.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredChains.map(chain => {
            const chainStats = stats.find(s => s.chainId === chain.id);
            return (
              <NetworkCard key={chain.id} chain={chain} stats={chainStats} isLoading={isLoading} />
            );
          })}
        </div>
      )}

      <Card className="border border-divider p-6 mt-8">
        <h2 className="font-semibold mb-4">About ERC-8004</h2>
        <p className="text-default-500 text-sm mb-4">
          ERC-8004 is a standard for AI agent identity and reputation on Ethereum and EVM-compatible
          chains. It enables agents to have a unified identity across multiple networks while
          maintaining separate reputation scores on each chain.
        </p>
        <div className="flex flex-wrap gap-2">
          <NextLink
            href="https://eips.ethereum.org/EIPS/eip-8004"
            target="_blank"
            className="text-sm text-primary hover:underline"
          >
            ERC-8004 Specification
          </NextLink>
          <span className="text-default-300">|</span>
          <NextLink
            href="https://8004scan.io"
            target="_blank"
            className="text-sm text-primary hover:underline"
          >
            8004scan Explorer
          </NextLink>
        </div>
      </Card>
    </div>
  );
}
