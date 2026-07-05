'use client';

import { useCallback } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  useWebhookStore,
  type WebhookRegistration,
  type WebhookUpdate,
} from '@/lib/webhooks';
import { createOwnerAuthHeaders } from '@/lib/client-auth';

export function useWebhooks() {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const queryClient = useQueryClient();
  const {
    getWebhook,
    getWebhooksByOwner,
    getActiveWebhooksForEvent,
  } = useWebhookStore();

  const getAuthHeaders = useCallback(async () => {
    if (!address || !walletClient) throw new Error('Wallet not connected');
    return createOwnerAuthHeaders(address, walletClient);
  }, [address, walletClient]);

  const listQuery = useQuery({
    queryKey: ['webhooks', address],
    queryFn: async () => {
      if (!address || !walletClient) return [];
      const authHeaders = await getAuthHeaders();
      const response = await fetch('/api/webhooks', { headers: authHeaders });
      const data = await response.json();
      return data.webhooks || [];
    },
    enabled: !!address && !!walletClient,
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: async (registration: WebhookRegistration) => {
      if (!address || !walletClient) throw new Error('Wallet not connected');
      const authHeaders = await getAuthHeaders();
      const response = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify(registration),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to register webhook');
      return data.webhook;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['webhooks', address] }),
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, update }: { id: string; update: WebhookUpdate }) => {
      if (!address || !walletClient) throw new Error('Wallet not connected');
      const authHeaders = await getAuthHeaders();
      const response = await fetch(`/api/webhooks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify(update),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update webhook');
      return data.webhook;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['webhooks', address] }),
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!address || !walletClient) throw new Error('Wallet not connected');
      const authHeaders = await getAuthHeaders();
      const response = await fetch(`/api/webhooks/${id}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete webhook');
      return true;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['webhooks', address] }),
  });

  const triggerMutation = useMutation({
    mutationFn: async (webhookId: string) => {
      if (!address || !walletClient) throw new Error('Wallet not connected');
      const authHeaders = await getAuthHeaders();
      const response = await fetch('/api/webhooks/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          webhookId,
          event: 'job.created',
          data: { test: true, message: 'This is a test webhook event from Kokonut' },
        }),
      });
      return response.json();
    },
  });

  return {
    webhooks: address ? getWebhooksByOwner(address) : [],
    myWebhooks: address ? getWebhooksByOwner(address) : [],
    getWebhook,
    getActiveWebhooksForEvent,
    createWebhook: createMutation.mutateAsync,
    editWebhook: (id: string, update: WebhookUpdate) => editMutation.mutateAsync({ id, update }),
    removeWebhook: removeMutation.mutateAsync,
    listWebhooks: listQuery.refetch,
    triggerTestEvent: triggerMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isEditing: editMutation.isPending,
    isRemoving: removeMutation.isPending,
    isTriggering: triggerMutation.isPending,
  };
}

export function useWebhookDelivery(webhookId: string) {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();

  const fetchDeliveries = useCallback(async () => {
    if (!address || !walletClient) return [];
    const authHeaders = await createOwnerAuthHeaders(address, walletClient);
    const response = await fetch(`/api/webhooks/${webhookId}/deliveries`, {
      headers: authHeaders,
    });
    return response.json();
  }, [address, walletClient, webhookId]);

  return { fetchDeliveries };
}
