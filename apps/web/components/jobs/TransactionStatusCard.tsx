'use client';

import { Card } from '@heroui/react';
import { Loader2 } from 'lucide-react';

interface TransactionStatusCardProps {
  txStep: string | null;
}

export function TransactionStatusCard({ txStep }: TransactionStatusCardProps) {
  if (!txStep) return null;

  return (
    <Card className="border border-primary/20 bg-primary/5 p-4">
      <div className="flex items-center gap-3">
        <Loader2 className="size-5 animate-spin text-primary" />
        <div>
          <p className="text-sm font-medium">{txStep}</p>
          <p className="text-xs text-default-500">Waiting for confirmation…</p>
        </div>
      </div>
    </Card>
  );
}
