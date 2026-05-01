'use client';

import { useCallback } from 'react';
import { useAccount } from 'wagmi';
import {
  useWebhookStore,
  type WebhookRegistration,
  type WebhookUpdate,
} from '@/lib/webhooks';

export function useWebhooks() {
  const { address } = useAccount();
  const {
    getWebhook,
    getWebhooksByOwner,
    getActiveWebhooksForEvent,
  } = useWebhookStore();

  const createWebhook = useCallback(
    async (registration: WebhookRegistration) => {
      if (!address) {
        throw new Error('Wallet not connected');
      }

      const response = await fetch('/api/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-owner-address': address,
        },
        body: JSON.stringify(registration),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to register webhook');
      }

      return data.webhook;
    },
    [address]
  );

  const editWebhook = useCallback(
    async (id: string, update: WebhookUpdate) => {
      if (!address) {
        throw new Error('Wallet not connected');
      }

      const response = await fetch(`/api/webhooks/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-owner-address': address,
        },
        body: JSON.stringify(update),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update webhook');
      }

      return data.webhook;
    },
    [address]
  );

  const removeWebhook = useCallback(
    async (id: string) => {
      if (!address) {
        throw new Error('Wallet not connected');
      }

      const response = await fetch(`/api/webhooks/${id}`, {
        method: 'DELETE',
        headers: {
          'x-owner-address': address,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete webhook');
      }

      return true;
    },
    [address]
  );

  const listWebhooks = useCallback(async () => {
    if (!address) {
      return [];
    }

    const response = await fetch('/api/webhooks', {
      headers: {
        'x-owner-address': address,
      },
    });

    const data = await response.json();
    return data.webhooks || [];
  }, [address]);

  const triggerTestEvent = useCallback(async (_webhookId: string) => {
    const response = await fetch('/api/webhooks/trigger', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event: 'job.created',
        data: {
          test: true,
          message: 'This is a test webhook event from Kokonut',
        },
      }),
    });

    const data = await response.json();
    return data;
  }, []);

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

  const fetchDeliveries = useCallback(async () => {
    if (!address) {
      return [];
    }

    const response = await fetch(`/api/webhooks/${webhookId}/deliveries`, {
      headers: {
        'x-owner-address': address,
      },
    });

    const data = await response.json();
    return data;
  }, [address, webhookId]);

  return { fetchDeliveries };
}
