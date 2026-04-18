'use client';

import { DetailPageSkeleton } from '@/components/Skeletons';

export default function ServiceDetailLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <DetailPageSkeleton />
    </div>
  );
}
