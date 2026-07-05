'use client';

import { Suspense, useEffect } from 'react';
import dynamic from 'next/dynamic';

const MarketplaceInner = dynamic(() => import('./marketplace-inner'), {
  ssr: false,
  loading: () => (
    <div className="container mx-auto px-4 py-8">
      <div className="animate-pulse h-48 bg-content2 rounded" />
    </div>
  ),
});

export default function MarketplacePage(): JSX.Element {
  useEffect(() => { document.title = 'Marketplace | Kokonut'; }, []);
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MarketplaceInner />
    </Suspense>
  );
}
