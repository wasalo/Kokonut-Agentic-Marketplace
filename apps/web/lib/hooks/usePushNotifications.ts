'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { createOwnerAuthHeaders } from '@/lib/client-auth';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

interface PushSubscriptionState {
  supported: boolean;
  permission: NotificationPermission | 'unsupported';
  subscribed: boolean;
  subscription: PushSubscription | null;
  loading: boolean;
  error: string | null;
}

export function usePushNotifications() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [state, setState] = useState<PushSubscriptionState>({
    supported: false,
    permission: 'default',
    subscribed: false,
    subscription: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setState(prev => ({
        ...prev,
        supported: false,
        permission: 'unsupported',
        loading: false,
      }));
      return;
    }

    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        registration.pushManager.getSubscription().then(subscription => {
          setState(prev => ({
            ...prev,
            supported: true,
            permission: Notification.permission,
            subscribed: !!subscription,
            subscription,
            loading: false,
          }));
        });
      });
    } else {
      setState(prev => ({
        ...prev,
        supported: false,
        permission: 'unsupported',
        loading: false,
      }));
    }
  }, []);

  const subscribe = useCallback(async () => {
    if (!state.supported || !isConnected || !address) {
      setState(prev => ({
        ...prev,
        error: 'Push notifications not supported or wallet not connected',
      }));
      return;
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState(prev => ({
          ...prev,
          permission,
          loading: false,
          error: 'Notification permission denied',
        }));
        return;
      }

      const registration = await navigator.serviceWorker.ready;

      if (!VAPID_PUBLIC_KEY) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: 'VAPID public key not configured',
        }));
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      if (!walletClient) {
        throw new Error('Wallet client required for signed push subscription');
      }

      const authHeaders = await createOwnerAuthHeaders(address, walletClient);
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          address,
        }),
      });

      setState(prev => ({
        ...prev,
        permission: 'granted',
        subscribed: true,
        subscription,
        loading: false,
      }));
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to subscribe to push notifications',
      }));
    }
  }, [state.supported, isConnected, address, walletClient]);

  const unsubscribe = useCallback(async () => {
    if (!state.subscription) return;

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      await state.subscription.unsubscribe();

      if (!address || !walletClient) {
        throw new Error('Wallet client required for signed push unsubscribe');
      }

      const authHeaders = await createOwnerAuthHeaders(address, walletClient);
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          endpoint: state.subscription.endpoint,
          address,
        }),
      });

      setState(prev => ({
        ...prev,
        subscribed: false,
        subscription: null,
        loading: false,
      }));
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to unsubscribe from push notifications',
      }));
    }
  }, [state.subscription, address, walletClient]);

  const sendTestNotification = useCallback(async () => {
    if (!state.subscription || !address || !walletClient) return;

    try {
      const authHeaders = await createOwnerAuthHeaders(address, walletClient);
      await fetch('/api/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          subscription: state.subscription.toJSON(),
          title: 'Kokonut Network',
          message: 'Push notifications are working!',
          link: '/notifications',
        }),
      });
    } catch (error) {
      console.error('Error sending test notification:', error);
    }
  }, [state.subscription, address, walletClient]);

  return {
    ...state,
    subscribe,
    unsubscribe,
    sendTestNotification,
  };
}

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer;
}
