'use client';

import React from 'react';
import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface MarketplaceStatItem {
  label: string;
  value: string | number;
  detail?: string;
  icon?: ReactNode;
  isLoading?: boolean;
}

interface MarketplaceStatsStripProps {
  items: MarketplaceStatItem[];
}

export const MarketplaceStatsStrip = React.memo(function MarketplaceStatsStrip({ items }: MarketplaceStatsStripProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      {items.map(item => (
        <div key={item.label} className="rounded-2xl border border-divider bg-content1/70 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium uppercase tracking-wide text-default-400">{item.label}</p>
            {item.icon && <div className="text-success">{item.icon}</div>}
          </div>
          <div className="mt-2 text-2xl font-bold">
            {item.isLoading ? <Loader2 className="size-5 animate-spin text-default-400" /> : item.value}
          </div>
          {item.detail && <p className="mt-1 text-xs text-default-500">{item.detail}</p>}
        </div>
      ))}
    </div>
  );
});
