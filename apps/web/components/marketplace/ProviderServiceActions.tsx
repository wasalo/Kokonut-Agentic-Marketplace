'use client';

import { useEffect, useRef, useState } from 'react';
import NextLink from 'next/link';
import { Edit3, MoreVertical, Power, PowerOff, Wallet } from 'lucide-react';
import {
  useActivateService,
  useDeactivateService,
  useDeactivatedAt,
  useGetServiceBond,
  useWithdrawServiceBond,
  type Service,
} from '@/lib/hooks/useServices';
import { getTransactionError, showToast } from '@/lib/toast';
import { SERVICE_BOND_AMOUNT, SERVICE_BOND_COOLDOWN_MS } from '@/components/marketplace/ServiceBondStatus';

interface ProviderServiceActionsProps {
  service: Service;
  onRefetch: () => void;
}

export function ProviderServiceActions({ service, onRefetch }: ProviderServiceActionsProps) {
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
      const toastId = showToast.loading('Activating service...');
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
      const toastId = showToast.loading('Deactivating service...');
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
      const toastId = showToast.loading('Withdrawing bond...');
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
    Date.now() >= deactivatedAt + SERVICE_BOND_COOLDOWN_MS;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
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
            <button
              type="button"
              onClick={handleDeactivate}
              disabled={isDeactivatePending}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-danger/5 transition-colors disabled:opacity-50"
            >
              <PowerOff className="size-4" />
              {isDeactivatePending ? 'Deactivating...' : 'Deactivate'}
            </button>
          )}

          {!service.isActive && (
            <>
              <button
                type="button"
                onClick={handleActivate}
                disabled={isActivatePending}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-success hover:bg-success/5 transition-colors disabled:opacity-50"
              >
                <Power className="size-4" />
                {isActivatePending ? 'Activating...' : 'Activate'}
              </button>

              {canWithdrawBond && (
                <button
                  type="button"
                  onClick={handleWithdrawBond}
                  disabled={isWithdrawPending}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
                >
                  <Wallet className="size-4" />
                  {isWithdrawPending ? 'Withdrawing...' : 'Withdraw Bond (0.01 ETH)'}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
