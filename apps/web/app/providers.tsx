'use client';

import { useState, useEffect, type ReactNode } from 'react';

// Create a client-only wrapper that completely prevents SSR
function ClientOnly({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) {
    return (
      <div style={{ visibility: 'hidden' }}>
        {/* SSR placeholder */}
        <div className="min-h-screen bg-background" />
      </div>
    );
  }
  return <>{children}</>;
}

// Dynamic imports for browser-only modules
function Web3Providers({ children }: { children: ReactNode }) {
  const [providers, setProviders] = useState<ReactNode>(null);

  useEffect(() => {
    // Dynamically import browser-only modules
    const setupProviders = async () => {
      const [{ QueryClient, QueryClientProvider }, { WagmiProvider }, { RainbowKitProvider, darkTheme }] = await Promise.all([
        import('@tanstack/react-query'),
        import('wagmi'),
        import('@rainbow-me/rainbowkit'),
      ]);
      
      const { config } = await import('@/lib/wagmi');
      const { DebugProvider } = await import('@/contexts/DebugContext');
      
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,
            gcTime: 30 * 60 * 1000,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            retry: 2,
            retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 10000),
            refetchOnMount: 'always',
          },
        },
      });

      const kokonutTheme = {
        accentColor: '#009F4D',
        accentColorForeground: '#FFFFFF',
        borderRadius: 'medium',
      };

      setProviders(
        <WagmiProvider config={config}>
          <QueryClientProvider client={queryClient}>
            <DebugProvider>
              <RainbowKitProvider theme={darkTheme(kokonutTheme)}>
                {children}
              </RainbowKitProvider>
            </DebugProvider>
          </QueryClientProvider>
        </WagmiProvider>
      );
    };

    setupProviders();
  }, [children]);

  return <>{providers}</>;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ClientOnly>
      <Web3Providers>{children}</Web3Providers>
    </ClientOnly>
  );
}
