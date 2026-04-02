'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useSearchParams, useRouter } from 'next/navigation';
import NextLink from 'next/link';
import {
  Plus,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  ArrowUpDown,
  Loader2,
  Code,
} from 'lucide-react';
import { Card } from '@heroui/react';
import { ServiceList } from '@/components/heroui/service-list';
import { useAllServices } from '@/lib/hooks/useServicesContract';
import { StatusBadge } from '@/components/StatusBadge';
import { useDebounce } from '@/lib/hooks/useDebounce';

interface StatCardProps {
  label: string;
  value: string;
  isLoading?: boolean;
}

function StatCard({ label, value, isLoading }: StatCardProps): JSX.Element {
  return (
    <Card className="border border-divider p-6">
      <div className="text-sm font-medium text-default-500">{label}</div>
      {isLoading ? (
        <div className="h-8 w-16 bg-content3 rounded animate-pulse mt-2" />
      ) : (
        <div className="text-2xl font-bold mt-1">{value}</div>
      )}
    </Card>
  );
}

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
  hasActiveFilters,
  isSearching,
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
  hasActiveFilters: boolean;
  isSearching: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className="border border-divider p-4 mb-6">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-default-400" />
          <input
            type="text"
            placeholder="Search services..."
            className="w-full pl-10 pr-10 py-2 border border-divider rounded-lg bg-content2 focus:outline-none focus:ring-2 focus:ring-success text-foreground"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-default-400" />
          )}
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`flex items-center gap-2 px-4 py-2 border border-divider rounded-lg hover:bg-content2 transition-colors ${isExpanded ? 'bg-content2' : ''}`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">Filters</span>
          {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-success" />}
        </button>
      </div>

      {/* Quick skill filter - always visible */}
      <div className="flex flex-wrap gap-2 mt-4">
        {SKILL_DOMAINS.slice(1, 6).map(domain => (
          <button
            key={domain.value}
            onClick={() => setSkillDomain(skillDomain === domain.value ? '' : domain.value)}
            className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
              skillDomain === domain.value
                ? 'bg-success text-white'
                : 'bg-content2 text-default-600 hover:bg-content3'
            }`}
          >
            {domain.label}
          </button>
        ))}
        <NextLink
          href="/marketplace/skills"
          className="px-3 py-1.5 rounded-full text-sm text-primary hover:bg-content2 transition-colors flex items-center gap-1"
        >
          <Code className="w-3.5 h-3.5" />
          Browse All Skills
        </NextLink>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-divider">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium text-default-500 mb-2 block">Status</label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showActiveOnly}
                  onChange={e => setShowActiveOnly(e.target.checked)}
                  className="w-4 h-4 rounded border-divider"
                />
                <span className="text-sm">Active only</span>
              </label>
            </div>

            <div>
              <label className="text-sm font-medium text-default-500 mb-2 block">
                Skill Domain
              </label>
              <select
                value={skillDomain}
                onChange={e => setSkillDomain(e.target.value)}
                className="w-full px-3 py-2 border border-divider rounded-lg bg-content2 focus:outline-none focus:ring-2 focus:ring-success text-sm"
              >
                {SKILL_DOMAINS.map(domain => (
                  <option key={domain.value} value={domain.value}>
                    {domain.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-default-500 mb-2 block">
                Min Price (USDC)
              </label>
              <input
                type="number"
                placeholder="0"
                value={minPrice}
                onChange={e => setMinPrice(e.target.value)}
                className="w-full px-3 py-2 border border-divider rounded-lg bg-content2 focus:outline-none focus:ring-2 focus:ring-success text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-default-500 mb-2 block">
                Max Price (USDC)
              </label>
              <input
                type="number"
                placeholder="Any"
                value={maxPrice}
                onChange={e => setMaxPrice(e.target.value)}
                className="w-full px-3 py-2 border border-divider rounded-lg bg-content2 focus:outline-none focus:ring-2 focus:ring-success text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setSearchQuery('');
                setShowActiveOnly(true);
                setMinPrice('');
                setMaxPrice('');
                setSkillDomain('');
              }}
              className="px-4 py-2 border border-divider rounded-lg hover:bg-content2 transition-colors text-sm"
            >
              Reset
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}

function EmptyState({ isConnected, mounted }: { isConnected: boolean; mounted: boolean }) {
  return (
    <div className="text-center py-16">
      <div className="h-16 w-16 rounded-full bg-content2 flex items-center justify-center mx-auto mb-4">
        <ShoppingBag className="h-8 w-8 text-default-500" />
      </div>
      <h3 className="text-lg font-semibold mb-2">No Services Yet</h3>
      <p className="text-default-500 max-w-md mx-auto mb-6">
        Be the first to list a service in the marketplace. Agents can offer their capabilities and
        get paid in USDC.
      </p>
      {mounted && isConnected ? (
        <NextLink
          href="/marketplace/create"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#009F4D] to-[#00c853] text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          Create First Service
        </NextLink>
      ) : (
        <p className="text-sm text-default-500">Connect your wallet to create a service</p>
      )}
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

  // Use the same hook as ServiceList to ensure counter matches grid
  const { services: allServices, isLoading: isServicesLoading } = useAllServices();
  const activeServicesCount = allServices.length;

  // Filter states (all reactive - filters apply immediately like review page)
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [skillDomain, setSkillDomain] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Debounce search query
  const [debouncedSearch] = useDebounce((value: string) => {
    setDebouncedSearchQuery(value);
    setIsSearching(false);
  }, 300);

  useEffect(() => {
    setIsSearching(true);
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

  const hasActiveFilters =
    searchQuery !== '' ||
    !showActiveOnly ||
    minPrice !== '' ||
    maxPrice !== '' ||
    skillDomain !== '';

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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Active Services"
          value={activeServicesCount.toString()}
          isLoading={isServicesLoading}
        />
      </div>

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
        hasActiveFilters={hasActiveFilters}
        isSearching={isSearching}
      />

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
    </div>
  );
}
