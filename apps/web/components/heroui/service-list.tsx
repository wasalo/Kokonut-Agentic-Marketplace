'use client';

import { useState, useEffect, useMemo } from 'react';
import { usePublicClient } from 'wagmi';
import { useAllServices, Service } from '@/lib/hooks/useServicesContract';
import { useFindSkillsByDomain } from '@/lib/hooks/useSkills';
import { useTokenPriceConversion } from '@/lib/hooks/useTokenConversion';
import { Card, Button } from '@heroui/react';
import NextLink from 'next/link';
import {
  ShoppingBag,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  List,
  LayoutGrid,
  Bookmark,
  Calendar,
} from 'lucide-react';
import { useViewportPagination, usePagination } from '@/lib/hooks/useViewportPagination';
import { StatusBadge, getServiceStatusBadgeType } from '@/components/StatusBadge';
import { useServiceBookmarks, useBookmarkCounts } from '@/lib/hooks/useBookmarks';
import { CONTRACTS } from '@/lib/wagmi';
import { AGENT_SKILL_REGISTRY_ABI } from '@/lib/contracts/abis';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const SKILL_REGISTRY_ADDRESS = CONTRACTS[11155111].skillRegistry;

// Helper function to convert price to USD equivalent (USDC = 6 decimals, ETH = 18 decimals)
function priceToUsdEquivalent(
  price: bigint,
  paymentToken: `0x${string}`,
  ethToUsdcRate: number | null
): number {
  const isEth = paymentToken.toLowerCase() === ZERO_ADDRESS.toLowerCase();

  if (isEth && ethToUsdcRate) {
    // ETH: convert from 18 decimals to USD equivalent
    const ethAmount = Number(price) / 1e18;
    return ethAmount * ethToUsdcRate;
  } else if (isEth) {
    // ETH but no rate available - return price in ETH terms (will be excluded from filter)
    return Number(price) / 1e18;
  } else {
    // USDC: already in 6 decimals
    return Number(price) / 1e6;
  }
}

function ServiceListSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(6)].map((_, i) => (
        <Card key={i} className="border border-divider p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-5 bg-content2 rounded w-2/3" />
            <div className="h-4 bg-content2 rounded w-full" />
            <div className="h-4 bg-content2 rounded w-1/2" />
          </div>
        </Card>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16">
      <div className="h-16 w-16 rounded-full bg-content2 flex items-center justify-center mx-auto mb-4">
        <ShoppingBag className="h-8 w-8 text-default-500" />
      </div>
      <h3 className="text-lg font-semibold mb-2">No Services Available</h3>
      <p className="text-default-500 max-w-md mx-auto">
        No services have been listed yet. Check back later or register an agent to create one.
      </p>
    </div>
  );
}

