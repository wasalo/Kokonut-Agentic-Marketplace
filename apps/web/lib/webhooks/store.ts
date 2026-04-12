'use client';

import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import type {
  Webhook,
  WebhookRegistration,
  WebhookUpdate,
  WebhookDelivery,
  WebhookPayload,
  WebhookEventType,
} from './types';
import { generateWebhookId, generateSecret, MAX_WEBHOOKS_PER_AGENT } from './types';

const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

const getBrowserStorage = (): StateStorage => {
  if (typeof window === 'undefined') {
    return noopStorage;
  }
  return {
    getItem: (name: string) => localStorage.getItem(name),
    setItem: (name: string, value: string) => localStorage.setItem(name, value),
    removeItem: (name: string) => localStorage.removeItem(name),
  };
};

interface WebhookState {
  webhooks: Webhook[];
  deliveries: WebhookDelivery[];

  registerWebhook: (owner: string, registration: WebhookRegistration) => Webhook | null;
  updateWebhook: (id: string, owner: string, update: WebhookUpdate) => boolean;
  deleteWebhook: (id: string, owner: string) => boolean;
  getWebhook: (id: string) => Webhook | undefined;
  getWebhooksByOwner: (owner: string) => Webhook[];
  getActiveWebhooksForEvent: (event: WebhookEventType) => Webhook[];

  addDelivery: (webhookId: string, payload: WebhookPayload) => void;
  updateDelivery: (id: string, update: Partial<WebhookDelivery>) => void;
  getPendingDeliveries: () => WebhookDelivery[];
  getDeliveriesForWebhook: (webhookId: string) => WebhookDelivery[];
}

export const useWebhookStore = create<WebhookState>()(
  persist(
    (set, get) => ({
      webhooks: [],
      deliveries: [],

      registerWebhook: (owner, registration) => {
        const ownerWebhooks = get().webhooks.filter(
          w => w.owner.toLowerCase() === owner.toLowerCase()
        );

        if (ownerWebhooks.length >= MAX_WEBHOOKS_PER_AGENT) {
          return null;
        }

        const webhook: Webhook = {
          id: generateWebhookId(),
          owner: owner.toLowerCase(),
          url: registration.url,
          events: registration.events,
          secret: generateSecret(),
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          metadata: registration.metadata,
        };

        set(state => ({
          webhooks: [...state.webhooks, webhook],
        }));

        return webhook;
      },

      updateWebhook: (id, owner, update) => {
        const webhook = get().webhooks.find(
          w => w.id === id && w.owner.toLowerCase() === owner.toLowerCase()
        );

        if (!webhook) return false;

        set(state => ({
          webhooks: state.webhooks.map(w =>
            w.id === id
              ? {
                  ...w,
                  ...update,
                  updatedAt: Date.now(),
                }
              : w
          ),
        }));

        return true;
      },

      deleteWebhook: (id, owner) => {
        const webhook = get().webhooks.find(
          w => w.id === id && w.owner.toLowerCase() === owner.toLowerCase()
        );

        if (!webhook) return false;

        set(state => ({
          webhooks: state.webhooks.filter(w => w.id !== id),
          deliveries: state.deliveries.filter(d => d.webhookId !== id),
        }));

        return true;
      },

      getWebhook: id => {
        return get().webhooks.find(w => w.id === id);
      },

      getWebhooksByOwner: owner => {
        return get().webhooks.filter(w => w.owner.toLowerCase() === owner.toLowerCase());
      },

      getActiveWebhooksForEvent: event => {
        return get().webhooks.filter(w => w.isActive && w.events.includes(event));
      },

      addDelivery: (webhookId, payload) => {
        const delivery: WebhookDelivery = {
          id: generateWebhookId(),
          webhookId,
          payload,
          attempts: 0,
          lastAttempt: null,
          status: 'pending',
          responseStatus: null,
          responseBody: null,
          createdAt: Date.now(),
        };

        set(state => ({
          deliveries: [...state.deliveries, delivery],
        }));
      },

      updateDelivery: (id, update) => {
        set(state => ({
          deliveries: state.deliveries.map(d => (d.id === id ? { ...d, ...update } : d)),
        }));
      },

      getPendingDeliveries: () => {
        return get().deliveries.filter(d => d.status === 'pending');
      },

      getDeliveriesForWebhook: webhookId => {
        return get().deliveries.filter(d => d.webhookId === webhookId);
      },
    }),
    {
      name: 'kokonut_webhooks',
      storage: createJSONStorage(() => getBrowserStorage()),
      partialize: state => ({
        webhooks: state.webhooks,
        deliveries: state.deliveries,
      }),
    }
  )
);
