/**
 * x402 Client Wrapper
 *
 * Handles payment flow with Coinbase CDP facilitator
 * https://docs.cdp.coinbase.com/x402/docs
 */

import {
  type PaymentRequired,
  type PaymentPayload,
  type SettlementResponse,
  encodePaymentRequired,
  decodePaymentRequired,
  encodePaymentPayload,
  decodePaymentPayload,
  encodeSettlementResponse,
  decodeSettlementResponse,
  type X402Headers,
} from './types';
import { getChainConfig, getDefaultChain, type X402ChainConfig } from './chains';
import { privateKeyToAccount, signTypedData } from 'viem/accounts';
import { createWalletClient, http } from 'viem';

export interface X402ClientConfig {
  privateKey: string;
  chain?: string;
  facilitator?: string;
  onBehalfOf?: string;
}

export interface X402PaymentRequest {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

const DEFAULT_FACILITATOR = process.env.X402_FACILITATOR_URL || 'https://x402.org/facilitator';

export class X402Client {
  private account: ReturnType<typeof privateKeyToAccount>;
  private chainConfig: X402ChainConfig;
  private facilitator: string;
  private onBehalfOf?: string;

  constructor(config: X402ClientConfig) {
    this.account = privateKeyToAccount(config.privateKey as `0x${string}`);
    this.chainConfig = getChainConfig(config.chain || getDefaultChain().caip) || getDefaultChain();
    this.facilitator = config.facilitator || DEFAULT_FACILITATOR;
    this.onBehalfOf = config.onBehalfOf;
  }

  getAddress(): string {
    return this.account.address;
  }

  getChainConfig(): X402ChainConfig {
    return this.chainConfig;
  }

  async request(req: X402PaymentRequest): Promise<Response> {
    const response = await fetch(req.url, {
      method: req.method || 'GET',
      headers: req.headers,
      body: req.body,
    });

    if (response.status === 402) {
      const paymentRequiredHeader = response.headers.get('PAYMENT-REQUIRED');
      if (!paymentRequiredHeader) {
        throw new Error('402 response without PAYMENT-REQUIRED header');
      }

      const paymentRequired = decodePaymentRequired(paymentRequiredHeader);
      if (!paymentRequired) {
        throw new Error('Invalid PAYMENT-REQUIRED header');
      }

      const settlement = await this.pay(paymentRequired);

      if (settlement.status === 'failed') {
        throw new Error(`Payment failed: ${settlement.error}`);
      }

      const payload = await this.createPaymentPayload(paymentRequired);

      return fetch(req.url, {
        method: req.method || 'GET',
        headers: {
          ...req.headers,
          'PAYMENT-SIGNATURE': encodePaymentPayload(payload),
        },
        body: req.body,
      });
    }

    return response;
  }

  async pay(paymentRequired: PaymentRequired): Promise<SettlementResponse> {
    const facilitatorUrl = `${this.facilitator}/pay`;

    const facilitatorPayload = {
      payment_requirement: paymentRequired,
      payer: this.account.address,
      on_behalf_of: this.onBehalfOf,
    };

    try {
      const response = await fetch(facilitatorUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-cdp-api-key': process.env.CDP_API_KEY || '',
        },
        body: JSON.stringify(facilitatorPayload),
      });

      if (!response.ok) {
        const error = await response.text();
        return {
          status: 'failed',
          amount: paymentRequired.amount,
          error: `Facilitator error: ${error}`,
        };
      }

      const data = await response.json();
      return {
        status: data.status === 'completed' ? 'completed' : 'pending',
        amount: data.settlement_amount || paymentRequired.amount,
        transactionHash: data.transaction_hash,
        settlementAmount: data.settlement_amount,
        fee: data.fee,
      };
    } catch (error) {
      return {
        status: 'failed',
        amount: paymentRequired.amount,
        error: error instanceof Error ? error.message : 'Payment failed',
      };
    }
  }

  async createPaymentPayload(paymentRequired: PaymentRequired): Promise<PaymentPayload> {
    const domain = {
      name: 'Kokonut',
      version: '1',
      chainId: this.chainConfig.chainId,
      verifyingContract: paymentRequired.token as `0x${string}`,
    };

    const types = {
      Payment: [
        { name: 'scheme', type: 'string' },
        { name: 'amount', type: 'uint256' },
        { name: 'network', type: 'string' },
        { name: 'token', type: 'address' },
        { name: 'recipient', type: 'address' },
        { name: 'max', type: 'uint256' },
        { name: 'validUntil', type: 'uint256' },
      ],
    };

    const message = {
      scheme: paymentRequired.scheme,
      amount: paymentRequired.amount,
      network: paymentRequired.network,
      token: paymentRequired.token,
      recipient: paymentRequired.recipient,
      max: paymentRequired.max || '0',
      validUntil: Math.floor((paymentRequired.expires || Date.now() + 15 * 60 * 1000) / 1000).toString(),
    };

    // Sign via facilitator - client just provides requirement, facilitator handles signing
    return {
      scheme: paymentRequired.scheme,
      amount: paymentRequired.amount,
      network: paymentRequired.network,
      token: paymentRequired.token,
      recipient: paymentRequired.recipient,
      max: paymentRequired.max,
      validUntil: Math.floor((paymentRequired.expires || Date.now() + 15 * 60 * 1000) / 1000),
      signature: '0x0000',
      facilitator: this.facilitator,
    };
  }

  static async verifyPayment(
    header: string,
    expectedRecipient: string
  ): Promise<{ valid: boolean; error?: string }> {
    const payload = decodePaymentPayload(header);

    if (!payload) {
      return { valid: false, error: 'Invalid payment payload' };
    }

    if (payload.validUntil < Date.now()) {
      return { valid: false, error: 'Payment expired' };
    }

    if (payload.recipient !== expectedRecipient) {
      return { valid: false, error: 'Recipient mismatch' };
    }

    return { valid: true };
  }
}

export interface X402FetchOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  chain?: string;
}

export async function x402fetch(
  url: string,
  privateKey: string,
  options: X402FetchOptions = {}
): Promise<Response> {
  const client = new X402Client({
    privateKey,
    chain: options.chain,
  });

  return client.request({
    url,
    method: options.method,
    headers: options.headers,
    body: options.body,
  });
}

export function createX402Headers(
  paymentRequired: PaymentRequired,
  payload: PaymentPayload
): X402Headers {
  return {
    'PAYMENT-REQUIRED': encodePaymentRequired(paymentRequired),
    'PAYMENT-SIGNATURE': encodePaymentPayload(payload),
  };
}

export { getChainConfig, getDefaultChain };
export type { PaymentRequired, PaymentPayload, SettlementResponse } from './types';
export type { X402ChainConfig } from './chains';