import { useReadContract, useReadContracts, useWriteContract } from 'wagmi';
import { useCallback } from 'react';
import { SERVICE_REGISTRY_ABI } from '@/lib/contracts/abis';
import { getContractAddress, SEPOLIA_CHAIN_ID } from '@/lib/contracts/config';
import { SERVICE_BOND_AMOUNT } from '@/lib/contracts/bonds';
import type { Service } from '@/lib/types/contracts';

const SERVICE_REGISTRY_ADDRESS = getContractAddress('SERVICE_REGISTRY');

export type { Service };

function mapServiceData(id: bigint, data: unknown): Service | null {
  if (!data) return null;

  if (typeof data === 'object' && !Array.isArray(data)) {
    const obj = data as Record<string, unknown>;
    if ('provider' in obj && 'name' in obj) {
      return {
        id,
        provider: (obj.provider as `0x${string}`) || '0x',
        agentId: (obj.agentId as bigint) || BigInt(0),
        name: (obj.name as string) || '',
        description: (obj.description as string) || '',
        metadataURI: (obj.metadataURI as string) || '',
        price: (obj.price as bigint) || BigInt(0),
        paymentToken: (obj.paymentToken as `0x${string}`) || '0x',
        paymentAddress: (obj.paymentAddress as `0x${string}`) || '0x',
        isActive: (obj.isActive as boolean) || false,
        createdAt: (obj.createdAt as bigint) || BigInt(0),
      };
    }
  }

  // viem can return tuple-like arrays depending on ABI inference.
  if (Array.isArray(data) && data.length >= 11) {
    const [
      ,
      provider,
      paymentAddress,
      agentId,
      name,
      description,
      metadataURI,
      price,
      paymentToken,
      isActive,
      createdAt,
    ] = data;
    return {
      id,
      provider: (provider as `0x${string}`) || '0x',
      agentId: (agentId as bigint) || BigInt(0),
      name: (name as string) || '',
      description: (description as string) || '',
      metadataURI: (metadataURI as string) || '',
      price: (price as bigint) || BigInt(0),
      paymentToken: (paymentToken as `0x${string}`) || '0x',
      paymentAddress: (paymentAddress as `0x${string}`) || '0x',
      isActive: (isActive as boolean) || false,
      createdAt: (createdAt as bigint) || BigInt(0),
    };
  }

  return null;
}

export function useTotalServiceCount() {
  const { data, isLoading, error, refetch } = useReadContract({
    address: SERVICE_REGISTRY_ADDRESS,
    abi: SERVICE_REGISTRY_ABI,
    functionName: 'getServiceCounter',
    query: {
      staleTime: 60000,
    },
  });

  return {
    count: data ? Number(data) : 0,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}

export function useService(serviceId: number | bigint | undefined) {
  const id = serviceId !== undefined
    ? (typeof serviceId === 'bigint' ? serviceId : BigInt(serviceId))
    : undefined;

  const { data, isLoading, error, refetch } = useReadContract({
    address: SERVICE_REGISTRY_ADDRESS,
    abi: SERVICE_REGISTRY_ABI,
    functionName: 'getService',
    args: id ? [id] : undefined,
    query: {
      enabled: !!id,
      staleTime: 60000,
    },
  });

  return {
    service: data ? mapServiceData(id!, data) : null,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}

export function useServices(start = 0, count = 20) {
  const { count: totalCount, isLoading: isCountLoading } = useTotalServiceCount();

  const queries = [];
  const safeCount = totalCount ?? 0;

  for (let i = start; i < Math.min(start + count, safeCount); i++) {
    queries.push({
      address: SERVICE_REGISTRY_ADDRESS,
      abi: SERVICE_REGISTRY_ABI,
      functionName: 'getService' as const,
      args: [BigInt(i)],
    });
  }

  const { data: results, isLoading, error, refetch } = useReadContracts({
    contracts: queries,
    query: {
      staleTime: 60000,
    },
  });

  const services = results?.map((result, index) => {
    if (result.status === 'success' && result.result) {
      return mapServiceData(BigInt(start + index), result.result);
    }
    return null;
  }).filter(Boolean) as Service[] || [];

  return {
    services,
    totalCount: safeCount,
    isLoading: isLoading || isCountLoading,
    error: error as Error | null,
    refetch,
  };
}

export function useProviderServices(providerAddress: `0x${string}` | undefined) {
  const { data: countData, isLoading: countLoading } = useReadContract({
    address: SERVICE_REGISTRY_ADDRESS,
    abi: SERVICE_REGISTRY_ABI,
    functionName: 'getProviderServices',
    args: providerAddress ? [providerAddress] : undefined,
    query: {
      enabled: !!providerAddress,
    },
  });

  const serviceIds = (countData as bigint[] | undefined) || [];
  
  const queries = serviceIds.map(id => ({
    address: SERVICE_REGISTRY_ADDRESS,
    abi: SERVICE_REGISTRY_ABI,
    functionName: 'getService' as const,
    args: [id],
  }));

  const { data: results, isLoading, error, refetch } = useReadContracts({
    contracts: queries,
    query: {
      enabled: queries.length > 0,
      staleTime: 60000,
    },
  });

  const services: Service[] = [];
  if (results) {
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === 'success' && result.result) {
        const service = mapServiceData(serviceIds[i], result.result);
        if (service) services.push(service);
      }
    }
  }

  return {
    services,
    isLoading: isLoading || countLoading,
    error: error as Error | null,
    refetch,
  };
}

