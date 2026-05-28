'use client';

import { useState } from 'react';
import { useTransactionRegistry } from '@/lib/stores/transactionRegistry';
import { usePathname } from 'next/navigation';
import { AlertCircle, X } from 'lucide-react';

export function ResumeBanner() {
  const registry = useTransactionRegistry();
  const [dismissed, setDismissed] = useState<string[]>([]);
  const pathname = usePathname();

  const resumable = registry.getResumable().filter(
    (tx) => !dismissed.includes(tx.id) && !tx.resumedAt
  );

  // Only show banners relevant to current page
  const relevant = resumable.filter((tx) => {
    if (pathname?.startsWith('/jobs/create') && tx.type === 'usdc-approve') return true;
    if (pathname?.startsWith('/jobs/') && tx.type.startsWith('create-')) return true;
    if (pathname?.startsWith('/bidding') && tx.type.startsWith('bid')) return true;
    return false;
  });

  if (relevant.length === 0) return null;

  return (
    <div className="space-y-2 px-4 py-2">
      {relevant.map((tx) => (
        <div
          key={tx.id}
          className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="size-5 text-amber-400" />
            <div>
              <p className="text-sm font-medium text-amber-200">
                {tx.nextStep?.description || 'Resume pending action'}
              </p>
              <p className="text-xs text-amber-400/70">{tx.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button"
              onClick={() => {
                registry.updateTransaction(tx.id, { resumedAt: Date.now() });
                // TODO: Navigate to appropriate page or trigger next step
              }}
              className="px-3 py-1.5 text-sm bg-amber-500/20 text-amber-300 rounded-lg hover:bg-amber-500/30 transition-colors"
            >
              Resume
            </button>
            <button type="button"
              onClick={() => setDismissed((prev) => [...prev, tx.id])}
              className="p-1.5 text-default-400 hover:text-foreground transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
