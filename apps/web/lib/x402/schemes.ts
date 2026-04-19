/**
 * x402 Payment Schemes - Exact and Upto with Hybrid Settlement
 *
 * exact: Fixed amount, immediate settle
 * upto: Authorization for max, settle based on actual usage
 * Hybrid: A for large amounts, B for small
 */

import {
  type X402SchemeV2,
  type PaymentPayload,
  type PaymentRequired,
  type SettlementResponse,
} from './types';
import { getChainConfig, type X402ChainConfig } from './chains';
import { createPublicClient, createWalletClient, http, parseAbi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const USDC_ABI = parseAbi([
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function transferFrom(address from, address to, uint256 amount) returns (bool)',
]);

export interface SchemeConfig {
  scheme: X402SchemeV2;
  amount: string;
  max?: string;
  thresholdForInstant?: string;
}

export interface SettlementConfig {
  instant: boolean;
  settleImmediately: boolean;
  batchDelay: number;
}

export const DEFAULT_SETTLEMENT_THRESHOLD = '5000000';

export const DEFAULT_BATCH_DELAY_MS = 5 * 60 * 1000;

export function getSettlementStrategy(
  amount: string,
  threshold: string = DEFAULT_SETTLEMENT_THRESHOLD
): SettlementConfig {
  return {
    instant: BigInt(amount) > BigInt(threshold),
    settleImmediately: BigInt(amount) > BigInt(threshold),
    batchDelay: BigInt(amount) > BigInt(threshold) ? 0 : DEFAULT_BATCH_DELAY_MS,
  };
}

export function createPaymentRequired(
  scheme: X402SchemeV2,
  amount: string,
  recipient: string,
  chainConfig: X402ChainConfig,
  max?: string,
  description?: string,
  expiresInMs: number = 15 * 60 * 1000
): PaymentRequired {
  return {
    scheme,
    amount,
    network: chainConfig.caip,
    token: chainConfig.usdc,
    recipient,
    max,
    expires: Date.now() + expiresInMs,
    description,
  };
}

export interface PaymentVerification {
  valid: boolean;
  error?: string;
  amount?: string;
  network?: string;
  token?: string;
  recipient?: string;
}

export async function verifyPaymentPayload(
  payload: PaymentPayload,
  expectedRecipient: string,
  expectedNetwork: string,
  expectedToken: string,
  expectedMinAmount?: string
): Promise<PaymentVerification> {
  if (payload.validUntil < Date.now()) {
    return { valid: false, error: 'Payment expired' };
  }

  if (payload.network !== expectedNetwork) {
    return { valid: false, error: 'Network mismatch' };
  }

  if (payload.token !== expectedToken) {
    return { valid: false, error: 'Token mismatch' };
  }

  if (payload.recipient !== expectedRecipient) {
    return { valid: false, error: 'Recipient mismatch' };
  }

  if (expectedMinAmount && BigInt(payload.amount) < BigInt(expectedMinAmount)) {
    return { valid: false, error: 'Insufficient payment amount' };
  }

  if (payload.scheme === 'upto' && payload.max) {
    if (BigInt(payload.max) < BigInt(expectedMinAmount || '0')) {
      return { valid: false, error: 'Authorization too small' };
    }
  }

  return {
    valid: true,
    amount: payload.amount,
    network: payload.network,
    token: payload.token,
    recipient: payload.recipient,
  };
}

export async function settleExactPayment(
  payload: PaymentPayload,
  chainConfig: X402ChainConfig,
  privateKey: string,
  onChain: boolean = true
): Promise<SettlementResponse> {
  if (!onChain) {
    return {
      status: 'completed',
      amount: payload.amount,
      settlementAmount: payload.amount,
    };
  }

  try {
    const account = privateKeyToAccount(privateKey as `0x${string}`);

    const walletClient = createWalletClient({
      account,
      chain: { id: chainConfig.chainId, name: chainConfig.name, nativeCurrency: chainConfig.nativeCurrency, rpcUrls: { default: { http: [chainConfig.rpc] } } },
      transport: http(chainConfig.rpc),
    });

    const tx = await walletClient.writeContract({
      address: chainConfig.usdc as `0x${string}`,
      abi: USDC_ABI,
      functionName: 'transfer',
      args: [payload.recipient as `0x${string}`, BigInt(payload.amount)],
    });

    return {
      status: 'completed',
      amount: payload.amount,
      transactionHash: tx,
      settlementAmount: payload.amount,
    };
  } catch (error) {
    return {
      status: 'failed',
      amount: payload.amount,
      error: error instanceof Error ? error.message : 'Settlement failed',
    };
  }
}

export interface PendingSettlement {
  id: string;
  payload: PaymentPayload;
  chainConfig: X402ChainConfig;
  actualAmount: string;
  status: 'pending' | 'settled' | 'failed';
  createdAt: number;
  settledAt?: number;
}

const pendingSettlements = new Map<string, PendingSettlement>();
const settlementTimers = new Map<string, NodeJS.Timeout>();

export async function initiateUptoSettlement(
  settlementId: string,
  payload: PaymentPayload,
  chainConfig: X402ChainConfig,
  privateKey: string,
  onChain: boolean = true
): Promise<SettlementResponse> {
  const strategy = getSettlementStrategy(payload.max || payload.amount);

  if (strategy.instant) {
    return settleExactPayment(payload, chainConfig, privateKey, onChain);
  }

  pendingSettlements.set(settlementId, {
    id: settlementId,
    payload,
    chainConfig,
    actualAmount: '0',
    status: 'pending',
    createdAt: Date.now(),
  });

  const timer = setTimeout(async () => {
    const pending = pendingSettlements.get(settlementId);
    if (pending && pending.status === 'pending') {
      await finalizeUptoSettlement(settlementId, pending.payload.max || '0', chainConfig, privateKey, onChain);
    }
  }, strategy.batchDelay);

  settlementTimers.set(settlementId, timer);

  return {
    status: 'pending',
    amount: payload.max || payload.amount,
  };
}

export async function finalizeUptoSettlement(
  settlementId: string,
  actualAmount: string,
  chainConfig: X402ChainConfig,
  privateKey: string,
  onChain: boolean = true
): Promise<SettlementResponse> {
  const pending = pendingSettlements.get(settlementId);

  if (!pending) {
    return {
      status: 'failed',
      amount: actualAmount,
      error: 'Settlement not found',
    };
  }

  if (pending.status !== 'pending') {
    return {
      status: pending.status === 'settled' ? 'completed' : 'failed',
      amount: pending.actualAmount,
      transactionHash: (pending as any).transactionHash,
    };
  }

  if (actualAmount === '0') {
    pending.status = 'settled';
    pendingSettlements.set(settlementId, pending);
    return {
      status: 'completed',
      amount: '0',
      settlementAmount: '0',
    };
  }

  try {
    if (onChain) {
      const account = privateKeyToAccount(privateKey as `0x${string}`);

      const walletClient = createWalletClient({
        account,
        chain: { id: chainConfig.chainId, name: chainConfig.name, nativeCurrency: chainConfig.nativeCurrency, rpcUrls: { default: { http: [chainConfig.rpc] } } },
        transport: http(chainConfig.rpc),
      });

      const tx = await walletClient.writeContract({
        address: chainConfig.usdc as `0x${string}`,
        abi: USDC_ABI,
        functionName: 'transfer',
        args: [pending.payload.recipient as `0x${string}`, BigInt(actualAmount)],
      });

      pending.status = 'settled';
      pending.actualAmount = actualAmount;
      (pending as any).transactionHash = tx;
      pendingSettlements.set(settlementId, pending);
    } else {
      pending.status = 'settled';
      pending.actualAmount = actualAmount;
      pendingSettlements.set(settlementId, pending);
    }

    const timer = settlementTimers.get(settlementId);
    if (timer) {
      clearTimeout(timer);
      settlementTimers.delete(settlementId);
    }

    return {
      status: 'completed',
      amount: pending.payload.max || pending.payload.amount,
      settlementAmount: actualAmount,
      transactionHash: (pending as any).transactionHash,
    };
  } catch (error) {
    pending.status = 'failed';
    pendingSettlements.set(settlementId, pending);

    return {
      status: 'failed',
      amount: actualAmount,
      error: error instanceof Error ? error.message : 'Settlement failed',
    };
  }
}

export function getPendingSettlement(settlementId: string): PendingSettlement | undefined {
  return pendingSettlements.get(settlementId);
}

export function cancelPendingSettlement(settlementId: string): boolean {
  const pending = pendingSettlements.get(settlementId);
  if (pending && pending.status === 'pending') {
    pending.status = 'failed';
    pendingSettlements.set(settlementId, pending);

    const timer = settlementTimers.get(settlementId);
    if (timer) {
      clearTimeout(timer);
      settlementTimers.delete(settlementId);
    }
    return true;
  }
  return false;
}