/**
 * wagmi/experimental shim for wagmi v3 compatibility
 * ethereum-identity-kit imports from wagmi/experimental (wagmi v2),
 * which was removed in wagmi v3. This shim provides the needed exports.
 * The experimental features (batch writes, paymaster) are unused in Kokonut.
 */

import type { UseWriteContractReturnType } from 'wagmi';

export function useCapabilities(): { data: any } {
  return { data: undefined };
}

export function useWriteContracts(): UseWriteContractReturnType {
  // No-op for wagmi v3 compatibility with ethereum-identity-kit
  return {
    data: undefined,
    error: null,
    isIdle: true,
    isPending: false,
    isSuccess: false,
    isError: false,
    isPaused: false,
    writeContract: (() => {}) as any,
    writeContractAsync: (async () => undefined) as any,
    reset: () => {},
    status: 'idle',
    failureReason: null,
  } as unknown as UseWriteContractReturnType;
}

export function writeContracts() {
  return undefined;
}
