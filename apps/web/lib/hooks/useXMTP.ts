'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWalletClient } from 'wagmi';
import { Client, isText } from '@xmtp/browser-sdk';

export interface XMTPConversation {
  id: string;
  peerAddress: string;
  peerName?: string;
  lastMessage?: string;
  lastMessageTime?: Date;
  unread: number;
}

export interface XMTPMessage {
  id: string;
  content: string;
  senderAddress: string;
  sentAt: Date;
}

export function useXMTP() {
  const { data: walletClient } = useWalletClient();
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function initXMTP() {
      if (!walletClient) {
        setClient(null);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const address = walletClient.account.address;
        
        const signer = {
          type: 'EOA' as const,
          getIdentifier: async () => ({
            identifier: address.toLowerCase(),
            identifierKind: 0,
          }),
          // @ts-ignore - signature format
          signMessage: async (message: string) => {
            const msg = { message };
            const sig = await walletClient.signMessage(msg as any);
            return sig;
          },
        };

        // @ts-ignore - version differences
        const xmtp = await Client.create(signer);
        
        setClient(xmtp);
      } catch (err) {
        console.error('XMTP init error:', err);
        setError(err instanceof Error ? err.message : 'Failed to init XMTP');
      } finally {
        setIsLoading(false);
      }
    }

    initXMTP();
  }, [walletClient]);

  const getConversations = useCallback(async (): Promise<XMTPConversation[]> => {
    if (!client) return [];

    try {
      const convs = await client.conversations.list();
      return convs.map((conv: any) => ({
        id: conv.id,
        peerAddress: conv.id,
        lastMessageTime: conv.createdAt,
        unread: 0,
      }));
    } catch (err) {
      console.error('Get conversations error:', err);
      return [];
    }
  }, [client]);

  const getMessages = useCallback(async (peerAddress: string): Promise<XMTPMessage[]> => {
    if (!client) return [];

    try {
      const conv = await (client.conversations as any).getConversation(peerAddress);
      if (!conv) return [];

      const msgs = await conv.messages({ limit: 50 });
      return msgs
        .filter(isText)
        .map((msg: any) => ({
          id: msg.id,
          content: msg.content as string,
          senderAddress: msg.senderInboxId,
          sentAt: msg.sentAt,
        }));
    } catch (err) {
      console.error('Get messages error:', err);
      return [];
    }
  }, [client]);

  const sendMessage = useCallback(async (peerAddress: string, content: string): Promise<boolean> => {
    if (!client) return false;

    try {
      const conv = await (client.conversations as any).newConversation(peerAddress);
      await conv.sendText(content);
      return true;
    } catch (err) {
      console.error('Send message error:', err);
      return false;
    }
  }, [client]);

  return {
    client,
    isLoading,
    error,
    isReady: !!client,
    getConversations,
    getMessages,
    sendMessage,
  };
}