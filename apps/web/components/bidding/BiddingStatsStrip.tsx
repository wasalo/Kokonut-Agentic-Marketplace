'use client';

import { Card } from '@heroui/react';
import { Clock, Gavel, Loader2, Users } from 'lucide-react';
import { card } from '@/lib/design-system';

interface BiddingStatsStripProps {
  totalCount: number;
  activeCount: number;
  inProgressCount: number;
  isLoading: boolean;
}

export function BiddingStatsStrip({
  totalCount,
  activeCount,
  inProgressCount,
  isLoading,
}: BiddingStatsStripProps) {
  const stats = [
    {
      label: 'Total Sessions',
      value: totalCount,
      icon: Gavel,
      iconClassName: 'text-primary',
      bgClassName: 'bg-primary/10',
    },
    {
      label: 'Active Sessions',
      value: activeCount,
      icon: Clock,
      iconClassName: 'text-success',
      bgClassName: 'bg-success/10',
    },
    {
      label: 'In Progress',
      value: inProgressCount,
      icon: Users,
      iconClassName: 'text-primary',
      bgClassName: 'bg-primary/10',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      {stats.map(stat => {
        const Icon = stat.icon;
        return (
          <Card key={stat.label} className={card('padded')}>
            <div className="flex items-center gap-3">
              <div className={`p-2 ${stat.bgClassName} rounded-lg`}>
                <Icon className={`size-5 ${stat.iconClassName}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {isLoading ? <Loader2 className="size-6 animate-spin" /> : stat.value}
                </p>
                <p className="text-sm text-default-500">{stat.label}</p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
