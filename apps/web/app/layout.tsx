// Force dynamic rendering for all pages (Web3 app requires client-side providers)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import '@/lib/wallet-shim';
import * as React from 'react';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import { Providers } from './providers';
import { NavbarComponent } from '@/components/heroui/navbar';
import { Footer } from '@/components/heroui/footer';
import { ClientErrorBoundary } from '@/components/error/ClientErrorBoundary';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Kokonut Agent Economy',
  description: 'Identity, Commerce, and Coordination for AI Agents onchain',
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
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        {/* Crypto polyfill MUST run before any other JavaScript */}
        <Script src="/crypto-polyfill.js" strategy="beforeInteractive" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <ClientErrorBoundary>
          <Providers>
            <div className="min-h-screen flex flex-col bg-background">
              <NavbarComponent />
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
          </Providers>
        </ClientErrorBoundary>
      </body>
    </html>
  );
}
