/**
 * Wallet Provider Shim
 *
 * This file must be imported BEFORE any wallet-related code to prevent
 * conflicts between MetaMask and RainbowKit ethereum injection.
 *
 * The error "can't redefine non-configurable property 'ethereum'" occurs
 * when RainbowKit tries to inject its provider after MetaMask has already
 * defined window.ethereum as non-configurable.
 *
 * This shim ensures window.ethereum is configurable from the start.
 *
 * IMPORTANT: This module uses side effects (modifies window.ethereum) and must
 * be imported at the module level BEFORE any wallet code runs. The import
 * in app/layout.tsx is intentional and necessary for the shim to work.
 *
 * This is NOT a code smell in this case - it's a legitimate use of a
 * side-effect import that must run at module initialization time.
 */

if (typeof window !== 'undefined') {
  try {
    // Only apply shim if ethereum is not already defined
    // or if it's defined but not configurable
    if (!window.ethereum || !Object.getOwnPropertyDescriptor(window, 'ethereum')?.configurable) {
      // Remove the existing property if it's not configurable
      if (
        window.ethereum &&
        Object.getOwnPropertyDescriptor(window, 'ethereum')?.configurable === false
      ) {
        // We can't delete it, but we can redefine it if we act quickly
        Object.defineProperty(window, 'ethereum', {
          value: window.ethereum,
          writable: true,
          configurable: true,
          enumerable: true,
        });
      } else if (!window.ethereum) {
        // Define ethereum as undefined but configurable
        Object.defineProperty(window, 'ethereum', {
          value: undefined,
          writable: true,
          configurable: true,
          enumerable: true,
        });
      }
    }
  } catch (error) {
    // Best-effort shim - warn in development for debugging
    if (process.env.NODE_ENV === 'development') {
      console.warn('Wallet shim: Could not modify window.ethereum', error);
    }
  }
}

// Type augmentation for TypeScript
declare global {
  interface Window {
    ethereum?: any;
  }
}

export {};
