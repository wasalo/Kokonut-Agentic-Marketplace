import crypto from 'crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const WEBHOOKS_FILE = path.join(DATA_DIR, 'webhooks.json');
const DELIVERIES_FILE = path.join(DATA_DIR, 'webhook-deliveries.json');

export interface Webhook {
  id: string;
  owner: string;
  url: string;
  events: string[];
  chains?: number[];
  secret: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  metadata?: string;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: string;
  payload: string;
  status: 'pending' | 'success' | 'failed';
  statusCode?: number;
  response?: string;
  attempts: number;
  lastAttempt?: string;
  createdAt: string;
}

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readWebhooks(): Webhook[] {
  ensureDataDir();
  if (!existsSync(WEBHOOKS_FILE)) {
    return [];
  }
  try {
    return JSON.parse(readFileSync(WEBHOOKS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function writeWebhooks(webhooks: Webhook[]): void {
  ensureDataDir();
  writeFileSync(WEBHOOKS_FILE, JSON.stringify(webhooks, null, 2));
}

function readDeliveries(): WebhookDelivery[] {
  ensureDataDir();
  if (!existsSync(DELIVERIES_FILE)) {
    return [];
  }
  try {
    return JSON.parse(readFileSync(DELIVERIES_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function writeDeliveries(deliveries: WebhookDelivery[]): void {
  ensureDataDir();
  writeFileSync(DELIVERIES_FILE, JSON.stringify(deliveries, null, 2));
}

export function generateSecret(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function createWebhook(params: {
  owner: string;
  url: string;
  events: string[];
  chains?: number[];
  metadata?: string;
}): Promise<Webhook> {
  const webhooks = readWebhooks();

  const webhook: Webhook = {
    id: crypto.randomBytes(16).toString('hex'),
    owner: params.owner.toLowerCase(),
    url: params.url,
    events: params.events,
    chains: params.chains,
    secret: generateSecret(),
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    metadata: params.metadata,
  };

  webhooks.push(webhook);
  writeWebhooks(webhooks);

  return webhook;
}

export async function getWebhooks(owner?: string): Promise<Webhook[]> {
  const webhooks = readWebhooks();
  if (owner) {
    return webhooks.filter(w => w.owner === owner.toLowerCase());
  }
  return webhooks;
}

export async function getWebhookById(id: string): Promise<Webhook | null> {
  const webhooks = readWebhooks();
  return webhooks.find(w => w.id === id) || null;
}

export async function updateWebhook(
  id: string,
  updates: Partial<Webhook>
): Promise<Webhook | null> {
  const webhooks = readWebhooks();
  const index = webhooks.findIndex(w => w.id === id);

  if (index === -1) return null;

  webhooks[index] = {
    ...webhooks[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  writeWebhooks(webhooks);
  return webhooks[index];
}

export async function deleteWebhook(id: string): Promise<boolean> {
  const webhooks = readWebhooks();
  const index = webhooks.findIndex(w => w.id === id);

  if (index === -1) return false;

  webhooks.splice(index, 1);
  writeWebhooks(webhooks);
  return true;
}

export async function getWebhooksForEvent(event: string, chainId?: number): Promise<Webhook[]> {
  const webhooks = readWebhooks();
  return webhooks.filter(w => {
    if (!w.isActive || !w.events.includes(event)) return false;
    if (!w.chains || w.chains.length === 0) return true;
    return chainId ? w.chains.includes(chainId) : false;
  });
}

export async function recordDelivery(
  delivery: Omit<WebhookDelivery, 'id' | 'createdAt'>
): Promise<WebhookDelivery> {
  const deliveries = readDeliveries();

  const newDelivery: WebhookDelivery = {
    ...delivery,
    id: crypto.randomBytes(16).toString('hex'),
    createdAt: new Date().toISOString(),
  };

  deliveries.push(newDelivery);
  writeDeliveries(deliveries);

  return newDelivery;
}

export async function getDeliveries(webhookId?: string, limit = 100): Promise<WebhookDelivery[]> {
  const deliveries = readDeliveries();
  let filtered = webhookId ? deliveries.filter(d => d.webhookId === webhookId) : deliveries;
  return filtered.slice(-limit).reverse();
}
