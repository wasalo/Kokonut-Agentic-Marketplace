'use client';

import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { useSearchParams, useRouter } from 'next/navigation';
import NextLink from 'next/link';
import { ArrowRight, Briefcase, Code, Gavel, Store } from 'lucide-react';
import { ServiceList } from '@/components/heroui/service-list';
import { useAllServices, useProviderServices, useTotalServiceCount, type Service } from '@/lib/hooks/useServices';
import { useFindSkillsByDomain } from '@/lib/hooks/useSkills';
import { useServiceEvents } from '@/lib/hooks/useServiceEvents';
import { useTokenPriceConversion } from '@/lib/hooks/useTokenConversion';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { EmptyStateServices } from '@/components/ui/empty-state';
import { AGENT_SKILL_REGISTRY_ABI } from '@/lib/contracts/abis';
import { getContractAddress } from '@/lib/contracts/config';
import { getTokenByAddress, tokenAmountToUsd } from '@/lib/tokenUtils';
import { btn } from '@/lib/design-system';
import { JobStatus, useJobs } from '@/lib/hooks/useJobs';
import { useBiddingSessions, SessionStatus } from '@/lib/hooks/useBiddingSystem';
import { MarketplaceHubShell, type MarketplaceHubTab } from '@/components/marketplace/MarketplaceHubShell';
import { MarketplaceStatsStrip } from '@/components/marketplace/MarketplaceStatsStrip';
import { MarketplaceCommandBar } from '@/components/marketplace/MarketplaceCommandBar';
import {
  BiddingHubPanel,
  JobsHubPanel,
  MyWorkHubPanel,
  SkillsHubPanel,
  StudioHubPanel,
  getAttentionReason,
} from '@/components/marketplace/MarketplaceHubPanels';

const ITEMS_PER_PAGE = 12;
const MAX_MARKETPLACE_BATCH = 50;
const SKILL_REGISTRY_ADDRESS = getContractAddress('SKILL_REGISTRY');

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

const HUB_TABS = new Set<MarketplaceHubTab>([
  'discover',
  'jobs',
  'bidding',
  'skills',
  'my-work',
  'studio',
]);

function parseMarketplaceTab(value: string | null): MarketplaceHubTab {
  return value && HUB_TABS.has(value as MarketplaceHubTab) ? (value as MarketplaceHubTab) : 'discover';
}

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
    <MarketplaceCommandBar
      value={searchQuery}
      onChange={setSearchQuery}
      placeholder="Search services, providers, or outcomes..."
    >
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
          <button type="button"
            onClick={() => setSkillDomain('')}
            className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors cursor-pointer ${
              skillDomain === ''
                ? 'bg-primary text-white'
                : 'bg-content2 text-default-600 hover:bg-content3'
            }`}
          >
            All
          </button>
          {SKILL_DOMAINS.slice(1).map(domain => (
            <button type="button"
              key={domain.value}
              onClick={() => setSkillDomain(skillDomain === domain.value ? '' : domain.value)}
              className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors cursor-pointer ${
                skillDomain === domain.value
                  ? 'bg-primary text-white'
                  : 'bg-content2 text-default-600 hover:bg-content3'
              }`}
            >
              {domain.label}
            </button>
          ))}
        </div>
        <NextLink
          href="/marketplace?tab=skills"
          className="px-3 py-1.5 rounded-full text-xs text-primary hover:bg-content2 transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap"
        >
          <Code className="size-3" />
          Browse Skills
        </NextLink>
    </MarketplaceCommandBar>
  );
}

