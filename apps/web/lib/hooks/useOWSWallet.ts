import { useEffect } from 'react';
import { useWalletStore } from '@/lib/stores/wallet-store';
import { OWSWallet, OWSPolicy, OWS_POLICY_TEMPLATES, OWSPolicyTemplate } from '@/lib/ows/types';

export function useOWSWallet() {
  const {
    wallets,
    activeWallet,
    policies,
    isLoading,
    error,
    loadWallets,
    createWallet,
    importWallet,
    deleteWallet,
    setActiveWallet,
    createPolicy,
    updatePolicy,
    deletePolicy,
    assignPolicy,
    clearError,
  } = useWalletStore();

  useEffect(() => {
    loadWallets();
  }, [loadWallets]);

  const getPolicy = (policyId: string): OWSPolicy | undefined => {
    return policies.find((p) => p.id === policyId);
  };

  const getActivePolicy = (): OWSPolicy | undefined => {
    if (!activeWallet?.policyId) return undefined;
    return policies.find((p) => p.id === activeWallet.policyId);
  };

  const getPolicyTemplates = (): OWSPolicyTemplate[] => {
    return OWS_POLICY_TEMPLATES;
  };

  return {
    wallets,
    activeWallet,
    policies,
    isLoading,
    error,
    loadWallets,
    createWallet,
    importWallet,
    deleteWallet,
    setActiveWallet,
    createPolicy,
    updatePolicy,
    deletePolicy,
    assignPolicy,
    clearError,
    getPolicy,
    getActivePolicy,
    getPolicyTemplates,
  };
}

export function useWalletById(walletId: string): OWSWallet | null {
  const { wallets } = useWalletStore();
  return wallets.find((w) => w.id === walletId) || null;
}

export function useWalletByAddress(address: string): OWSWallet | null {
  const { wallets } = useWalletStore();
  return wallets.find((w) => w.address.toLowerCase() === address.toLowerCase()) || null;
}