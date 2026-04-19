'use client';

import { useState, useCallback } from 'react';
import { useWalletClient } from 'wagmi';
import {
  type PaymentRequired,
  formatX402Amount,
  X402Client,
  getChainConfig,
} from '@/lib/x402';

interface X402PaymentButtonProps {
  paymentRequired?: PaymentRequired | null;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  children?: React.ReactNode;
}

export function X402PaymentButton({
  paymentRequired,
  onSuccess,
  onError,
  children,
}: X402PaymentButtonProps) {
  const { data: walletClient } = useWalletClient();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handlePay = useCallback(async () => {
    if (!walletClient?.account?.address) {
      setError('Please connect your wallet');
      onError?.('Please connect your wallet');
      return;
    }

    if (!paymentRequired) {
      setError('No payment required');
      onError?.('No payment required');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const chainConfig = getChainConfig(paymentRequired.network);
      if (!chainConfig) {
        throw new Error(`Unsupported network: ${paymentRequired.network}`);
      }

      const response = await fetch(`${chainConfig.facilitator}/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-cdp-api-key': process.env.NEXT_PUBLIC_CDP_API_KEY || '',
        },
        body: JSON.stringify({
          payment_requirement: paymentRequired,
          payer: walletClient.account.address,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Payment failed');
      }

      const data = await response.json();

      if (data.status === 'completed') {
        setSuccess(true);
        onSuccess?.();
      } else {
        setError('Payment pending - please try again later');
        onError?.('Payment pending');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Payment failed';
      setError(message);
      onError?.(message);
    } finally {
      setIsProcessing(false);
    }
  }, [walletClient, paymentRequired, onSuccess, onError]);

  if (!paymentRequired) {
    return null;
  }

  const amount = formatX402Amount(paymentRequired.amount);
  const chain = getChainConfig(paymentRequired.network);
  const chainName = chain?.name || paymentRequired.network;
  const maxAmount = paymentRequired.max
    ? formatX402Amount(paymentRequired.max)
    : null;

  if (success) {
    return (
      <div className="x402-success">
        <p>Payment completed!</p>
        {children}
      </div>
    );
  }

  return (
    <div className="x402-payment-panel">
      <div className="x402-payment-info">
        <h4>Payment Required</h4>
        <p className="amount">
          {paymentRequired.scheme === 'upto' && maxAmount
            ? `Up to ${maxAmount}`
            : amount}{' '}
          USDC
        </p>
        <p className="network">Network: {chainName}</p>
        {paymentRequired.description && (
          <p className="description">{paymentRequired.description}</p>
        )}
      </div>

      {error && <p className="x402-error">{error}</p>}

      <button
        type="button"
        onClick={handlePay}
        disabled={isProcessing || !walletClient}
        className="x402-pay-button"
      >
        {isProcessing
          ? 'Processing...'
          : `Pay ${
              paymentRequired.scheme === 'upto' && maxAmount
                ? maxAmount
                : amount
            } USDC`}
      </button>

      {children}
    </div>
  );
}

interface X402InlinePaymentProps {
  paymentRequired?: PaymentRequired | null;
  onSuccess?: () => void;
}

export function X402InlinePayment({
  paymentRequired,
  onSuccess,
}: X402InlinePaymentProps) {
  if (!paymentRequired) return null;

  return (
    <X402PaymentButton paymentRequired={paymentRequired} onSuccess={onSuccess}>
      <p className="text-sm text-gray-500">
        Secure payment powered by x402
      </p>
    </X402PaymentButton>
  );
}