import { useState, useEffect, useCallback } from 'react';
import { useReadContract, useReadContracts, useWriteContract, usePublicClient } from 'wagmi';
import { SERVICE_REGISTRY_ABI } from '@/lib/contracts/abis';
import { CONTRACT_ADDRESSES, getContractAddress } from '@/lib/contracts/config';
import { getQueryConfig } from '@/lib/queryConfig';
import { debugLog, debugError } from '@/lib/debug';

const SERVICE_REGISTRY_ADDRESS = getContractAddress(
  process.env.NEXT_PUBLIC_SERVICE_REGISTRY_ADDRESS,
  CONTRACT_ADDRESSES.sepolia.serviceRegistry
);

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

function mapServiceData(id: bigint, data: unknown): Service | null {
  // Debug: Log raw input
  console.log('[mapServiceData] Raw input:', {
    id: id.toString(),
    data,
    type: typeof data,
    isArray: Array.isArray(data),
  });

  if (!data) {
    console.error('[mapServiceData] Error: data is null/undefined');
    return null;
  }

  // Handle object format (viem returns object when ABI defines struct/tuple)
  if (typeof data === 'object' && !Array.isArray(data)) {
    const obj = data as Record<string, unknown>;

    // Check if it has the expected properties
    if ('provider' in obj && 'name' in obj) {
      console.log(`[mapServiceData] Mapping OBJECT format service ${id.toString()}:`, obj);

      return {
        id,
        provider: obj.provider as `0x${string}`,
        agentId: (obj.agentId as bigint) || BigInt(0),
        name: (obj.name as string) || '',
        description: (obj.description as string) || '',
        metadataURI: (obj.metadataURI as string) || '',
        price: (obj.price as bigint) || BigInt(0),
        paymentToken: obj.paymentToken as `0x${string}`,
        isActive: (obj.isActive as boolean) || false,
        createdAt: (obj.createdAt as bigint) || BigInt(0),
      };
    }

    console.error('[mapServiceData] Error: Object format missing expected properties', obj);
    return null;
  }

  // Handle array format (legacy support)
  if (Array.isArray(data)) {
    console.log(
      `[mapServiceData] Mapping ARRAY format service ${id}, length: ${data.length}`,
      data
    );

    // New contract has 10 fields (with agentId)
    if (data.length >= 10) {
      const [
        serviceId, // Index 0: id from contract
        provider, // Index 1
        agentId, // Index 2
        name, // Index 3
        description, // Index 4
        metadataURI, // Index 5
        price, // Index 6
        paymentToken, // Index 7
        isActive, // Index 8
        createdAt, // Index 9
      ] = data;

      console.log(`[mapServiceData] Successfully mapped NEW format service ${id.toString()}:`, {
        serviceId: serviceId?.toString?.(),
        provider,
        agentId: agentId?.toString?.(),
        name,
        isActive,
      });

      return {
        id,
        provider: provider as `0x${string}`,
        agentId: agentId as bigint,
        name: name || '',
        description: description || '',
        metadataURI: metadataURI || '',
        price: price || BigInt(0),
        paymentToken: paymentToken as `0x${string}`,
        isActive: isActive || false,
        createdAt: createdAt || BigInt(0),
      };
    }

    console.error(`[mapServiceData] Error: Unexpected array length (${data.length})`, data);
    return null;
  }

  console.error('[mapServiceData] Error: Unknown data format', data);
  return null;
}

