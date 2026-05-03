'use client';

import { useState, useEffect, useMemo } from 'react';
import { usePublicClient } from 'wagmi';
import { useAllServices, Service } from '@/lib/hooks/useServicesContract';
import { useFindSkillsByDomain } from '@/lib/hooks/useSkills';
import { useTokenPriceConversion } from '@/lib/hooks/useTokenConversion';
import { useAgentReputation } from '@/lib/hooks/useAgentReputation';
import { Card } from '@heroui/react';
import { useRouter } from 'next/navigation';
import {
  ShoppingBag,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  Calendar,
  Star,
  User,
} from 'lucide-react';
import { StatusBadge, getServiceStatusBadgeType } from '@/components/StatusBadge';
import { useServiceBookmarks, useBookmarkCounts } from '@/lib/hooks/useBookmarks';
import { useServiceEvents } from '@/lib/hooks/useServiceEvents';
import { CONTRACTS } from '@/lib/wagmi';
import { AGENT_SKILL_REGISTRY_ABI } from '@/lib/contracts/abis';
import { Address } from '@/components/Address';
import { GridSkeleton } from '@/components/Skeletons';

const ITEMS_PER_PAGE = 12;
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const SKILL_REGISTRY_ADDRESS = CONTRACTS[11155111].skillRegistry;

