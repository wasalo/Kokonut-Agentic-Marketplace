'use client';

import { useMemo } from 'react';
import { useAccount } from 'wagmi';
import { Activity, ExternalLink, ArrowRight } from 'lucide-react';
import { useTransactionRegistry } from '@/lib/stores/transactionRegistry';
import { useConfirmationWatcher } from '@/lib/hooks/useConfirmationWatcher';
import { getExplorerTxUrl } from '@/lib/utils/txExplorer';

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
        <Activity className="w-8 h-8 text-default-300 mx-auto mb-2" />
        <p className="text-sm text-default-500">Connect wallet to see your activity</p>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8">
        <Activity className="w-8 h-8 text-default-300 mx-auto mb-2" />
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
        <button className="w-full py-2 text-sm text-primary hover:text-primary/80 transition-colors flex items-center justify-center gap-1">
          View all activity
          <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

function ActivityItem({ tx }: { tx: ReturnType<typeof useTransactionRegistry.getState>['transactions'][0] }) {
  const { confirmations, isFinalized } = useConfirmationWatcher(tx.txHash, tx.id);
  const explorerUrl = tx.txHash ? getExplorerTxUrl(tx.txHash, tx.chainId) : undefined;

  return (
    <div className="flex items-center gap-3 p-3 bg-default-100 rounded-lg">
      <div className="flex-shrink-0">
        <ActivityIcon status={tx.status} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{tx.description}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <StatusBadge status={tx.status} />
          {tx.status === 'confirming' && (
            <span className="text-xs text-amber-400">{confirmations}/3 blocks</span>
          )}
          {tx.status === 'confirmed' && (
            <span className="text-xs text-green-400">
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
          <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>
  );
}

function ActivityIcon({ status }: { status: string }) {
  const colorClass =
    status === 'confirmed'
      ? 'bg-green-500/20 text-green-400'
      : status === 'failed'
        ? 'bg-red-500/20 text-red-400'
        : 'bg-amber-500/20 text-amber-400';

  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${colorClass}`}>
      <StatusIcon />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    preparing: { label: 'Preparing', className: 'bg-default-500/20 text-default-400' },
    'awaiting-signature': { label: 'Awaiting Signature', className: 'bg-amber-500/20 text-amber-400' },
    pending: { label: 'Pending', className: 'bg-amber-500/20 text-amber-400' },
    confirming: { label: 'Confirming', className: 'bg-blue-500/20 text-blue-400' },
    confirmed: { label: 'Confirmed', className: 'bg-green-500/20 text-green-400' },
    failed: { label: 'Failed', className: 'bg-red-500/20 text-red-400' },
    cancelled: { label: 'Cancelled', className: 'bg-default-500/20 text-default-400' },
  };

  const { label, className } = config[status] || config.preparing;

  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${className}`}>
      {label}
    </span>
  );
}

function StatusIcon() {
  return <Activity className="w-4 h-4" />;
}
