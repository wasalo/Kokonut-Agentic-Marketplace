'use client';

import { useEffect } from 'react';
import { useTransactionRegistry } from '@/lib/stores/transactionRegistry';

/**
 * OnChainPulse - Adds a subtle background pulse when transactions are pending.
 * Attach this to the body or a main container.
 */
export function OnChainPulse() {
  const pendingCount = useTransactionRegistry().getPending().length;
  const hasPending = pendingCount > 0;

  useEffect(() => {
    if (hasPending) {
      document.body.classList.add('chain-pulse-active');
    } else {
      document.body.classList.remove('chain-pulse-active');
    }

    return () => {
      document.body.classList.remove('chain-pulse-active');
    };
  }, [hasPending]);

  return null;
}
