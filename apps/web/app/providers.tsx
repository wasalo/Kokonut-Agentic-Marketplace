'use client';

import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { config } from '@/lib/wagmi';
import { DebugProvider } from '@/contexts/DebugContext';
import { TransactionProvider as EfpTxProvider } from 'ethereum-identity-kit';
import { usePersonalNotifications } from '@/lib/hooks/useNotificationEvents';
import { NetworkGuard } from '@/components/NetworkGuard';
import { OnChainPulse } from '@/components/OnChainPulse';

function NotificationWatcher() {
  usePersonalNotifications();
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,
            gcTime: 30 * 60 * 1000,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            retry: 2,
            retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 10000),
            refetchOnMount: false,
          },
        },
      })
  );

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <DebugProvider>
          <EfpTxProvider>
            <RainbowKitProvider
              theme={darkTheme({
                accentColor: '#009F4D',
                accentColorForeground: '#FFFFFF',
                borderRadius: 'large',
              })}
            >
              <NetworkGuard />
              <OnChainPulse />
              <NotificationWatcher />
              {children}
            </RainbowKitProvider>
          </EfpTxProvider>
        </DebugProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
