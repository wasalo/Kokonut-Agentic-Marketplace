'use client';

import { useEffect, useState, useCallback } from 'react';
import { debugLog } from '@/lib/debug';

export interface NetworkStatus {
  isOnline: boolean;
  isOffline: boolean;
  wasOffline: boolean;
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: true,
    isOffline: false,
    wasOffline: false,
  });

  const handleOnline = useCallback(() => {
    debugLog('network', 'Network: Online');
    setStatus(prev => ({
      isOnline: true,
      isOffline: false,
      wasOffline: prev.isOffline,
    }));
  }, []);

  const handleOffline = useCallback(() => {
    debugLog('network', 'Network: Offline');
    setStatus(_prev => ({
      isOnline: false,
      isOffline: true,
      wasOffline: true,
    }));
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setStatus(prev => ({
      ...prev,
      isOnline: navigator.onLine,
      isOffline: !navigator.onLine,
    }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  return status;
}

export function useNetworkStatusWithCallback<T>(
  callback: (isOnline: boolean) => T | void,
  deps: React.DependencyList = []
): void {
  const { isOnline } = useNetworkStatus();

  useEffect(() => {
    callback(isOnline);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, callback, ...deps]);
}

export default useNetworkStatus;