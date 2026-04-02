'use client';

import { useAllServices, Service } from '@/lib/hooks/useServicesContract';
import { useUSDCPrice } from '@/lib/hooks/usePriceOracle';
import { Card, Button } from '@heroui/react';
import NextLink from 'next/link';
import { ShoppingBag, DollarSign, ChevronLeft, ChevronRight, List, LayoutGrid } from 'lucide-react';
import { useViewportPagination, usePagination } from '@/lib/hooks/useViewportPagination';
import { StatusBadge, getServiceStatusBadgeType } from '@/components/StatusBadge';

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
  const { priceInUsd } = useUSDCPrice();
  const usdcAmount = Number(service.price) / 1e6;
  const usdValue = priceInUsd ? usdcAmount * (Number(priceInUsd) / 1e8) : null;

  const handlePurchase = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.location.href = `/jobs/create?serviceId=${service.id}&provider=${service.provider}`;
  };

  return (
    <Card className="border border-divider p-6 hover:border-success transition-colors cursor-pointer h-full relative group">
      <NextLink href={`/marketplace/${service.id.toString()}`} className="block">
        <div className="flex justify-between items-start mb-3">
          <h3 className="font-semibold text-lg">{service.name}</h3>
          <StatusBadge status={getServiceStatusBadgeType(service.isActive)} size="sm" />
        </div>
        <p className="text-default-500 text-sm mb-4 line-clamp-2">{service.description}</p>
        <div className="flex justify-between items-center text-sm">
          <span className="text-default-500">
            By {(service.provider as `0x${string}`).slice(0, 6)}...
            {(service.provider as `0x${string}`).slice(-4)}
          </span>
          <div className="text-right">
            <span className="font-semibold text-success flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              {usdcAmount.toFixed(2)}
            </span>
            {usdValue && (
              <span className="text-xs text-default-400">~${usdValue.toFixed(2)} USD</span>
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
  // Use contract-based services
  const { services, isLoading, error, refetch } = useAllServices();

  // Apply filters
  let filteredServices = services.filter((service: Service) => {
    // Search query filter
    if (searchQuery && !service.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Active only filter
    if (showActiveOnly && !service.isActive) {
      return false;
    }

    // Price range filters
    const priceInUSDC = Number(service.price) / 1e6;
    if (minPrice && priceInUSDC < Number(minPrice)) {
      return false;
    }
    if (maxPrice && priceInUSDC > Number(maxPrice)) {
      return false;
    }

    return true;
  });

  // Apply sorting
  filteredServices.sort((a: Service, b: Service) => {
    const multiplier = sortOrder === 'asc' ? 1 : -1;

    switch (sortBy) {
      case 'price':
        return multiplier * (Number(a.price) - Number(b.price));
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

  if (isLoading) {
    return <ServiceListSkeleton />;
  }

  if (!displayServices || displayServices.length === 0) {
    return <EmptyState />;
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
