'use client';

import { Card, Spinner } from '@heroui/react';
import { CheckCircle, XCircle, Clock, ExternalLink } from 'lucide-react';
import { useConfirmationWatcher } from '@/lib/hooks/useConfirmationWatcher';

interface TransactionStatusProps {
  txId?: string;
  txHash?: `0x${string}`;
  description: string;
}

export function TransactionStatus({ txId, txHash, description }: TransactionStatusProps) {
  const { receipt, confirmations, isFinalized, isDeepFinalized } = useConfirmationWatcher(
    txHash,
    txId
  );

  if (!txHash) {
    return (
      <Card className="p-4 bg-amber-500/10 border-amber-500/20">
        <div className="flex items-center gap-3">
          <Spinner size="sm" />
          <div>
            <p className="font-medium">{description}</p>
            <p className="text-sm text-default-500">Awaiting signature…</p>
          </div>
        </div>
      </Card>
    );
  }

  if (!receipt) {
    return (
      <Card className="p-4 bg-amber-500/10 border-amber-500/20">
        <div className="flex items-center gap-3">
          <Clock className="size-5 text-amber-400 animate-pulse" />
          <div>
            <p className="font-medium">{description}</p>
            <p className="text-sm text-default-500">Pending in mempool…</p>
          </div>
        </div>
      </Card>
    );
  }

  if (receipt.status === 'reverted') {
    return (
      <Card className="p-4 bg-red-500/10 border-red-500/20">
        <div className="flex items-center gap-3">
          <XCircle className="size-5 text-red-400" />
          <div>
            <p className="font-medium">Transaction failed</p>
            <p className="text-sm text-red-400/70">{description}</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-green-500/10 border-green-500/20">
      <div className="flex items-center gap-3">
        <CheckCircle className="size-5 text-green-400" />
        <div className="flex-1">
          <p className="font-medium">{description}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-green-400/70">
              {isDeepFinalized
                ? 'Deep finality'
                : isFinalized
                  ? 'Confirmed'
                  : `Confirming... ${confirmations}/3`}
            </span>
            <a
              href={`https://sepolia.etherscan.io/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary flex items-center gap-1 hover:underline"
            >
              View on Etherscan <ExternalLink className="size-3" />
            </a>
          </div>
        </div>
      </div>
    </Card>
  );
}
