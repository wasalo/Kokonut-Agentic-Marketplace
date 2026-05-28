'use client';

import { Card } from '@heroui/react';

interface JobsStatsStripProps {
  stats: {
    openJobs: number;
    inProgressJobs: number;
    completedJobs: number;
    totalJobs: number;
  };
  isLoading: boolean;
}

export function JobsStatsStrip({ stats, isLoading }: JobsStatsStripProps) {
  const items = [
    { label: 'Open Jobs', value: stats.openJobs },
    { label: 'In Progress', value: stats.inProgressJobs },
    { label: 'Completed', value: stats.completedJobs },
    { label: 'Total Jobs', value: stats.totalJobs },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {items.map(item => (
        <Card key={item.label} className="border border-divider p-4">
          <div className="text-sm text-default-500">{item.label}</div>
          <div className="text-2xl font-bold">{isLoading ? '...' : item.value}</div>
        </Card>
      ))}
    </div>
  );
}
