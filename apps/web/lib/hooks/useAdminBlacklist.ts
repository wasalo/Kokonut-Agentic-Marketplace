'use client';

import { useState, useCallback } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { getContractAddress } from '@/lib/contracts/config';
import { ADMIN_REGISTRY_BLACKLIST_ABI } from '@/lib/contracts/abis';

const ADMIN_REGISTRY_ADDRESS = getContractAddress('ADMIN_REGISTRY');

export interface BlacklistEntry {
  isBlacklisted: boolean;
  blacklistedAt: bigint;
  activationAt: bigint;
  reason: string;
  blacklistedBy: string;
  autoSlashed: boolean;
}

export function useAdminBlacklist() {
  const [error, setError] = useState<string | null>(null);

  // Read: Get blacklisted agent count
  const { data: agentCount, refetch: refetchAgentCount } = useReadContract({
    address: ADMIN_REGISTRY_ADDRESS,
    abi: ADMIN_REGISTRY_BLACKLIST_ABI,
    functionName: 'getBlacklistedAgentCount',
  } as any);

  // Read: Get blacklisted wallet count
  const { data: walletCount, refetch: refetchWalletCount } = useReadContract({
    address: ADMIN_REGISTRY_ADDRESS,
    abi: ADMIN_REGISTRY_BLACKLIST_ABI,
    functionName: 'getBlacklistedWalletCount',
  } as any);

  // Write: Blacklist agent
  const { writeContract: blacklistAgent, data: agentHash } = useWriteContract();
  const { isLoading: isBlacklistingAgent, isSuccess: agentBlacklisted } = useWaitForTransactionReceipt({
    hash: agentHash,
  });

  const handleBlacklistAgent = useCallback(
    (agentId: bigint, reason: string) => {
      try {
        setError(null);
        blacklistAgent({
          address: ADMIN_REGISTRY_ADDRESS,
          abi: ADMIN_REGISTRY_BLACKLIST_ABI,
          functionName: 'blacklistAgent',
          args: [agentId, reason],
        } as any);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to blacklist agent');
      }
    },
    [blacklistAgent]
  );

  // Write: Unblacklist agent
  const { writeContract: unblacklistAgent, data: unagentHash } = useWriteContract();
  const { isLoading: isUnblacklistingAgent, isSuccess: agentUnblacklisted } = useWaitForTransactionReceipt({
    hash: unagentHash,
  });

  const handleUnblacklistAgent = useCallback(
    (agentId: bigint) => {
      try {
        setError(null);
        unblacklistAgent({
          address: ADMIN_REGISTRY_ADDRESS,
          abi: ADMIN_REGISTRY_BLACKLIST_ABI,
          functionName: 'unblacklistAgent',
          args: [agentId],
        } as any);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to unblacklist agent');
      }
    },
    [unblacklistAgent]
  );

  // Write: Blacklist wallet
  const { writeContract: blacklistWallet, data: walletHash } = useWriteContract();
  const { isLoading: isBlacklistingWallet, isSuccess: walletBlacklisted } = useWaitForTransactionReceipt({
    hash: walletHash,
  });

  const handleBlacklistWallet = useCallback(
    (wallet: `0x${string}`, reason: string) => {
      try {
        setError(null);
        blacklistWallet({
          address: ADMIN_REGISTRY_ADDRESS,
          abi: ADMIN_REGISTRY_BLACKLIST_ABI,
          functionName: 'blacklistWallet',
          args: [wallet, reason],
        } as any);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to blacklist wallet');
      }
    },
    [blacklistWallet]
  );

  // Write: Unblacklist wallet
  const { writeContract: unblacklistWallet, data: unwalletHash } = useWriteContract();
  const { isLoading: isUnblacklistingWallet, isSuccess: walletUnblacklisted } = useWaitForTransactionReceipt({
    hash: unwalletHash,
  });

  const handleUnblacklistWallet = useCallback(
    (wallet: `0x${string}`) => {
      try {
        setError(null);
        unblacklistWallet({
          address: ADMIN_REGISTRY_ADDRESS,
          abi: ADMIN_REGISTRY_BLACKLIST_ABI,
          functionName: 'unblacklistWallet',
          args: [wallet],
        } as any);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to unblacklist wallet');
      }
    },
    [unblacklistWallet]
  );

  return {
    // Stats
    agentCount: agentCount ? Number(agentCount) : 0,
    walletCount: walletCount ? Number(walletCount) : 0,
    refetchAgentCount,
    refetchWalletCount,

    // Agent operations
    blacklistAgent: handleBlacklistAgent,
    unblacklistAgent: handleUnblacklistAgent,
    isBlacklistingAgent,
    isUnblacklistingAgent,
    agentBlacklisted,
    agentUnblacklisted,

    // Wallet operations
    blacklistWallet: handleBlacklistWallet,
    unblacklistWallet: handleUnblacklistWallet,
    isBlacklistingWallet,
    isUnblacklistingWallet,
    walletBlacklisted,
    walletUnblacklisted,

    // Utility
    error,
  };
}

export function useIsAgentBlacklisted(agentId: bigint | undefined) {
  const { data, isLoading, error } = useReadContract({
    address: ADMIN_REGISTRY_ADDRESS,
    abi: ADMIN_REGISTRY_BLACKLIST_ABI,
    functionName: 'isAgentBlacklistedActive',
    args: agentId !== undefined ? [agentId] : undefined,
    query: {
      enabled: agentId !== undefined,
    },
  } as any);

  return { isBlacklisted: data, isLoading, error };
}

export function useIsWalletBlacklisted(wallet: `0x${string}` | undefined) {
  const { data, isLoading, error } = useReadContract({
    address: ADMIN_REGISTRY_ADDRESS,
    abi: ADMIN_REGISTRY_BLACKLIST_ABI,
    functionName: 'isWalletBlacklistedActive',
    args: wallet !== undefined ? [wallet] : undefined,
    query: {
      enabled: wallet !== undefined,
    },
  } as any);

  return { isBlacklisted: data, isLoading, error };
}