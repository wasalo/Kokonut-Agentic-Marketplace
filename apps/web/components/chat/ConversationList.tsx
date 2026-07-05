'use client';

import { cn } from '@/lib/utils';
import { formatAddress } from '@/lib/utils';
import { useConversations } from '@/lib/hooks/useConversations';
import type { Conversation, ConversationScope } from '@/lib/types/chat';
import { MessageSquare, Briefcase, Gavel, ShoppingBag } from 'lucide-react';

interface ConversationListProps {
  onSelect: (conversation: Conversation) => void;
  selectedId?: string | null;
  scope?: ConversationScope;
  className?: string;
}

const SCOPE_ICONS: Record<ConversationScope, typeof MessageSquare> = {
  job: Briefcase,
  bidding: Gavel,
  service: ShoppingBag,
};

function formatTime(ts: number): string {
  const date = new Date(ts);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffDays === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' });
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function ConversationList({ onSelect, selectedId, scope, className }: ConversationListProps) {
  const { conversations, unread } = useConversations(scope);

  if (conversations.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-8 text-default-400', className)}>
        <MessageSquare className="size-6 mb-2" />
        <p className="text-xs">No conversations yet</p>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col', className)}>
      {unread > 0 && (
        <div className="px-4 py-2 text-xs text-default-400 border-b border-divider">
          {unread} unread message{unread !== 1 ? 's' : ''}
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
        {conversations.map(conv => {
          const Icon = SCOPE_ICONS[conv.scope];
          return (
            <button
              key={conv.id}
              onClick={() => onSelect(conv)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-content2 transition-colors border-b border-divider',
                selectedId === conv.id && 'bg-content2'
              )}
            >
              <div className={cn(
                'shrink-0 size-9 rounded-full flex items-center justify-center',
                (conv.unreadBy[conv.participants.find(p => p !== conv.participants[0]) || ''] || 0) > 0
                  ? 'bg-primary/10 text-primary'
                  : 'bg-content2 text-default-400'
              )}>
                <Icon className="size-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium truncate text-foreground">
                    {conv.title}
                  </span>
                  <span className="text-[10px] text-default-400 shrink-0">
                    {formatTime(conv.lastMessageAt)}
                  </span>
                </div>
                {conv.lastMessage && (
                  <p className="text-xs text-default-400 truncate mt-0.5">
                    {conv.lastMessage}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
