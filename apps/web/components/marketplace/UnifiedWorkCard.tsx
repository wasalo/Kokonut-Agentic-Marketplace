'use client';

import React from 'react';
import type { ReactNode } from 'react';
import NextLink from 'next/link';
import { ArrowRight } from 'lucide-react';

interface UnifiedWorkCardProps {
  title: string;
  description?: string;
  href: string;
  eyebrow?: string;
  status?: ReactNode;
  meta?: Array<{ label: string; value: ReactNode }>;
  actionLabel?: string;
}

export const UnifiedWorkCard = React.memo(function UnifiedWorkCard({
  title,
  description,
  href,
  eyebrow,
  status,
  meta = [],
  actionLabel = 'Open',
}: UnifiedWorkCardProps) {
  return (
    <div className="rounded-2xl border border-divider bg-content1 p-4 transition hover:border-success/40 hover:bg-content2/50">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {eyebrow && <p className="mb-1 text-xs font-medium uppercase tracking-wide text-default-400">{eyebrow}</p>}
          <NextLink href={href} className="font-semibold text-foreground hover:text-success">
            {title}
          </NextLink>
          {description && <p className="mt-1 line-clamp-2 text-sm text-default-500">{description}</p>}
        </div>
        {status}
      </div>

      {meta.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-default-500">
          {meta.map(item => (
            <div key={item.label} className="rounded-xl bg-content2 px-3 py-2">
              <p className="text-default-400">{item.label}</p>
              <div className="mt-0.5 font-medium text-foreground">{item.value}</div>
            </div>
          ))}
        </div>
      )}

      <NextLink
        href={href}
        className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-success hover:underline"
      >
        {actionLabel}
        <ArrowRight className="size-3" />
      </NextLink>
    </div>
  );
});
