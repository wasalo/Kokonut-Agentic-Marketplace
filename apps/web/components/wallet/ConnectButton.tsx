'use client';

import { ConnectButton as RainbowConnectButton } from '@rainbow-me/rainbowkit';
import { useEffect, useState } from 'react';

/**
 * Custom ConnectButton wrapper with proper error handling and loading states.
 *
 * This component wraps RainbowKit's ConnectButton with additional safeguards:
 * - Client-side only rendering (prevents hydration mismatches)
 * - Error boundary fallback
 * - Loading state while RainbowKit initializes
 */
export function ConnectButton() {
  const [mounted, setMounted] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle errors from RainbowKit
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.message?.includes('rainbow') || event.message?.includes('wagmi')) {
        console.error('Wallet connection error:', event.error);
        setHasError(true);
      }
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  // Prevent hydration mismatch by only rendering on client
  if (!mounted) {
    return (
      <button type="button"
        disabled
        className="px-4 py-2 text-sm font-medium text-default-500 bg-content2 rounded-lg opacity-50 cursor-not-allowed"
      >
        Loading...
      </button>
    );
  }

  // Error state
  if (hasError) {
    return (
      <button type="button"
        disabled
        className="px-4 py-2 text-sm font-medium text-danger bg-danger/10 rounded-lg opacity-50 cursor-not-allowed"
        title="Wallet connection failed. Please refresh the page."
      >
        Wallet Error
      </button>
    );
  }

  // Render RainbowKit ConnectButton with custom props
  return <RainbowConnectButton accountStatus="address" chainStatus="icon" showBalance={false} />;
}

/**
 * Simplified ConnectButton that just shows "Connect" text
 * Useful for mobile or compact layouts
 */
export function ConnectButtonCompact() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button type="button"
        disabled
        className="px-3 py-1.5 text-sm font-medium text-default-500 bg-content2 rounded-lg opacity-50 cursor-not-allowed"
      >
        ...
      </button>
    );
  }

  return (
    <RainbowConnectButton
      accountStatus="avatar"
      chainStatus="none"
      showBalance={false}
      label="Connect"
    />
  );
}
