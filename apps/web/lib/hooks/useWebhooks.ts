'use client';

import { useCallback } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import {
  useWebhookStore,
  type WebhookRegistration,
  type WebhookUpdate,
} from '@/lib/webhooks';
import { createOwnerAuthHeaders } from '@/lib/client-auth';

export function useWebhooks() {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const {
    getWebhook,
    getWebhooksByOwner,
    getActiveWebhooksForEvent,
  } = useWebhookStore();

  const getAuthHeaders = useCallback(async () => {
    if (!address || !walletClient) {
      throw new Error('Wallet not connected');
    }

    return createOwnerAuthHeaders(address, walletClient);
  }, [address, walletClient]);

  const createWebhook = useCallback(
    async (registration: WebhookRegistration) => {
      if (!address || !walletClient) {
        throw new Error('Wallet not connected');
      }

      const authHeaders = await getAuthHeaders();

      const response = await fetch('/api/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify(registration),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to register webhook');
      }

      return data.webhook;
    },
    [address, walletClient, getAuthHeaders]
  );

  const editWebhook = useCallback(
    async (id: string, update: WebhookUpdate) => {
      if (!address || !walletClient) {
        throw new Error('Wallet not connected');
      }

      const authHeaders = await getAuthHeaders();

      const response = await fetch(`/api/webhooks/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify(update),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update webhook');
      }

      return data.webhook;
    },
    [address, walletClient, getAuthHeaders]
  );

  const removeWebhook = useCallback(
    async (id: string) => {
      if (!address || !walletClient) {
        throw new Error('Wallet not connected');
      }

      const authHeaders = await getAuthHeaders();

      const response = await fetch(`/api/webhooks/${id}`, {
        method: 'DELETE',
        headers: authHeaders,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete webhook');
      }

      return true;
    },
    [address, walletClient, getAuthHeaders]
  );

  const listWebhooks = useCallback(async () => {
    if (!address || !walletClient) {
      return [];
    }

    const authHeaders = await getAuthHeaders();

    const response = await fetch('/api/webhooks', {
      headers: authHeaders,
    });

    const data = await response.json();
    return data.webhooks || [];
  }, [address, walletClient, getAuthHeaders]);

  const triggerTestEvent = useCallback(async (webhookId: string) => {
    if (!address || !walletClient) {
      throw new Error('Wallet not connected');
    }

    const authHeaders = await getAuthHeaders();
    const response = await fetch('/api/webhooks/trigger', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({
        webhookId,
        event: 'job.created',
        data: {
          test: true,
          message: 'This is a test webhook event from Kokonut',
        },
      }),
    });

    const data = await response.json();
    return data;
  }, [address, walletClient, getAuthHeaders]);

  return {
    webhooks: address ? getWebhooksByOwner(address) : [],
    myWebhooks: address ? getWebhooksByOwner(address) : [],
    getWebhook,
    getActiveWebhooksForEvent,
    createWebhook,
    editWebhook,
    removeWebhook,
    listWebhooks,
    triggerTestEvent,
  };
}

export function useWebhookDelivery(webhookId: string) {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();

  const fetchDeliveries = useCallback(async () => {
    if (!address || !walletClient) {
      return [];
    }

    const authHeaders = await createOwnerAuthHeaders(address, walletClient);

    const response = await fetch(`/api/webhooks/${webhookId}/deliveries`, {
      headers: authHeaders,
    });

    const data = await response.json();
    return data;
  }, [address, walletClient, webhookId]);

  return { fetchDeliveries };
}
