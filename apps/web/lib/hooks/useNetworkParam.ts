'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { getChainById, getDefaultChain, SUPPORTED_CHAINS } from '@/lib/chains';
import { chainIdToCAIP, caipToChainId } from '@/lib/caip';
import { isChainDeployed, getContractsByChainId } from '@/lib/contracts/config';

export interface NetworkState {
  network: string;      // 'sepolia', 'base', etc.
  chainId: number;      // 11155111, 8453, etc.
  caip: string;       // 'eip155:11155111', etc.
  isValid: boolean;    // Valid chain
  isDeployed: boolean; // Has contracts deployed
  isDefault: boolean; // Default network (Sepolia)
  chainConfig: ReturnType<typeof getChainById>;
}

const DEFAULT_CHAIN_ID = 11155111;
const DEFAULT_CAIP = chainIdToCAIP(DEFAULT_CHAIN_ID);
const DEFAULT_NETWORK = 'sepolia';

// Map network slugs to chainIds
const NETWORK_TO_CHAIN: Record<string, number> = {};
SUPPORTED_CHAINS.forEach(chain => {
  const slug = chain.shortName?.toLowerCase() || String(chain.id);
  NETWORK_TO_CHAIN[slug] = chain.id;
});

export function useNetworkParam(): NetworkState {
  const searchParams = useSearchParams();

  const chainIdParam = searchParams.get('chainId');
  const networkParam = searchParams.get('network');

  const state = useMemo((): NetworkState => {
    // Prefer chainId query param
    if (chainIdParam) {
      const chainId = parseInt(chainIdParam, 10);
      const chainConfig = getChainById(chainId);
      if (chainConfig) {
        return {
          network: chainConfig.shortName?.toLowerCase() || DEFAULT_NETWORK,
          chainId,
          caip: chainIdToCAIP(chainId),
          isValid: true,
          isDeployed: isChainDeployed(chainId),
          isDefault: chainId === DEFAULT_CHAIN_ID,
          chainConfig,
        };
      }
    }

    // Network query param
    if (networkParam) {
      const chainId = NETWORK_TO_CHAIN[networkParam.toLowerCase()];
      if (chainId) {
        const chainConfig = getChainById(chainId);
        return {
          network: networkParam.toLowerCase(),
          chainId,
          caip: chainIdToCAIP(chainId),
          isValid: true,
          isDeployed: isChainDeployed(chainId),
          isDefault: chainId === DEFAULT_CHAIN_ID,
          chainConfig,
        };
      }
    }

    // No network specified - use default
    const defaultChain = getDefaultChain();
    return {
      network: defaultChain.shortName?.toLowerCase() || DEFAULT_NETWORK,
      chainId: defaultChain.id,
      caip: chainIdToCAIP(defaultChain.id),
      isValid: true,
      isDeployed: isChainDeployed(defaultChain.id),
      isDefault: true,
      chainConfig: defaultChain,
    };
  }, [chainIdParam, networkParam]);

  return state;
}

// Hook for set network via query params
export function useSetNetwork() {
  return (network: string | number, { replace = false }: { replace?: boolean } = {}) => {
    const params = new URLSearchParams();
    
    if (typeof network === 'number') {
      params.set('chainId', String(network));
    } else {
      params.set('network', network.toLowerCase());
    }
    
    const path = typeof window !== 'undefined' ? window.location.pathname : '/';
    const separator = path.includes('?') ? '&' : '?';
    const newUrl = replace ? `${path.split('?')[0]}${separator}${params.toString()}` : `${path}${separator}${params.toString()}`;
    
    window.location.href = newUrl;
  };
}

// Get contracts for current network
export function useCurrentContracts() {
  const { chainId, isValid } = useNetworkParam();
  
  if (!isValid) return undefined;
  return getContractsByChainId(chainId);
}

// Export constants for external use
export const DEFAULT_NETWORK_STATE: NetworkState = {
  network: DEFAULT_NETWORK,
  chainId: DEFAULT_CHAIN_ID,
  caip: DEFAULT_CAIP,
  isValid: true,
  isDeployed: true,
  isDefault: true,
  chainConfig: getDefaultChain(),
};