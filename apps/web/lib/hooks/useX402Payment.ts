/**
 * useX402Payment - React hook for x402 payment flows
 *
 * Frontend hook for handling 402 Payment Required responses
 */

import { useState, useCallback } from 'react';
import { useWalletClient } from 'wagmi';
import {
  type PaymentRequired,
  type SettlementResponse,
  decodePaymentRequired,
  getChainConfig,
} from '@/lib/x402';

export interface UseX402PaymentOptions {
  chain?: string;
  facilitator?: string;
}

export interface UseX402PaymentState {
  paymentRequired: PaymentRequired | null;
  isProcessing: boolean;
  error: string | null;
  settlement: SettlementResponse | null;
}

export interface UseX402PaymentReturn extends UseX402PaymentState {
  pay: () => Promise<SettlementResponse | null>;
  payAndRetry: (originalRequest: Request) => Promise<Response | null>;
  clearError: () => void;
  setPaymentRequired: (req: PaymentRequired | null) => void;
}

export function useX402Payment(options: UseX402PaymentOptions = {}): UseX402PaymentReturn {
  const { data: walletClient } = useWalletClient();
  const [state, setState] = useState<UseX402PaymentState>({
    paymentRequired: null,
    isProcessing: false,
    error: null,
    settlement: null,
  });

  const setPaymentRequired = useCallback((req: PaymentRequired | null) => {
    setState((s) => ({ ...s, paymentRequired: req }));
  }, []);

  const clearError = useCallback(() => {
    setState({
      paymentRequired: null,
      isProcessing: false,
      error: null,
      settlement: null,
    });
  }, []);

  const pay = useCallback(async () => {
    if (!walletClient?.account?.address) {
      setState((s) => ({ ...s, error: 'Wallet not connected' }));
      return null;
    }

    if (!state.paymentRequired) {
      setState((s) => ({ ...s, error: 'No payment required' }));
      return null;
    }

    setState((s) => ({ ...s, isProcessing: true, error: null }));

    try {
      const network = state.paymentRequired.network || options?.chain;
      if (!network) {
        throw new Error('No network specified in payment requirement or options');
      }
      const chainConfig = getChainConfig(network);
      if (!chainConfig) {
        throw new Error(`Unsupported network: ${network}`);
      }

      const response = await fetch('/api/x402/pay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_requirement: state.paymentRequired,
          payer: walletClient.account.address,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Payment failed');
      }

      const data = await response.json();

      if (data.status === 'completed') {
        setState((s) => ({
          ...s,
          isProcessing: false,
          settlement: data,
          paymentRequired: null,
        }));
        return data as SettlementResponse;
      } else {
        setState((s) => ({
          ...s,
          isProcessing: false,
          error: 'Payment pending',
          settlement: data,
        }));
        return data as SettlementResponse;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Payment failed';
      setState((s) => ({ ...s, isProcessing: false, error: message }));
      return null;
    }
  }, [walletClient, state.paymentRequired, options]);

  const payAndRetry = useCallback(
    async (originalRequest: Request) => {
      const settlement = await pay();
      if (!settlement) return null;

      try {
        const headers = new Headers();
        if (originalRequest.headers) {
          originalRequest.headers.forEach((v, k) => headers.set(k, v));
        }
        const method = originalRequest.method || 'GET';
        const body = originalRequest.body ? await originalRequest.text() : undefined;

        return fetch(originalRequest.url, { method, headers, body });
      } catch {
        return null;
      }
    },
    [pay]
  );

  return {
    ...state,
    pay,
    payAndRetry,
    clearError,
    setPaymentRequired,
  };
}

export function parsePaymentRequiredFromResponse(response: Response): PaymentRequired | null {
  const header = response.headers.get('PAYMENT-REQUIRED');
  if (!header) return null;

  try {
    return decodePaymentRequired(header);
  } catch {
    return null;
  }
}

export function formatX402Amount(amount: string | number, decimals: number = 6): string {
  const num = typeof amount === 'string' ? parseInt(amount) : amount;
  return (num / Math.pow(10, decimals)).toFixed(decimals === 6 ? 2 : 4);
}

export function parseX402Amount(amount: string, decimals: number = 6): string {
  const num = parseFloat(amount) * Math.pow(10, decimals);
  return Math.round(num).toString();
}

export function handleX402Response(response: Response): {
  needsPayment: boolean;
  paymentRequired?: PaymentRequired;
} {
  if (response.status !== 402) {
    return { needsPayment: false };
  }

  const paymentRequired = parsePaymentRequiredFromResponse(response);
  return {
    needsPayment: true,
    paymentRequired: paymentRequired || undefined,
  };
}