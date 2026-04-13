'use client';

import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import type { Notification, NotificationPreferences } from './types';

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

const MAX_NOTIFICATIONS = 100;
const NOTIFICATION_RETENTION_DAYS = 30;

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  preferences: NotificationPreferences;

  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  updatePreferences: (preferences: Partial<NotificationPreferences>) => void;
  cleanupOldNotifications: () => void;
}

const defaultPreferences: NotificationPreferences = {
  email: true,
  push: false,
  inApp: true,
  types: {
    job: true,
    service: true,
    proposal: true,
    payment: true,
    system: true,
  },
};

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      notifications: [],
      unreadCount: 0,
      preferences: defaultPreferences,

      addNotification: notification => {
        const now = Date.now();
        const cutoffTime = now - NOTIFICATION_RETENTION_DAYS * 24 * 60 * 60 * 1000;

        const newNotification: Notification = {
          ...notification,
          id: generateId(),
          timestamp: now,
          read: false,
        };

        set(state => {
          let notifications = [newNotification, ...state.notifications];

          notifications = notifications.filter(n => n.timestamp > cutoffTime || n.persistent);

          if (notifications.length > MAX_NOTIFICATIONS) {
            notifications = notifications.slice(0, MAX_NOTIFICATIONS);
          }

          return {
            notifications,
            unreadCount: notifications.filter(n => !n.read).length,
          };
        });
      },

      markAsRead: id => {
        set(state => {
          const notifications = state.notifications.map(n =>
            n.id === id ? { ...n, read: true } : n
          );
          return {
            notifications,
            unreadCount: notifications.filter(n => !n.read).length,
          };
        });
      },

      markAllAsRead: () => {
        set(state => ({
          notifications: state.notifications.map(n => ({ ...n, read: true })),
          unreadCount: 0,
        }));
      },

      removeNotification: id => {
        set(state => {
          const notifications = state.notifications.filter(n => n.id !== id);
          return {
            notifications,
            unreadCount: notifications.filter(n => !n.read).length,
          };
        });
      },

      clearAll: () => {
        set({ notifications: [], unreadCount: 0 });
      },

      updatePreferences: preferences => {
        set(state => ({
          preferences: { ...state.preferences, ...preferences },
        }));
      },

      cleanupOldNotifications: () => {
        const now = Date.now();
        const cutoffTime = now - NOTIFICATION_RETENTION_DAYS * 24 * 60 * 60 * 1000;

        set(state => {
          const notifications = state.notifications.filter(
            n => n.timestamp > cutoffTime || n.persistent
          );
          return {
            notifications,
            unreadCount: notifications.filter(n => !n.read).length,
          };
        });
      },
    }),
    {
      name: 'kokonut_notifications',
      storage: createJSONStorage(() => getBrowserStorage()),
      partialize: state => ({
        notifications: state.notifications,
        unreadCount: state.unreadCount,
        preferences: state.preferences,
      }),
    }
  )
);
