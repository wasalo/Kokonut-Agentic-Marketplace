import { OWSWallet, OWSSignRequest, OWSChain, OWS_RPC_URLS } from './types';
import { policyEngine, PolicyCheckResult } from './policy-engine';
import * as storage from './storage';
import { getWalletBalances, estimateTransactionGas, getGasPrice } from './rpc-client';

export interface SignOptions {
  walletId: string;
  to: `0x${string}`;
  value?: bigint;
  data?: string;
  chain: OWSChain;
  metadata?: Record<string, unknown>;
}

export interface SignResult {
  success: boolean;
  signature?: string;
  transactionHash?: string;
  policyCheck?: PolicyCheckResult;
  error?: string;
}

export class OWSSigner {
  async sign(options: SignOptions): Promise<SignResult> {
    const wallet = storage.getWallet(options.walletId);
    if (!wallet) {
      return { success: false, error: 'Wallet not found' };
    }

    if (wallet.chain !== options.chain) {
      return { success: false, error: `Wallet chain (${wallet.chain}) does not match requested chain (${options.chain})` };
    }

    if (wallet.policyId) {
      const policy = storage.getPolicy(wallet.policyId);
      if (policy) {
        policyEngine.registerPolicy(policy);
        const policyCheck = policyEngine.canSign(wallet.policyId, {
          walletId: options.walletId,
          to: options.to,
          value: options.value,
          data: options.data,
          chain: options.chain,
          metadata: options.metadata,
        });

        if (!policyCheck.allowed) {
          return { success: false, policyCheck, error: policyCheck.reason };
        }

        return { success: true, policyCheck, signature: '0xplaceholder', transactionHash: '0xplaceholder' };
      }
    }

    return { success: true, signature: '0xplaceholder', transactionHash: '0xplaceholder' };
  }

  async signMessage(walletId: string, message: string): Promise<SignResult> {
    const wallet = storage.getWallet(walletId);
    if (!wallet) {
      return { success: false, error: 'Wallet not found' };
    }

    return { success: true, signature: '0xplaceholder' };
  }

  async signTypedData(walletId: string, domain: unknown, types: unknown, message: unknown): Promise<SignResult> {
    const wallet = storage.getWallet(walletId);
    if (!wallet) {
      return { success: false, error: 'Wallet not found' };
    }

    return { success: true, signature: '0xplaceholder' };
  }

  async estimateGas(options: SignOptions): Promise<bigint> {
    const wallet = storage.getWallet(options.walletId);
    if (!wallet) {
      return 21000n;
    }

    try {
      return await estimateTransactionGas(
        wallet.address as `0x${string}`,
        options.to,
        options.chain,
        options.value,
        options.data
      );
    } catch {
      return 21000n;
    }
  }

  async estimateGasPrice(chain: OWSChain): Promise<bigint> {
    try {
      return await getGasPrice(chain);
    } catch {
      return 20000000000n;
    }
  }

  async getBalance(walletId: string): Promise<{ native: bigint; usdc?: bigint }> {
    const wallet = storage.getWallet(walletId);
    if (!wallet) {
      return { native: 0n };
    }

    try {
      const balances = await getWalletBalances(wallet.address as `0x${string}`, wallet.chain);
      return {
        native: balances.native,
        usdc: balances.tokens['0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'],
      };
    } catch (error) {
      console.error('[OWS Signer] Error fetching balance:', error);
      return { native: 0n };
    }
  }

  async sendTransaction(options: SignOptions): Promise<SignResult> {
    return this.sign(options);
  }
}

export const owsSigner = new OWSSigner();