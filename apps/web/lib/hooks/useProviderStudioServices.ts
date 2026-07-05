'use client';

import { useAccount } from 'wagmi';
import { useProviderServices, type Service } from '@/lib/hooks/useServices';

export function useProviderStudioServices() {
  const { isConnected, address } = useAccount();
  const { services, isLoading, error, refetch } = useProviderServices(address);

  const activeServices = services.filter((service: Service) => service.isActive);
  const inactiveServices = services.filter((service: Service) => !service.isActive);

  return {
    isConnected,
    address,
    services,
    activeServices,
    inactiveServices,
    isLoading,
    error,
    refetch,
  };
}
