/**
 * x402 Middleware for Next.js Route Protection
 *
 * Integrates with existing API tier system
 * Checks payment before processing request
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  type PaymentRequired,
  type PaymentPayload,
  type SettlementResponse,
  X402_ERROR_CODES,
  encodePaymentRequired,
  decodePaymentRequired,
  encodePaymentPayload,
  decodePaymentPayload,
  encodeSettlementResponse,
  type X402SchemeV2,
} from './types';
import { getChainConfig, getDefaultChain, DEFAULT_CAIP, type X402ChainConfig } from './chains';
import { getTierFromApiKey, type ApiKeyTier, API_KEY_TIERS } from '../api-keys';

export interface X402RouteConfig {
  path: string;
  scheme: X402SchemeV2;
  amount: string;
  max?: string;
  chain?: string;
  description?: string;
  tierExempt?: ApiKeyTier[];
}

export const DEFAULT_RECIPIENT = process.env.X402_RECIPIENT_ADDRESS || process.env.OWNER_ADDRESS || '';

const X402_ROUTE_CONFIGS: X402RouteConfig[] = [
  { path: '/api/webhooks', scheme: 'exact', amount: '1000', description: 'Register webhook' },
  { path: '/api/webhooks/[id]', scheme: 'exact', amount: '1000', description: 'Update webhook' },
  { path: '/api/webhooks/trigger', scheme: 'exact', amount: '5000', description: 'Trigger webhook' },
  { path: '/api/push/subscribe', scheme: 'exact', amount: '1000', description: 'Subscribe to push' },
  { path: '/api/push/unsubscribe', scheme: 'exact', amount: '1000', description: 'Unsubscribe' },
  { path: '/api/push/send', scheme: 'exact', amount: '5000', description: 'Send push notification' },
  { path: '/api/emails/send', scheme: 'exact', amount: '10000', description: 'Send email' },
  { path: '/api/emails/preferences', scheme: 'exact', amount: '1000', description: 'Update email prefs' },
  { path: '/api/cron/events', scheme: 'exact', amount: '1000', description: 'Event watcher' },
  { path: '/api/cron/digest', scheme: 'exact', amount: '5000', description: 'Weekly digest' },
  { path: '/api/health', scheme: 'exact', amount: '0', description: 'Health check', tierExempt: ['free', 'anonymous'] },
  { path: '/api/swagger', scheme: 'exact', amount: '0', description: 'Swagger docs', tierExempt: ['free', 'anonymous'] },
  { path: '/api/csp-report', scheme: 'exact', amount: '1000', description: 'CSP report' },
  { path: '/api/agents', scheme: 'upto', amount: '100000', max: '500000', description: 'AI agent services' },
  { path: '/api/agents/analyze', scheme: 'upto', amount: '100000', max: '500000', description: 'Agent analysis' },
  { path: '/api/analysis', scheme: 'upto', amount: '100000', max: '500000', description: 'Data analysis' },
  { path: '/api/verification', scheme: 'upto', amount: '100000', max: '500000', description: 'Verification services' },
  { path: '/api/mcp', scheme: 'upto', amount: '50000', max: '500000', description: 'MCP server' },
];

const tierPricing: Record<ApiKeyTier, { exact: string; upto: string }> = {
  anonymous: { exact: '1000', upto: '10000' },
  free: { exact: '1000', upto: '10000' },
  basic: { exact: '5000', upto: '50000' },
  pro: { exact: '10000', upto: '100000' },
  enterprise: { exact: '0', upto: '0' },
};

function getPricingForTier(tier: ApiKeyTier): { exact: string; upto: string } {
  return tierPricing[tier];
}

function getMatchingConfig(pathname: string): X402RouteConfig | undefined {
  for (const config of X402_ROUTE_CONFIGS) {
    if (pathname.startsWith(config.path.replace('/[id]', ''))) {
      return config;
    }
  }
  return undefined;
}

export function createPaymentRequired(
  config: X402RouteConfig,
  tier: ApiKeyTier,
  chainConfig: X402ChainConfig,
  recipient: string = DEFAULT_RECIPIENT
): PaymentRequired {
  const pricing = getPricingForTier(tier);
  const amount = config.scheme === 'upto' ? (config.max || pricing.upto) : (config.amount || pricing.exact);
  const max = config.scheme === 'upto' ? config.max : undefined;

  return {
    scheme: config.scheme,
    amount,
    network: chainConfig.caip,
    token: chainConfig.usdc,
    recipient,
    max,
    expires: Date.now() + 15 * 60 * 1000,
    description: config.description,
  };
}

export async function verifyPayment(
  paymentHeader: string | null,
  expectedRecipient: string,
  expectedNetwork: string,
  expectedToken: string,
  expectedMinAmount?: string
): Promise<{ valid: boolean; error?: string; payload?: PaymentPayload }> {
  if (!paymentHeader) {
    return { valid: false, error: 'No payment payload' };
  }

  const payload = decodePaymentPayload(paymentHeader);
  if (!payload) {
    return { valid: false, error: 'Invalid payment payload' };
  }

  if (payload.validUntil < Math.floor(Date.now() / 1000)) {
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
    return { valid: false, error: 'Insufficient payment' };
  }

  return { valid: true, payload };
}

export async function settlePayment(
  payload: PaymentPayload,
  config: X402RouteConfig,
  chainConfig: X402ChainConfig
): Promise<SettlementResponse> {
  const facilitatorUrl = `${chainConfig.facilitator}/pay`;

  try {
    const response = await fetch(facilitatorUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cdp-api-key': process.env.CDP_API_KEY || '',
      },
      body: JSON.stringify({
        payment_requirement: {
          scheme: payload.scheme,
          amount: payload.amount,
          network: payload.network,
          token: payload.token,
          recipient: payload.recipient,
          max: payload.max,
          expires: payload.validUntil,
        },
        payer: 'facilitator',
      }),
    });

    if (!response.ok) {
      return {
        status: 'failed',
        amount: payload.amount,
        error: `Facilitator error: ${response.statusText}`,
      };
    }

    const data = await response.json();
    return {
      status: data.status === 'completed' ? 'completed' : 'pending',
      amount: data.settlement_amount || payload.amount,
      transactionHash: data.transaction_hash,
      settlementAmount: data.settlement_amount,
      fee: data.fee,
    };
  } catch (error) {
    return {
      status: 'failed',
      amount: payload.amount,
      error: error instanceof Error ? error.message : 'Settlement failed',
    };
  }
}

export function x402Middleware(request: NextRequest): NextResponse | null {
  const pathname = request.nextUrl.pathname;
  const apiKey = request.headers.get('x-api-key') || undefined;
  const tier = getTierFromApiKey(apiKey);
  const config = getMatchingConfig(pathname);

  if (!config) {
    return null;
  }

  if (config.tierExempt?.includes(tier)) {
    return null;
  }

  if (tier === 'enterprise') {
    return null;
  }

  if (config.amount === '0') {
    return null;
  }

  const chainConfig = getChainConfig(config.chain || DEFAULT_CAIP) || getDefaultChain();
  const pricing = getPricingForTier(tier);
  const amount = config.scheme === 'upto' ? (config.max || pricing.upto) : (config.amount || pricing.exact);
  const max = config.scheme === 'upto' ? config.max : undefined;

  const paymentRequired: PaymentRequired = {
    scheme: config.scheme,
    amount,
    network: chainConfig.caip,
    token: chainConfig.usdc,
    recipient: DEFAULT_RECIPIENT,
    max,
    expires: Date.now() + 15 * 60 * 1000,
    description: config.description,
  };

  return NextResponse.json(
    { error: 'PAYMENT_REQUIRED', message: 'Payment required' },
    {
      status: 402,
      headers: {
        'PAYMENT-REQUIRED': encodePaymentRequired(paymentRequired),
      },
    }
  );
}

export async function handleX402Payment(
  request: NextRequest,
  config: X402RouteConfig
): Promise<{ allowed: boolean; error?: NextResponse; settlement?: SettlementResponse }> {
  const paymentSignature = request.headers.get('PAYMENT-SIGNATURE');
  const apiKey = request.headers.get('x-api-key') || undefined;
  const tier = getTierFromApiKey(apiKey);
  const chainConfig = getChainConfig(config.chain || DEFAULT_CAIP) || getDefaultChain();

  if (tier === 'enterprise') {
    return { allowed: true };
  }

  if (!paymentSignature) {
    const pricing = getPricingForTier(tier);
    const amount = config.scheme === 'upto' ? (config.max || pricing.upto) : (config.amount || pricing.exact);
    const max = config.scheme === 'upto' ? config.max : undefined;

    const paymentRequired: PaymentRequired = {
      scheme: config.scheme,
      amount,
      network: chainConfig.caip,
      token: chainConfig.usdc,
      recipient: DEFAULT_RECIPIENT,
      max,
      expires: Date.now() + 15 * 60 * 1000,
      description: config.description,
    };

    return {
      allowed: false,
      error: NextResponse.json(
        { error: X402_ERROR_CODES.PAYMENT_REQUIRED, message: 'Payment required' },
        {
          status: 402,
          headers: {
            'PAYMENT-REQUIRED': encodePaymentRequired(paymentRequired),
          },
        }
      ),
    };
  }

  const verification = await verifyPayment(
    paymentSignature,
    DEFAULT_RECIPIENT,
    chainConfig.caip,
    chainConfig.usdc
  );

  if (!verification.valid) {
    return {
      allowed: false,
      error: NextResponse.json(
        { error: 'INVALID_PAYMENT', message: verification.error },
        {
          status: 402,
          headers: {
            'PAYMENT-REQUIRED': encodePaymentRequired({
              scheme: config.scheme,
              amount: config.amount,
              network: chainConfig.caip,
              token: chainConfig.usdc,
              recipient: DEFAULT_RECIPIENT,
              max: config.max,
              expires: Date.now() + 15 * 60 * 1000,
            }),
          },
        }
      ),
    };
  }

  const settlement = await settlePayment(verification.payload!, config, chainConfig);

  if (settlement.status === 'failed') {
    return {
      allowed: false,
      error: NextResponse.json(
        { error: X402_ERROR_CODES.SETTLEMENT_FAILED, message: settlement.error },
        { status: 402 }
      ),
    };
  }

  return { allowed: true, settlement };
}

export { X402_ROUTE_CONFIGS, getMatchingConfig, getPricingForTier };
export { DEFAULT_CAIP, getDefaultChain, getChainConfig };
export type { PaymentRequired, PaymentPayload, SettlementResponse } from './types';
export type { X402ChainConfig } from './chains';