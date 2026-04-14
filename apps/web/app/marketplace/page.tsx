'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useSearchParams, useRouter } from 'next/navigation';
import NextLink from 'next/link';
import { Plus, Code } from 'lucide-react';
// Card import was needed? Wait, wait: Card is not used anymore anywhere since we removed it from FilterSection AND EmptyState! Let me remove Card completely!
import { ServiceList } from '@/components/heroui/service-list';
import { useAllServices } from '@/lib/hooks/useServicesContract';
import { useProviderServices, useTotalServiceCount } from '@/lib/hooks/useServices';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { StatCard } from '@/components/ui/stat-card';
import { FilterPanel, FilterPresets } from '@/components/ui/filter-panel';
import { EmptyStateServices } from '@/components/ui/empty-state';
import { LiveFeed } from '@/components/heroui/live-feed';

// Popular skill domains for filtering
const SKILL_DOMAINS = [
  { value: '', label: 'All Skills' },
  { value: 'defi', label: 'DeFi' },
  { value: 'nft', label: 'NFT' },
  { value: 'ai', label: 'AI / ML' },
  { value: 'governance', label: 'Governance' },
  { value: 'web3', label: 'Web3' },
  { value: 'data', label: 'Data Analysis' },
  { value: 'security', label: 'Security' },
  { value: 'infrastructure', label: 'Infrastructure' },
];

function FilterSection({
  searchQuery,
  setSearchQuery,
  showActiveOnly,
  setShowActiveOnly,
  minPrice,
  setMinPrice,
  maxPrice,
  setMaxPrice,
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
      <FilterPanel
        searchPlaceholder="Search services..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        filters={FilterPresets.services()}
        filterValues={{
          status: showActiveOnly ? 'active' : '',
          domain: skillDomain,
          priceMin: minPrice,
          priceMax: maxPrice,
        }}
        onFilterChange={(key, value) => {
          if (key === 'status') setShowActiveOnly(value === 'active' || value === '');
          if (key === 'domain') setSkillDomain(value as string);
          if (key === 'priceMin') setMinPrice(value as string);
          if (key === 'priceMax') setMaxPrice(value as string);
        }}
        onReset={() => {
          setSearchQuery('');
          setShowActiveOnly(true);
          setMinPrice('');
          setMaxPrice('');
          setSkillDomain('');
        }}
      />
      {/* Quick skill filter - always visible */}
      <div className="flex flex-wrap gap-2 mt-4 px-1">
        {SKILL_DOMAINS.slice(1, 6).map(domain => (
          <button
            key={domain.value}
            onClick={() => setSkillDomain(skillDomain === domain.value ? '' : domain.value)}
            className={`px-3 py-1.5 rounded-full text-sm transition-colors cursor-pointer ${
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
          className="px-3 py-1.5 rounded-full text-sm text-[#009F4D] hover:bg-content2 transition-colors flex items-center gap-1 cursor-pointer"
        >
          <Code className="w-3.5 h-3.5" />
          Browse All Skills
        </NextLink>
      </div>
    </div>
  );
}

export default function MarketplacePage(): JSX.Element {
  const { isConnected } = useAccount();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // URL-based provider filtering
  const providerParam = searchParams.get('provider');

  // Use provider services hook if provider filter is set
  const { services: providerServices, isLoading: isProviderLoading } = useProviderServices(
    providerParam && providerParam.startsWith('0x') ? (providerParam as `0x${string}`) : undefined
  );

  // Use the same hook as ServiceList to ensure counter matches grid
  const { services: allMarketServices, isLoading: isAllLoading } = useAllServices();

  // Contract-based counts
  const { count: totalCount, isLoading: isTotalCountLoading } = useTotalServiceCount();

  // Filter services based on URL params
  const services = providerParam ? providerServices : allMarketServices;
  const isServicesLoading = providerParam ? isProviderLoading : isAllLoading;
  const activeServicesCount = services.length;

  // Filter states (all reactive - filters apply immediately like review page)
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [skillDomain, setSkillDomain] = useState('');

  // Debounce search query
  const [debouncedSearch] = useDebounce((value: string) => {
    setDebouncedSearchQuery(value);
  }, 300);

  useEffect(() => {
    debouncedSearch(searchQuery);
  }, [searchQuery, debouncedSearch]);

  // URL-based sorting
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
        {mounted && isConnected && (
          <NextLink
            href="/marketplace/create"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#009F4D] to-[#00c853] text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" />
            Create Service
          </NextLink>
        )}
      </div>

      {/* Live Feed - Announcements */}
      <div className="mb-6">
        <LiveFeed maxDisplay={3} showHeader={true} showLoadMore={true} className="shadow-lg" />
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
            mounted && isConnected
              ? { label: 'List Your Service', href: '/marketplace/create' }
              : undefined
          }
        />
      ) : (
        <>
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
