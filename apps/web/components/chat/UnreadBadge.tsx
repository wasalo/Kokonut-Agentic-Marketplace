'use client';

import { cn } from '@/lib/utils';
import { useConversations } from '@/lib/hooks/useConversations';

interface UnreadBadgeProps {
  className?: string;
}

export function UnreadBadge({ className }: UnreadBadgeProps) {
  const { unread } = useConversations();

  if (unread === 0) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1',
        'bg-danger text-white text-[10px] font-bold rounded-full',
        className
      )}
    >
      {unread > 99 ? '99+' : unread}
    </span>
  );
}
