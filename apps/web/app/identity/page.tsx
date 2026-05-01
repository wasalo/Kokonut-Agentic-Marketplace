'use client';

import { useKokonutStats } from '@/lib/hooks/useKokonutStats';
import { KokonutAgentList } from '@/components/heroui/kokonut-agent-list';
import { useAccount, useEnsAddress } from 'wagmi';
import NextLink from 'next/link';
import { Plus, Search } from 'lucide-react';
import { useCallback, useState, useEffect } from 'react';
import { StatCard } from '@/components/ui/stat-card';

export default function IdentityPage(): JSX.Element {
  const { isConnected } = useAccount();
  const [searchQuery, setSearchQuery] = useState('');
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [, setIsResolving] = useState(false);

  // ENS forward resolution (ENS name -> address)
  const { data: ensAddress, isLoading: ensLoading } = useEnsAddress({
    name: searchQuery.endsWith('.eth') ? searchQuery : undefined,
    chainId: 1,
  });

  // Handle resolving ENS to address
  useEffect(() => {
    if (searchQuery.endsWith('.eth') && ensAddress) {
      setResolvedAddress(ensAddress);
    } else if (searchQuery && !searchQuery.endsWith('.eth')) {
      setResolvedAddress(null);
    }
  }, [ensAddress, searchQuery]);

  // Use Kokonut-specific stats
  const { totalAgents, activeAgents, totalReviews, averageRating, isLoading } = useKokonutStats();

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setIsResolving(e.target.value.endsWith('.eth'));
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Agent Identity</h1>
          <p className="text-default-500">
            Discover and register AI agents on the Kokonut Marketplace
          </p>
        </div>
        {isConnected && (
          <NextLink
            href="/identity/register"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-semibold bg-gradient-to-r from-[#009F4D] to-[#00c853] text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Register Agent
          </NextLink>
        )}
      </div>

      <div className="relative mb-8 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-default-400" />
        <input
          type="text"
          placeholder="Search by ENS (vitalik.eth) or address..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="w-full pl-10 pr-4 py-2 bg-content2 border border-divider rounded-lg text-default-700 placeholder:text-default-400 focus:outline-none focus:ring-2 focus:ring-success focus:border-transparent transition-all"
        />
        {ensLoading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-default-400">
            Resolving ENS...
          </span>
        )}
        {resolvedAddress && !ensLoading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-success">
            {resolvedAddress.slice(0, 6)}...{resolvedAddress.slice(-4)}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Kokonut Agents"
          value={totalAgents?.toString() ?? '0'}
          isLoading={isLoading}
          variant="simple"
        />
        <StatCard
          label="Active"
          value={activeAgents?.toString() ?? '0'}
          isLoading={isLoading}
          variant="simple"
        />
        <StatCard
          label="Total Reviews"
          value={(totalReviews ?? 0).toString()}
          isLoading={isLoading}
          variant="simple"
        />
        <StatCard
          label="Avg Rating"
          value={(averageRating ?? 0).toFixed(1)}
          isLoading={isLoading}
          variant="simple"
        />
      </div>

      <KokonutAgentList />
    </div>
  );
}
