'use client';

import { useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { cn } from '@/lib/utils';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { useConversationMessages } from '@/lib/hooks/useConversations';
import { useSendMessage, useUploadAttachment } from '@/lib/hooks/useSendMessage';
import type { Attachment, Message } from '@/lib/types/chat';
import { MessageSquare } from 'lucide-react';

interface MessageThreadProps {
  conversationId: string | null;
  scope?: 'job' | 'bidding' | 'service';
  scopeId?: string;
  recipientAddress?: string;
  title?: string;
  className?: string;
}

export function MessageThread({
  conversationId,
  scope,
  scopeId,
  recipientAddress,
  title,
  className,
}: MessageThreadProps) {
  const { address } = useAccount();
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, isLoading } = useConversationMessages(conversationId);
  const { send, isSending } = useSendMessage();
  const { upload } = useUploadAttachment();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (content: string, attachments: Attachment[]) => {
    await send({
      conversationId: conversationId ?? undefined,
      scope,
      scopeId,
      recipientAddress,
      content,
      attachments,
    });
  };

  if (!conversationId && !scopeId) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-12 text-default-400', className)}>
        <MessageSquare className="size-8 mb-3" />
        <p className="text-sm">Start a conversation</p>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {title && (
        <div className="px-4 py-3 border-b border-divider">
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
        </div>
      )}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="size-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-default-400">
            <MessageSquare className="size-6 mb-2" />
            <p className="text-xs">No messages yet. Say hello!</p>
          </div>
        ) : (
          (messages as Array<Message>)
            .slice()
            .reverse()
            .map(msg => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isOwn={msg.senderAddress.toLowerCase() === address?.toLowerCase()}
              />
            ))
        )}
      </div>
      <MessageInput
        onSend={handleSend}
        onUpload={upload}
        disabled={isSending}
        placeholder={title ? `Message in ${title}...` : 'Type a message...'}
      />
    </div>
  );
}
