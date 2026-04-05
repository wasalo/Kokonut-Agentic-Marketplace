import { Webhook, WebhookRegistration, WebhookEventType } from './types';
import { generateWebhookId, generateSecret } from './types';

const WEBHOOKS_KEY = 'kokonut_webhooks';

export function getStoredWebhooks(owner?: string): Webhook[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(WEBHOOKS_KEY);
    if (!stored) return [];

    const webhooks: Webhook[] = JSON.parse(stored);

    if (owner) {
      return webhooks.filter(w => w.owner === owner);
    }

    return webhooks;
  } catch {
    return [];
  }
}

export function getAllStoredWebhooks(): Webhook[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(WEBHOOKS_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveWebhook(owner: string, registration: WebhookRegistration): Webhook {
  const webhooks = getAllStoredWebhooks();

  const newWebhook: Webhook = {
    id: generateWebhookId(),
    owner,
    url: registration.url,
    events: registration.events,
    secret: generateSecret(),
    isActive: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    metadata: registration.metadata,
  };

  webhooks.push(newWebhook);
  localStorage.setItem(WEBHOOKS_KEY, JSON.stringify(webhooks));

  return newWebhook;
}

export function updateWebhook(id: string, updates: Partial<Webhook>): Webhook | null {
  const webhooks = getAllStoredWebhooks();
  const index = webhooks.findIndex(w => w.id === id);

  if (index === -1) return null;

  webhooks[index] = {
    ...webhooks[index],
    ...updates,
    updatedAt: Date.now(),
  };
  localStorage.setItem(WEBHOOKS_KEY, JSON.stringify(webhooks));

  return webhooks[index];
}

export function deleteWebhook(id: string): boolean {
  const webhooks = getAllStoredWebhooks();
  const filtered = webhooks.filter(w => w.id !== id);

  if (filtered.length === webhooks.length) return false;

  localStorage.setItem(WEBHOOKS_KEY, JSON.stringify(filtered));
  return true;
}

export function getWebhookById(id: string): Webhook | null {
  const webhooks = getAllStoredWebhooks();
  return webhooks.find(w => w.id === id) || null;
}

export function getWebhooksByEvent(event: WebhookEventType): Webhook[] {
  const webhooks = getAllStoredWebhooks();
  return webhooks.filter(w => w.isActive && w.events.includes(event));
}
