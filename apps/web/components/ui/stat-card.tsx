'use client';

import { Card } from '@heroui/react';
import { Skeleton } from '@heroui/react';
import { memo } from 'react';

interface StatCardProps {
  label: string;
  value: string;
  isLoading?: boolean;
  variant?: 'card' | 'simple';
  padding?: 'sm' | 'md' | 'lg';
  icon?: React.ComponentType<{ className?: string }>;
  subtext?: string;
  sourceLink?: {
    href: string;
    label?: string;
  };
}

const paddingMap = {
  sm: 'p-4',
  md: 'p-4 sm:p-6',
  lg: 'p-6',
};

export const StatCard = memo(function StatCard({
  label,
  value,
  isLoading = false,
  variant = 'card',
  padding = 'md',
  icon: Icon,
  subtext,
  sourceLink,
}: StatCardProps) {
  const content = (
    <>
      <div className="text-sm font-medium text-default-500">{label}</div>
      {isLoading ? (
        <div className="h-8 w-16 bg-content3 rounded animate-pulse mt-2" />
      ) : (
        <div className="flex items-center gap-2 mt-1">
          <span className="text-2xl font-bold">{value}</span>
          {sourceLink && (
            <a
              href={sourceLink.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline"
            >
              {sourceLink.label || 'View'}
            </a>
          )}
        </div>
      )}
      {subtext && !isLoading && <p className="text-xs text-default-400 mt-1">{subtext}</p>}
    </>
  );

  if (variant === 'simple') {
    return (
      <div className={`bg-content2 rounded-lg border border-divider ${paddingMap[padding]}`}>
        {content}
      </div>
    );
  }

  return (
    <Card className={`border border-divider ${paddingMap[padding]}`}>
      {Icon && !isLoading && (
        <div className="absolute top-4 right-4 p-2 bg-success/10 rounded-lg">
          <Icon className="size-5 text-success" />
        </div>
      )}
      {content}
    </Card>
  );
});

export function StatCardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`p-4 rounded-lg border border-default-200 bg-default-50 ${className}`}>
      <Skeleton className="h-4 w-20 mb-2" />
      <Skeleton className="h-8 w-16" />
    </div>
  );
}
