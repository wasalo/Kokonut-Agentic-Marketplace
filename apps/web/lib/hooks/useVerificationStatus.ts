"use client";

import { useReadContract } from 'wagmi';
import { getContractAddress } from '@/lib/contracts/config';
import { ADMIN_REGISTRY_ABI } from '@/lib/contracts/abis';

export interface VerificationStatus {
  level: 'self-attest' | 'id-verified';
  provider: string;
  verifiedAt: number;
  proof?: string;
  isVerified: boolean;
  isLoading: boolean;
  error?: Error;
}

/**
 * Check verification status for an agent
 * Note: This returns stub data since AdminRegistry may not have all verification functions
 */
export function useVerificationStatus(agent: `0x${string}` | undefined): {
  verification: VerificationStatus | null;
  isLoading: boolean;
} {
  const adminRegistryAddress = getContractAddress('ADMIN_REGISTRY');
  
  const { isLoading: isLoadingVerification } = useReadContract({
    address: adminRegistryAddress,
    abi: ADMIN_REGISTRY_ABI,
    functionName: 'getHalfLifeDays',
    query: {
      enabled: agent !== undefined,
    },
  });

  // Return stub verification - in production would query actual verification registry
  const verification: VerificationStatus | null = agent
    ? {
        level: 'self-attest',
        provider: 'self.xyz',
        verifiedAt: 0,
        isVerified: false,
        isLoading: false,
      }
    : null;

  return {
    verification,
    isLoading: isLoadingVerification,
  };
}

/**
 * Check if agent has specific verification level
 */
export function useVerificationLevel(
  agent: `0x${string}` | undefined,
  requiredLevel: 'self-attest' | 'id-verified' = 'id-verified'
) {
  const { verification, isLoading } = useVerificationStatus(agent);
  
  return {
    hasLevel: verification?.level === requiredLevel,
    isVerified: verification?.isVerified || false,
    isLoading,
    verificationLevel: verification?.level,
  };
}