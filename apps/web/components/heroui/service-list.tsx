'use client';

import { memo } from 'react';
import { Service } from '@/lib/hooks/useServices';
import { useTokenPriceConversion } from '@/lib/hooks/useTokenConversion';
import { Card } from '@heroui/react';
import { useRouter } from 'next/navigation';
import NextLink from 'next/link';
import {
  ShoppingBag,
  DollarSign,
  ChevronRight,
  Bookmark,
  Calendar,
  Star,
  User,
} from 'lucide-react';
import { StatusBadge, getServiceStatusBadgeType } from '@/components/StatusBadge';
import { useServiceBookmarks, useBookmarkCounts } from '@/lib/hooks/useBookmarks';
import { Address } from '@/components/Address';
import { GridSkeleton } from '@/components/Skeletons';
import { formatAmount, getTokenByAddress, tokenAmountToUsd } from '@/lib/tokenUtils';
import { card, btn } from '@/lib/design-system';

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

const ServiceCard = memo(function ServiceCard({
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

  const token = getTokenByAddress(service.paymentToken);
  const usdValue = token.symbol === 'ETH'
    ? tokenAmountToUsd(service.price, token, ethToUsdcRate)
    : tokenAmountToUsd(service.price, token);
  const hasUsdValue = token.symbol === 'USDC' || !!ethToUsdcRate;

  const serviceIdStr = service.id.toString();
  const bookmarked = isBookmarked(serviceIdStr);
  const bookmarkCount = getServiceCount(serviceIdStr);

  const createdAt = service.createdAt
    ? new Date(Number(service.createdAt) * 1000).toLocaleDateString()
    : null;

  const handlePurchase = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/jobs/create?serviceId=${serviceIdStr}&provider=${service.provider}`);
  };

  const handleBookmark = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleBookmark(serviceIdStr);
  };

  const prefetchService = () => {
    router.prefetch(`/marketplace/${serviceIdStr}`);
  };

  return (
    <NextLink
      href={`/marketplace/${serviceIdStr}`}
      className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
      onMouseEnter={prefetchService}
    >
    <Card className={card('clickable', 'hover:border-success h-full')}>
      <div className="p-5 flex flex-col h-full">
        {/* Header Row */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0 pr-2">
            <h3 className="font-semibold text-sm md:text-base truncate">{service.name}</h3>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button type="button"
              onClick={handleBookmark}
              className={`p-1 rounded transition-colors ${
                bookmarked
                  ? 'text-primary hover:bg-primary/10'
                  : 'text-default-400 hover:text-default-600 hover:bg-default-100'
              }`}
              title={bookmarked ? 'Remove bookmark' : 'Bookmark this service'}
            >
              <Bookmark className={`size-3.5 ${bookmarked ? 'fill-current' : ''}`} />
            </button>
            {bookmarkCount > 0 && (
              <span className="text-[10px] text-default-400">{bookmarkCount}</span>
            )}
            <StatusBadge status={getServiceStatusBadgeType(service.isActive)} size="sm" />
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded ${
                token.symbol === 'ETH' ? 'bg-[#627EEA]/10 text-[#627EEA]' : 'bg-[#2775CA]/10 text-[#2775CA]'
              }`}
            >
              {token.symbol}
            </span>
          </div>
        </div>

        {/* Description */}
        <div className="flex-1">
          <p className="text-default-500 text-xs mb-3 line-clamp-2">{service.description}</p>
        </div>

        {/* Rating + Provider */}
        <div className="mb-3">
          {providerReputation && providerReputation.rating > 0 && (
            <span className="inline-flex items-center gap-1 mr-3 text-xs">
              <Star className="size-3 fill-yellow-500 text-yellow-500" />
              <span className="font-medium">{providerReputation.rating.toFixed(1)}</span>
              <span className="text-default-400">({providerReputation.total})</span>
            </span>
          )}
          <span className="text-xs text-default-500 inline-flex items-center gap-1">
            <User className="size-3" />
            {providerName ? (
              <span className="truncate max-w-[120px]">{providerName}</span>
            ) : (
              <Address address={service.provider as `0x${string}`} truncate />
            )}
          </span>
          {createdAt && (
            <span className="flex items-center gap-1 mt-1 text-[10px] text-default-400">
              <Calendar className="size-3" />
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
              <DollarSign className="size-3" />
              {formatAmount(service.price, token, {
                includeSymbol: true,
                minFractionDigits: token.symbol === 'USDC' ? 2 : 0,
                maxFractionDigits: token.symbol === 'USDC' ? 2 : 6,
              })}
            </span>
            {hasUsdValue && (
              <span className="text-[10px] text-default-400 block">
                ~${usdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
              </span>
            )}
          </div>
          {service.isActive && (
            <button type="button"
              onClick={handlePurchase}
              className={btn('primary', 'gap-1.5 px-3 py-1.5 text-xs')}
            >
              Purchase
              <ChevronRight className="size-3" />
            </button>
          )}
        </div>
      </div>
    </Card>
    </NextLink>
  );
});

interface ServiceListProps {
  services: Service[];
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  skillDomain?: string;
  skillDomainsByAgent?: Map<string, string[]>;
  totalFilteredCount?: number;
}

export function ServiceList({
  services,
  isLoading = false,
  error = null,
  onRetry,
  skillDomain = '',
  skillDomainsByAgent = new Map(),
  totalFilteredCount = services.length,
}: ServiceListProps) {
  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-danger mb-2">Error loading services</p>
        <p className="text-default-500 text-sm">{error.message}</p>
        <button type="button"
          onClick={onRetry}
          className="mt-4 px-4 py-2 bg-content2 rounded-lg text-sm hover:bg-content3 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (isLoading) {
    return <GridSkeleton count={6} />;
  }

  if (!services || services.length === 0) {
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
        {services.map((service: Service) => {
          const agentDomains = skillDomainsByAgent.get(service.agentId.toString());
          return (
            <ServiceCard
              key={service.id.toString()}
              service={service}
              skillDomains={agentDomains}
            />
          );
        })}
      </div>

      <p className="text-center text-xs text-default-400 mt-6">
        Showing {services.length} of {totalFilteredCount} services
      </p>
    </div>
  );
}