export function useCreateService() {
  const { writeContract, data, isPending, error, reset } = useWriteContract();

  const create = useCallback(
    async (args: {
      agentId: bigint;
      name: string;
      description: string;
      metadataURI: string;
      price: bigint;
      paymentToken: `0x${string}`;
      paymentAddress: `0x${string}`;
    }) => {
      const tx = await writeContract({
        chainId: SEPOLIA_CHAIN_ID,
        address: SERVICE_REGISTRY_ADDRESS,
        abi: SERVICE_REGISTRY_ABI,
        functionName: 'createService',
        args: [
          args.agentId,
          args.name,
          args.description,
          args.metadataURI,
          args.price,
          args.paymentToken,
          args.paymentAddress,
        ],
        value: SERVICE_BOND_AMOUNT,
      });
      return tx;
    },
    [writeContract]
  );

  return {
    create,
    createService: create,
    hash: data,
    isPending,
    error: error as Error | null,
    reset,
  };
}

export function useUpdateService() {
  const { writeContract, data, isPending, error, reset } = useWriteContract();

  const update = useCallback(
    async (args: {
      serviceId: bigint;
      name: string;
      description: string;
      metadataURI: string;
      price: bigint;
    }) => {
      const tx = await writeContract({
        chainId: SEPOLIA_CHAIN_ID,
        address: SERVICE_REGISTRY_ADDRESS,
        abi: SERVICE_REGISTRY_ABI,
        functionName: 'updateService',
        args: [args.serviceId, args.name, args.description, args.metadataURI, args.price],
      });
      return tx;
    },
    [writeContract]
  );

  return {
    update,
    updateService: update,
    hash: data,
    isPending,
    error: error as Error | null,
    reset,
  };
}

export function useSetPaymentAddress() {
  const { writeContract, data, isPending, error, reset } = useWriteContract();

  const setPaymentAddress = useCallback(
    async (args: { serviceId: bigint; paymentAddress: `0x${string}` }) => {
      const tx = await writeContract({
        chainId: SEPOLIA_CHAIN_ID,
        address: SERVICE_REGISTRY_ADDRESS,
        abi: SERVICE_REGISTRY_ABI,
        functionName: 'setPaymentAddress',
        args: [args.serviceId, args.paymentAddress],
      });
      return tx;
    },
    [writeContract]
  );

  return {
    setPaymentAddress,
    hash: data,
    isPending,
    error: error as Error | null,
    reset,
  };
}

