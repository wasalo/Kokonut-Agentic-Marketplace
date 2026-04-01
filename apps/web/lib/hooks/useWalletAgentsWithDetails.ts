'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePublicClient, useReadContract } from 'wagmi';
import { parseAbiItem } from 'viem';
import { ERC8004_ABI } from '@/lib/8004contracts';
import { decodeAgentMetadata } from '@/lib/metadata';
import { CONTRACT_ADDRESSES, getContractAddress, debugLog } from '@/lib/contracts/config';
import { useDebug } from '@/contexts/DebugContext';

const ERC8004_ADDRESS = getContractAddress(
  process.env.NEXT_PUBLIC_8004_REGISTRY_ADDRESS,
  CONTRACT_ADDRESSES.sepolia.erc8004Registry
);

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
  const { addLog } = useDebug();
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
    if (!publicClient || !ownerAddress || !balance || balance === BigInt(0)) {
      setAgents([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    addLog('contract', `Fetching agents for ${ownerAddress}`, { balance: balance.toString() });

    try {
      // Step 2: Query Registered events to find agent IDs owned by this address
      addLog('contract', 'Querying Registered events...');

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

      addLog(
        'contract',
        `Found ${logs.length} Registered events`,
        logs.map(l => ({ agentId: l.args.agentId?.toString() }))
      );

      if (logs.length === 0) {
        setAgents([]);
        setIsLoading(false);
        return;
      }

      // Step 3: Fetch tokenURI for each agent
      const agentIds = logs.map(log => log.args.agentId).filter(Boolean) as bigint[];

      addLog(
        'contract',
        `Fetching tokenURI for ${agentIds.length} agents`,
        agentIds.map(id => id.toString())
      );

      const calls = agentIds.map(id => ({
        address: ERC8004_ADDRESS,
        abi: ERC8004_ABI,
        functionName: 'tokenURI' as const,
        args: [id],
      }));

      const results = await publicClient.multicall({ contracts: calls });

      // Step 4: Decode metadata and check for Kokonut tag
      const fetchedAgents: AgentWithDetails[] = [];

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const agentId = Number(agentIds[i]);

        if (result.status === 'success' && result.result) {
          const uri = result.result as string;
          const metadata = decodeAgentMetadata(uri);
          const hasKokonutTag = metadata?.source === 'kokonut-marketplace';

          addLog('contract', `Agent ${agentId} metadata check`, {
            hasMetadata: !!metadata,
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
        } else {
          addLog('error', `Failed to fetch tokenURI for agent ${agentId}`, result);
        }
      }

      addLog(
        'contract',
        `Total agents: ${fetchedAgents.length}, Tagged: ${fetchedAgents.filter(a => a.hasKokonutTag).length}`
      );

      setAgents(fetchedAgents);
    } catch (err) {
      console.error('Error fetching agents:', err);
      addLog('error', 'Error fetching agents', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch agents'));
    } finally {
      setIsLoading(false);
    }
  }, [publicClient, ownerAddress, balance, addLog]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

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
