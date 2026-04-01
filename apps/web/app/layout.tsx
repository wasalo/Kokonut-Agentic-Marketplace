// Force dynamic rendering for all pages (Web3 app requires client-side providers)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import '@/lib/wallet-shim';
import * as React from 'react';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
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
    <html lang="en" className="dark">
      <body className={inter.className}>
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
