'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import type { Conversation, ConversationScope } from '@/lib/types/chat';
import { createOwnerAuthHeaders } from '@/lib/client-auth';

async function fetchConversations(
  address: string,
  scope?: ConversationScope
): Promise<{ conversations: Conversation[]; unread: number }> {
  const params = new URLSearchParams();
  if (scope) params.set('scope', scope);

  const res = await fetch(`/api/messages?${params}`, {
    headers: { 'x-owner-address': address },
  });
  if (!res.ok) throw new Error('Failed to fetch conversations');
  return res.json();
}

async function fetchConversationMessages(
  conversationId: string,
  limit = 50,
  before?: number
): Promise<{ messages: unknown[] }> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (before) params.set('before', String(before));

  const res = await fetch(`/api/messages/${conversationId}?${params}`);
  if (!res.ok) throw new Error('Failed to fetch messages');
  return res.json();
}

export function useConversations(scope?: ConversationScope) {
  const { address } = useAccount();
  const queryClient = useQueryClient();

  const conversationsQuery = useQuery({
    queryKey: ['conversations', address, scope],
    queryFn: () => fetchConversations(address!, scope),
    enabled: !!address,
    staleTime: 10_000,
    refetchInterval: 15_000,
  });

  const markReadMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      await fetch(`/api/messages/${conversationId}/read`, {
        method: 'POST',
        headers: { 'x-owner-address': address! },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations', address] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      await fetch(`/api/messages/${conversationId}`, {
        method: 'DELETE',
        headers: { 'x-owner-address': address! },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations', address] });
    },
  });

  const markAsRead = useCallback(
    (conversationId: string) => {
      if (address) markReadMutation.mutate(conversationId);
    },
    [address, markReadMutation]
  );

  const deleteConversation = useCallback(
    (conversationId: string) => {
      if (address) deleteMutation.mutate(conversationId);
    },
    [address, deleteMutation]
  );

  return {
    conversations: conversationsQuery.data?.conversations ?? [],
    unread: conversationsQuery.data?.unread ?? 0,
    isLoading: conversationsQuery.isLoading,
    isError: conversationsQuery.isError,
    markAsRead,
    deleteConversation,
    refetch: conversationsQuery.refetch,
  };
}

export function useConversationMessages(conversationId: string | null) {
  const messagesQuery = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => fetchConversationMessages(conversationId!),
    enabled: !!conversationId,
    staleTime: 5_000,
    refetchInterval: 10_000,
  });

  return {
    messages: messagesQuery.data?.messages ?? [],
    isLoading: messagesQuery.isLoading,
    isError: messagesQuery.isError,
    refetch: messagesQuery.refetch,
  };
}
