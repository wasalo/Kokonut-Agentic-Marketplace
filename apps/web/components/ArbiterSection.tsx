'use client';

import { useAccount } from 'wagmi';
import { Gavel, Shield, Loader2 } from 'lucide-react';
import { formatAmount } from '@/lib/tokenUtils';
import {
  useArbiterCount,
  useIsArbiter,
  useArbiterStake,
  useRegisterAsArbiter,
  useUnregisterAsArbiter,
} from '@/lib/hooks/useMilestoneEscrow';
import { DashboardCard } from '@/components/ui/DashboardCard';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/StatusBadge';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { ZERO_ADDRESS } from '@/lib/contracts/config';

const ARBITER_STAKE = 10_000_000_000_000_000n; // 0.01 ETH
const TOKEN_ADDRESS: `0x${string}` = ZERO_ADDRESS; // Native ETH
const TOKEN_SYMBOL = 'ETH';
const TOKEN_DECIMALS = 18;

export function ArbiterSection(): JSX.Element {
  const { address, isConnected } = useAccount();
  const { count: arbiterCount, isLoading: isCountLoading } = useArbiterCount();
  const { isArbiter, isLoading: isArbiterLoading } = useIsArbiter(address);
  const { stake, isLoading: isStakeLoading } = useArbiterStake(address);

  const { registerAsArbiter, isPending: isRegisterPending, writeError: registerError } = useRegisterAsArbiter();
  const { unregisterAsArbiter, isPending: isUnregisterPending, writeError: unregisterError } = useUnregisterAsArbiter();

  const isButtonDisabled = isRegisterPending || isUnregisterPending;

  const handleRegister = () => {
    registerAsArbiter(TOKEN_ADDRESS, ARBITER_STAKE);
  };

  if (!isConnected) {
    return (
      <DashboardCard title="Arbiter Status" icon={<Gavel />}>
        <p className="text-sm text-default-500">Connect your wallet to view arbiter status</p>
      </DashboardCard>
    );
  }

  if (isArbiterLoading || isCountLoading) {
    return (
      <DashboardCard title="Arbiter Status" icon={<Gavel />}>
        <div className="flex justify-center py-4">
          <Loader2 className="size-6 animate-spin text-default-400" />
        </div>
      </DashboardCard>
    );
  }

  const error = registerError || unregisterError;

  return (
    <DashboardCard
      title="Arbiter Status"
      icon={<Gavel />}
      variant="glass"
      actions={
        isArbiter ? (
          <Button
            variant="danger"
            size="sm"
            isLoading={isUnregisterPending}
            onClick={unregisterAsArbiter}
          >
            Unregister as Arbiter
          </Button>
        ) : (
          <Button
            variant="primary"
            size="sm"
            isLoading={isButtonDisabled}
            onClick={handleRegister}
          >
            {isRegisterPending ? 'Registering…' : `Register as Arbiter (0.01 ${TOKEN_SYMBOL})`}
          </Button>
        )
      }
    >
      <div className="flex items-center justify-between">
        <StatusBadge status={isArbiter ? 'registered' : 'not-registered'} size="sm" />
      </div>

      {isArbiter ? (
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Shield className="size-4 text-success" />
            <span className="font-medium text-success">You are a registered arbiter</span>
          </div>
          <p className="text-default-500 text-xs">
            Stake: {isStakeLoading ? 'Loading…' : `${formatAmount(stake || BigInt(0), TOKEN_DECIMALS)} ${TOKEN_SYMBOL}`}
          </p>
          <p className="text-default-500 text-xs">
            Total arbiters: {isCountLoading ? 'Loading…' : arbiterCount}
          </p>
        </div>
      ) : (
        <div className="space-y-2 text-sm text-default-500">
          <p>Resolve disputes and earn fees. Stake {TOKEN_SYMBOL} to participate.</p>
        </div>
      )}

      {error && <ErrorDisplay error={error} />}
    </DashboardCard>
  );
}
