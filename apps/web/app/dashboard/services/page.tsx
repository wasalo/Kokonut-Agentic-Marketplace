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
  MoreVertical,
  Power,
  PowerOff,
  Wallet,
  Shield,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import NextLink from 'next/link';
import {
  useProviderServices,
  useActivateService,
  useDeactivateService,
  useWithdrawServiceBond,
  useGetServiceBond,
  useDeactivatedAt,
  type Service,
} from '@/lib/hooks/useServices';
import { formatAmount, getTokenByAddress } from '@/lib/tokenUtils';
import { showToast, getTransactionError } from '@/lib/toast';
import { useState, useRef, useEffect } from 'react';
import { parseEther } from 'viem';

const SERVICE_BOND_AMOUNT = parseEther('0.01');
const COOLDOWN_DAYS = 7;
const COOLDOWN_MS = COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

function WalletConnectPrompt() {
  return (
    <div className="container mx-auto px-4 py-16 text-center">
      <ShoppingBag className="h-16 w-16 text-default-400 mx-auto mb-4" />
      <h1 className="text-2xl font-bold mb-2">Connect Your Wallet</h1>
      <p className="text-default-500">Connect your wallet to manage your services</p>
    </div>
  );
}

function BondStatusBadge({ serviceId, isActive }: { serviceId: bigint; isActive: boolean }) {
  const { bond, isLoading } = useGetServiceBond(serviceId);
  const { deactivatedAt } = useDeactivatedAt(serviceId);

  if (isLoading) return <Skeleton className="h-4 w-20 rounded" />;

  const hasBond = bond >= SERVICE_BOND_AMOUNT;

  if (isActive) {
    return hasBond ? (
      <span className="inline-flex items-center gap-1 text-xs text-success">
        <Shield className="size-3" />
        Bonded
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 text-xs text-warning">
        <AlertCircle className="size-3" />
        Unbonded
      </span>
    );
  }

  // Inactive service
  if (!hasBond) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-default-400">
        <AlertCircle className="size-3" />
        No bond
      </span>
    );
  }

  const cooldownEnd = deactivatedAt + COOLDOWN_MS;
  const now = Date.now();
  const remaining = cooldownEnd - now;

  if (remaining > 0) {
    const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
    const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    return (
      <span className="inline-flex items-center gap-1 text-xs text-warning">
        <Clock className="size-3" />
        Withdraw in {days}d {hours}h
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs text-success">
      <Wallet className="size-3" />
      Bond withdrawable
    </span>
  );
}

