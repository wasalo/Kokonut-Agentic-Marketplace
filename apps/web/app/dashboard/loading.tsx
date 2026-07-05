'use client';

import { PageSkeleton } from '@/components/Skeletons';

export default function DashboardLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <PageSkeleton />
    </div>
  );
}
