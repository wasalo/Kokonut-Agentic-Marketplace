'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import type { WalletClient } from 'viem';
import type { Attachment, ConversationScope } from '@/lib/types/chat';
import { createOwnerAuthHeaders } from '@/lib/client-auth';

interface SendMessageInput {
  conversationId?: string;
  scope?: ConversationScope;
  scopeId?: string;
  recipientAddress?: string;
  content: string;
  attachments?: Attachment[];
}

async function sendMessageApi(
  input: SendMessageInput,
  address: string,
  walletClient?: WalletClient | null
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-owner-address': address,
  };

  if (walletClient) {
    const authHeaders = await createOwnerAuthHeaders(address as `0x${string}`, walletClient);
    Object.assign(headers, authHeaders);
  }

  const res = await fetch('/api/messages', {
    method: 'POST',
    headers,
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to send message');
  }
  return res.json();
}

async function uploadAttachment(file: File, address: string) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch('/api/messages/attachments', {
    method: 'POST',
    headers: { 'x-owner-address': address },
    body: formData,
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to upload attachment');
  }
  return res.json();
}

export function useSendMessage() {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const queryClient = useQueryClient();

  const sendMutation = useMutation({
    mutationFn: (input: SendMessageInput) =>
      sendMessageApi(input, address!, walletClient),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations', address] });
    },
  });

  const send = useCallback(
    (input: SendMessageInput) => {
      if (!address) throw new Error('Wallet not connected');
      return sendMutation.mutateAsync(input);
    },
    [address, sendMutation]
  );

  return {
    send,
    isSending: sendMutation.isPending,
    error: sendMutation.error,
  };
}

export function useUploadAttachment() {
  const { address } = useAccount();

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadAttachment(file, address!),
  });

  const upload = useCallback(
    (file: File) => {
      if (!address) throw new Error('Wallet not connected');
      return uploadMutation.mutateAsync(file);
    },
    [address, uploadMutation]
  );

  return {
    upload,
    isUploading: uploadMutation.isPending,
    error: uploadMutation.error,
  };
}
