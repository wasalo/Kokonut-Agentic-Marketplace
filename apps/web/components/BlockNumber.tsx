'use client';

import { useBlockNumber } from 'wagmi';
import { useTransactionRegistry } from '@/lib/stores/transactionRegistry';

export function BlockNumber() {
  const { data: blockNumber } = useBlockNumber({ watch: true });
  const pendingCount = useTransactionRegistry().getPending().length;

  return (
    <div className="flex items-center gap-2 text-xs font-mono text-default-400">
      <div className="flex items-center gap-1.5">
        <div
          className={`size-1.5 rounded-full ${
            pendingCount > 0 ? 'bg-warning animate-pulse' : 'bg-green-400'
          }`}
        />
        <span>Block {blockNumber?.toLocaleString() ?? '—'}</span>
      </div>
      {pendingCount > 0 && (
        <span className="text-warning">({pendingCount} pending)</span>
      )}
    </div>
  );
}
