'use client';

import { useEffect, useState } from 'react';
import { useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { useTransactionRegistry } from '@/lib/stores/transactionRegistry';

export function useConfirmationWatcher(txHash?: `0x${string}`, txId?: string) {
  const { data: receipt, isLoading } = useWaitForTransactionReceipt({
    hash: txHash,
  });
  const [confirmations, setConfirmations] = useState(0);
  const publicClient = usePublicClient();
  const registry = useTransactionRegistry();

  useEffect(() => {
    if (!receipt || !publicClient || !txHash) return;

    // Update registry with receipt data
    if (txId) {
      registry.updateTransaction(txId, {
        status: 'confirming',
        blockNumber: Number(receipt.blockNumber),
      });
    }

    // Poll for confirmation count
    const interval = setInterval(async () => {
      try {
        const currentBlock = await publicClient.getBlockNumber();
        const count = Number(currentBlock - receipt.blockNumber);
        setConfirmations(count);

        if (txId) {
          registry.updateTransaction(txId, {
            confirmations: count,
            status: count >= 3 ? 'confirmed' : 'confirming',
            confirmedAt: count >= 3 ? Date.now() : undefined,
          });
        }
      } catch {
        // RPC error, retry next interval
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [receipt, publicClient, txHash, txId, registry]);

  const isFinalized = confirmations >= 3;
  const isDeepFinalized = confirmations >= 6;

  return { receipt, confirmations, isLoading, isFinalized, isDeepFinalized };
}
