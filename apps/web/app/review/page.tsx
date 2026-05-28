'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';

const ReviewContent = dynamic(() => import('./review-content'), {
  ssr: false,
  loading: () => (
    <div className="container mx-auto px-4 py-8">
      <div className="animate-pulse h-48 bg-content2 rounded" />
    </div>
  ),
});

export default function ReviewPage(): JSX.Element {
  useEffect(() => {
    document.title = 'Review Proposals | Kokonut Agent Economy';
  }, []);

  return <ReviewContent />;
}
