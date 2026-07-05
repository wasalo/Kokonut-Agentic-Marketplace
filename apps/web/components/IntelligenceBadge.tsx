'use client';

import { Leaf } from 'lucide-react';

interface IntelligenceBadgeProps {
  source?: string;
}

export function IntelligenceBadge({ source }: IntelligenceBadgeProps) {
  if (source !== 'kokonut-intelligence') return null;

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
      <Leaf className="size-3" aria-hidden="true" />
      Intelligence
    </span>
  );
}
