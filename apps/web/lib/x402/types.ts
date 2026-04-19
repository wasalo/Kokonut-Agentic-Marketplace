/**
 * x402 Payment Types
 *
 * Based on x402 V2 specification
 * https://docs.x402.org
 */

export type X402Scheme = 'exact' | 'upto';

export type X402SchemeV2 = 'exact' | 'upto';

export interface PaymentRequired {
  scheme: X402SchemeV2;
  amount: string;
  network: string;
  token: string;
  recipient: string;
  max?: string;
  expires?: number;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentPayload {
  scheme: X402SchemeV2;
  amount: string;
  network: string;
  token: string;
  recipient: string;
  max?: string;
  validUntil: number;
  signature: string;
  facilitator?: string;
}

export interface SettlementResponse {
  status: 'completed' | 'pending' | 'failed';
  amount: string;
  transactionHash?: string;
  settlementAmount?: string;
  fee?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentRequirement {
  scheme: X402SchemeV2;
  amount: string;
  max?: string;
  network: string;
  token: string;
  recipient: string;
  expires: number;
  description?: string;
}

export interface X402Headers {
  'PAYMENT-REQUIRED'?: string;
  'PAYMENT-SIGNATURE'?: string;
  'PAYMENT-RESPONSE'?: string;
}

export interface X402Error {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export const X402_ERROR_CODES = {
  INVALID_PAYLOAD: 'INVALID_PAYLOAD',
  EXPIRED: 'EXPIRED',
  INSUFFICIENT_PAYMENT: 'INSUFFICIENT_PAYMENT',
  VERIFICATION_FAILED: 'VERIFICATION_FAILED',
  SETTLEMENT_FAILED: 'SETTLEMENT_FAILED',
  NETWORK_MISMATCH: 'NETWORK_MISMATCH',
  TOKEN_MISMATCH: 'TOKEN_MISMATCH',
  RECIPIENT_MISMATCH: 'RECIPIENT_MISMATCH',
  INVALID_SIGNATURE: 'INVALID_SIGNATURE',
  FACILITATOR_ERROR: 'FACILITATOR_ERROR',
  PAYMENT_REQUIRED: 'PAYMENT_REQUIRED',
  INVALID_PAYMENT: 'INVALID_PAYMENT',
} as const;

export interface X402RouteConfig {
  path: string;
  scheme: X402SchemeV2;
  amount: string;
  max?: string;
  chain?: string;
  description?: string;
  tierExempt?: string[];
}

export const X402_ERROR_MESSAGES = X402_ERROR_CODES;

export function formatX402Amount(amount: string | number, decimals: number = 6): string {
  const num = typeof amount === 'string' ? parseInt(amount) : amount;
  return (num / Math.pow(10, decimals)).toFixed(decimals === 6 ? 2 : 4);
}

export type X402ErrorCode = (typeof X402_ERROR_CODES)[keyof typeof X402_ERROR_CODES];

export function encodePaymentRequired(req: PaymentRequired): string {
  return Buffer.from(JSON.stringify(req)).toString('base64');
}

export function decodePaymentRequired(encoded: string): PaymentRequired | null {
  try {
    return JSON.parse(Buffer.from(encoded, 'base64').toString()) as PaymentRequired;
  } catch {
    return null;
  }
}

export function encodePaymentPayload(payload: PaymentPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

export function decodePaymentPayload(encoded: string): PaymentPayload | null {
  try {
    return JSON.parse(Buffer.from(encoded, 'base64').toString()) as PaymentPayload;
  } catch {
    return null;
  }
}

export function encodeSettlementResponse(resp: SettlementResponse): string {
  return Buffer.from(JSON.stringify(resp)).toString('base64');
}

export function decodeSettlementResponse(encoded: string): SettlementResponse | null {
  try {
    return JSON.parse(Buffer.from(encoded, 'base64').toString()) as SettlementResponse;
  } catch {
    return null;
  }
}