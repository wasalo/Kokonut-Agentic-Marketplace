'use client';

import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { config } from '@/lib/wagmi';
import { DebugProvider } from '@/contexts/DebugContext';

// RainbowKit styles are imported in globals.css

export function Providers({ children }: { children: ReactNode }) {
  // Create QueryClient once using lazy initialization
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            gcTime: 30 * 60 * 1000, // 30 minutes
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            retry: 2,
            retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 10000),
            refetchOnMount: 'always',
          },
        },
      })
  );

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <DebugProvider>
          <RainbowKitProvider
            theme={darkTheme({
              accentColor: '#009F4D',
              accentColorForeground: '#FFFFFF',
              borderRadius: 'large',
            })}
          >
            {children}
          </RainbowKitProvider>
        </DebugProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
