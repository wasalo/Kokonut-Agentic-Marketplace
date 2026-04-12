'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePublicClient } from 'wagmi';
import { parseAbiItem } from 'viem';
import { getContractAddress, debugLog, DEFAULT_FROM_BLOCK } from '@/lib/contracts/config';
import { SERVICE_REGISTRY_ABI } from '@/lib/contracts/abis';

const SERVICE_REGISTRY_ADDRESS = getContractAddress('SERVICE_REGISTRY');

// From block 9989393 as specified by user
const FROM_BLOCK = DEFAULT_FROM_BLOCK;

export interface Service {
  id: bigint;
  provider: `0x${string}`;
  agentId: bigint;
  name: string;
  description: string;
  metadataURI: string;
  price: bigint;
  paymentToken: `0x${string}`;
  isActive: boolean;
  createdAt: bigint;
}

/**
 * Fetch services using event logs
 * This is more reliable than calling non-existent view functions
 */
export function useServicesFromEvents() {
  const publicClient = usePublicClient();
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchServices = useCallback(async () => {
    if (!publicClient) return;

    setIsLoading(true);
    setError(null);

    try {
      debugLog('contracts', 'Fetching services from events...');

      // Query ServiceCreated events
      const logs = await publicClient.getLogs({
        address: SERVICE_REGISTRY_ADDRESS,
        event: parseAbiItem(
          'event ServiceCreated(uint256 indexed serviceId, address indexed provider, uint256 indexed agentId)'
        ),
        fromBlock: FROM_BLOCK,
        toBlock: 'latest',
      });

      debugLog('contracts', `Found ${logs.length} service creation events`);

      if (logs.length === 0) {
        setServices([]);
        setIsLoading(false);
        return;
      }

      // Get unique service IDs
      const serviceIds = [...new Set(logs.map(log => log.args.serviceId))].filter(Boolean);

      // Batch fetch service details using multicall
      const calls = serviceIds.map(id => ({
        address: SERVICE_REGISTRY_ADDRESS,
        abi: SERVICE_REGISTRY_ABI,
        functionName: 'getService' as const,
        args: [id],
      }));

      const results = await publicClient.multicall({ contracts: calls });

      const fetchedServices: Service[] = [];

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (result.status === 'success' && result.result) {
          const data = result.result as any;
          fetchedServices.push({
            id: data.id || serviceIds[i],
            provider: data.provider,
            agentId: data.agentId,
            name: data.name || '',
            description: data.description || '',
            metadataURI: data.metadataURI || '',
            price: data.price || BigInt(0),
            paymentToken: data.paymentToken,
            isActive: data.isActive || false,
            createdAt: data.createdAt || BigInt(0),
          });
        }
      }

      // Filter only active services
      const activeServices = fetchedServices.filter(s => s.isActive);

      debugLog('contracts', `Loaded ${activeServices.length} active services`);
      setServices(activeServices);
    } catch (err) {
      console.error('Error fetching services:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch services'));
    } finally {
      setIsLoading(false);
    }
  }, [publicClient]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  return { services, isLoading, error, refetch: fetchServices };
}

/**
 * Fetch services for a specific provider
 */
export function useProviderServicesFromEvents(provider: `0x${string}` | undefined) {
  const { services, isLoading, error, refetch } = useServicesFromEvents();

  const providerServices = services.filter(
    s => provider && s.provider.toLowerCase() === provider.toLowerCase()
  );

  return { services: providerServices, isLoading, error, refetch };
}

/**
 * Get count of active services
 */
export function useActiveServiceCountFromEvents() {
  const { services, isLoading, error } = useServicesFromEvents();

  return { count: services.length, isLoading, error };
}
