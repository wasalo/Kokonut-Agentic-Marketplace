'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): JSX.Element {
  useEffect(() => {
    if (error) {
      try {
        console.error(error);
      } catch {
        // Ignore console.error failures (e.g. cyclic objects)
      }
    }
  }, [error]);

  const rawMessage =
    error && typeof error === 'object' && 'message' in error
      ? String(error.message)
      : 'An unexpected error occurred.';

  const message = (() => {
    const msg = rawMessage.toLowerCase();
    if (msg.includes('user rejected') || msg.includes('user denied')) {
      return 'Transaction was cancelled. No changes were made.';
    }
    if (msg.includes('insufficient funds') || msg.includes('insufficient balance')) {
      return 'Insufficient funds to complete this transaction. Please add funds to your wallet.';
    }
    if (msg.includes('network') || msg.includes('timeout') || msg.includes('timeout')) {
      return 'Network error. Please check your connection and try again.';
    }
    if (msg.includes('execution reverted')) {
      return 'The smart contract rejected this transaction. The conditions may not be met.';
    }
    if (msg.includes('nonce')) {
      return 'Transaction nonce error. Please wait a moment and try again.';
    }
    if (process.env.NODE_ENV === 'development') {
      return rawMessage;
    }
    return 'Something went wrong. Please try again or contact support.';
  })();

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h2 className="text-2xl font-bold text-danger mb-2">Something went wrong!</h2>
        <p className="text-muted-foreground mb-6">{message}</p>
        <button
          onClick={reset}
          className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