function ServiceCard({ service }: { service: Service }) {
  const { ethToUsdcRate } = useTokenPriceConversion();
  const { isBookmarked, toggleBookmark } = useServiceBookmarks();
  const { getServiceCount } = useBookmarkCounts();

  const isEth =
    service.paymentToken && service.paymentToken.toLowerCase() === ZERO_ADDRESS.toLowerCase();
  const tokenDecimals = isEth ? 18 : 6;
  const tokenAmount = Number(service.price) / 10 ** tokenDecimals;
  const tokenSymbol = isEth ? 'ETH' : 'USDC';

  const usdValue =
    isEth && ethToUsdcRate ? tokenAmount * ethToUsdcRate : isEth ? null : tokenAmount;

  const serviceIdStr = service.id.toString();
  const bookmarked = isBookmarked(serviceIdStr);
  const bookmarkCount = getServiceCount(serviceIdStr);

  const createdAt = service.createdAt
    ? new Date(Number(service.createdAt) * 1000).toLocaleDateString()
    : null;

  const handlePurchase = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.location.href = `/jobs/create?serviceId=${serviceIdStr}&provider=${service.provider}`;
  };

  const handleBookmark = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleBookmark(serviceIdStr);
  };

  return (
    <Card className="border border-divider p-6 hover:border-success transition-colors cursor-pointer h-full relative group">
      <div className="flex items-start justify-between mb-3">
        <NextLink href={`/marketplace/${serviceIdStr}`} className="flex-1 min-w-0 pr-2">
          <h3 className="font-semibold text-lg">{service.name}</h3>
        </NextLink>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleBookmark}
            className={`p-1.5 rounded-lg transition-colors ${
              bookmarked
                ? 'text-[#009F4D] hover:bg-[#009F4D]/10'
                : 'text-default-400 hover:text-default-600 hover:bg-default-100'
            }`}
            title={bookmarked ? 'Remove bookmark' : 'Bookmark this service'}
          >
            <Bookmark className={`w-4 h-4 ${bookmarked ? 'fill-current' : ''}`} />
          </button>
          {bookmarkCount > 0 && <span className="text-xs text-default-400">{bookmarkCount}</span>}
          <StatusBadge status={getServiceStatusBadgeType(service.isActive)} size="sm" />
          <span
            className={`text-xs px-2 py-0.5 rounded ${
              isEth ? 'bg-[#627EEA]/10 text-[#627EEA]' : 'bg-[#2775CA]/10 text-[#2775CA]'
            }`}
          >
            {tokenSymbol}
          </span>
        </div>
      </div>
      <NextLink href={`/marketplace/${serviceIdStr}`} className="block">
        <p className="text-default-500 text-sm mb-4 line-clamp-2">{service.description}</p>
        <div className="flex justify-between items-center text-sm">
          <span className="text-default-500">
            By {(service.provider as `0x${string}`).slice(0, 6)}...
            {(service.provider as `0x${string}`).slice(-4)}
            {createdAt && (
              <span className="flex items-center gap-1 mt-1 text-xs text-default-400">
                <Calendar className="w-3 h-3" />
                {createdAt}
              </span>
            )}
          </span>
          <div className="text-right">
            <span className="font-semibold text-success flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              {tokenAmount.toFixed(2)} {tokenSymbol}
            </span>
            {usdValue !== null && (
              <span className="text-xs text-default-400 block">
                ~$
                {usdValue.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                USD
              </span>
            )}
          </div>
        </div>
      </NextLink>
      {service.isActive && (
        <button
          onClick={handlePurchase}
          className="absolute bottom-4 right-4 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#009F4D] to-[#00c853] text-white rounded-lg font-medium text-sm hover:opacity-90 transition-opacity opacity-0 group-hover:opacity-100"
        >
          Purchase
        </button>
      )}
    </Card>
  );
}

interface ServiceListProps {
  searchQuery?: string;
  showActiveOnly?: boolean;
  minPrice?: string;
  maxPrice?: string;
  skillDomain?: string;
  sortBy?: string;
  sortOrder?: string;
}

