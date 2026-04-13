'use client';

import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import type { EmailPreferences, EmailDelivery } from './types';

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

interface EmailState {
  preferences: Record<string, EmailPreferences>;
  deliveries: EmailDelivery[];

  setPreferences: (address: string, preferences: Partial<EmailPreferences>) => void;
  getPreferences: (address: string) => EmailPreferences | undefined;
  isEnabled: (address: string) => boolean;

  addDelivery: (delivery: Omit<EmailDelivery, 'id'>) => void;
  updateDelivery: (id: string, update: Partial<EmailDelivery>) => void;
  getDeliveries: (address: string) => EmailDelivery[];
}

function generateId(): string {
  return `em_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

const defaultPreferences: Omit<EmailPreferences, 'email'> = {
  enabled: true,
  types: {
    payment: true,
    job: true,
    proposal: true,
    weekly_digest: true,
    marketing: false,
  },
  frequency: 'instant',
};

export const useEmailStore = create<EmailState>()(
  persist(
    (set, get) => ({
      preferences: {},
      deliveries: [],

      setPreferences: (address, prefs) => {
        const normalizedAddress = address.toLowerCase();
        const current = get().preferences[normalizedAddress] || {
          email: '',
          ...defaultPreferences,
        };

        set(state => ({
          preferences: {
            ...state.preferences,
            [normalizedAddress]: {
              ...current,
              ...prefs,
            },
          },
        }));
      },

      getPreferences: address => {
        return get().preferences[address.toLowerCase()];
      },

      isEnabled: address => {
        const prefs = get().preferences[address.toLowerCase()];
        return prefs?.enabled ?? false;
      },

      addDelivery: delivery => {
        const newDelivery: EmailDelivery = {
          ...delivery,
          id: generateId(),
        };

        set(state => ({
          deliveries: [...state.deliveries, newDelivery],
        }));
      },

      updateDelivery: (id, update) => {
        set(state => ({
          deliveries: state.deliveries.map(d => (d.id === id ? { ...d, ...update } : d)),
        }));
      },

      getDeliveries: address => {
        return get().deliveries.filter(d => d.to.toLowerCase() === address.toLowerCase());
      },
    }),
    {
      name: 'kokonut_emails',
      storage: createJSONStorage(() => getBrowserStorage()),
      partialize: state => ({
        preferences: state.preferences,
      }),
    }
  )
);
