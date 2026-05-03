'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useSearchParams, useRouter } from 'next/navigation';
import NextLink from 'next/link';
import { Plus, Code, Users, TrendingUp } from 'lucide-react';
import { ServiceList } from '@/components/heroui/service-list';
import { useAllServices } from '@/lib/hooks/useServicesContract';
import { useProviderServices, useTotalServiceCount } from '@/lib/hooks/useServices';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { StatCard } from '@/components/ui/stat-card';
import { EmptyStateServices } from '@/components/ui/empty-state';

const SKILL_DOMAINS = [
  { value: '', label: 'All Skills' },
  { value: '@skills/defi', label: 'DeFi' },
  { value: '@skills/nft', label: 'NFT' },
  { value: '@skills/ai', label: 'AI / ML' },
  { value: '@skills/governance', label: 'Governance' },
  { value: '@skills/web3', label: 'Web3' },
  { value: '@skills/data', label: 'Data Analysis' },
  { value: '@skills/security', label: 'Security' },
  { value: '@skills/infrastructure', label: 'Infrastructure' },
  { value: '@skills/portfolio', label: 'Portfolio' },
  { value: '@skills/verification', label: 'Verification' },
];

function FilterSection({
  searchQuery,
  setSearchQuery,
  skillDomain,
  setSkillDomain,
}: {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  showActiveOnly: boolean;
  setShowActiveOnly: (v: boolean) => void;
  minPrice: string;
  setMinPrice: (v: string) => void;
  maxPrice: string;
  setMaxPrice: (v: string) => void;
  skillDomain: string;
  setSkillDomain: (v: string) => void;
}) {
  return (
    <div className="mb-6">
      <div className="relative">
        <input
          type="text"
          placeholder="Search services..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-4 pr-4 py-2.5 bg-content2 border border-divider rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-success focus:border-transparent transition-all"
        />
      </div>
      <div className="flex flex-wrap gap-2 mt-4">
        {SKILL_DOMAINS.slice(1, 6).map(domain => (
          <button
            key={domain.value}
            onClick={() => setSkillDomain(skillDomain === domain.value ? '' : domain.value)}
            className={`px-3 py-1.5 rounded-full text-xs transition-colors cursor-pointer ${
              skillDomain === domain.value
                ? 'bg-[#009F4D] text-white'
                : 'bg-content2 text-default-600 hover:bg-content3'
            }`}
          >
            {domain.label}
          </button>
        ))}
        <NextLink
          href="/marketplace/skills"
          className="px-3 py-1.5 rounded-full text-xs text-[#009F4D] hover:bg-content2 transition-colors flex items-center gap-1 cursor-pointer"
        >
          <Code className="w-3 h-3" />
          Browse Skills
        </NextLink>
      </div>
    </div>
  );
}

export default function MarketplaceInner() {
  const { isConnected } = useAccount();
  const router = useRouter();
  const searchParams = useSearchParams();

  const providerParam = searchParams.get('provider');

  const { services: providerServices, isLoading: isProviderLoading } = useProviderServices(
    providerParam && providerParam.startsWith('0x') ? (providerParam as `0x${string}`) : undefined
  );

  const { services: allMarketServices, isLoading: isAllLoading } = useAllServices();

  const { count: totalCount, isLoading: isTotalCountLoading } = useTotalServiceCount();

  const services = providerParam ? providerServices : allMarketServices;
  const isServicesLoading = providerParam ? isProviderLoading : isAllLoading;
  const activeServicesCount = services.length;

  const uniqueProviders = useMemo(() => new Set(services.map(s => s.provider.toLowerCase())).size, [services]);
  const avgPrice = useMemo(() => {
    if (services.length === 0) return 0;
    const total = services.reduce((sum, s) => sum + Number(s.price) / 1e6, 0);
    return total / services.length;
  }, [services]);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [skillDomain, setSkillDomain] = useState('');

  const [debouncedSearch] = useDebounce((value: string) => {
    setDebouncedSearchQuery(value);
  }, 300);

  useEffect(() => {
    debouncedSearch(searchQuery);
  }, [searchQuery, debouncedSearch]);

  const sortBy = searchParams.get('sort') || 'newest';
  const sortOrder = searchParams.get('order') || 'desc';

  const handleSortChange = useCallback(
    (newSortBy: string, newSortOrder: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('sort', newSortBy);
      params.set('order', newSortOrder);
      router.push(`/marketplace?${params.toString()}`);
    },
    [searchParams, router]
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Marketplace</h1>
          <p className="text-default-500">Discover and purchase AI agent services</p>
        </div>
        {isConnected && (
          <NextLink
            href="/marketplace/create"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#009F4D] to-[#00c853] text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" />
            Create Service
          </NextLink>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Active Services"
          value={activeServicesCount.toString()}
          isLoading={isServicesLoading}
        />
        <StatCard
          label="Total Services"
          value={totalCount.toString()}
          isLoading={isTotalCountLoading}
        />
        <StatCard
          label="Providers"
          value={uniqueProviders.toString()}
          isLoading={isServicesLoading}
        />
        <StatCard
          label="Avg Price"
          value={`$${avgPrice.toFixed(0)}`}
          isLoading={isServicesLoading}
        />
      </div>

      {providerParam && (
        <div className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-primary">Filtered by provider:</span>
            <span className="text-sm font-mono text-default-600">{providerParam}</span>
          </div>
          <button
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.delete('provider');
              router.push(`/marketplace?${params.toString()}`);
            }}
            className="text-sm text-primary hover:underline"
          >
            Clear filter
          </button>
        </div>
      )}

      <FilterSection
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        showActiveOnly={showActiveOnly}
        setShowActiveOnly={setShowActiveOnly}
        minPrice={minPrice}
        setMinPrice={setMinPrice}
        maxPrice={maxPrice}
        setMaxPrice={setMaxPrice}
        skillDomain={skillDomain}
        setSkillDomain={setSkillDomain}
      />

      {services.length === 0 ? (
        <EmptyStateServices
          action={
            isConnected
              ? { label: 'List Your Service', href: '/marketplace/create' }
              : undefined
          }
        />
      ) : (
        <>
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
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="name-asc">Name: A-Z</option>
                <option value="name-desc">Name: Z-A</option>
              </select>
            </div>
            <span className="text-sm text-default-500">{activeServicesCount} services</span>
          </div>

          <ServiceList
            searchQuery={debouncedSearchQuery}
            showActiveOnly={showActiveOnly}
            minPrice={minPrice}
            maxPrice={maxPrice}
            skillDomain={skillDomain}
            sortBy={sortBy}
            sortOrder={sortOrder}
          />
        </>
      )}
    </div>
  );
}
