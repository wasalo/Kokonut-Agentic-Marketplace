'use client';

import { Skeleton } from '@heroui/react';
import { AlertCircle, Clock, Shield, Wallet } from 'lucide-react';
import { useDeactivatedAt, useGetServiceBond } from '@/lib/hooks/useServices';
import { SERVICE_BOND_AMOUNT, SERVICE_BOND_COOLDOWN_MS } from '@/lib/contracts/bonds';

interface ServiceBondStatusProps {
  serviceId: bigint;
  isActive: boolean;
}

export function ServiceBondStatus({ serviceId, isActive }: ServiceBondStatusProps) {
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

  if (!hasBond) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-default-400">
        <AlertCircle className="size-3" />
        No bond
      </span>
    );
  }

  const cooldownEnd = deactivatedAt + SERVICE_BOND_COOLDOWN_MS;
  const remaining = cooldownEnd - Date.now();

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
