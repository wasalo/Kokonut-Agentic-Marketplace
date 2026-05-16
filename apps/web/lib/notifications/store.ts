'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Notification, NotificationPreferences } from './types';

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

function cleanup(notifications: Notification[]): Notification[] {
  const now = Date.now();
  const cutoffTime = now - NOTIFICATION_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  return notifications
    .filter(n => n.timestamp > cutoffTime || n.persistent)
    .slice(0, MAX_NOTIFICATIONS);
}

function countUnread(notifications: Notification[]): number {
  return notifications.filter(n => !n.read).length;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      notifications: [],
      unreadCount: 0,
      preferences: defaultPreferences,

      addNotification: notification => {
        const now = Date.now();
        const newNotification: Notification = {
          ...notification,
          id: generateId(),
          timestamp: now,
          read: false,
        };

        set(state => {
          const notifications = cleanup([newNotification, ...state.notifications]);
          return { notifications, unreadCount: countUnread(notifications) };
        });
      },

      markAsRead: id => {
        set(state => {
          const notifications = state.notifications.map(n =>
            n.id === id ? { ...n, read: true } : n
          );
          return { notifications, unreadCount: countUnread(notifications) };
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
          return { notifications, unreadCount: countUnread(notifications) };
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
        set(state => {
          const notifications = cleanup(state.notifications);
          return { notifications, unreadCount: countUnread(notifications) };
        });
      },
    }),
    {
      name: 'kokonut-notifications',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        notifications: state.notifications.slice(0, 50),
        preferences: state.preferences,
      }),
    }
  )
);
