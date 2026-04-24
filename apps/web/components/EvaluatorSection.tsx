'use client';

import { useAccount } from 'wagmi';
import { Card, Button, Chip } from '@heroui/react';
import { ShieldCheck, Users, Loader2 } from 'lucide-react';
import {
  useEvaluatorPoolSize,
  useEvaluatorStatus,
  useRegisterAsEvaluator,
  useUnregisterAsEvaluator,
} from '@/lib/hooks/useJobs';
import { ErrorDisplay } from '@/components/ErrorDisplay';

export function EvaluatorSection(): JSX.Element {
  const { address, isConnected } = useAccount();
  const { count: poolSize, isLoading: isPoolLoading } = useEvaluatorPoolSize();
  const { isEvaluator, isLoading: isEvaluatorLoading } = useEvaluatorStatus(address);
  const { registerAsEvaluator, isPending: isRegisterPending, error: registerError } = useRegisterAsEvaluator();
  const { unregisterAsEvaluator, isPending: isUnregisterPending, error: unregisterError } = useUnregisterAsEvaluator();

  if (!isConnected) {
    return (
      <Card className="border border-divider p-6">
        <div className="flex items-center gap-3 mb-4">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <h2 className="text-base font-semibold">Evaluator Pool</h2>
        </div>
        <p className="text-sm text-default-500">Connect your wallet to view evaluator status</p>
      </Card>
    );
  }

  if (isPoolLoading || isEvaluatorLoading) {
    return (
      <Card className="border border-divider p-6">
        <div className="flex items-center gap-3 mb-4">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <h2 className="text-base font-semibold">Evaluator Pool</h2>
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
          <ShieldCheck className="w-5 h-5 text-primary" />
          <h2 className="text-base font-semibold">Evaluator Pool</h2>
        </div>
        {isEvaluator ? (
          <Chip size="sm" variant="soft" color="success">
            Registered
          </Chip>
        ) : (
          <Chip size="sm" variant="soft" color="default">
            Not Registered
          </Chip>
        )}
      </div>

      <div className="flex items-center gap-2 mb-4 text-sm text-default-500">
        <Users className="w-4 h-4" />
        <span>{poolSize !== undefined ? poolSize.toString() : '0'} evaluators in pool</span>
      </div>

      {isEvaluator ? (
        <div className="space-y-4">
          <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4 text-success" />
              <span className="text-sm font-medium text-success">You are a registered evaluator</span>
            </div>
            <p className="text-xs text-default-500">
              Total evaluators: {isPoolLoading ? 'Loading...' : poolSize}
            </p>
          </div>

          <Button
            size="sm"
            variant="outline"
            className="border-danger text-danger"
            onPress={unregisterAsEvaluator}
            isDisabled={isUnregisterPending}
          >
            {isUnregisterPending ? 'Unregistering...' : 'Unregister as Evaluator'}
          </Button>

          {unregisterError && <ErrorDisplay error={unregisterError} />}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Join the evaluator pool</span>
            </div>
            <p className="text-xs text-default-500">
              Earn 1% fee on jobs you evaluate. Randomly selected for fair evaluation.
            </p>
          </div>

          <Button
            size="sm"
            className="bg-primary text-white"
            onPress={registerAsEvaluator}
            isDisabled={isRegisterPending}
          >
            {isRegisterPending ? 'Registering...' : 'Register as Evaluator'}
          </Button>

          {registerError && <ErrorDisplay error={registerError} />}
        </div>
      )}

      <p className="text-xs text-default-400 mt-4">
        Stake 0.01 ETH to join the pool.
      </p>
    </Card>
  );
}