export function ServiceList({
  searchQuery = '',
  showActiveOnly = true,
  minPrice = '',
  maxPrice = '',
  skillDomain = '',
  sortBy = 'newest',
  sortOrder = 'desc',
}: ServiceListProps) {
  const { itemsPerPage } = useViewportPagination();
  const [{ page, showAll }, { setPage, toggleShowAll }] = usePagination(itemsPerPage);
  const publicClient = usePublicClient();
  const { ethToUsdcRate } = useTokenPriceConversion();

  // Use contract-based services
  const { services, isLoading, error, refetch } = useAllServices();

  // Skill domain filtering
  const { skillIds, isLoading: isLoadingSkills } = useFindSkillsByDomain(skillDomain || undefined);
  const [agentIdsBySkill, setAgentIdsBySkill] = useState<Set<string>>(new Set());

  // Fetch agent IDs for skills matching the domain
  useEffect(() => {
    if (!publicClient || !skillIds || skillIds.length === 0) {
      setAgentIdsBySkill(new Set());
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
        const agentIdSet = new Set<string>();
        for (const result of results) {
          if (result.status === 'success' && result.result) {
            const skillData = result.result as { agentId: bigint };
            agentIdSet.add(skillData.agentId.toString());
          }
        }
        setAgentIdsBySkill(agentIdSet);
      } catch (err) {
        console.error('Error fetching agent IDs for skill domain:', err);
        setAgentIdsBySkill(new Set());
      }
    };

    void fetchAgentIds();
  }, [publicClient, skillIds]);

  // Apply filters
  const filteredServices = useMemo(() => {
    return services.filter((service: Service) => {
      // Search query filter
      if (searchQuery && !service.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Active only filter
      if (showActiveOnly && !service.isActive) {
        return false;
      }

      // Skill domain filter
      if (skillDomain && agentIdsBySkill.size > 0) {
        const serviceAgentId = service.agentId.toString();
        if (!agentIdsBySkill.has(serviceAgentId)) {
          return false;
        }
      }

      // Price range filters - convert to USD equivalents for comparison
      const priceInUsd = priceToUsdEquivalent(service.price, service.paymentToken, ethToUsdcRate);
      if (minPrice && priceInUsd < Number(minPrice)) {
        return false;
      }
      if (maxPrice && priceInUsd > Number(maxPrice)) {
        return false;
      }

      return true;
    });
  }, [
    services,
    searchQuery,
    showActiveOnly,
    skillDomain,
    agentIdsBySkill,
    minPrice,
    maxPrice,
    ethToUsdcRate,
  ]);

  // Apply sorting
  filteredServices.sort((a: Service, b: Service) => {
    const multiplier = sortOrder === 'asc' ? 1 : -1;

    switch (sortBy) {
      case 'price': {
        // Sort by USD equivalent price
        const priceA = priceToUsdEquivalent(a.price, a.paymentToken, ethToUsdcRate);
        const priceB = priceToUsdEquivalent(b.price, b.paymentToken, ethToUsdcRate);
        return multiplier * (priceA - priceB);
      }
      case 'name':
        return multiplier * a.name.localeCompare(b.name);
      case 'newest':
      default:
        // Sort by ID (newest first by default)
        return multiplier * (Number(a.id) - Number(b.id));
    }
  });

  // Pagination logic (use filteredServices)
  const totalPages = Math.ceil((filteredServices.length || 0) / itemsPerPage);
  const displayServices = showAll
    ? filteredServices
    : filteredServices.slice(page * itemsPerPage, (page + 1) * itemsPerPage);

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-danger mb-2">Error loading services</p>
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

  if (isLoading || isLoadingSkills) {
    return <ServiceListSkeleton />;
  }

  if (!displayServices || displayServices.length === 0) {
    return skillDomain ? (
      <div className="text-center py-16">
        <div className="h-16 w-16 rounded-full bg-content2 flex items-center justify-center mx-auto mb-4">
          <ShoppingBag className="h-8 w-8 text-default-500" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No Services Found</h3>
        <p className="text-default-500 max-w-md mx-auto">
          No services match the skill domain "{skillDomain}". Try a different search term.
        </p>
      </div>
    ) : (
      <EmptyState />
    );
  }

  return (
    <div>
      {/* Show All Toggle */}
      <div className="flex justify-end mb-4">
        <Button variant="ghost" size="sm" onPress={toggleShowAll} className="text-default-500">
          {showAll ? (
            <>
              <LayoutGrid className="w-4 h-4 mr-2" />
              Show Paginated
            </>
          ) : (
            <>
              <List className="w-4 h-4 mr-2" />
              Show All ({filteredServices.length || 0})
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayServices.map((service: Service) => (
          <ServiceCard key={service.id.toString()} service={service} />
        ))}
      </div>

      {/* Pagination - only show if not in Show All mode and multiple pages exist */}
      {!showAll && totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-8">
          <Button
            variant="ghost"
            size="sm"
            isDisabled={page === 0}
            onPress={() => setPage(Math.max(0, page - 1))}
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
            onPress={() => setPage(Math.min(totalPages - 1, page + 1))}
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Summary when showing all */}
      {showAll && (
        <p className="text-center text-sm text-default-500 mt-8">
          Showing all {displayServices.length} services
        </p>
      )}
    </div>
  );
}