export default function MarketplaceInner() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { ethToUsdcRate } = useTokenPriceConversion();

  const activeTab = parseMarketplaceTab(searchParams.get('tab'));
  const providerParam = searchParams.get('provider');
  const pageParam = Math.max(0, parseInt(searchParams.get('page') || '0', 10) || 0);
  const initialQuery = searchParams.get('q') || '';
  const initialSkill = searchParams.get('skill') || '';

  const { count: totalCount, isLoading: isTotalCountLoading } = useTotalServiceCount();
  const marketBatchSize = Math.min(Math.max(totalCount || MAX_MARKETPLACE_BATCH, 1), MAX_MARKETPLACE_BATCH);

  const { services: providerFilteredServices, isLoading: isProviderLoading } = useProviderServices(
    providerParam && providerParam.startsWith('0x') ? (providerParam as `0x${string}`) : undefined
  );
  const {
    services: ownServices,
    isLoading: isOwnServicesLoading,
    error: ownServicesError,
    refetch: refetchOwnServices,
  } = useProviderServices(address);
  const { jobs: hubJobs, isLoading: isJobsLoading, refetch: refetchHubJobs } = useJobs(0, 60);
  const {
    sessions: biddingSessions,
    totalCount: biddingTotalCount,
    isLoading: isBiddingLoading,
    refetch: refetchBiddingSessions,
  } = useBiddingSessions(0, 60);

  const {
    services: allMarketServices,
    isLoading: isAllLoading,
    error: allServicesError,
    refetch: refetchAllServices,
  } = useAllServices(0, marketBatchSize);

  const services = providerParam ? providerFilteredServices : allMarketServices;
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
  const initialActiveOnly = (() => {
    const raw = searchParams.get('active');
    if (raw === null) return true;
    return raw !== '0' && raw !== 'false';
  })();
  const [showActiveOnly, setShowActiveOnly] = useState(initialActiveOnly);
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');
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

  const handleShowActiveOnlyChange = useCallback(
    (value: boolean) => {
      setShowActiveOnly(value);
      updateMarketplaceUrl({ active: value ? null : '0', page: '0' });
    },
    [updateMarketplaceUrl]
  );

  const handleMinPriceChange = useCallback(
    (value: string) => {
      setMinPrice(value);
      updateMarketplaceUrl({ minPrice: value.trim() || null, page: '0' });
    },
    [updateMarketplaceUrl]
  );

  const handleMaxPriceChange = useCallback(
    (value: string) => {
      setMaxPrice(value);
      updateMarketplaceUrl({ maxPrice: value.trim() || null, page: '0' });
    },
    [updateMarketplaceUrl]
  );

  const handleTabChange = useCallback(
    (tab: MarketplaceHubTab) => {
      updateMarketplaceUrl({ tab: tab === 'discover' ? null : tab, page: '0' });
    },
    [updateMarketplaceUrl]
  );

  const openJobsCount = hubJobs.filter(job => job.status === JobStatus.Open).length;
  const activeSessionsCount = biddingSessions.filter(session => session.status === SessionStatus.Active).length;
  const needsAttentionCount = address
    ? hubJobs.filter(job => getAttentionReason(job, address)).length
    : 0;

  const hubStats = [
    {
      label: 'Services',
      value: activeServicesCount,
      detail: `${uniqueProviders} provider${uniqueProviders === 1 ? '' : 's'} · avg $${avgPrice.toFixed(0)}`,
      icon: <Store className="size-4" />,
      isLoading: isServicesLoading || isTotalCountLoading,
    },
    {
      label: 'Awaiting Escrow',
      value: openJobsCount,
      detail: 'Jobs pending client funding',
      icon: <Briefcase className="size-4" />,
      isLoading: isJobsLoading,
    },
    {
      label: 'Bidding',
      value: activeSessionsCount,
      detail: `${biddingTotalCount} total sessions`,
      icon: <Gavel className="size-4" />,
      isLoading: isBiddingLoading,
    },
    {
      label: 'Needs Attention',
      value: needsAttentionCount,
      detail: isConnected ? 'Your action queue' : 'Connect wallet',
      icon: <ArrowRight className="size-4" />,
      isLoading: isJobsLoading,
    },
  ];

  return (
    <MarketplaceHubShell
      activeTab={activeTab}
      onTabChange={handleTabChange}
      actions={
        isConnected ? (
          <>
            <NextLink href="/marketplace/create" className={btn('primary')}>
              List Service
            </NextLink>
            <NextLink href="/jobs/create" className={btn('secondary')}>
              Post Job
            </NextLink>
            <NextLink href="/bidding/create" className={btn('secondary')}>
              Create Bid Session
            </NextLink>
          </>
        ) : undefined
      }
    >
      {activeTab === 'discover' && <MarketplaceStatsStrip items={hubStats} />}

      {activeTab === 'discover' && (
        <section>
          {providerParam && (
            <div className="mb-4 flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 p-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-primary">Filtered by provider:</span>
                <span className="text-sm font-mono text-default-600">{providerParam}</span>
              </div>
              <button
                type="button"
                onClick={() => updateMarketplaceUrl({ provider: null })}
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
            setShowActiveOnly={handleShowActiveOnlyChange}
            minPrice={minPrice}
            setMinPrice={handleMinPriceChange}
            maxPrice={maxPrice}
            setMaxPrice={handleMaxPriceChange}
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
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-default-500">Sort by:</span>
                  <select
                    value={`${sortBy}-${sortOrder}`}
                    onChange={e => {
                      const [newSortBy, newSortOrder] = e.target.value.split('-');
                      handleSortChange(newSortBy, newSortOrder);
                    }}
                    className="rounded-lg border border-divider bg-content2 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-success"
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
                <div className="mt-8 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateMarketplaceUrl({ page: String(Math.max(0, currentPage - 1)) })}
                    disabled={currentPage === 0}
                    className="rounded-lg border border-divider px-4 py-2 text-sm transition-colors hover:bg-content2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-default-500">
                    Page {currentPage + 1} of {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateMarketplaceUrl({ page: String(Math.min(totalPages - 1, currentPage + 1)) })}
                    disabled={currentPage >= totalPages - 1}
                    className="rounded-lg border border-divider px-4 py-2 text-sm transition-colors hover:bg-content2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {activeTab === 'jobs' && <JobsHubPanel />}
      {activeTab === 'bidding' && <BiddingHubPanel />}
      {activeTab === 'skills' && <SkillsHubPanel />}
      {activeTab === 'my-work' && <MyWorkHubPanel jobs={hubJobs} user={address} isLoading={isJobsLoading} />}
      {activeTab === 'studio' && (
        <StudioHubPanel
          services={ownServices}
          jobs={hubJobs}
          sessions={biddingSessions}
          user={address}
          isConnected={isConnected}
          isLoading={isOwnServicesLoading}
          isJobsLoading={isJobsLoading}
          isBiddingLoading={isBiddingLoading}
          error={ownServicesError}
          onRefetch={refetchOwnServices}
          onRefreshAll={() => {
            refetchOwnServices();
            void refetchHubJobs();
            void refetchBiddingSessions();
          }}
        />
      )}
    </MarketplaceHubShell>
  );
}
