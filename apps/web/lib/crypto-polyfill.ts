/**
 * Crypto API Polyfill for Non-Secure Contexts
 *
 * Browsers don't expose crypto APIs in non-secure contexts (HTTP with IP addresses).
 * This polyfill provides fallback implementations for:
 * - crypto.randomUUID() - Used by WalletConnect, wagmi, React Query, RainbowKit
 * - crypto.subtle - Used by cryptographic operations
 *
 * localhost is treated as a secure context, so these APIs are available there.
 * Network IPs (e.g., http://10.108.1.215:3000) are NOT secure contexts.
 */

if (typeof window !== 'undefined') {
  const isSecureContext = window.isSecureContext !== false;
  const hasRandomUUID = typeof window.crypto?.randomUUID === 'function';
  const hasSubtle = typeof window.crypto?.subtle !== 'undefined';

  // Log secure context status
  console.log('[crypto-polyfill] Secure context check:', {
    isSecureContext,
    hasRandomUUID,
    hasSubtle,
    origin: window.location.origin,
    protocol: window.location.protocol,
  });

  // Polyfill randomUUID if missing
  if (!hasRandomUUID) {
    console.warn('[crypto-polyfill] crypto.randomUUID() not available');
    console.warn('[crypto-polyfill] crypto.randomUUID() requires HTTPS. Using non-secure Math.random() fallback — IDs will not be cryptographically secure');
    
    Object.defineProperty(window.crypto, 'randomUUID', {
      value: () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });
      },
      writable: true,
      configurable: true,
    });

    console.log('[crypto-polyfill] randomUUID polyfill applied successfully');
  }

  // Polyfill crypto.subtle if missing (used by cryptographic operations)
  if (!hasSubtle) {
    console.warn('[crypto-polyfill] crypto.subtle not available - applying minimal polyfill');

    // Create a minimal SubtleCrypto implementation
    const subtleCrypto = {
      decrypt: async () => {
        throw new Error('crypto.subtle.decrypt not available in non-secure context');
      },
      deriveBits: async () => {
        throw new Error('crypto.subtle.deriveBits not available in non-secure context');
      },
      deriveKey: async () => {
        throw new Error('crypto.subtle.deriveKey not available in non-secure context');
      },
      digest: async (_algorithm: string, _data: BufferSource) => {
        throw new Error('crypto.subtle.digest not available in non-secure context. Access via HTTPS.');
      },
      encrypt: async () => {
        throw new Error('crypto.subtle.encrypt not available in non-secure context');
      },
      exportKey: async () => {
        throw new Error('crypto.subtle.exportKey not available in non-secure context');
      },
      generateKey: async () => {
        throw new Error('crypto.subtle.generateKey not available in non-secure context');
      },
      importKey: async () => {
        throw new Error('crypto.subtle.importKey not available in non-secure context');
      },
      sign: async () => {
        throw new Error('crypto.subtle.sign not available in non-secure context');
      },
      unwrapKey: async () => {
        throw new Error('crypto.subtle.unwrapKey not available in non-secure context');
      },
      verify: async () => {
        throw new Error('crypto.subtle.verify not available in non-secure context');
      },
      wrapKey: async () => {
        throw new Error('crypto.subtle.wrapKey not available in non-secure context');
      },
    };

    Object.defineProperty(window.crypto, 'subtle', {
      value: subtleCrypto,
      writable: true,
      configurable: true,
    });

    console.log('[crypto-polyfill] crypto.subtle polyfill applied (minimal implementation)');
  }

  // Final status
  console.log('[crypto-polyfill] Initialization complete:', {
    randomUUID: typeof window.crypto.randomUUID === 'function',
    subtle: typeof window.crypto.subtle !== 'undefined',
  });
}
