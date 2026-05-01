'use client';

import { useAccount } from 'wagmi';
import { Card, Button, Chip } from '@heroui/react';
import { Gavel, Shield, Loader2, AlertCircle } from 'lucide-react';
import { formatUnits } from 'viem';
import {
  useArbiterCount,
  useIsArbiter,
  useArbiterStake,
  useRegisterAsArbiter,
  useUnregisterAsArbiter,
} from '@/lib/hooks/useMilestoneEscrow';
import { CONTRACTS } from '@/lib/wagmi';
import { ErrorDisplay } from '@/components/ErrorDisplay';

export function ArbiterSection(): JSX.Element {
  const { address, isConnected } = useAccount();
  const { count: arbiterCount, isLoading: isCountLoading } = useArbiterCount();
  const { isArbiter, isLoading: isArbiterLoading } = useIsArbiter(address);
  const { stake, isLoading: isStakeLoading } = useArbiterStake(address);

  const { registerAsArbiter, isPending: isRegisterPending, writeError: registerError } = useRegisterAsArbiter();
  const USDC_ADDRESS = CONTRACTS[11155111].usdc as `0x${string}`;
  const { unregisterAsArbiter, isPending: isUnregisterPending, writeError: unregisterError } = useUnregisterAsArbiter();

  if (!isConnected) {
    return (
      <Card className="border border-divider p-6">
        <div className="flex items-center gap-3 mb-4">
          <Gavel className="w-5 h-5 text-warning" />
          <h2 className="text-base font-semibold">Arbiter Status</h2>
        </div>
        <p className="text-sm text-default-500">Connect your wallet to view arbiter status</p>
      </Card>
    );
  }

  if (isArbiterLoading || isCountLoading) {
    return (
      <Card className="border border-divider p-6">
        <div className="flex items-center gap-3 mb-4">
          <Gavel className="w-5 h-5 text-warning" />
          <h2 className="text-base font-semibold">Arbiter Status</h2>
        </div>
        <div className="flex justify-center py-4">
          <Loader2 className="w-6 h-6 animate-spin text-default-400" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="border border-divider p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Gavel className="w-5 h-5 text-warning" />
          <h2 className="text-base font-semibold">Arbiter Status</h2>
        </div>
        {isArbiter ? (
          <Chip size="sm" variant="soft" color="success">
            Registered
          </Chip>
        ) : (
          <Chip size="sm" variant="soft" color="default">
            Not Registered
          </Chip>
        )}
      </div>

      {isArbiter ? (
        <div className="space-y-4">
          <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-success" />
              <span className="text-sm font-medium text-success">You are a registered arbiter</span>
            </div>
            <p className="text-xs text-default-500">
              Stake: {isStakeLoading ? 'Loading...' : `${formatUnits(stake || BigInt(0), 18)} ETH`}
            </p>
            <p className="text-xs text-default-500 mt-1">
              Total arbiters: {isCountLoading ? 'Loading...' : arbiterCount}
            </p>
          </div>

          <Button
            size="sm"
            variant="outline"
            className="border-danger text-danger"
            onPress={unregisterAsArbiter}
            isDisabled={isUnregisterPending}
          >
            {isUnregisterPending ? 'Unregistering...' : 'Unregister as Arbiter'}
          </Button>

          {unregisterError && <ErrorDisplay error={unregisterError} />}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-warning" />
              <span className="text-sm font-medium text-warning">Become an Arbiter</span>
            </div>
            <p className="text-xs text-default-500 mb-2">
              Resolve disputes and earn fees. You&apos;ll need to stake tokens to participate.
            </p>
            <div className="text-xs text-default-400">
              <p>Stake token: USDC</p>
              <p>Arbiter fee per dispute: varies by token</p>
            </div>
          </div>

          <Button
            size="sm"
            className="bg-[#009F4D] text-white"
            onPress={() => registerAsArbiter(USDC_ADDRESS, 10000000n)} // 10 USDC default
            isDisabled={isRegisterPending}
          >
            {isRegisterPending ? 'Registering...' : 'Register as Arbiter (10 USDC)'}
          </Button>

          {registerError && <ErrorDisplay error={registerError} />}
        </div>
      )}
    </Card>
  );
}