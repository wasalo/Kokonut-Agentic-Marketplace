// Force dynamic rendering for all pages (Web3 app requires client-side providers)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import '@/lib/wallet-shim';
import * as React from 'react';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import { ThemeProvider } from '@/contexts/ThemeContext';
import './globals.css';
import { Providers } from './providers';
import { NavbarComponent } from '@/components/heroui/navbar';
import { Footer } from '@/components/heroui/footer';
import { ClientErrorBoundary } from '@/components/error/ClientErrorBoundary';
import { WebVitalsProvider } from '@/components/WebVitalsProvider';

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
    <html lang="en" suppressHydrationWarning className="dark">
      <head>
        <Script src="/crypto-polyfill.js" strategy="beforeInteractive" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <Script src="/push-sw.js" strategy="lazyOnload" />
        <Script id="register-service-worker">{`
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/push-sw.js')
                .then(function(registration) {
                  console.log('[SW] Registered successfully:', registration.scope);
                })
                .catch(function(error) {
                  console.log('[SW] Registration failed:', error);
                });
            });
          }
        `}</Script>
        <ThemeProvider>
          <ClientErrorBoundary>
            <WebVitalsProvider>
              <Providers>
                <div className="min-h-screen flex flex-col bg-background">
                  <NavbarComponent />
                  <main className="flex-1">{children}</main>
                  <Footer />
                </div>
              </Providers>
            </WebVitalsProvider>
          </ClientErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  );
}
