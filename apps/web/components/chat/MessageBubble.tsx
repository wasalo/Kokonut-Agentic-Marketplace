'use client';

import { formatAddress } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { Message } from '@/lib/types/chat';
import { Paperclip, Check, CheckCheck } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showSender?: boolean;
}

function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function MessageBubble({ message, isOwn, showSender }: MessageBubbleProps) {
  const readByOthers = message.readBy.length > 1;

  return (
    <div className={cn('flex flex-col max-w-[75%] gap-1', isOwn ? 'items-end ml-auto' : 'items-start')}>
      {showSender && (
        <span className="text-xs text-default-400 px-1">
          {formatAddress(message.senderAddress)}
        </span>
      )}
      <div
        className={cn(
          'rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
          isOwn
            ? 'bg-gradient-to-r from-[#009F4D] to-[#00c853] text-white rounded-br-md'
            : 'bg-content2 text-foreground rounded-bl-md'
        )}
      >
        {message.content && <p className="whitespace-pre-wrap break-words">{message.content}</p>}
        {message.attachments.length > 0 && (
          <div className={cn('flex flex-col gap-1.5', message.content && 'mt-2')}>
            {message.attachments.map(att => (
              <div
                key={att.id}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-xs',
                  isOwn ? 'bg-white/10' : 'bg-background'
                )}
              >
                <Paperclip className="size-3 shrink-0" />
                <span className="truncate">{att.name}</span>
                <span className="text-default-400 shrink-0">
                  {(att.size / 1024).toFixed(1)}KB
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1 px-1">
        <span className="text-[10px] text-default-400">{formatTimestamp(message.timestamp)}</span>
        {isOwn && (
          readByOthers
            ? <CheckCheck className="size-3 text-primary" />
            : <Check className="size-3 text-default-400" />
        )}
      </div>
    </div>
  );
}
