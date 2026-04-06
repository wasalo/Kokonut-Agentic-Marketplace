'use client';

import { useReadContract } from 'wagmi';
import { ERC8004_ABI } from '@/lib/8004contracts';
import { decodeAgentMetadata, type AgentMetadata8004 } from '@/lib/metadata';
import { getContractAddress } from '@/lib/contracts/config';

const ERC8004_ADDRESS = getContractAddress('ERC8004_REGISTRY');

export interface ImportedAgent {
  agentId: bigint;
  owner: `0x${string}`;
  agentURI: string;
  isActive: boolean;
  metadata: AgentMetadata8004 | null;
}

const RESOLVE_AGENT_ABI = [
  {
    inputs: [{ name: 'agentAddress', type: 'address' }],
    name: 'resolveAgent',
    outputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'agentURI', type: 'string' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

/** Check if a wallet is registered on the official ERC-8004 registry by checking balance */
export function useERC8004Agent(address: `0x${string}` | undefined) {
  const {
    data: balance,
    isLoading: isChecking,
    error: checkError,
  } = useReadContract({
    address: ERC8004_ADDRESS,
    abi: ERC8004_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      retry: 2,
      staleTime: 30 * 1000,
    },
  });

  const isRegistered = balance !== undefined && balance > BigInt(0);

  return {
    isRegistered,
    agentCount: balance ? Number(balance) : 0,
    isLoading: isChecking,
    error: checkError,
  };
}
