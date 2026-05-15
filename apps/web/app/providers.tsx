'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, useAccount, useChainId } from 'wagmi';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { config } from '@/lib/wagmi';
import { DebugProvider } from '@/contexts/DebugContext';
import { TransactionProvider as KokonutTxProvider } from '@/contexts/TransactionContext';
import { TransactionProvider as EfpTxProvider } from 'ethereum-identity-kit';
import { usePersonalNotifications } from '@/lib/hooks/useNotificationEvents';
import { showToast } from '@/lib/toast';

function NotificationWatcher() {
  usePersonalNotifications();
  return null;
}

function ChainGuard() {
  const targetChainId = 11155111; // Sepolia
  const chainId = useChainId();
  const { isConnected } = useAccount();
  const [hasShown, setHasShown] = useState(false);

  useEffect(() => {
    if (isConnected && chainId && chainId !== targetChainId && !hasShown) {
      showToast.warning('Wrong network', 'Switch to Sepolia testnet for Kokonut transactions.');
      setHasShown(true);
    }
    if (chainId === targetChainId) {
      setHasShown(false);
    }
  }, [chainId, isConnected, hasShown]);

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
          <KokonutTxProvider>
            <EfpTxProvider>
              <RainbowKitProvider
                theme={darkTheme({
                  accentColor: '#009F4D',
                  accentColorForeground: '#FFFFFF',
                  borderRadius: 'large',
                })}
              >
                <ChainGuard />
                <NotificationWatcher />
                {children}
              </RainbowKitProvider>
            </EfpTxProvider>
          </KokonutTxProvider>
        </DebugProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
