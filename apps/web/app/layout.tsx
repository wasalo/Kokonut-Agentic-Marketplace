// Force dynamic rendering for all pages (Web3 app requires client-side providers)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import '@/lib/wallet-shim';
import * as React from 'react';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import { ThemeProvider } from '@/contexts/ThemeContext';
import 'ethereum-identity-kit/css';
import './globals.css';
import { Providers } from './providers';
import { NavbarComponent } from '@/components/heroui/navbar';
import { Footer } from '@/components/heroui/footer';
import { BottomNav } from '@/components/BottomNav';
import { ClientErrorBoundary } from '@/components/error/ClientErrorBoundary';
import { WebVitalsProvider } from '@/components/WebVitalsProvider';
import { Toaster } from 'sonner';
import { SearchModal } from '@/components/SearchModal';
import { RouteProgress } from '@/components/RouteProgress';
import { SuppressHmrRace } from '@/lib/dev/suppress-hmr-race';

const inter = Inter({ subsets: ['latin'] });

const BASE_URL = 'https://market.kokonut.network';

export const metadata: Metadata = {
  title: 'Kokonut Agent Economy',
  description: 'Identity, Commerce, and Coordination for AI Agents onchain',
  metadataBase: new URL(BASE_URL),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: BASE_URL,
    siteName: 'Kokonut Agent Economy',
    title: 'Kokonut Agent Economy',
    description: 'Identity, Commerce, and Coordination for AI Agents onchain',
    images: [
      {
        url: '/kkn_x.jpg',
        width: 1200,
        height: 630,
        alt: 'Kokonut Agent Economy',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kokonut Agent Economy',
    description: 'Identity, Commerce, and Coordination for AI Agents onchain',
    images: ['/kkn_x.jpg'],
  },
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): JSX.Element {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script src="/crypto-polyfill.js" strategy="beforeInteractive" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <SuppressHmrRace />
        <Script src="/push-sw.js" strategy="lazyOnload" />
        <Script id="register-service-worker">{`
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/push-sw.js')
                .catch(function() {});
            });
          }
        `}</Script>
        <ThemeProvider>
          <ClientErrorBoundary>
            <WebVitalsProvider>
              <Providers>
                <RouteProgress />
                <div className="min-h-screen flex flex-col bg-background">
                  <SearchModal />
                  <a
                    href="#main-content"
                    data-skip-link
                    className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-success focus:text-white focus:rounded-lg"
                  >
                    Skip to main content
                  </a>
                  <div id="aria-live-region" aria-live="polite" aria-atomic="true" className="sr-only" />
                  <NavbarComponent />
                  <main id="main-content" className="flex-1" tabIndex={-1}>{children}</main>
                  <Footer />
                  <BottomNav />
                  <Toaster
                    position="bottom-right"
                    theme="dark"
                    toastOptions={{
                      style: {
                        background: '#1a1a1a',
                        border: '1px solid #2a2a2a',
                        color: '#fff',
                      },
                    }}
                  />
                </div>
              </Providers>
            </WebVitalsProvider>
          </ClientErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  );
}
