'use client';

import { useMemo } from 'react';
import { useAccount } from 'wagmi';
import { Card } from '@heroui/react';
import { card } from '@/lib/design-system';
import { MessageThread } from '@/components/chat/MessageThread';
import { useConversations } from '@/lib/hooks/useConversations';
import { MessageSquare } from 'lucide-react';
import { ZERO_ADDRESS } from '@/lib/contracts/config';

interface JobChatSectionProps {
  jobId: string;
  client: string;
  provider: string;
  isClient: boolean;
  isProvider: boolean;
}

export function JobChatSection({ jobId, client, provider, isClient, isProvider }: JobChatSectionProps) {
  const { address } = useAccount();
  const { conversations } = useConversations('job');

  const conversationId = useMemo(() => {
    const participants = [client, provider].filter(p => p && p !== ZERO_ADDRESS);
    const sorted = [...participants].map(p => p.toLowerCase()).sort();
    return `job:${jobId}:${sorted.join(':')}`;
  }, [jobId, client, provider]);

  const existingConv = conversations.find(c => c.id === conversationId);

  const recipientAddress = useMemo(() => {
    if (isClient) return provider;
    if (isProvider) return client;
    return provider;
  }, [isClient, isProvider, client, provider]);

  if (!client || client === ZERO_ADDRESS || !provider || provider === ZERO_ADDRESS) {
    return null;
  }

  return (
    <Card className={card('padded')}>
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="size-4 text-primary" />
        <h3 className="text-sm font-medium text-foreground">Discussion</h3>
      </div>
      <div className="h-[400px] -mx-4 -mb-4">
        <MessageThread
          conversationId={existingConv?.id ?? null}
          scope="job"
          scopeId={jobId}
          recipientAddress={recipientAddress}
          title={`Job #${jobId}`}
        />
      </div>
    </Card>
  );
}
