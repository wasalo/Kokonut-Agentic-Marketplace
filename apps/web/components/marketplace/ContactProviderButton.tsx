'use client';

import { useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { DS } from '@/lib/design-system';
import { useSendMessage } from '@/lib/hooks/useSendMessage';
import { useConversations } from '@/lib/hooks/useConversations';
import { MessageSquare, Send, X, Loader2 } from 'lucide-react';

interface ContactProviderButtonProps {
  providerAddress: string;
  serviceId: string;
  serviceName: string;
  className?: string;
}

export function ContactProviderButton({
  providerAddress,
  serviceId,
  serviceName,
  className,
}: ContactProviderButtonProps) {
  const { address } = useAccount();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const { send, isSending } = useSendMessage();
  const { conversations } = useConversations('service');

  const handleSend = useCallback(async () => {
    if (!message.trim() || !address) return;

    const existingConv = conversations.find(
      c => c.scope === 'service' && c.scopeId === serviceId
    );

    await send({
      conversationId: existingConv?.id,
      scope: 'service',
      scopeId: serviceId,
      recipientAddress: providerAddress,
      content: message,
    });

    setMessage('');
    setIsOpen(false);
  }, [message, address, conversations, serviceId, providerAddress, send]);

  if (!address) return null;
  if (address.toLowerCase() === providerAddress.toLowerCase()) return null;

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(DS.buttons.ghost, 'gap-2')}
      >
        <MessageSquare className="size-4" />
        Contact Provider
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setIsOpen(false)} />
          <div className="fixed right-0 top-0 h-full w-full max-w-sm bg-background border-l border-divider z-50 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-divider">
              <div>
                <h3 className="text-sm font-medium text-foreground">Contact Provider</h3>
                <p className="text-xs text-default-400">About: {serviceName}</p>
              </div>
              <button onClick={() => setIsOpen(false)} className={DS.buttons.icon}>
                <X className="size-4" />
              </button>
            </div>
            <div className="flex-1 p-4">
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder={`Ask about ${serviceName}...`}
                className={cn(DS.inputs.base, DS.inputs.textarea, 'h-full')}
              />
            </div>
            <div className="p-4 border-t border-divider">
              <button
                onClick={handleSend}
                disabled={!message.trim() || isSending}
                className={cn(DS.buttons.primary, 'w-full')}
              >
                {isSending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                Send Message
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
