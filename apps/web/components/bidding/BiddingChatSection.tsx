'use client';

import { useMemo } from 'react';
import { Card } from '@heroui/react';
import { card } from '@/lib/design-system';
import { MessageThread } from '@/components/chat/MessageThread';
import { useConversations } from '@/lib/hooks/useConversations';
import { MessageSquare } from 'lucide-react';

interface BiddingChatSectionProps {
  sessionId: string;
  creatorAddress: string;
  bidderAddress: string;
  isCreator: boolean;
  isBidder: boolean;
}

export function BiddingChatSection({
  sessionId,
  creatorAddress,
  bidderAddress,
  isCreator,
  isBidder,
}: BiddingChatSectionProps) {
  const { conversations } = useConversations('bidding');

  const conversationId = useMemo(() => {
    const participants = [creatorAddress, bidderAddress].filter(Boolean);
    const sorted = [...participants].map(p => p.toLowerCase()).sort();
    return `bidding:${sessionId}:${sorted.join(':')}`;
  }, [sessionId, creatorAddress, bidderAddress]);

  const existingConv = conversations.find(c => c.id === conversationId);

  const recipientAddress = useMemo(() => {
    if (isCreator) return bidderAddress;
    if (isBidder) return creatorAddress;
    return creatorAddress;
  }, [isCreator, isBidder, creatorAddress, bidderAddress]);

  if (!creatorAddress || !bidderAddress) {
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
          scope="bidding"
          scopeId={sessionId}
          recipientAddress={recipientAddress}
          title={`Bidding Session #${sessionId}`}
        />
      </div>
    </Card>
  );
}
