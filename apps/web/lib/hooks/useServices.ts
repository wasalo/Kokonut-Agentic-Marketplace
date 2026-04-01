import { useReadContract, useReadContracts, useWriteContract } from 'wagmi';
import { SERVICE_REGISTRY_ABI } from '@/lib/contracts/abis';
import { CONTRACT_ADDRESSES, getContractAddress, debugLog } from '@/lib/contracts/config';
import { getQueryConfig } from '@/lib/queryConfig';

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

function mapServiceData(id: bigint, data: readonly any[] | undefined): Service | null {
  if (!data || !Array.isArray(data)) {
    debugLog('errors', 'mapServiceData: Invalid data format', data);
    return null;
  }

  debugLog('data', `mapServiceData: Mapping service ${id}, data length: ${data.length}`, data);

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

    debugLog('data', `mapServiceData: Successfully mapped service ${id}`, {
      serviceId,
      provider,
      agentId,
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

  // Legacy format (9 fields, no agentId)
  const [
    serviceId,
    provider,
    name,
    description,
    metadataURI,
    price,
    paymentToken,
    isActive,
    createdAt,
  ] = data;

  debugLog('data', `mapServiceData: Mapped legacy service ${id}`);

  return {
    id,
    provider: provider as `0x${string}`,
    agentId: BigInt(0),
    name: name || '',
    description: description || '',
    metadataURI: metadataURI || '',
    price: price || BigInt(0),
    paymentToken: paymentToken as `0x${string}`,
    isActive: isActive || false,
    createdAt: createdAt || BigInt(0),
  };
}

export function useActiveServiceCount() {
  debugLog('contracts', 'useActiveServiceCount: Fetching from', SERVICE_REGISTRY_ADDRESS);
  const config = getQueryConfig('stats');

  const { data, isLoading, error, refetch } = useReadContract({
    address: SERVICE_REGISTRY_ADDRESS,
    abi: SERVICE_REGISTRY_ABI,
    functionName: 'getActiveServiceCount',
    query: {
      retry: 2,
      staleTime: config.staleTime,
      gcTime: config.gcTime,
    },
  });

  if (error) {
    debugLog('errors', 'useActiveServiceCount: Error fetching count', error);
  }

  if (data) {
    debugLog('contracts', 'useActiveServiceCount: Retrieved count', Number(data));
  }

  return {
    count: data ? Number(data) : 0,
    isLoading,
    error,
    refetch,
  };
}

export function useService(serviceId: number | bigint) {
  const id = typeof serviceId === 'bigint' ? serviceId : BigInt(serviceId);
  const config = getQueryConfig('services');

  const { data, isLoading, error, refetch } = useReadContract({
    address: SERVICE_REGISTRY_ADDRESS,
    abi: SERVICE_REGISTRY_ABI,
    functionName: 'getService',
    args: [id],
    query: {
      retry: 2,
      staleTime: config.staleTime,
      gcTime: config.gcTime,
    },
  });

  return {
    service: mapServiceData(
      id,
      data as unknown as
        | readonly [bigint, string, string, string, string, bigint, `0x${string}`, boolean, bigint]
        | undefined
    ),
    isLoading,
    error,
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

  // Handle empty results after hooks are called
  if (!results || results.length === 0) {
    return {
      services: [] as Service[],
      isLoading: isIdsLoading,
      error: idsError,
      refetch: refetchIds,
    };
  }

  const services: Service[] = [];

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
  // Always call useReadContract - don't return early
  const {
    data: serviceIds,
    isLoading,
    error,
    refetch,
  } = useReadContract({
    address: SERVICE_REGISTRY_ADDRESS,
    abi: SERVICE_REGISTRY_ABI,
    functionName: 'getProviderServices',
    args: [provider as `0x${string}`],
    query: {
      retry: 2,
      staleTime: 30 * 1000,
      enabled: !!provider,
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
  const { data: results, refetch: refetchServices } = useReadContracts({
    contracts: serviceQueries,
    query: {
      enabled: serviceQueries.length > 0,
      retry: 2,
      staleTime: 30 * 1000,
    },
  });

  // Handle empty results after hooks are called
  if (!results || results.length === 0) {
    return {
      services: [] as Service[],
      isLoading,
      error,
      refetch,
    };
  }

  const services: Service[] = [];

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

  return {
    services,
    isLoading,
    error,
    refetch: () => {
      refetch();
      refetchServices();
    },
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
