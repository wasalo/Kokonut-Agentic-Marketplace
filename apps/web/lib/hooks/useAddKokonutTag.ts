'use client';

import { useState, useCallback } from 'react';
import { usePublicClient, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ERC8004_ABI } from '@/lib/8004contracts';
import { decodeAgentMetadata, generateAgentMetadata, type AgentMetadata8004 } from '@/lib/metadata';
import { getContractAddress } from '@/lib/contracts/config';
import { useDebug } from '@/contexts/DebugContext';

const ERC8004_ADDRESS = getContractAddress('ERC8004_REGISTRY');
const SEPOLIA_CHAIN_ID = 11155111;

interface UseAddKokonutTagReturn {
  addTag: (agentId: number) => Promise<void>;
  isLoading: boolean;
  isSuccess: boolean;
  error: Error | null;
  txHash: `0x${string}` | undefined;
}

/**
 * Hook to add kokonut-marketplace tag to an agent's metadata
 * Fetches current URI, adds source field, and updates via setAgentURI
 */
export function useAddKokonutTag(): UseAddKokonutTagReturn {
  const publicClient = usePublicClient();
  const { addLog } = useDebug();
  const [error, setError] = useState<Error | null>(null);

  const {
    writeContract,
    data: txHash,
    isPending: isWritePending,
    error: writeError,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const addTag = useCallback(
    async (agentId: number) => {
      if (!publicClient) {
        setError(new Error('Public client not available'));
        return;
      }

      setError(null);
      addLog('contract', `Adding Kokonut tag to agent ${agentId}`);

      try {
        // Step 1: Fetch current tokenURI
        addLog('contract', 'Fetching current tokenURI…');

        const uri = await publicClient.readContract({
          address: ERC8004_ADDRESS,
          abi: ERC8004_ABI,
          functionName: 'tokenURI',
          args: [BigInt(agentId)],
        });

        addLog('contract', 'Current URI fetched', { uri: uri.slice(0, 100) + '…' });

        // Step 2: Decode current metadata
        const currentMetadata = decodeAgentMetadata(uri);

        if (!currentMetadata) {
          throw new Error('Failed to decode current metadata');
        }

        addLog('contract', 'Current metadata decoded', {
          name: currentMetadata.name,
          hasSource: !!currentMetadata.source,
        });

        // Step 3: Check if already tagged
        if (currentMetadata.source === 'kokonut-marketplace') {
          addLog('info', 'Agent already has Kokonut tag');
          return;
        }

        // Step 4: Create new metadata with Kokonut tag
        const newMetadata: AgentMetadata8004 = {
          ...currentMetadata,
          source: 'kokonut-marketplace',
          updatedAt: new Date().toISOString(),
        };

        // Step 5: Generate new URI
        const newURI = generateAgentMetadata(newMetadata);

        addLog('contract', 'New metadata generated', {
          uri: newURI.slice(0, 100) + '…',
          source: newMetadata.source,
        });

        // Step 6: Call setAgentURI
        addLog('contract', 'Calling setAgentURI…');

        writeContract({
          chainId: SEPOLIA_CHAIN_ID,
          address: ERC8004_ADDRESS,
          abi: ERC8004_ABI,
          functionName: 'setAgentURI',
          args: [BigInt(agentId), newURI],
        });
      } catch (err) {
        console.error('Error adding Kokonut tag:', err);
        addLog('error', 'Error adding Kokonut tag', err);
        setError(err instanceof Error ? err : new Error('Failed to add Kokonut tag'));
      }
    },
    [publicClient, writeContract, addLog]
  );

  return {
    addTag,
    isLoading: isWritePending || isConfirming,
    isSuccess,
    error: error || writeError,
    txHash,
  };
}
