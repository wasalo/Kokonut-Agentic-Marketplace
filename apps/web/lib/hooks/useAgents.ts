'use client';

import { useReadContract, useWriteContract } from 'wagmi';
import { ERC8004_ABI } from '@/lib/8004contracts';
import { decodeAgentMetadata, type AgentMetadata8004 } from '@/lib/metadata';
import { CONTRACT_ADDRESSES, getContractAddress, debugLog } from '@/lib/contracts/config';

const ERC8004_ADDRESS = getContractAddress(
  process.env.NEXT_PUBLIC_8004_REGISTRY_ADDRESS,
  CONTRACT_ADDRESSES.sepolia.erc8004Registry
);

export interface Agent {
  id: number;
  owner: `0x${string}`;
  agentURI: string;
  metadata: AgentMetadata8004 | null;
  isActive?: boolean;
  createdAt?: string;
}

// ============ Read Hooks (ERC721 Standard) ============

export function useAgentOwner(agentId: bigint | undefined) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: ERC8004_ADDRESS,
    abi: ERC8004_ABI,
    functionName: 'ownerOf',
    args: agentId !== undefined ? [agentId] : undefined,
    query: {
      enabled: agentId !== undefined,
      retry: 2,
      staleTime: 30 * 1000,
    },
  });

  return {
    owner: data as `0x${string}` | undefined,
    isLoading,
    error,
    refetch,
  };
}

export function useAgentTokenURI(agentId: bigint | undefined) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: ERC8004_ADDRESS,
    abi: ERC8004_ABI,
    functionName: 'tokenURI',
    args: agentId !== undefined ? [agentId] : undefined,
    query: {
      enabled: agentId !== undefined,
      retry: 2,
      staleTime: 30 * 1000,
    },
  });

  const metadata = data ? decodeAgentMetadata(data as string) : null;

  return {
    uri: data as string | undefined,
    metadata,
    isLoading,
    error,
    refetch,
  };
}

export function useAgentMetadata(agentId: bigint | undefined, key: string) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: ERC8004_ADDRESS,
    abi: ERC8004_ABI,
    functionName: 'getMetadata',
    args: agentId !== undefined && key ? [agentId, key] : undefined,
    query: {
      enabled: agentId !== undefined && !!key,
      retry: 2,
      staleTime: 60 * 1000,
    },
  });

  return {
    metadata: data as `0x${string}` | undefined,
    isLoading,
    error,
    refetch,
  };
}

export function useAgentWallet(agentId: bigint | undefined) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: ERC8004_ADDRESS,
    abi: ERC8004_ABI,
    functionName: 'getAgentWallet',
    args: agentId !== undefined ? [agentId] : undefined,
    query: {
      enabled: agentId !== undefined,
      retry: 2,
      staleTime: 30 * 1000,
    },
  });

  return {
    wallet: data as `0x${string}` | undefined,
    isLoading,
    error,
    refetch,
  };
}

// ============ Write Hooks ============

export function useRegisterAgent() {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();

  return {
    register: (agentURI: string) =>
      writeContract({
        address: ERC8004_ADDRESS,
        abi: ERC8004_ABI,
        functionName: 'register',
        args: [agentURI],
      }),
    hash,
    isPending,
    error,
    reset,
  };
}

export function useSetAgentURI() {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();

  return {
    setAgentURI: (agentId: bigint, newURI: string) =>
      writeContract({
        address: ERC8004_ADDRESS,
        abi: ERC8004_ABI,
        functionName: 'setAgentURI',
        args: [agentId, newURI],
      }),
    hash,
    isPending,
    error,
    reset,
  };
}

export function useSetAgentMetadata() {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();

  return {
    setMetadata: (agentId: bigint, key: string, value: `0x${string}`) =>
      writeContract({
        address: ERC8004_ADDRESS,
        abi: ERC8004_ABI,
        functionName: 'setMetadata',
        args: [agentId, key, value],
      }),
    hash,
    isPending,
    error,
    reset,
  };
}

export function useSetAgentWallet() {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();

  return {
    setAgentWallet: (
      agentId: bigint,
      newWallet: `0x${string}`,
      deadline: bigint,
      signature: `0x${string}`
    ) =>
      writeContract({
        address: ERC8004_ADDRESS,
        abi: ERC8004_ABI,
        functionName: 'setAgentWallet',
        args: [agentId, newWallet, deadline, signature],
      }),
    hash,
    isPending,
    error,
    reset,
  };
}

export function useUnsetAgentWallet() {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();

  return {
    unsetAgentWallet: (agentId: bigint) =>
      writeContract({
        address: ERC8004_ADDRESS,
        abi: ERC8004_ABI,
        functionName: 'unsetAgentWallet',
        args: [agentId],
      }),
    hash,
    isPending,
    error,
    reset,
  };
}

// ============ Aggregate Hooks ============

/**
 * Hook to fetch all agents with pagination
 * Note: This is a simplified version that returns an empty array
 * In production, you would fetch agents from an indexer or subgraph
 */
export function useAgents(start: number = 0, count: number = 20) {
  // This is a placeholder implementation
  // In production, this should fetch from an indexer or event logs
  return {
    agents: [] as Agent[],
    totalCount: 0,
    isLoading: false,
    error: null as Error | null,
    refetch: () => Promise.resolve(),
  };
}
