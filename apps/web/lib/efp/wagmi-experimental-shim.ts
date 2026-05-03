/**
 * wagmi/experimental shim for wagmi v3 compatibility
 * ethereum-identity-kit imports from wagmi/experimental (wagmi v2),
 * which was removed in wagmi v3. This shim provides the needed exports.
 * The experimental features (batch writes, paymaster) are unused in Kokonut.
 */

import type { UseWriteContractParameters, UseWriteContractReturnType } from 'wagmi';

export function useCapabilities(): { data: any } {
  return { data: undefined };
}

export function useWriteContracts(): UseWriteContractReturnType {
  throw new Error(
    'wagmi/experimental: useWriteContracts is not available in wagmi v3. ' +
    'Batch transactions and paymaster features are not supported in this build.'
  );
}

export function writeContracts(): never {
  throw new Error(
    'wagmi/experimental: writeContracts is not available in wagmi v3. ' +
    'This function was part of wagmi v2 experimental and has been removed.'
  );
}
