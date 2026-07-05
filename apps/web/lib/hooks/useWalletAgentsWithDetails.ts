'use client';

import { useMemo } from 'react';
import { usePublicClient, useReadContract } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { parseAbiItem } from 'viem';
import { ERC8004_ABI } from '@/lib/8004contracts';
import { decodeAgentMetadata } from '@/lib/metadata';
import { getContractAddress, DEFAULT_FROM_BLOCK } from '@/lib/contracts/config';

const ERC8004_ADDRESS = getContractAddress('ERC8004_REGISTRY');
const FROM_BLOCK = DEFAULT_FROM_BLOCK;

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

export function useWalletAgentsWithDetails(
  ownerAddress: `0x${string}` | undefined
): UseWalletAgentsWithDetailsReturn {
  const publicClient = usePublicClient();

  const { data: balance, isLoading: isLoadingBalance } = useReadContract({
    address: ERC8004_ADDRESS,
    abi: ERC8004_ABI,
    functionName: 'balanceOf',
    args: ownerAddress ? [ownerAddress] : undefined,
    query: { enabled: !!ownerAddress },
  });

  const query = useQuery<AgentWithDetails[]>({
    queryKey: ['wallet-agents-details', ownerAddress, balance?.toString()],
    queryFn: async () => {
      if (!publicClient || !ownerAddress || !balance || balance === BigInt(0)) return [];

      const logs = await publicClient.getLogs({
        address: ERC8004_ADDRESS,
        event: parseAbiItem(
          'event Registered(uint256 indexed agentId, string agentURI, address indexed owner)'
        ),
        fromBlock: FROM_BLOCK,
        toBlock: 'latest',
        args: { owner: ownerAddress },
      });

      if (logs.length === 0) return [];

      const agentIds = logs.map(log => log.args.agentId).filter(Boolean) as bigint[];
      const calls = agentIds.map(id => ({
        address: ERC8004_ADDRESS,
        abi: ERC8004_ABI,
        functionName: 'tokenURI' as const,
        args: [id],
      }));

      const results = await publicClient.multicall({ contracts: calls });
      const fetchedAgents: AgentWithDetails[] = [];

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const agentId = Number(agentIds[i]);

        if (result.status === 'success' && result.result && result.result !== '') {
          const uri = result.result as string;
          const metadata = decodeAgentMetadata(uri);
          fetchedAgents.push({
            id: agentId,
            owner: ownerAddress,
            agentURI: uri,
            metadata,
            hasKokonutTag: metadata?.source === 'kokonut-marketplace' || metadata?.source === 'kokonut-intelligence',
          });
        } else if (result.status === 'success' && result.result === '') {
          fetchedAgents.push({
            id: agentId,
            owner: ownerAddress,
            agentURI: '',
            metadata: null,
            hasKokonutTag: false,
          });
        }
      }

      return fetchedAgents;
    },
    enabled: !!publicClient && !!ownerAddress && balance !== undefined && balance !== BigInt(0),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const agents = useMemo(() => query.data ?? [], [query.data]);
  const taggedAgents = useMemo(() => agents.filter(a => a.hasKokonutTag), [agents]);
  const untaggedAgents = useMemo(() => agents.filter(a => !a.hasKokonutTag), [agents]);

  return {
    agents,
    taggedAgents,
    untaggedAgents,
    isLoading: query.isLoading || isLoadingBalance,
    error: query.error,
    refetch: query.refetch,
  };
}
