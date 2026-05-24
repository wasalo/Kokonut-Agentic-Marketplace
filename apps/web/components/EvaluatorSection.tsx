'use client';

import { useAccount } from 'wagmi';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { formatUnits } from 'viem';
import {
  useEvaluatorPoolSize,
  useEvaluatorStatus,
  useRegisterAsEvaluator,
  useUnregisterAsEvaluator,
} from '@/lib/hooks/useJobs';
import { DashboardCard } from '@/components/ui/DashboardCard';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/StatusBadge';
import { ErrorDisplay } from '@/components/ErrorDisplay';

export function EvaluatorSection(): JSX.Element {
  const { address, isConnected } = useAccount();
  const { count: poolSize, isLoading: isPoolLoading } = useEvaluatorPoolSize();
  const { isEvaluator, isLoading: isEvaluatorLoading } = useEvaluatorStatus(address);
  const { registerAsEvaluator, isPending: isRegisterPending, error: registerError } = useRegisterAsEvaluator();
  const { unregisterAsEvaluator, isPending: isUnregisterPending, error: unregisterError } = useUnregisterAsEvaluator();

  if (!isConnected) {
    return (
      <DashboardCard title="Evaluator Status" icon={<ShieldCheck />}>
        <p className="text-sm text-default-500">Connect your wallet to view evaluator status</p>
      </DashboardCard>
    );
  }

  if (isEvaluatorLoading || isPoolLoading) {
    return (
      <DashboardCard title="Evaluator Status" icon={<ShieldCheck />}>
        <div className="flex justify-center py-4">
          <Loader2 className="w-6 h-6 animate-spin text-default-400" />
        </div>
      </DashboardCard>
    );
  }

  return (
    <DashboardCard
      title="Evaluator Status"
      icon={<ShieldCheck />}
      variant="glass"
      actions={
        isEvaluator ? (
          <Button
            variant="danger"
            size="sm"
            isLoading={isUnregisterPending}
            onClick={unregisterAsEvaluator}
          >
            Unregister as Evaluator
          </Button>
        ) : (
          <Button
            variant="primary"
            size="sm"
            isLoading={isRegisterPending}
            onClick={registerAsEvaluator}
          >
            {isRegisterPending ? 'Registering...' : 'Register as Evaluator (0.01 ETH)'}
          </Button>
        )
      }
    >
      <div className="flex items-center justify-between">
        <StatusBadge status={isEvaluator ? 'registered' : 'not-registered'} size="sm" />
      </div>

      {isEvaluator ? (
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-success" />
            <span className="font-medium text-success">You are a registered evaluator</span>
          </div>
          <p className="text-default-500 text-xs">
            Total evaluators: {isPoolLoading ? 'Loading...' : poolSize}
          </p>
        </div>
      ) : (
        <div className="space-y-2 text-sm text-default-500">
          <p>Earn 1% fee on jobs you evaluate. Randomly selected for fair evaluation.</p>
          <p className="text-xs">Stake: 0.01 ETH</p>
        </div>
      )}

      {registerError && <ErrorDisplay error={registerError} />}
      {unregisterError && <ErrorDisplay error={unregisterError} />}
    </DashboardCard>
  );
}
