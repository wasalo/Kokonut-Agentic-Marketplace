'use client';

import { useAccount } from 'wagmi';
import { Card, Skeleton } from '@heroui/react';
import {
  Plus,
  ShoppingBag,
  Edit3,
  CheckCircle2,
  DollarSign,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import NextLink from 'next/link';
import { useProviderServices, type Service } from '@/lib/hooks/useServices';
import { formatAmount, getTokenByAddress } from '@/lib/tokenUtils';

function WalletConnectPrompt() {
  return (
    <div className="container mx-auto px-4 py-16 text-center">
      <ShoppingBag className="h-16 w-16 text-default-400 mx-auto mb-4" />
      <h1 className="text-2xl font-bold mb-2">Connect Your Wallet</h1>
      <p className="text-default-500">Connect your wallet to manage your services</p>
    </div>
  );
}

function ServiceCard({ service }: { service: Service }) {
  const token = getTokenByAddress(service.paymentToken);
  const formattedPrice = formatAmount(service.price, token, {
    includeSymbol: true,
    minFractionDigits: token.symbol === 'USDC' ? 2 : 0,
    maxFractionDigits: token.symbol === 'USDC' ? 2 : 6,
  });

  return (
    <Card className="border border-divider p-4 hover:border-[#009F4D]/30 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-foreground">{service.name}</h3>
            <StatusBadge status={service.isActive ? 'active' : 'inactive'} size="sm" />
          </div>
          {service.description && (
            <p className="text-sm text-default-500 mt-1.5 line-clamp-2">{service.description}</p>
          )}
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1 text-sm">
              <DollarSign className="w-4 h-4 text-success" />
              <span className="font-medium">{formattedPrice}</span>
            </div>
            <span className="text-xs text-default-400">Agent #{service.agentId.toString()}</span>
          </div>
        </div>
        <div className="flex gap-1 ml-3">
          <NextLink
            href={`/marketplace/${service.id.toString()}`}
            className="p-2 text-default-400 hover:text-primary hover:bg-content2 rounded-lg transition-colors"
            title="View service"
          >
            <Edit3 className="w-4 h-4" />
          </NextLink>
        </div>
      </div>
    </Card>
  );
}

function ServiceCardSkeleton() {
  return (
    <Card className="border border-divider p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-2/3" />
          <div className="flex items-center gap-4 mt-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="h-9 w-9 rounded-lg" />
      </div>
    </Card>
  );
}

export default function DashboardServicesPage() {
  const { isConnected, address } = useAccount();
  const { services, isLoading, error, refetch } = useProviderServices(address);

  const activeServices = services.filter((s: Service) => s.isActive);
  const inactiveServices = services.filter((s: Service) => !s.isActive);

  if (!isConnected) {
    return <WalletConnectPrompt />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <NextLink
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-default-500 hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </NextLink>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Your Services</h1>
            <p className="text-default-500 mt-1">
              {isLoading
                ? 'Loading...'
                : `${services.length} service${services.length !== 1 ? 's' : ''} listed`}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => refetch()}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-divider rounded-lg font-medium hover:bg-content2 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <NextLink
              href="/marketplace/create"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#009F4D] to-[#00c853] text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              New Service
            </NextLink>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-danger-50 border border-danger-200 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p className="text-danger font-medium">Error loading services</p>
              <p className="text-danger-600 text-sm mt-1">{error.message}</p>
              <button
                onClick={() => refetch()}
                className="mt-3 px-4 py-2 bg-danger text-white rounded-lg text-sm font-medium hover:bg-danger-600 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          <ServiceCardSkeleton />
          <ServiceCardSkeleton />
          <ServiceCardSkeleton />
        </div>
      ) : (
        <>
          {activeServices.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-success" />
                Active Services ({activeServices.length})
              </h2>
              <div className="space-y-3">
                {activeServices.map((service: Service) => (
                  <ServiceCard key={service.id.toString()} service={service} />
                ))}
              </div>
            </div>
          )}

          {inactiveServices.length > 0 && (
            <div className="mb-6 opacity-60">
              <h2 className="text-lg font-semibold mb-3 text-default-500">
                Inactive Services ({inactiveServices.length})
              </h2>
              <div className="space-y-3">
                {inactiveServices.map((service: Service) => (
                  <ServiceCard key={service.id.toString()} service={service} />
                ))}
              </div>
            </div>
          )}

          {services.length === 0 && (
            <div className="text-center py-12">
              <ShoppingBag className="h-12 w-12 text-default-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Services Yet</h3>
              <p className="text-sm text-default-500 mb-6">
                Create your first service to start earning
              </p>
              <NextLink
                href="/marketplace/create"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#009F4D] to-[#00c853] text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                <Plus className="w-4 h-4" />
                Create First Service
              </NextLink>
            </div>
          )}
        </>
      )}
    </div>
  );
}
