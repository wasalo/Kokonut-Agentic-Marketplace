import {
  OWSWallet,
  OWSVault,
  OWSPolicy,
  OWSChain,
  OWSWalletCreateOptions,
  OWSWalletImportOptions,
  OWSSignRequest,
  OWSSignResult,
  OWSImportData,
  OWSError,
  OWSErrorCode,
  OWS_POLICY_TEMPLATES,
  OWSCreateWalletResult,
} from './types';
import { encryptSeed, decryptSeed, validatePassphrase, generateVaultId } from './encryption';
import { generateSeedPhrase, validateSeedPhrase, deriveWalletFromSeed, importFromPrivateKey, importFromJson } from './derivation';
import * as storage from './storage';

export class OWSClient {
  private activeWalletId: string | null = null;

  constructor() {
    this.loadActiveWallet();
  }

  private loadActiveWallet(): void {
    const id = storage.getActiveWalletId();
    if (id) {
      const wallet = storage.getWallet(id);
      if (wallet) {
        this.activeWalletId = id;
      }
    }
  }

  async createWallet(options: OWSWalletCreateOptions): Promise<OWSCreateWalletResult> {
    if (!validatePassphrase(options.passphrase)) {
      throw createError('INVALID_PASSPHRASE', 'Passphrase must be 8-128 characters');
    }

    const seedPhrase = await generateSeedPhrase();
    const { privateKey, address } = await deriveWalletFromSeed(seedPhrase, options.chain);

    const { encryptedSeed, salt, iv } = await encryptSeed(seedPhrase, options.passphrase);

    const vault: OWSVault = {
      id: generateVaultId(),
      encryptedSeed,
      salt,
      iv,
      version: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    storage.saveVault(vault);

    const wallet: OWSWallet = {
      id: crypto.randomUUID(),
      name: options.name,
      type: 'generated',
      address,
      chain: options.chain,
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
      policyId: options.policyId,
      metadata: { vaultId: vault.id },
    };
    storage.saveWallet(wallet);

    if (!this.activeWalletId) {
      this.activeWalletId = wallet.id;
      storage.setActiveWallet(wallet.id);
    }

    return { wallet, seedPhrase };
  }

  async importWallet(options: OWSWalletImportOptions): Promise<OWSWallet> {
    if (!validatePassphrase(options.passphrase)) {
      throw createError('INVALID_PASSPHRASE', 'Passphrase must be 8-128 characters');
    }

    let privateKey: string;
    let address: string;
    const importType = options.importData.type;

    switch (importType) {
      case 'seed':
        if (!validateSeedPhrase(options.importData.seed)) {
          throw createError('INVALID_SEED', 'Invalid seed phrase');
        }
        const derived = await deriveWalletFromSeed(options.importData.seed, options.chain);
        privateKey = derived.privateKey;
        address = derived.address;
        break;

      case 'privateKey':
        const imported = await importFromPrivateKey(options.importData.privateKey, options.chain);
        privateKey = imported.privateKey;
        address = imported.address;
        break;

      case 'json':
        const jsonImported = await importFromJson(options.importData.json, options.importData.password, options.chain);
        privateKey = jsonImported.privateKey;
        address = jsonImported.address;
        break;

      default:
        throw createError('INVALID_SEED', 'Unknown import type');
    }

    const seedToEncrypt = importType === 'seed' ? options.importData.seed : privateKey;
    const { encryptedSeed, salt, iv } = await encryptSeed(seedToEncrypt, options.passphrase);

    const vault: OWSVault = {
      id: generateVaultId(),
      encryptedSeed,
      salt,
      iv,
      version: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    storage.saveVault(vault);

    const wallet: OWSWallet = {
      id: crypto.randomUUID(),
      name: options.name,
      type: 'imported',
      address,
      chain: options.chain,
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
      policyId: options.policyId,
      metadata: { vaultId: vault.id },
    };
    storage.saveWallet(wallet);

    if (!this.activeWalletId) {
      this.activeWalletId = wallet.id;
      storage.setActiveWallet(wallet.id);
    }

    return wallet;
  }

  async signTransaction(request: OWSSignRequest): Promise<OWSSignResult> {
    const wallet = storage.getWallet(request.walletId);
    if (!wallet) {
      throw createError('WALLET_NOT_FOUND', 'Wallet not found');
    }

    const vaultId = wallet.metadata?.vaultId as string;
    if (!vaultId) {
      throw createError('WALLET_NOT_FOUND', 'Vault not associated with wallet');
    }

    const vault = storage.getVault(vaultId);
    if (!vault) {
      throw createError('WALLET_NOT_FOUND', 'Vault not found');
    }

    const policy = wallet.policyId ? storage.getPolicy(wallet.policyId) : null;
    if (policy) {
      this.enforcePolicy(policy, request, wallet);
    }

    return { signature: '0xplaceholder', transactionHash: undefined };
  }

  private enforcePolicy(policy: OWSPolicy, request: OWSSignRequest, wallet: OWSWallet): void {
    for (const rule of policy.rules) {
      switch (rule.type) {
        case 'chain-restriction':
          if (!rule.allowedChains.includes(request.chain)) {
            throw createError('POLICY_DENIED', `Chain ${request.chain} not allowed by policy`);
          }
          break;

        case 'spending-limit':
          if (request.value && rule.perTransactionLimit && request.value > rule.perTransactionLimit) {
            throw createError('POLICY_DENIED', 'Transaction exceeds per-transaction limit');
          }
          break;

        case 'contract-whitelist':
          if (rule.allowedContracts.length > 0 && !rule.allowedContracts.includes(request.to)) {
            throw createError('POLICY_DENIED', 'Contract not whitelisted');
          }
          break;

        case 'time-lock':
          const now = new Date();
          const hour = now.getHours();
          const day = now.getDay();

          if (rule.activeHoursStart !== undefined && rule.activeHoursEnd !== undefined) {
            if (hour < rule.activeHoursStart || hour > rule.activeHoursEnd) {
              throw createError('POLICY_DENIED', 'Outside allowed hours');
            }
          }

          if (rule.activeDays && !rule.activeDays.includes(day)) {
            throw createError('POLICY_DENIED', 'Today is not an allowed day');
          }
          break;
      }
    }
  }

  getWallets(): OWSWallet[] {
    return storage.getAllWallets();
  }

  getWallet(walletId: string): OWSWallet | null {
    return storage.getWallet(walletId);
  }

  getActiveWallet(): OWSWallet | null {
    if (!this.activeWalletId) return null;
    return storage.getWallet(this.activeWalletId);
  }

  setActiveWallet(walletId: string): void {
    const wallet = storage.getWallet(walletId);
    if (!wallet) {
      throw createError('WALLET_NOT_FOUND', 'Wallet not found');
    }
    this.activeWalletId = walletId;
    storage.setActiveWallet(walletId);
  }

  deleteWallet(walletId: string): void {
    const wallet = storage.getWallet(walletId);
    if (wallet && wallet.metadata?.vaultId) {
      storage.deleteVault(wallet.metadata.vaultId as string);
    }

    if (wallet?.policyId) {
      storage.deletePolicy(wallet.policyId);
    }

    storage.deleteWallet(walletId);

    if (this.activeWalletId === walletId) {
      const wallets = storage.getAllWallets();
      this.activeWalletId = wallets[0]?.id || null;
      storage.setActiveWallet(this.activeWalletId);
    }
  }

  getPolicies(): OWSPolicy[] {
    const data = storage.getStorageData();
    return data.policies;
  }

  createPolicy(walletId: string, name: string, templateId?: string): OWSPolicy {
    const rules = templateId
      ? OWS_POLICY_TEMPLATES.find((t) => t.id === templateId)?.rules || []
      : [];

    const policy: OWSPolicy = {
      id: crypto.randomUUID(),
      walletId,
      name,
      rules,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    storage.savePolicy(policy);
    return policy;
  }

  updatePolicy(policyId: string, name: string, rules: OWSPolicy['rules']): OWSPolicy | null {
    const policy = storage.getPolicy(policyId);
    if (!policy) return null;

    policy.name = name;
    policy.rules = rules;
    policy.updatedAt = Date.now();

    storage.savePolicy(policy);
    return policy;
  }

  deletePolicy(policyId: string): void {
    storage.deletePolicy(policyId);
  }

  assignPolicy(walletId: string, policyId: string): OWSWallet | null {
    const wallet = storage.getWallet(walletId);
    if (!wallet) return null;

    const policy = storage.getPolicy(policyId);
    if (!policy || policy.walletId !== walletId) return null;

    wallet.policyId = policyId;
    wallet.lastUsedAt = Date.now();
    storage.saveWallet(wallet);

    return wallet;
  }

  getPolicyTemplates(): typeof OWS_POLICY_TEMPLATES {
    return OWS_POLICY_TEMPLATES;
  }
}

function createError(code: OWSErrorCode, message: string): OWSError {
  return { code, message };
}

export const owsClient = new OWSClient();