function priceToUsdEquivalent(
  price: bigint,
  paymentToken: `0x${string}`,
  ethToUsdcRate: number | null
): number {
  const isEth = paymentToken.toLowerCase() === ZERO_ADDRESS.toLowerCase();
  if (isEth && ethToUsdcRate) {
    return (Number(price) / 1e18) * ethToUsdcRate;
  } else if (isEth) {
    return Number(price) / 1e18;
  } else {
    return Number(price) / 1e6;
  }
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

function ServiceCard({
  service,
  providerName,
  providerReputation,
  skillDomains,
}: {
  service: Service;
  providerName?: string;
  providerReputation?: { rating: number; total: number };
  skillDomains?: string[];
}) {
  const router = useRouter();
  const { ethToUsdcRate } = useTokenPriceConversion();
  const { isBookmarked, toggleBookmark } = useServiceBookmarks();
  const { getServiceCount } = useBookmarkCounts();

  const isEth =
    service.paymentToken && service.paymentToken.toLowerCase() === ZERO_ADDRESS.toLowerCase();
  const tokenDecimals = isEth ? 18 : 6;
  const tokenAmount = Number(service.price) / 10 ** tokenDecimals;
  const tokenSymbol = isEth ? 'ETH' : 'USDC';

  const usdValue = isEth && ethToUsdcRate ? tokenAmount * ethToUsdcRate : isEth ? null : tokenAmount;

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

  const handleCardClick = () => {
    router.push(`/marketplace/${serviceIdStr}`);
  };

  return (
    <Card className="border border-divider hover:border-success transition-colors cursor-pointer h-full">
      <div className="p-5 flex flex-col h-full">
        {/* Header Row */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0 pr-2" onClick={handleCardClick}>
            <h3 className="font-semibold text-sm md:text-base truncate">{service.name}</h3>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleBookmark}
              className={`p-1 rounded transition-colors ${
                bookmarked
                  ? 'text-[#009F4D] hover:bg-[#009F4D]/10'
                  : 'text-default-400 hover:text-default-600 hover:bg-default-100'
              }`}
              title={bookmarked ? 'Remove bookmark' : 'Bookmark this service'}
            >
              <Bookmark className={`w-3.5 h-3.5 ${bookmarked ? 'fill-current' : ''}`} />
            </button>
            {bookmarkCount > 0 && (
              <span className="text-[10px] text-default-400">{bookmarkCount}</span>
            )}
            <StatusBadge status={getServiceStatusBadgeType(service.isActive)} size="sm" />
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded ${
                isEth ? 'bg-[#627EEA]/10 text-[#627EEA]' : 'bg-[#2775CA]/10 text-[#2775CA]'
              }`}
            >
              {tokenSymbol}
            </span>
          </div>
        </div>

        {/* Description */}
        <div className="flex-1" onClick={handleCardClick}>
          <p className="text-default-500 text-xs mb-3 line-clamp-2">{service.description}</p>
        </div>

        {/* Rating + Provider */}
        <div className="mb-3">
          {providerReputation && providerReputation.rating > 0 && (
            <span className="inline-flex items-center gap-1 mr-3 text-xs">
              <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
              <span className="font-medium">{providerReputation.rating.toFixed(1)}</span>
              <span className="text-default-400">({providerReputation.total})</span>
            </span>
          )}
          <span className="text-xs text-default-500 inline-flex items-center gap-1">
            <User className="w-3 h-3" />
            {providerName ? (
              <span className="truncate max-w-[120px]">{providerName}</span>
            ) : (
              <Address address={service.provider as `0x${string}`} truncate />
            )}
          </span>
          {createdAt && (
            <span className="flex items-center gap-1 mt-1 text-[10px] text-default-400">
              <Calendar className="w-3 h-3" />
              {createdAt}
            </span>
          )}
        </div>

        {/* Skill Domain Chips */}
        {skillDomains && skillDomains.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {skillDomains.slice(0, 2).map(domain => (
              <span
                key={domain}
                className="text-[10px] px-1.5 py-0.5 rounded-full bg-content2 text-default-500"
              >
                {domain.replace('@skills/', '')}
              </span>
            ))}
          </div>
        )}

        {/* Price + Purchase Row */}
        <div className="flex items-center justify-between pt-3 border-t border-divider">
          <div>
            <span className="font-semibold text-sm text-success flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              {tokenAmount.toFixed(2)} {tokenSymbol}
            </span>
            {usdValue !== null && (
              <span className="text-[10px] text-default-400 block">
                ~${usdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
              </span>
            )}
          </div>
          {service.isActive && (
            <button
              onClick={handlePurchase}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#009F4D] to-[#00c853] text-white rounded-lg font-medium text-xs hover:opacity-90 transition-opacity"
            >
              Purchase
              <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
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
  const [page, setPage] = useState(0);
  const publicClient = usePublicClient();
  const { ethToUsdcRate } = useTokenPriceConversion();

  const { services, isLoading, error, refetch } = useAllServices();

  // Auto-refresh when new services are created on-chain
  useServiceEvents(() => refetch());

  // Skill domain filtering
  const { skillIds, isLoading: isLoadingSkills } = useFindSkillsByDomain(skillDomain || undefined);
  const [agentIdsBySkill, setAgentIdsBySkill] = useState<Map<string, string[]>>(new Map());

  // Fetch agent IDs and skill names for skills matching the domain
  useEffect(() => {
    if (!publicClient || !skillIds || skillIds.length === 0) {
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
            if (!existing.includes(skillDomain || '')) {
              existing.push(skillDomain || '');
            }
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

  // Apply filters
  const filteredServices = useMemo(() => {
    return services.filter((service: Service) => {
      if (searchQuery && !service.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (showActiveOnly && !service.isActive) {
        return false;
      }
      if (skillDomain && agentIdsBySkill.size > 0) {
        const serviceAgentId = service.agentId.toString();
        if (!agentIdsBySkill.has(serviceAgentId)) {
          return false;
        }
      }
      const priceInUsd = priceToUsdEquivalent(service.price, service.paymentToken, ethToUsdcRate);
      if (minPrice && priceInUsd < Number(minPrice)) return false;
      if (maxPrice && priceInUsd > Number(maxPrice)) return false;
      return true;
    });
  }, [services, searchQuery, showActiveOnly, skillDomain, agentIdsBySkill, minPrice, maxPrice, ethToUsdcRate]);

  // Apply sorting
  useMemo(() => {
    filteredServices.sort((a: Service, b: Service) => {
      const multiplier = sortOrder === 'asc' ? 1 : -1;
      switch (sortBy) {
        case 'price': {
          const priceA = priceToUsdEquivalent(a.price, a.paymentToken, ethToUsdcRate);
          const priceB = priceToUsdEquivalent(b.price, b.paymentToken, ethToUsdcRate);
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

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredServices.length / ITEMS_PER_PAGE));
  const displayServices = filteredServices.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);

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
    return <GridSkeleton count={6} />;
  }

  if (!displayServices || displayServices.length === 0) {
    return skillDomain ? (
      <div className="text-center py-16">
        <div className="h-16 w-16 rounded-full bg-content2 flex items-center justify-center mx-auto mb-4">
          <ShoppingBag className="h-8 w-8 text-default-500" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No Services Found</h3>
        <p className="text-default-500 max-w-md mx-auto">
          No services match the skill domain &quot;{skillDomain}&quot;. Try a different search term.
        </p>
      </div>
    ) : (
      <EmptyState />
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayServices.map((service: Service) => {
          const agentDomains = agentIdsBySkill.get(service.agentId.toString());
          return (
            <ServiceCard
              key={service.id.toString()}
              service={service}
              skillDomains={agentDomains}
            />
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-8">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-divider hover:bg-content2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          <span className="text-sm text-default-500">
            Page {page + 1} of {totalPages}
          </span>

          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-divider hover:bg-content2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      <p className="text-center text-xs text-default-400 mt-6">
        Showing {displayServices.length} of {filteredServices.length} services
      </p>
    </div>
  );
}
