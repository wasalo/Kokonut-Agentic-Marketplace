'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { DS } from '@/lib/design-system';
import { ConversationList } from './ConversationList';
import { MessageThread } from './MessageThread';
import { UnreadBadge } from './UnreadBadge';
import type { Conversation } from '@/lib/types/chat';
import { MessageSquare, X, ArrowLeft } from 'lucide-react';

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChatDrawer({ isOpen, onClose }: ChatDrawerProps) {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

  const handleSelect = useCallback((conv: Conversation) => {
    setSelectedConversation(conv);
  }, []);

  const handleBack = useCallback(() => {
    setSelectedConversation(null);
  }, []);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-background border-l border-divider z-50 flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-divider">
          {selectedConversation ? (
            <div className="flex items-center gap-2">
              <button onClick={handleBack} className={DS.buttons.icon}>
                <ArrowLeft className="size-4" />
              </button>
              <h2 className="text-sm font-medium text-foreground">
                {selectedConversation.title}
              </h2>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <MessageSquare className="size-4 text-primary" />
              <h2 className="text-sm font-medium text-foreground">Messages</h2>
              <UnreadBadge />
            </div>
          )}
          <button onClick={onClose} className={DS.buttons.icon}>
            <X className="size-4" />
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          {selectedConversation ? (
            <MessageThread
              conversationId={selectedConversation.id}
              title={selectedConversation.title}
            />
          ) : (
            <ConversationList onSelect={handleSelect} />
          )}
        </div>
      </div>
    </>
  );
}

export function ChatDrawerToggle({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <button onClick={onClick} className={cn(DS.buttons.ghost, 'relative', className)}>
      <MessageSquare className="size-4" />
      <UnreadBadge className="absolute -top-1 -right-1" />
    </button>
  );
}
