'use client';

import { useMemo } from 'react';
import { useAccount } from 'wagmi';
import { Activity, ExternalLink, ArrowRight } from 'lucide-react';
import { useTransactionRegistry } from '@/lib/stores/transactionRegistry';
import { useConfirmationWatcher } from '@/lib/hooks/useConfirmationWatcher';
import { getExplorerTxUrl } from '@/lib/utils/txExplorer';
import { StatusBadge } from '@/components/StatusBadge';

interface ActivityFeedProps {
  limit?: number;
  showViewAll?: boolean;
}

export function ActivityFeed({ limit = 10, showViewAll = true }: ActivityFeedProps) {
  const { address } = useAccount();
  const registry = useTransactionRegistry();

  const activities = useMemo(() => {
    return registry.getRecent(limit);
  }, [registry, limit]);

  if (!address) {
    return (
      <div className="text-center py-8">
        <Activity className="size-8 text-default-300 mx-auto mb-2" />
        <p className="text-sm text-default-500">Connect wallet to see your activity</p>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8">
        <Activity className="size-8 text-default-300 mx-auto mb-2" />
        <p className="text-sm text-default-500">No on-chain activity yet</p>
        <p className="text-xs text-default-400 mt-1">
          Your transactions will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((tx) => (
        <ActivityItem key={tx.id} tx={tx} />
      ))}
      {showViewAll && activities.length >= limit && (
        <button type="button" className="w-full py-2 text-sm text-primary hover:text-primary/80 transition-colors flex items-center justify-center gap-1">
          View all activity
          <ArrowRight className="size-4" />
        </button>
      )}
    </div>
  );
}

function ActivityItem({ tx }: { tx: ReturnType<typeof useTransactionRegistry.getState>['transactions'][0] }) {
  const { confirmations, isFinalized } = useConfirmationWatcher(tx.txHash, tx.id);
  const explorerUrl = tx.txHash ? getExplorerTxUrl(tx.txHash, tx.chainId) : undefined;

  const badgeStatus =
    tx.status === 'confirmed' ? 'success'
    : tx.status === 'failed' ? 'error'
    : 'pending';

  return (
    <div className="flex items-center gap-3 p-3 bg-content2 rounded-lg">
      <div className="flex-shrink-0">
        <ActivityIcon status={tx.status} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{tx.description}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <StatusBadge status={badgeStatus} size="sm" />
          {tx.status === 'confirming' && (
            <span className="text-xs text-warning">{confirmations}/3 blocks</span>
          )}
          {tx.status === 'confirmed' && (
            <span className="text-xs text-success">
              {isFinalized ? '✓ Confirmed' : `${confirmations} blocks`}
            </span>
          )}
        </div>
      </div>
      {explorerUrl && (
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 text-default-400 hover:text-primary transition-colors"
        >
          <ExternalLink className="size-3" />
        </a>
      )}
    </div>
  );
}

function ActivityIcon({ status }: { status: string }) {
  const colorClass =
    status === 'confirmed'
      ? 'bg-success/20 text-success'
      : status === 'failed'
        ? 'bg-danger/20 text-danger'
        : 'bg-warning/20 text-warning';

  return (
    <div className={`size-8 rounded-full flex items-center justify-center ${colorClass}`}>
      <Activity className="size-4" />
    </div>
  );
}
