'use client';

import { useCallback } from 'react';
import { useAccount } from 'wagmi';
import {
  useTransactionRegistry,
  type SimulationPreview,
  type TransactionType,
} from '@/lib/stores/transactionRegistry';
import { getExplorerTxUrl } from '@/lib/utils/txExplorer';

interface ExecuteConfig {
  type: TransactionType;
  description: string;
  targetContract: `0x${string}`;
  writeFn: () => Promise<`0x${string}`>;
  simulation?: () => SimulationPreview | Promise<SimulationPreview>;
  gasEstimate?: bigint;
  nextStep?: {
    type: TransactionType;
    description: string;
    params: Record<string, unknown>;
  };
}

export function useTransactionLifecycle() {
  const { chainId, address } = useAccount();
  const registry = useTransactionRegistry();

  const execute = useCallback(
    async (config: ExecuteConfig) => {
      if (!chainId || !address) {
        throw new Error('Wallet not connected');
      }

      // 1. Add to registry
      const id = registry.addTransaction({
        type: config.type,
        description: config.description,
        targetContract: config.targetContract,
        from: address,
        chainId,
        simulation: undefined,
        gasEstimate: config.gasEstimate,
        nextStep: config.nextStep,
      });

      try {
        // 2. Run simulation if provided
        if (config.simulation) {
          registry.updateTransaction(id, { status: 'preparing' });
          const simResult = await Promise.resolve(config.simulation());
          registry.updateTransaction(id, { simulation: simResult });
        }

        // 3. Await signature
        registry.updateTransaction(id, { status: 'awaiting-signature' });
        const txHash = await config.writeFn();

        // 4. Update with hash
        const etherscanUrl = getExplorerTxUrl(txHash, chainId);
        registry.updateTransaction(id, {
          txHash,
          status: 'pending',
          etherscanUrl: etherscanUrl || undefined,
        });

        // 5. Return for external confirmation watching
        return { id, txHash };
      } catch (error) {
        registry.updateTransaction(id, {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
      }
    },
    [chainId, address, registry]
  );

  return { execute, registry };
}
