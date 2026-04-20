"use client";

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseAbiItem } from 'viem';
import { getContractAddress } from '@/lib/contracts/config';
import { ADMIN_REGISTRY_ABI } from '@/lib/contracts/abis';

export const useAdminRegistry = () => {
  const adminRegistryAddress = getContractAddress('ADMIN_REGISTRY');

  // Read functions
  const { data: halfLifeDays, isLoading: isLoadingHalfLife } = useReadContract({
    address: adminRegistryAddress,
    abi: ADMIN_REGISTRY_ABI,
    functionName: 'getHalfLifeDays',
  });

  const { data: featuredAgents, isLoading: isLoadingFeaturedAgents } = useReadContract({
    address: adminRegistryAddress,
    abi: ADMIN_REGISTRY_ABI,
    functionName: 'getFeaturedAgents',
  });

  const { data: verificationProviders, isLoading: isLoadingVerificationProviders } = useReadContract({
    address: adminRegistryAddress,
    abi: ADMIN_REGISTRY_ABI,
    functionName: 'getVerificationProviders',
  });

  // Write functions
  const { writeContractAsync, data: writeHash, error: writeError } = useWriteContract();
  const { data: receipt, isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: writeHash,
  });

  const setHalfLifeDays = async (halfLifeDays: bigint) => {
    await writeContractAsync({
      address: adminRegistryAddress,
      abi: ADMIN_REGISTRY_ABI,
      functionName: 'setHalfLifeDays',
      args: [halfLifeDays],
    });
  };

  const setFeaturedAgent = async (agentId: bigint, isFeatured: boolean) => {
    await writeContractAsync({
      address: adminRegistryAddress,
      abi: ADMIN_REGISTRY_ABI,
      functionName: 'setFeaturedAgent',
      args: [agentId, isFeatured],
    });
  };

  const setVerificationProvider = async (provider: string, isActive: boolean) => {
    await writeContractAsync({
      address: adminRegistryAddress,
      abi: ADMIN_REGISTRY_ABI,
      functionName: 'setVerificationProvider',
      args: [provider, isActive],
    });
  };

  return {
    halfLifeDays,
    isLoadingHalfLife,
    featuredAgents,
    isLoadingFeaturedAgents,
    verificationProviders,
    isLoadingVerificationProviders,
    setHalfLifeDays,
    setFeaturedAgent,
    setVerificationProvider,
    writeHash,
    isConfirming,
    isConfirmed,
    receipt,
    writeError,
  };
};