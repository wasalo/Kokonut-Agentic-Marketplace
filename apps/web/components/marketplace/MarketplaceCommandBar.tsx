'use client';

import type { ReactNode } from 'react';
import { Search } from 'lucide-react';

interface MarketplaceCommandBarProps {
  value?: string;
  placeholder?: string;
  onChange?: (value: string) => void;
  children?: ReactNode;
}

export function MarketplaceCommandBar({
  value,
  placeholder = 'Search marketplace...',
  onChange,
  children,
}: MarketplaceCommandBarProps) {
  return (
    <div className="mb-6 rounded-2xl border border-divider bg-content1/70 p-3">
      <div className="flex flex-col md:flex-row gap-3">
        {onChange && (
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-default-400" />
            <input
              type="text"
              placeholder={placeholder}
              value={value}
              onChange={event => onChange(event.target.value)}
              className="w-full rounded-xl border border-divider bg-content2 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-success focus:ring-2 focus:ring-success/20"
            />
          </div>
        )}
        {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
      </div>
    </div>
  );
}
