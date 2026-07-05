import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const PUSH_FILE = path.join(DATA_DIR, 'push-subscriptions.json');

export interface PushSubscriptionRecord {
  id: string;
  userAddress: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readSubscriptions(): PushSubscriptionRecord[] {
  ensureDataDir();
  if (!existsSync(PUSH_FILE)) {
    return [];
  }
  try {
    return JSON.parse(readFileSync(PUSH_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function writeSubscriptions(subs: PushSubscriptionRecord[]): void {
  ensureDataDir();
  writeFileSync(PUSH_FILE, JSON.stringify(subs, null, 2));
}

export async function createPushSubscription(params: {
  userAddress: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
}) {
  const subscriptions = readSubscriptions();

  const existingIndex = subscriptions.findIndex(s => s.endpoint === params.endpoint);

  if (existingIndex >= 0) {
    subscriptions[existingIndex] = {
      ...subscriptions[existingIndex],
      userAddress: params.userAddress.toLowerCase(),
      p256dh: params.p256dh,
      auth: params.auth,
      userAgent: params.userAgent,
      isActive: true,
      updatedAt: new Date().toISOString(),
    };
    writeSubscriptions(subscriptions);
    return mapSubscription(subscriptions[existingIndex]);
  }

  const newSub: PushSubscriptionRecord = {
    id: `push_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    userAddress: params.userAddress.toLowerCase(),
    endpoint: params.endpoint,
    p256dh: params.p256dh,
    auth: params.auth,
    userAgent: params.userAgent,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  subscriptions.push(newSub);
  writeSubscriptions(subscriptions);
  return mapSubscription(newSub);
}

export async function deletePushSubscription(endpoint: string, userAddress?: string): Promise<boolean> {
  const subscriptions = readSubscriptions();
  const owner = userAddress?.toLowerCase();
  const index = subscriptions.findIndex(s => {
    if (s.endpoint !== endpoint) return false;
    if (owner && s.userAddress !== owner) return false;
    return true;
  });

  if (index === -1) return false;

  subscriptions[index].isActive = false;
  subscriptions[index].updatedAt = new Date().toISOString();
  writeSubscriptions(subscriptions);
  return true;
}

export async function getActivePushSubscriptions(userAddress?: string) {
  const subscriptions = readSubscriptions();
  return subscriptions
    .filter(s => {
      if (!s.isActive) return false;
      if (userAddress && s.userAddress !== userAddress.toLowerCase()) return false;
      return true;
    })
    .map(mapSubscription);
}

export async function getAllActivePushSubscriptions() {
  return getActivePushSubscriptions();
}

function mapSubscription(sub: PushSubscriptionRecord) {
  return {
    id: sub.id,
    userAddress: sub.userAddress,
    endpoint: sub.endpoint,
    keys: {
      p256dh: sub.p256dh,
      auth: sub.auth,
    },
    userAgent: sub.userAgent,
    isActive: sub.isActive,
    createdAt: sub.createdAt,
  };
}
