'use client';

import { useReadContract } from 'wagmi';
import { ERC8004_ABI } from '@/lib/8004contracts';
import { type AgentMetadata8004 } from '@/lib/metadata';
import { CONTRACT_ADDRESSES, getContractAddress } from '@/lib/contracts/config';

const ERC8004_ADDRESS = getContractAddress(
  process.env.NEXT_PUBLIC_8004_REGISTRY_ADDRESS,
  CONTRACT_ADDRESSES.sepolia.erc8004Registry
);

export interface ImportedAgent {
  agentId: bigint;
  owner: `0x${string}`;
  agentURI: string;
  isActive: boolean;
  metadata: AgentMetadata8004 | null;
}



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