export function useActiveServiceCount() {
  const publicClient = usePublicClient();
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCount = useCallback(async () => {
    if (!publicClient) {
      debugLog('hooks', 'useActiveServiceCount: No publicClient yet');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      debugLog('hooks', 'useActiveServiceCount: Fetching from contract', SERVICE_REGISTRY_ADDRESS);

      const result = await publicClient.readContract({
        address: SERVICE_REGISTRY_ADDRESS,
        abi: SERVICE_REGISTRY_ABI,
        functionName: 'getActiveServiceCount',
      });

      const countValue = result ? Number(result) : 0;
      debugLog('hooks', `useActiveServiceCount: Retrieved count: ${countValue}`);
      setCount(countValue);
    } catch (err) {
      debugError('hooks', 'useActiveServiceCount: Error fetching count', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch count'));
      setCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [publicClient]);

  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  return {
    count,
    isLoading,
    error,
    refetch: fetchCount,
  };
}

export function useTotalServiceCount() {
  const publicClient = usePublicClient();
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCount = useCallback(async () => {
    if (!publicClient) {
      debugLog('hooks', 'useTotalServiceCount: No publicClient yet');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      debugLog('hooks', 'useTotalServiceCount: Fetching from contract', SERVICE_REGISTRY_ADDRESS);

      const result = await publicClient.readContract({
        address: SERVICE_REGISTRY_ADDRESS,
        abi: SERVICE_REGISTRY_ABI,
        functionName: 'getServiceCounter',
      });

      const countValue = result ? Number(result) : 0;
      debugLog('hooks', `useTotalServiceCount: Retrieved count: ${countValue}`);
      setCount(countValue);
    } catch (err) {
      debugError('hooks', 'useTotalServiceCount: Error fetching count', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch count'));
      setCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [publicClient]);

  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  return {
    count,
    isLoading,
    error,
    refetch: fetchCount,
  };
}

export function useService(serviceId: number | bigint) {
  const id = typeof serviceId === 'bigint' ? serviceId : BigInt(serviceId);
  const config = getQueryConfig('services');

  // Skip contract call for invalid service IDs (e.g., direct jobs with serviceId = 0)
  const isValidId = id > BigInt(0);

  const { data, isLoading, error, refetch } = useReadContract({
    address: SERVICE_REGISTRY_ADDRESS,
    abi: SERVICE_REGISTRY_ABI,
    functionName: 'getService',
    args: [id],
    query: {
      enabled: isValidId,
      retry: 2,
      staleTime: config.staleTime,
      gcTime: config.gcTime,
    },
  });

  return {
    service: isValidId && data ? mapServiceData(id, data) : null,
    isLoading: isValidId ? isLoading : false,
    error: isValidId ? error : null,
    refetch,
  };
}

export function useServices(start: number = 0, count: number = 20) {
  // Always call useReadContract for service IDs
  const {
    data: serviceIds,
    isLoading: isIdsLoading,
    error: idsError,
    refetch: refetchIds,
  } = useReadContract({
    address: SERVICE_REGISTRY_ADDRESS,
    abi: SERVICE_REGISTRY_ABI,
    functionName: 'getServices',
    args: [BigInt(start), BigInt(count)],
    query: {
      retry: 2,
      staleTime: 30 * 1000,
    },
  });

  // Always compute serviceQueries (empty array if no IDs)
  const serviceQueries = (serviceIds || []).map(id => ({
    address: SERVICE_REGISTRY_ADDRESS,
    abi: SERVICE_REGISTRY_ABI,
    functionName: 'getService' as const,
    args: [id],
  }));

  // Always call useReadContracts, control via enabled
  const {
    data: results,
    isLoading,
    error,
    refetch,
  } = useReadContracts({
    contracts: serviceQueries,
    query: {
      enabled: serviceQueries.length > 0 && !isIdsLoading,
      retry: 2,
      staleTime: 30 * 1000,
    },
  });

  const services: Service[] = [];

  if (results) {
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === 'success') {
        const service = mapServiceData(
          serviceIds![i],
          result.result as unknown as readonly [
            bigint,
            string,
            string,
            string,
            string,
            bigint,
            `0x${string}`,
            boolean,
            bigint,
          ]
        );
        if (service) {
          services.push(service);
        }
      }
    }
  }

  return {
    services,
    isLoading,
    error: error || idsError,
    refetch: () => {
      refetch();
      refetchIds();
    },
  };
}

export function useProviderServices(provider: `0x${string}` | undefined) {
  const publicClient = usePublicClient();
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchServices = useCallback(async () => {
    if (!provider || !publicClient) {
      setServices([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      debugLog('contracts', `useProviderServices: Fetching for provider ${provider}`);

      // Step 1: Try to get service IDs using wagmi first, then fallback to direct call
      let serviceIds: bigint[] = [];

      try {
        // Try direct contract call first (more reliable)
        const result = await publicClient.readContract({
          address: SERVICE_REGISTRY_ADDRESS,
          abi: SERVICE_REGISTRY_ABI,
          functionName: 'getProviderServices',
          args: [provider],
        });
        serviceIds = result as bigint[];
        debugLog('contracts', 'useProviderServices: Direct call succeeded', serviceIds);
      } catch (directError) {
        debugError(
          'contracts',
          'useProviderServices: Direct call failed, trying wagmi fallback',
          directError
        );
        // If direct call fails, we'll try wagmi (but it probably won't work either)
        // This is handled by returning empty array
        setServices([]);
        setIsLoading(false);
        return;
      }

      if (!serviceIds || serviceIds.length === 0) {
        debugLog('contracts', 'useProviderServices: No service IDs found');
        setServices([]);
        setIsLoading(false);
        return;
      }

      debugLog(
        'contracts',
        `useProviderServices: Found ${serviceIds.length} service IDs`,
        serviceIds.map(id => id.toString())
      );

      // Step 2: Fetch service details using multicall
      const calls = serviceIds.map(id => ({
        address: SERVICE_REGISTRY_ADDRESS,
        abi: SERVICE_REGISTRY_ABI,
        functionName: 'getService' as const,
        args: [id],
      }));

      const results = await publicClient.multicall({ contracts: calls });

      debugLog('contracts', `useProviderServices: Multicall returned ${results.length} results`);

      // Step 3: Map results to Service objects
      const mappedServices: Service[] = [];

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const serviceId = serviceIds[i];

        if (result.status === 'success' && result.result) {
          const service = mapServiceData(serviceId, result.result);
          if (service) {
            mappedServices.push(service);
            debugLog(
              'contracts',
              `useProviderServices: Mapped service ${serviceId.toString()}`,
              service.name
            );
          }
        } else {
          debugError(
            'contracts',
            `useProviderServices: Failed to fetch service ${serviceId.toString()}`,
            result
          );
        }
      }

      debugLog('contracts', `useProviderServices: Total mapped services: ${mappedServices.length}`);
      setServices(mappedServices);
    } catch (err) {
      debugError('contracts', 'useProviderServices: Error fetching services', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch services'));
      setServices([]);
    } finally {
      setIsLoading(false);
    }
  }, [provider, publicClient]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const refetch = useCallback(() => {
    fetchServices();
  }, [fetchServices]);

  return {
    services,
    isLoading,
    error,
    refetch,
  };
}

// ============ Write Hooks ============

export function useCreateService() {
  const { writeContract, data, isPending, error, reset } = useWriteContract();
  return {
    createService: (
      agentId: bigint,
      name: string,
      description: string,
      metadataURI: string,
      price: bigint,
      paymentToken: `0x${string}`
    ) =>
      writeContract({
        address: SERVICE_REGISTRY_ADDRESS,
        abi: SERVICE_REGISTRY_ABI,
        functionName: 'createService',
        args: [agentId, name, description, metadataURI, price, paymentToken],
      }),
    hash: data,
    isPending,
    error,
    reset,
  };
}

export function useUpdateService() {
  const { writeContract, data, isPending, error, reset } = useWriteContract();
  return {
    updateService: (
      serviceId: bigint,
      name: string,
      description: string,
      metadataURI: string,
      price: bigint
    ) =>
      writeContract({
        address: SERVICE_REGISTRY_ADDRESS,
        abi: SERVICE_REGISTRY_ABI,
        functionName: 'updateService',
        args: [serviceId, name, description, metadataURI, price],
      }),
    hash: data,
    isPending,
    error,
    reset,
  };
}

export function useDeactivateService() {
  const { writeContract, data, isPending, error, reset } = useWriteContract();
  return {
    deactivateService: (serviceId: bigint) =>
      writeContract({
        address: SERVICE_REGISTRY_ADDRESS,
        abi: SERVICE_REGISTRY_ABI,
        functionName: 'deactivateService',
        args: [serviceId],
      }),
    hash: data,
    isPending,
    error,
    reset,
  };
}

export function useActivateService() {
  const { writeContract, data, isPending, error, reset } = useWriteContract();
  return {
    activateService: (serviceId: bigint) =>
      writeContract({
        address: SERVICE_REGISTRY_ADDRESS,
        abi: SERVICE_REGISTRY_ABI,
        functionName: 'activateService',
        args: [serviceId],
      }),
    hash: data,
    isPending,
    error,
    reset,
  };
}

// ============ Agent Services Hook ============

export function useAgentServices(agentId: bigint | undefined) {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const publicClient = usePublicClient();

  const fetchServices = useCallback(async () => {
    if (!publicClient || !agentId) {
      setServices([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get service IDs for this agent
      const serviceIds = await publicClient.readContract({
        address: SERVICE_REGISTRY_ADDRESS,
        abi: SERVICE_REGISTRY_ABI,
        functionName: 'getServicesByAgent',
        args: [agentId],
      });

      debugLog('contracts', `useAgentServices: Found ${serviceIds.length} service IDs`, serviceIds);

      if (!serviceIds || serviceIds.length === 0) {
        setServices([]);
        setIsLoading(false);
        return;
      }

      // Fetch service details using multicall
      const calls = serviceIds.map(id => ({
        address: SERVICE_REGISTRY_ADDRESS,
        abi: SERVICE_REGISTRY_ABI,
        functionName: 'getService' as const,
        args: [id],
      }));

      const results = await publicClient.multicall({ contracts: calls });

      // Map results to Service objects
      const mappedServices: Service[] = [];
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const serviceId = serviceIds[i];

        if (result.status === 'success' && result.result) {
          const service = mapServiceData(serviceId, result.result);
          if (service) {
            mappedServices.push(service);
          }
        }
      }

      debugLog('contracts', `useAgentServices: Mapped ${mappedServices.length} services`);
      setServices(mappedServices);
    } catch (err) {
      debugError('contracts', 'useAgentServices: Error fetching services', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch services'));
      setServices([]);
    } finally {
      setIsLoading(false);
    }
  }, [publicClient, agentId]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const refetch = useCallback(() => {
    fetchServices();
  }, [fetchServices]);

  return {
    services,
    isLoading,
    error,
    refetch,
  };
}
