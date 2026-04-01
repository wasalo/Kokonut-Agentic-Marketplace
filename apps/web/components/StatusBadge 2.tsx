'use client';

import { Chip } from '@heroui/react';

interface StatusBadgeProps {
  status: string;
  variant?: 'soft' | 'solid' | 'flat';
  size?: 'sm' | 'md' | 'lg';
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'warning',
  active: 'success',
  completed: 'primary',
  disputed: 'danger',
  cancelled: 'default',
  open: 'success',
  closed: 'default',
  decided: 'primary',
};

export function StatusBadge({ status, variant = 'soft', size = 'sm' }: StatusBadgeProps) {
  const color = STATUS_COLORS[status.toLowerCase()] ?? 'default';
  
  return (
    <Chip size={size} variant={variant} color={color as any}>
      {status}
    </Chip>
  );
}