function ServiceCardActions({
  service,
  onRefetch,
}: {
  service: Service;
  onRefetch: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { activateService, isPending: isActivatePending } = useActivateService();
  const { deactivateService, isPending: isDeactivatePending } = useDeactivateService();
  const { withdrawServiceBond, isPending: isWithdrawPending } = useWithdrawServiceBond();
  const { bond } = useGetServiceBond(service.id);
  const { deactivatedAt } = useDeactivatedAt(service.id);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleActivate = async () => {
    try {
      const toastId = showToast.loading('Activating service…');
      await activateService(service.id);
      showToast.dismiss(toastId);
      showToast.success('Service activated', 'Your service is now visible in the marketplace.');
      onRefetch();
    } catch (err) {
      showToast.error('Activation failed', getTransactionError(err));
    }
    setIsOpen(false);
  };

  const handleDeactivate = async () => {
    try {
      const toastId = showToast.loading('Deactivating service…');
      await deactivateService(service.id);
      showToast.dismiss(toastId);
      showToast.success('Service deactivated', 'Your service is now hidden from the marketplace.');
      onRefetch();
    } catch (err) {
      showToast.error('Deactivation failed', getTransactionError(err));
    }
    setIsOpen(false);
  };

  const handleWithdrawBond = async () => {
    try {
      const toastId = showToast.loading('Withdrawing bond…');
      await withdrawServiceBond(service.id);
      showToast.dismiss(toastId);
      showToast.success('Bond withdrawn', '0.01 ETH has been returned to your wallet.');
      onRefetch();
    } catch (err) {
      showToast.error('Withdrawal failed', getTransactionError(err));
    }
    setIsOpen(false);
  };

  const canWithdrawBond =
    !service.isActive &&
    bond >= SERVICE_BOND_AMOUNT &&
    deactivatedAt > 0 &&
    Date.now() >= deactivatedAt + COOLDOWN_MS;

  return (
    <div className="relative" ref={dropdownRef}>
      <button type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-default-400 hover:text-foreground hover:bg-content2 rounded-lg transition-colors"
        title="Actions"
      >
        <MoreVertical className="size-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-56 bg-content1 border border-divider rounded-lg shadow-lg z-50 py-1">
          <NextLink
            href={`/marketplace/${service.id.toString()}`}
            className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-content2 transition-colors"
            onClick={() => setIsOpen(false)}
          >
            <Edit3 className="size-4" />
            View / Edit
          </NextLink>

          {service.isActive && (
            <button type="button"
              onClick={handleDeactivate}
              disabled={isDeactivatePending}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-danger/5 transition-colors disabled:opacity-50"
            >
              <PowerOff className="size-4" />
              {isDeactivatePending ? 'Deactivating…' : 'Deactivate'}
            </button>
          )}

          {!service.isActive && (
            <>
              <button type="button"
                onClick={handleActivate}
                disabled={isActivatePending}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-success hover:bg-success/5 transition-colors disabled:opacity-50"
              >
                <Power className="size-4" />
                {isActivatePending ? 'Activating…' : 'Activate'}
              </button>

              {canWithdrawBond && (
                <button type="button"
                  onClick={handleWithdrawBond}
                  disabled={isWithdrawPending}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
                >
                  <Wallet className="size-4" />
                  {isWithdrawPending ? 'Withdrawing…' : 'Withdraw Bond (0.01 ETH)'}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ServiceCard({ service, onRefetch }: { service: Service; onRefetch: () => void }) {
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
              <DollarSign className="size-4 text-success" />
              <span className="font-medium">{formattedPrice}</span>
            </div>
            <span className="text-xs text-default-400">Agent #{service.agentId.toString()}</span>
            <BondStatusBadge serviceId={service.id} isActive={service.isActive} />
          </div>
        </div>
        <ServiceCardActions service={service} onRefetch={onRefetch} />
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
  useEffect(() => {
    document.title = 'Manage Services | Kokonut Agent Economy';
  }, []);

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
          <ArrowLeft className="size-4" />
          Back to Dashboard
        </NextLink>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Your Services</h1>
            <p className="text-default-500 mt-1">
              {isLoading
                ? 'Loading…'
                : `${services.length} service${services.length !== 1 ? 's' : ''} listed`}
            </p>
          </div>
          <div className="flex gap-2">
            <button type="button"
              onClick={() => refetch()}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-divider rounded-lg font-medium hover:bg-content2 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`size-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <NextLink
              href="/marketplace/create"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#009F4D] to-[#00c853] text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              <Plus className="size-4" />
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
              <button type="button"
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
                <CheckCircle2 className="size-5 text-success" />
                Active Services ({activeServices.length})
              </h2>
              <div className="space-y-3">
                {activeServices.map((service: Service) => (
                  <ServiceCard key={service.id.toString()} service={service} onRefetch={refetch} />
                ))}
              </div>
            </div>
          )}

          {inactiveServices.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-default-500">
                <PowerOff className="size-5" />
                Inactive Services ({inactiveServices.length})
              </h2>
              <div className="space-y-3">
                {inactiveServices.map((service: Service) => (
                  <ServiceCard key={service.id.toString()} service={service} onRefetch={refetch} />
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
                <Plus className="size-4" />
                Create First Service
              </NextLink>
            </div>
          )}
        </>
      )}
    </div>
  );
}
