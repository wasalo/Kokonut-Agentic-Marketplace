'use client';

import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { useSearchParams, useRouter } from 'next/navigation';
import NextLink from 'next/link';
import { Plus, Code } from 'lucide-react';
import { ServiceList } from '@/components/heroui/service-list';
import { useAllServices, useProviderServices, useTotalServiceCount, type Service } from '@/lib/hooks/useServices';
import { useFindSkillsByDomain } from '@/lib/hooks/useSkills';
import { useServiceEvents } from '@/lib/hooks/useServiceEvents';
import { useTokenPriceConversion } from '@/lib/hooks/useTokenConversion';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { StatCard } from '@/components/ui/stat-card';
import { EmptyStateServices } from '@/components/ui/empty-state';
import { AGENT_SKILL_REGISTRY_ABI } from '@/lib/contracts/abis';
import { CONTRACTS } from '@/lib/wagmi';
import { getTokenByAddress, tokenAmountToUsd } from '@/lib/tokenUtils';

const ITEMS_PER_PAGE = 12;
const MAX_MARKETPLACE_BATCH = 50;
const SKILL_REGISTRY_ADDRESS = CONTRACTS[11155111].skillRegistry;

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
  const publicClient = usePublicClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { ethToUsdcRate } = useTokenPriceConversion();

  const providerParam = searchParams.get('provider');
  const pageParam = Math.max(0, parseInt(searchParams.get('page') || '0', 10) || 0);
  const initialQuery = searchParams.get('q') || '';
  const initialSkill = searchParams.get('skill') || '';

  const { count: totalCount, isLoading: isTotalCountLoading } = useTotalServiceCount();
  const marketBatchSize = Math.min(Math.max(totalCount || MAX_MARKETPLACE_BATCH, 1), MAX_MARKETPLACE_BATCH);

  const { services: providerServices, isLoading: isProviderLoading } = useProviderServices(
    providerParam && providerParam.startsWith('0x') ? (providerParam as `0x${string}`) : undefined
  );

  const {
    services: allMarketServices,
    isLoading: isAllLoading,
    error: allServicesError,
    refetch: refetchAllServices,
  } = useAllServices(0, marketBatchSize);

  const services = providerParam ? providerServices : allMarketServices;
  const isServicesLoading = providerParam ? isProviderLoading : isAllLoading;
  const activeServicesCount = services.filter(service => service.isActive).length;

  const uniqueProviders = useMemo(() => new Set(services.map(s => s.provider.toLowerCase())).size, [services]);
  const avgPrice = useMemo(() => {
    if (services.length === 0) return 0;
    const total = services.reduce((sum, service) => {
      const token = getTokenByAddress(service.paymentToken);
      return sum + tokenAmountToUsd(service.price, token, ethToUsdcRate);
    }, 0);
    return total / services.length;
  }, [services, ethToUsdcRate]);

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(initialQuery);
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [skillDomain, setSkillDomain] = useState(initialSkill);
  const hasMountedSearchRef = useRef(false);

  const updateMarketplaceUrl = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(
        typeof window === 'undefined' ? searchParams.toString() : window.location.search
      );
      Object.entries(updates).forEach(([key, value]) => {
        if (value) params.set(key, value);
        else params.delete(key);
      });
      router.replace(`/marketplace?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const [debouncedSearch] = useDebounce((value: string) => {
    setDebouncedSearchQuery(value);
    updateMarketplaceUrl({ q: value.trim() || null, page: '0' });
  }, 300);

  useEffect(() => {
    if (!hasMountedSearchRef.current) {
      hasMountedSearchRef.current = true;
      return;
    }
    debouncedSearch(searchQuery);
  }, [searchQuery, debouncedSearch]);

  useServiceEvents(() => refetchAllServices());

  const sortBy = searchParams.get('sort') || 'newest';
  const sortOrder = searchParams.get('order') || 'desc';

  const { skillIds, isLoading: isLoadingSkills } = useFindSkillsByDomain(skillDomain || undefined);
  const [agentIdsBySkill, setAgentIdsBySkill] = useState<Map<string, string[]>>(new Map());

  useEffect(() => {
    if (!skillDomain || !publicClient || !skillIds || skillIds.length === 0) {
      setAgentIdsBySkill(new Map());
      return;
    }

    const fetchAgentIds = async () => {
      const calls = skillIds.map(skillId => ({
        address: SKILL_REGISTRY_ADDRESS as `0x${string}`,
        abi: AGENT_SKILL_REGISTRY_ABI,
        functionName: 'getSkillData' as const,
        args: [skillId],
      }));

      try {
        const results = await publicClient.multicall({ contracts: calls });
        const map = new Map<string, string[]>();
        for (const result of results) {
          if (result.status === 'success' && result.result) {
            const skillData = result.result as unknown as { agentId: bigint };
            const agentId = skillData.agentId.toString();
            const existing = map.get(agentId) || [];
            if (!existing.includes(skillDomain)) existing.push(skillDomain);
            map.set(agentId, existing);
          }
        }
        setAgentIdsBySkill(map);
      } catch (err) {
        console.error('Error fetching agent IDs for skill domain:', err);
        setAgentIdsBySkill(new Map());
      }
    };

    void fetchAgentIds();
  }, [publicClient, skillIds, skillDomain]);

  const filteredServices = useMemo(() => {
    const normalizedQuery = debouncedSearchQuery.toLowerCase().trim();
    return services.filter((service: Service) => {
      if (normalizedQuery) {
        const haystack = `${service.name} ${service.description}`.toLowerCase();
        if (!haystack.includes(normalizedQuery)) return false;
      }
      if (showActiveOnly && !service.isActive) return false;
      if (skillDomain && !agentIdsBySkill.has(service.agentId.toString())) return false;

      const token = getTokenByAddress(service.paymentToken);
      const priceInUsd = tokenAmountToUsd(service.price, token, ethToUsdcRate);
      if (minPrice && priceInUsd < Number(minPrice)) return false;
      if (maxPrice && priceInUsd > Number(maxPrice)) return false;
      return true;
    });
  }, [
    services,
    debouncedSearchQuery,
    showActiveOnly,
    skillDomain,
    agentIdsBySkill,
    ethToUsdcRate,
    minPrice,
    maxPrice,
  ]);

  const sortedServices = useMemo(() => {
    return [...filteredServices].sort((a: Service, b: Service) => {
      const multiplier = sortOrder === 'asc' ? 1 : -1;
      switch (sortBy) {
        case 'price': {
          const tokenA = getTokenByAddress(a.paymentToken);
          const tokenB = getTokenByAddress(b.paymentToken);
          const priceA = tokenAmountToUsd(a.price, tokenA, ethToUsdcRate);
          const priceB = tokenAmountToUsd(b.price, tokenB, ethToUsdcRate);
          return multiplier * (priceA - priceB);
        }
        case 'name':
          return multiplier * a.name.localeCompare(b.name);
        case 'newest':
        default:
          return multiplier * (Number(a.id) - Number(b.id));
      }
    });
  }, [filteredServices, sortBy, sortOrder, ethToUsdcRate]);

  const totalPages = Math.max(1, Math.ceil(sortedServices.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(pageParam, totalPages - 1);
  const displayServices = sortedServices.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE
  );

  const handleSortChange = useCallback(
    (newSortBy: string, newSortOrder: string) => {
      updateMarketplaceUrl({ sort: newSortBy, order: newSortOrder, page: '0' });
    },
    [updateMarketplaceUrl]
  );

  const handleSkillDomainChange = useCallback(
    (value: string) => {
      setSkillDomain(value);
      updateMarketplaceUrl({ skill: value || null, page: '0' });
    },
    [updateMarketplaceUrl]
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
        setSkillDomain={handleSkillDomainChange}
      />

      {!isServicesLoading && services.length === 0 ? (
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
            <span className="text-sm text-default-500">{filteredServices.length} services</span>
          </div>

          <ServiceList
            services={displayServices}
            isLoading={isServicesLoading || isLoadingSkills}
            error={allServicesError as Error | null}
            onRetry={() => refetchAllServices()}
            skillDomain={skillDomain}
            skillDomainsByAgent={agentIdsBySkill}
            totalFilteredCount={filteredServices.length}
          />

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => {
                  updateMarketplaceUrl({ page: String(Math.max(0, currentPage - 1)) });
                }}
                disabled={currentPage === 0}
                className="px-4 py-2 rounded-lg border border-divider disabled:opacity-50 disabled:cursor-not-allowed hover:bg-content2 transition-colors text-sm"
              >
                Previous
              </button>
              <span className="text-sm text-default-500">
                Page {currentPage + 1} of {totalPages}
              </span>
              <button
                onClick={() => {
                  updateMarketplaceUrl({ page: String(Math.min(totalPages - 1, currentPage + 1)) });
                }}
                disabled={currentPage >= totalPages - 1}
                className="px-4 py-2 rounded-lg border border-divider disabled:opacity-50 disabled:cursor-not-allowed hover:bg-content2 transition-colors text-sm"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
