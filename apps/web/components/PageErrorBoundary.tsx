'use client';

import { usePathname } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import Link from 'next/link';

interface PageErrorBoundaryProps {
  children: ReactNode;
}

export function PageErrorBoundary({ children }: PageErrorBoundaryProps) {
  const pathname = usePathname();

  useEffect(() => {
    const main = document.querySelector('main');
    main?.focus({ preventScroll: true });
  }, [pathname]);

  return (
    <ErrorBoundary
      fallback={
        <div role="alert" className="container mx-auto px-4 py-16 text-center" aria-live="polite">
          <h1 className="text-2xl font-bold mb-4">Page Error</h1>
          <p className="text-default-500 mb-6">This page encountered an unexpected error.</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-success text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            Return Home
          </Link>
        </div>
      }
    >
      <main id="main-content" tabIndex={-1} className="outline-none">
        {children}
      </main>
    </ErrorBoundary>
  );
}
