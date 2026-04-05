import { PushSubscription } from './manager';

const PUSH_SUBSCRIPTIONS_KEY = 'kokonut_push_subscriptions';

export interface StoredPushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAddress: string;
  createdAt: number;
}

export function getStoredPushSubscriptions(userAddress?: string): StoredPushSubscription[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(PUSH_SUBSCRIPTIONS_KEY);
    if (!stored) return [];

    const subscriptions: StoredPushSubscription[] = JSON.parse(stored);

    if (userAddress) {
      return subscriptions.filter(s => s.userAddress === userAddress.toLowerCase());
    }

    return subscriptions;
  } catch {
    return [];
  }
}

export function savePushSubscription(
  subscription: PushSubscription,
  userAddress: string
): StoredPushSubscription {
  const subscriptions = getStoredPushSubscriptions();

  const newSubscription: StoredPushSubscription = {
    endpoint: subscription.endpoint,
    keys: subscription.keys,
    userAddress: userAddress.toLowerCase(),
    createdAt: Date.now(),
  };

  const existingIndex = subscriptions.findIndex(s => s.endpoint === subscription.endpoint);

  if (existingIndex >= 0) {
    subscriptions[existingIndex] = newSubscription;
  } else {
    subscriptions.push(newSubscription);
  }

  localStorage.setItem(PUSH_SUBSCRIPTIONS_KEY, JSON.stringify(subscriptions));

  return newSubscription;
}

export function deletePushSubscription(endpoint: string): boolean {
  const subscriptions = getStoredPushSubscriptions();
  const filtered = subscriptions.filter(s => s.endpoint !== endpoint);

  if (filtered.length === subscriptions.length) return false;

  localStorage.setItem(PUSH_SUBSCRIPTIONS_KEY, JSON.stringify(filtered));
  return true;
}

export function clearAllPushSubscriptions(): void {
  localStorage.removeItem(PUSH_SUBSCRIPTIONS_KEY);
}
