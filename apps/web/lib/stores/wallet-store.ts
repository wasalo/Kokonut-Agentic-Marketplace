'use client';

import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { OWSWallet, OWSPolicy } from '@/lib/ows/types';
import { owsClient } from '@/lib/ows/client';

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

interface WalletState {
  wallets: OWSWallet[];
  activeWallet: OWSWallet | null;
  policies: OWSPolicy[];
  isLoading: boolean;
  error: string | null;

  loadWallets: () => void;
  createWallet: (name: string, chain: OWSWallet['chain'], passphrase: string, policyId?: string) => Promise<{ wallet: OWSWallet; seedPhrase: string }>;
  importWallet: (name: string, chain: OWSWallet['chain'], passphrase: string, importData: { type: 'seed'; seed: string } | { type: 'privateKey'; privateKey: string } | { type: 'json'; json: string; password: string }, policyId?: string) => Promise<OWSWallet>;
  deleteWallet: (walletId: string) => void;
  setActiveWallet: (walletId: string) => void;
  createPolicy: (walletId: string, name: string, templateId?: string) => OWSPolicy;
  updatePolicy: (policyId: string, name: string, rules: OWSPolicy['rules']) => void;
  deletePolicy: (policyId: string) => void;
  assignPolicy: (walletId: string, policyId: string) => void;
  clearError: () => void;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      wallets: [],
      activeWallet: null,
      policies: [],
      isLoading: false,
      error: null,

      loadWallets: () => {
        try {
          const wallets = owsClient.getWallets();
          const activeWallet = owsClient.getActiveWallet();
          const policies = owsClient.getPolicies();
          set({ wallets, activeWallet, policies });
        } catch (error) {
          set({ error: (error as Error).message });
        }
      },

      createWallet: async (name, chain, passphrase, policyId) => {
        set({ isLoading: true, error: null });
        try {
          const result = await owsClient.createWallet({ name, chain, passphrase, policyId });
          const wallets = owsClient.getWallets();
          const activeWallet = owsClient.getActiveWallet();
          const policies = owsClient.getPolicies();
          set({ wallets, activeWallet, policies, isLoading: false });
          return result;
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
          throw error;
        }
      },

      importWallet: async (name, chain, passphrase, importData, policyId) => {
        set({ isLoading: true, error: null });
        try {
          const wallet = await owsClient.importWallet({ name, chain, passphrase, importData, policyId });
          const wallets = owsClient.getWallets();
          const activeWallet = owsClient.getActiveWallet();
          const policies = owsClient.getPolicies();
          set({ wallets, activeWallet, policies, isLoading: false });
          return wallet;
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
          throw error;
        }
      },

      deleteWallet: (walletId) => {
        try {
          owsClient.deleteWallet(walletId);
          const wallets = owsClient.getWallets();
          const activeWallet = owsClient.getActiveWallet();
          set({ wallets, activeWallet });
        } catch (error) {
          set({ error: (error as Error).message });
        }
      },

      setActiveWallet: (walletId) => {
        try {
          owsClient.setActiveWallet(walletId);
          const activeWallet = owsClient.getActiveWallet();
          set({ activeWallet });
        } catch (error) {
          set({ error: (error as Error).message });
        }
      },

      createPolicy: (walletId, name, templateId) => {
        const policy = owsClient.createPolicy(walletId, name, templateId);
        const policies = owsClient.getPolicies();
        set({ policies });
        return policy;
      },

      updatePolicy: (policyId, name, rules) => {
        owsClient.updatePolicy(policyId, name, rules);
        const policies = owsClient.getPolicies();
        set({ policies });
      },

      deletePolicy: (policyId) => {
        owsClient.deletePolicy(policyId);
        const policies = owsClient.getPolicies();
        set({ policies });
      },

      assignPolicy: (walletId, policyId) => {
        owsClient.assignPolicy(walletId, policyId);
        const wallets = owsClient.getWallets();
        const activeWallet = owsClient.getActiveWallet();
        set({ wallets, activeWallet });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'kokonut_wallet_store',
      storage: createJSONStorage(() => getBrowserStorage()),
      partialize: () => ({}),
    }
  )
);