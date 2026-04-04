export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  expirationTime: number | null;
}

export interface VapidKeys {
  publicKey: string;
  privateKey: string;
}

export interface PushPreferences {
  enabled: boolean;
  subscriptions: PushSubscription[];
  lastSync: number | null;
}

const VAPID_PUBLIC_KEY_STORAGE_KEY = 'kokonut_vapid_public_key';
const PUSH_PREFERENCES_KEY = 'kokonut_push_preferences';

export function generateVapidKeys(): VapidKeys {
  const array = new Uint8Array(65);
  crypto.getRandomValues(array);

  const privateKey = Array.from(array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  crypto.getRandomValues(array);
  const publicKey =
    '04' +
    Array.from(array)
      .slice(1)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

  return { publicKey, privateKey };
}

export function getPublicKey(): string | null {
  return localStorage.getItem(VAPID_PUBLIC_KEY_STORAGE_KEY);
}

export function setPublicKey(publicKey: string): void {
  localStorage.setItem(VAPID_PUBLIC_KEY_STORAGE_KEY, publicKey);
}

export function getPushPreferences(): PushPreferences {
  const stored = localStorage.getItem(PUSH_PREFERENCES_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return getDefaultPreferences();
    }
  }
  return getDefaultPreferences();
}

function getDefaultPreferences(): PushPreferences {
  return {
    enabled: false,
    subscriptions: [],
    lastSync: null,
  };
}

export function setPushPreferences(preferences: PushPreferences): void {
  localStorage.setItem(PUSH_PREFERENCES_KEY, JSON.stringify(preferences));
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.error('Push notifications not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      const publicKey = getPublicKey();
      if (!publicKey) {
        console.error('VAPID public key not found');
        return null;
      }

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });
    }

    const pushSub: PushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: (subscription as any).keys?.p256dh || '',
        auth: (subscription as any).keys?.auth || '',
      },
      expirationTime: subscription.expirationTime,
    };

    const prefs = getPushPreferences();
    const existingIndex = prefs.subscriptions.findIndex(s => s.endpoint === pushSub.endpoint);

    if (existingIndex >= 0) {
      prefs.subscriptions[existingIndex] = pushSub;
    } else {
      prefs.subscriptions.push(pushSub);
    }

    prefs.enabled = true;
    prefs.lastSync = Date.now();
    setPushPreferences(prefs);

    return pushSub;
  } catch (error) {
    console.error('Error subscribing to push:', error);
    return null;
  }
}

export async function unsubscribeFromPush(endpoint: string): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription && subscription.endpoint === endpoint) {
      await subscription.unsubscribe();
    }

    const prefs = getPushPreferences();
    prefs.subscriptions = prefs.subscriptions.filter(s => s.endpoint !== endpoint);

    if (prefs.subscriptions.length === 0) {
      prefs.enabled = false;
    }

    setPushPreferences(prefs);
    return true;
  } catch (error) {
    console.error('Error unsubscribing from push:', error);
    return false;
  }
}

export async function sendPushNotification(
  subscription: PushSubscription,
  data: {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    tag?: string;
    data?: Record<string, unknown>;
  }
): Promise<boolean> {
  try {
    const payload = JSON.stringify({
      notification: {
        title: data.title,
        body: data.body,
        icon: data.icon || '/icon-192.png',
        badge: data.badge || '/badge-72.png',
        tag: data.tag || 'kokonut-notification',
        data: {
          url: data.data?.url || '/notifications',
          ...data.data,
        },
      },
    });

    const response = await fetch('/api/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscription,
        payload,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Error sending push notification:', error);
    return false;
  }
}
