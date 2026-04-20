'use client';

import { useState, useCallback } from 'react';
import { useSignTypedData } from 'wagmi';
import { getContractAddress } from '@/lib/contracts/config';

const ERC8004_ADDRESS = getContractAddress('ERC8004_REGISTRY');

const DOMAIN = {
  name: 'IdentityRegistry',
  version: '1',
  chainId: 11155111,
  verifyingContract: ERC8004_ADDRESS,
} as const;

const TYPES = {
  AgentWalletSet: [
    { name: 'agentId', type: 'uint256' },
    { name: 'newWallet', type: 'address' },
    { name: 'deadline', type: 'uint256' },
  ],
} as const;

interface SignParams {
  agentId: bigint;
  newWallet: `0x${string}`;
  /**
   * Deadline timestamp (must be <= now + 5 minutes per ERC-8004 spec)
   * Use 60 seconds for best compatibility
   */
  deadline: bigint;
}

export function useGenerateWalletSignature() {
  const { signTypedDataAsync, isPending } = useSignTypedData();
  const [error, setError] = useState<string | null>(null);

  const generateSignature = useCallback(
    async ({ agentId, newWallet, deadline }: SignParams): Promise<`0x${string}` | null> => {
      setError(null);

      try {
        const signature = await signTypedDataAsync({
          domain: DOMAIN,
          types: TYPES,
          primaryType: 'AgentWalletSet',
          message: {
            agentId,
            newWallet,
            deadline,
          },
        });

        return signature;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Signature failed';
        setError(message);
        console.error('[useGenerateWalletSignature] Error:', message);
        return null;
      }
    },
    [signTypedDataAsync]
  );

  return {
    generateSignature,
    isPending,
    error,
  };
}