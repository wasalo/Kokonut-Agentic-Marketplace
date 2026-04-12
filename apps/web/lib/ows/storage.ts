import { OWSVault, OWSWallet, OWSPolicy } from './types';
import { generateVaultId } from './encryption';

const STORAGE_KEYS = {
  VAULTS: 'ows_vaults',
  WALLETS: 'ows_wallets',
  POLICIES: 'ows_policies',
  ACTIVE_WALLET: 'ows_active_wallet',
};

export interface OWSStorageData {
  vaults: OWSVault[];
  wallets: OWSWallet[];
  policies: OWSPolicy[];
  activeWalletId: string | null;
}

export function getStorageData(): OWSStorageData {
  if (typeof window === 'undefined') {
    return { vaults: [], wallets: [], policies: [], activeWalletId: null };
  }

  try {
    const vaultsJson = localStorage.getItem(STORAGE_KEYS.VAULTS);
    const walletsJson = localStorage.getItem(STORAGE_KEYS.WALLETS);
    const policiesJson = localStorage.getItem(STORAGE_KEYS.POLICIES);
    const activeWalletId = localStorage.getItem(STORAGE_KEYS.ACTIVE_WALLET);

    return {
      vaults: vaultsJson ? JSON.parse(vaultsJson) : [],
      wallets: walletsJson ? JSON.parse(walletsJson) : [],
      policies: policiesJson ? JSON.parse(policiesJson) : [],
      activeWalletId: activeWalletId || null,
    };
  } catch (error) {
    console.error('[OWS Storage] Failed to read storage:', error);
    return { vaults: [], wallets: [], policies: [], activeWalletId: null };
  }
}

export function saveVault(vault: OWSVault): void {
  if (typeof window === 'undefined') return;

  const data = getStorageData();
  const existingIndex = data.vaults.findIndex((v) => v.id === vault.id);

  if (existingIndex >= 0) {
    data.vaults[existingIndex] = vault;
  } else {
    data.vaults.push(vault);
  }

  localStorage.setItem(STORAGE_KEYS.VAULTS, JSON.stringify(data.vaults));
}

export function getVault(vaultId: string): OWSVault | null {
  const data = getStorageData();
  return data.vaults.find((v) => v.id === vaultId) || null;
}

export function deleteVault(vaultId: string): void {
  if (typeof window === 'undefined') return;

  const data = getStorageData();
  data.vaults = data.vaults.filter((v) => v.id !== vaultId);
  localStorage.setItem(STORAGE_KEYS.VAULTS, JSON.stringify(data.vaults));
}

export function saveWallet(wallet: OWSWallet): void {
  if (typeof window === 'undefined') return;

  const data = getStorageData();
  const existingIndex = data.wallets.findIndex((w) => w.id === wallet.id);

  if (existingIndex >= 0) {
    data.wallets[existingIndex] = wallet;
  } else {
    data.wallets.push(wallet);
  }

  localStorage.setItem(STORAGE_KEYS.WALLETS, JSON.stringify(data.wallets));
}

export function getWallet(walletId: string): OWSWallet | null {
  const data = getStorageData();
  return data.wallets.find((w) => w.id === walletId) || null;
}

export function getAllWallets(): OWSWallet[] {
  const data = getStorageData();
  return data.wallets;
}

export function deleteWallet(walletId: string): void {
  if (typeof window === 'undefined') return;

  const data = getStorageData();
  data.wallets = data.wallets.filter((w) => w.id !== walletId);

  if (data.activeWalletId === walletId) {
    data.activeWalletId = data.wallets[0]?.id || null;
    localStorage.setItem(STORAGE_KEYS.ACTIVE_WALLET, data.activeWalletId || '');
  }

  localStorage.setItem(STORAGE_KEYS.WALLETS, JSON.stringify(data.wallets));
}

export function setActiveWallet(walletId: string | null): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.ACTIVE_WALLET, walletId || '');
}

export function getActiveWalletId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEYS.ACTIVE_WALLET);
}

export function savePolicy(policy: OWSPolicy): void {
  if (typeof window === 'undefined') return;

  const data = getStorageData();
  const existingIndex = data.policies.findIndex((p) => p.id === policy.id);

  if (existingIndex >= 0) {
    data.policies[existingIndex] = policy;
  } else {
    data.policies.push(policy);
  }

  localStorage.setItem(STORAGE_KEYS.POLICIES, JSON.stringify(data.policies));
}

export function getPolicy(policyId: string): OWSPolicy | null {
  const data = getStorageData();
  return data.policies.find((p) => p.id === policyId) || null;
}

export function getPoliciesForWallet(walletId: string): OWSPolicy[] {
  const data = getStorageData();
  return data.policies.filter((p) => p.walletId === walletId);
}

export function deletePolicy(policyId: string): void {
  if (typeof window === 'undefined') return;

  const data = getStorageData();
  data.policies = data.policies.filter((p) => p.id !== policyId);
  localStorage.setItem(STORAGE_KEYS.POLICIES, JSON.stringify(data.policies));
}

export function createNewVaultId(): string {
  return generateVaultId();
}

export function clearAllStorage(): void {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(STORAGE_KEYS.VAULTS);
  localStorage.removeItem(STORAGE_KEYS.WALLETS);
  localStorage.removeItem(STORAGE_KEYS.POLICIES);
  localStorage.removeItem(STORAGE_KEYS.ACTIVE_WALLET);
}