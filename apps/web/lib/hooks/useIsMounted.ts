'use client';

import { useState, useEffect } from 'react';

/**
 * Hook to check if component has mounted (client-side only)
 * Use this to prevent hydration mismatches with wallet-dependent UI
 *
 * @example
 * const mounted = useIsMounted();
 * const { isConnected } = useAccount();
 * const showWalletUI = mounted && isConnected; // Only show after mount
 */
export function useIsMounted(): boolean {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted;
}
