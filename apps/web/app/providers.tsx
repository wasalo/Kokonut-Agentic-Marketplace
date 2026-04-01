'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { config } from '@/lib/wagmi';
import { useState, useEffect, type ReactNode } from 'react';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import { DebugProvider } from '@/contexts/DebugContext';

const kokonutTheme = {
  accentColor: '#009F4D',
  accentColorForeground: '#FFFFFF',
  borderRadius: 'medium',
} as const;

/**
 * Phase 3: Optimized React Query Configuration
 * - Conservative stale time to reduce RPC calls (5 minutes default)
 * - Longer gcTime to keep data in cache
 * - Disabled refetch on window focus to save RPC costs
 * - Exponential backoff for retries
 */
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Conservative stale time to reduce RPC calls
        staleTime: 5 * 60 * 1000, // 5 minutes

        // Keep in cache longer
        gcTime: 30 * 60 * 1000, // 30 minutes

        // Don't refetch on window focus (saves RPC calls)
        refetchOnWindowFocus: false,

        // Don't refetch on reconnect by default
        refetchOnReconnect: false,

        // Retry with exponential backoff
        retry: 2,
        retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 10000),

        // Don't refetch on mount if data is fresh
        refetchOnMount: 'always',
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === 'undefined') {
    return makeQueryClient();
  } else {
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

function ClientOnly({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <>{children}</>;
}

function RainbowKitWrapper({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <RainbowKitProvider theme={darkTheme(kokonutTheme)}>
      <div style={{ visibility: mounted ? 'visible' : 'hidden' }}>{children}</div>
    </RainbowKitProvider>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => getQueryClient());

  return (
    <ClientOnly>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <DebugProvider>
            <RainbowKitWrapper>{children}</RainbowKitWrapper>
          </DebugProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ClientOnly>
  );
}
