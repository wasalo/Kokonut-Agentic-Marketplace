'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePublicClient, useReadContract } from 'wagmi';
import { parseAbiItem } from 'viem';
import { ERC8004_ABI } from '@/lib/8004contracts';
import { decodeAgentMetadata } from '@/lib/metadata';
import { getContractAddress } from '@/lib/contracts/config';
import { debugLog, debugError } from '@/lib/debug';

const ERC8004_ADDRESS = getContractAddress('ERC8004_REGISTRY');

const FROM_BLOCK = BigInt(9989393);

export interface AgentWithDetails {
  id: number;
  owner: `0x${string}`;
  agentURI: string;
  metadata: ReturnType<typeof decodeAgentMetadata>;
  hasKokonutTag: boolean;
}

interface UseWalletAgentsWithDetailsReturn {
  agents: AgentWithDetails[];
  taggedAgents: AgentWithDetails[];
  untaggedAgents: AgentWithDetails[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook to fetch all agents owned by wallet with full details including Kokonut tag check
 * Uses direct contract calls for reliability
 */
export function useWalletAgentsWithDetails(
  ownerAddress: `0x${string}` | undefined
): UseWalletAgentsWithDetailsReturn {
  const publicClient = usePublicClient();
  const [agents, setAgents] = useState<AgentWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Step 1: Check balance
  const { data: balance, isLoading: isLoadingBalance } = useReadContract({
    address: ERC8004_ADDRESS,
    abi: ERC8004_ABI,
    functionName: 'balanceOf',
    args: ownerAddress ? [ownerAddress] : undefined,
    query: {
      enabled: !!ownerAddress,
    },
  });

  const fetchAgents = useCallback(async () => {
    debugLog('hooks', 'useWalletAgentsWithDetails: fetchAgents called', {
      hasPublicClient: !!publicClient,
      hasOwnerAddress: !!ownerAddress,
      balance: balance?.toString(),
    });

    if (!publicClient || !ownerAddress || !balance || balance === BigInt(0)) {
      debugLog('hooks', 'useWalletAgentsWithDetails: Missing dependencies, returning empty');
      setAgents([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      debugLog(
        'hooks',
        `useWalletAgentsWithDetails: Fetching agents for ${ownerAddress}, balance: ${balance.toString()}`
      );

      // Step 2: Query Registered events to find agent IDs owned by this address
      debugLog('hooks', 'useWalletAgentsWithDetails: Querying Registered events...');

      const logs = await publicClient.getLogs({
        address: ERC8004_ADDRESS,
        event: parseAbiItem(
          'event Registered(uint256 indexed agentId, string agentURI, address indexed owner)'
        ),
        fromBlock: FROM_BLOCK,
        toBlock: 'latest',
        args: {
          owner: ownerAddress,
        },
      });

      debugLog(
        'hooks',
        `useWalletAgentsWithDetails: Found ${logs.length} Registered events`,
        logs.map(l => ({ agentId: l.args.agentId?.toString() }))
      );

      if (logs.length === 0) {
        debugLog('hooks', 'useWalletAgentsWithDetails: No logs found, returning empty');
        setAgents([]);
        setIsLoading(false);
        return;
      }

      // Step 3: Fetch tokenURI for each agent
      const agentIds = logs.map(log => log.args.agentId).filter(Boolean) as bigint[];

      debugLog(
        'hooks',
        `useWalletAgentsWithDetails: Fetching tokenURI for ${agentIds.length} agents:`,
        agentIds.map(id => id.toString())
      );

      const calls = agentIds.map(id => ({
        address: ERC8004_ADDRESS,
        abi: ERC8004_ABI,
        functionName: 'tokenURI' as const,
        args: [id],
      }));

      const results = await publicClient.multicall({ contracts: calls });

      debugLog('hooks', `useWalletAgentsWithDetails: Multicall returned ${results.length} results`);

      // Step 4: Decode metadata and check for Kokonut tag
      const fetchedAgents: AgentWithDetails[] = [];

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const agentId = Number(agentIds[i]);

        if (result.status === 'success' && result.result && result.result !== '') {
          // Case 1: Valid URI with content
          const uri = result.result as string;
          const metadata = decodeAgentMetadata(uri);
          const hasKokonutTag = metadata?.source === 'kokonut-marketplace';

          debugLog('hooks', `Agent ${agentId}:`, {
            source: metadata?.source,
            hasKokonutTag,
          });

          fetchedAgents.push({
            id: agentId,
            owner: ownerAddress,
            agentURI: uri,
            metadata,
            hasKokonutTag,
          });
        } else if (result.status === 'success' && result.result === '') {
          // Case 2: Empty URI - include as untagged (not an error)
          debugLog('hooks', `Agent ${agentId}: empty tokenURI (untagged)`);
          fetchedAgents.push({
            id: agentId,
            owner: ownerAddress,
            agentURI: '',
            metadata: null,
            hasKokonutTag: false,
          });
        } else {
          // Case 3: Actual error - log as error
          debugError('hooks', `Agent ${agentId}: tokenURI failed`, result);
        }
      }

      debugLog(
        'hooks',
        `Total agents: ${fetchedAgents.length}, Tagged: ${fetchedAgents.filter(a => a.hasKokonutTag).length}, Untagged: ${fetchedAgents.filter(a => !a.hasKokonutTag).length}`
      );

      setAgents(fetchedAgents);
    } catch (err) {
      debugError('hooks', 'useWalletAgentsWithDetails: Error', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch agents'));
    } finally {
      setIsLoading(false);
    }
  }, [publicClient, ownerAddress, balance]);

  useEffect(() => {
    debugLog('hooks', 'useWalletAgentsWithDetails: useEffect triggered', {
      hasPublicClient: !!publicClient,
      hasOwnerAddress: !!ownerAddress,
      balance: balance?.toString(),
    });

    if (publicClient && ownerAddress && balance !== undefined) {
      fetchAgents();
    }
  }, [publicClient, ownerAddress, balance, fetchAgents]);

  const taggedAgents = agents.filter(a => a.hasKokonutTag);
  const untaggedAgents = agents.filter(a => !a.hasKokonutTag);

  return {
    agents,
    taggedAgents,
    untaggedAgents,
    isLoading: isLoading || isLoadingBalance,
    error,
    refetch: fetchAgents,
  };
}
