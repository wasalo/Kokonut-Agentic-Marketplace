'use client';

import { useState, useEffect, useCallback } from 'react';
import { useReadContract, useReadContracts } from 'wagmi';
import { SERVICE_REGISTRY_ABI } from '@/lib/contracts/abis';
import { getContractAddress, debugLog } from '@/lib/contracts/config';
import { useDebug } from '@/contexts/DebugContext';

const SERVICE_REGISTRY_ADDRESS = getContractAddress('SERVICE_REGISTRY');

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

interface UseServicesContractReturn {
  services: Service[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook to fetch services using contract functions GetServices and getService
 * Uses direct contract calls for reliability
 */
export function useServicesContract(start = 0, count = 20): UseServicesContractReturn {
  const { addLog } = useDebug();
  const [services, setServices] = useState<Service[]>([]);

  // Step 1: Get service IDs using getServices
  const {
    data: serviceIds,
    isLoading: isLoadingIds,
    error: idsError,
    refetch: refetchIds,
  } = useReadContract({
    address: SERVICE_REGISTRY_ADDRESS,
    abi: SERVICE_REGISTRY_ABI,
    functionName: 'getServices',
    args: [BigInt(start), BigInt(count)],
    query: {
      retry: 2,
    },
  });

  // Step 2: Batch fetch service details
  const calls = Array.isArray(serviceIds)
    ? serviceIds.map((id: bigint) => ({
        address: SERVICE_REGISTRY_ADDRESS,
        abi: SERVICE_REGISTRY_ABI,
        functionName: 'getService' as const,
        args: [id],
      }))
    : [];

  const {
    data: serviceData,
    isLoading: isLoadingDetails,
    error: detailsError,
    refetch: refetchDetails,
  } = useReadContracts({
    contracts: calls,
    query: {
      enabled: calls.length > 0,
      retry: 2,
    },
  });

  // Process results
  useEffect(() => {
    if (serviceData) {
      const fetchedServices: Service[] = [];

      for (let i = 0; i < serviceData.length; i++) {
        const result = serviceData[i];
        if (result.status === 'success' && result.result) {
          const data = result.result as any;
          const serviceId = Array.isArray(serviceIds) ? serviceIds[i] : BigInt(i);
          fetchedServices.push({
            id: data.id || serviceId,
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

      addLog('contract', `Fetched ${fetchedServices.length} services`, { start, count });
      setServices(fetchedServices);
    }
  }, [serviceData, serviceIds, start, count, addLog]);

  const refetch = useCallback(() => {
    refetchIds();
    refetchDetails();
  }, [refetchIds, refetchDetails]);

  const isLoading = isLoadingIds || isLoadingDetails;
  const error = idsError || detailsError;

  return { services, isLoading, error, refetch };
}

/**
 * Get all active services
 */
export function useAllServices() {
  const { services, isLoading, error, refetch } = useServicesContract(0, 100);

  // Filter active services
  const activeServices = services.filter(s => s.isActive);

  return { services: activeServices, isLoading, error, refetch };
}

/**
 * Get services by provider
 */
export function useProviderServicesContract(provider: `0x${string}` | undefined) {
  const { services, isLoading, error, refetch } = useAllServices();

  const providerServices = provider
    ? services.filter(s => s.provider.toLowerCase() === provider.toLowerCase())
    : [];

  return { services: providerServices, isLoading, error, refetch };
}

/**
 * Get single service by ID
 */
export function useServiceContract(serviceId: bigint | number | undefined) {
  const id = serviceId !== undefined ? BigInt(serviceId) : undefined;

  const { data, isLoading, error, refetch } = useReadContract({
    address: SERVICE_REGISTRY_ADDRESS,
    abi: SERVICE_REGISTRY_ABI,
    functionName: 'getService',
    args: id !== undefined ? [id] : undefined,
    query: {
      enabled: id !== undefined,
      retry: 2,
    },
  });

  const service: Service | null = data
    ? {
        id: (data as any).id || id!,
        provider: (data as any).provider,
        agentId: (data as any).agentId,
        name: (data as any).name || '',
        description: (data as any).description || '',
        metadataURI: (data as any).metadataURI || '',
        price: (data as any).price || BigInt(0),
        paymentToken: (data as any).paymentToken,
        isActive: (data as any).isActive || false,
        createdAt: (data as any).createdAt || BigInt(0),
      }
    : null;

  return { service, isLoading, error, refetch };
}