export function useActivateService() {
  const { writeContract, data, isPending, error, reset } = useWriteContract();

  const activate = useCallback(
    async (serviceId: bigint) => {
      const tx = await writeContract({
        chainId: SEPOLIA_CHAIN_ID,
        address: SERVICE_REGISTRY_ADDRESS,
        abi: SERVICE_REGISTRY_ABI,
        functionName: 'activateService',
        args: [serviceId],
      });
      return tx;
    },
    [writeContract]
  );

  return {
    activate,
    activateService: activate,
    hash: data,
    isPending,
    error: error as Error | null,
    reset,
  };
}

export function useDeactivateService() {
  const { writeContract, data, isPending, error, reset } = useWriteContract();

  const deactivate = useCallback(
    async (serviceId: bigint) => {
      const tx = await writeContract({
        chainId: SEPOLIA_CHAIN_ID,
        address: SERVICE_REGISTRY_ADDRESS,
        abi: SERVICE_REGISTRY_ABI,
        functionName: 'deactivateService',
        args: [serviceId],
      });
      return tx;
    },
    [writeContract]
  );

  return {
    deactivate,
    deactivateService: deactivate,
    hash: data,
    isPending,
    error: error as Error | null,
    reset,
  };
}

export function useWithdrawServiceBond() {
  const { writeContract, data, isPending, error, reset } = useWriteContract();

  const withdraw = useCallback(
    async (serviceId: bigint) => {
      const tx = await writeContract({
        chainId: SEPOLIA_CHAIN_ID,
        address: SERVICE_REGISTRY_ADDRESS,
        abi: SERVICE_REGISTRY_ABI,
        functionName: 'withdrawServiceBond',
        args: [serviceId],
      });
      return tx;
    },
    [writeContract]
  );

  return {
    withdraw,
    withdrawServiceBond: withdraw,
    hash: data,
    isPending,
    error: error as Error | null,
    reset,
  };
}

export function useGetServiceBond(serviceId: bigint | number | undefined) {
  const id = serviceId !== undefined ? (typeof serviceId === 'bigint' ? serviceId : BigInt(serviceId)) : undefined;

  const { data, isLoading, error, refetch } = useReadContract({
    address: SERVICE_REGISTRY_ADDRESS,
    abi: SERVICE_REGISTRY_ABI,
    functionName: 'getServiceBond',
    args: id !== undefined ? [id] : undefined,
    query: {
      enabled: id !== undefined,
      staleTime: 30000,
    },
  });

  return {
    bond: data ? (data as bigint) : BigInt(0),
    isLoading,
    error: error as Error | null,
    refetch,
  };
}

export function useDeactivatedAt(serviceId: bigint | number | undefined) {
  const id = serviceId !== undefined ? (typeof serviceId === 'bigint' ? serviceId : BigInt(serviceId)) : undefined;

  const { data, isLoading, error, refetch } = useReadContract({
    address: SERVICE_REGISTRY_ADDRESS,
    abi: SERVICE_REGISTRY_ABI,
    functionName: 'deactivatedAt',
    args: id !== undefined ? [id] : undefined,
    query: {
      enabled: id !== undefined,
      staleTime: 30000,
    },
  });

  return {
    deactivatedAt: data ? Number(data) * 1000 : 0, // convert to ms for JS Date
    isLoading,
    error: error as Error | null,
    refetch,
  };
}

// ============================================================================
// Consolidated aliases (replaces useServicesContract.ts)
// ============================================================================

/**
 * Alias for useServices — kept for backward compatibility with useServicesContract.ts consumers.
 */
export function useServicesContract(start = 0, count = 20) {
  return useServices(start, count);
}

const MAX_SERVICE_BATCH = 50;

export function useAllServices(page = 0, pageSize = 20) {
  const safePageSize = Math.min(pageSize, MAX_SERVICE_BATCH);
  const start = page * safePageSize;
  const { services, isLoading, error, refetch, totalCount } = useServices(start, safePageSize);
  const activeServices = services.filter(s => s.isActive);
  return { services: activeServices, isLoading, error, refetch, totalCount, page, pageSize: safePageSize };
}

export function useServiceContract(serviceId: bigint | number | undefined) {
  const { service, isLoading, error, refetch } = useService(serviceId);
  return { service, isLoading, error, refetch };
}

export function useProviderServicesContract(provider: `0x${string}` | undefined) {
  return useProviderServices(provider);
}
