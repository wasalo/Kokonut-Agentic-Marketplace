import { useWatchContractEvent } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { SERVICE_REGISTRY_ABI } from '@/lib/contracts/abis';
import { CONTRACT_ADDRESSES } from '@/lib/contracts/config';

const SERVICE_REGISTRY_ADDRESS = CONTRACT_ADDRESSES.sepolia.serviceRegistry;

/**
 * Hook to watch service events
 * Uses 30-second polling interval via wagmi's built-in polling
 */
export function useServiceEvents() {
  const queryClient = useQueryClient();

  // Watch ServiceCreated events
  useWatchContractEvent({
    address: SERVICE_REGISTRY_ADDRESS,
    abi: SERVICE_REGISTRY_ABI,
    eventName: 'ServiceCreated',
    onLogs: logs => {
      logs.forEach((log: any) => {
        const serviceId = log.args?.serviceId;
        console.log('[Events] Service created:', serviceId?.toString());

        // Invalidate services list
        queryClient.invalidateQueries({ queryKey: ['services'] });
        queryClient.invalidateQueries({ queryKey: ['service'] });
      });
    },
  });

  // Watch ServiceUpdated events
  useWatchContractEvent({
    address: SERVICE_REGISTRY_ADDRESS,
    abi: SERVICE_REGISTRY_ABI,
    eventName: 'ServiceUpdated',
    onLogs: logs => {
      logs.forEach((log: any) => {
        const serviceId = log.args?.serviceId;
        console.log('[Events] Service updated:', serviceId?.toString());

        // Invalidate specific service and lists
        if (serviceId) {
          queryClient.invalidateQueries({ queryKey: ['service', serviceId.toString()] });
        }
        queryClient.invalidateQueries({ queryKey: ['services'] });
      });
    },
  });

  // Watch ServiceDeactivated events
  useWatchContractEvent({
    address: SERVICE_REGISTRY_ADDRESS,
    abi: SERVICE_REGISTRY_ABI,
    eventName: 'ServiceDeactivated',
    onLogs: logs => {
      logs.forEach((log: any) => {
        const serviceId = log.args?.serviceId;
        console.log('[Events] Service deactivated:', serviceId?.toString());

        // Invalidate specific service and lists
        if (serviceId) {
          queryClient.invalidateQueries({ queryKey: ['service', serviceId.toString()] });
        }
        queryClient.invalidateQueries({ queryKey: ['services'] });
      });
    },
  });

  // Watch ServiceActivated events
  useWatchContractEvent({
    address: SERVICE_REGISTRY_ADDRESS,
    abi: SERVICE_REGISTRY_ABI,
    eventName: 'ServiceActivated',
    onLogs: logs => {
      logs.forEach((log: any) => {
        const serviceId = log.args?.serviceId;
        console.log('[Events] Service activated:', serviceId?.toString());

        // Invalidate specific service and lists
        if (serviceId) {
          queryClient.invalidateQueries({ queryKey: ['service', serviceId.toString()] });
        }
        queryClient.invalidateQueries({ queryKey: ['services'] });
      });
    },
  });
}

/**
 * Hook to watch specific service for real-time updates
 */
export function useWatchService(serviceId: bigint) {
  const queryClient = useQueryClient();

  useWatchContractEvent({
    address: SERVICE_REGISTRY_ADDRESS,
    abi: SERVICE_REGISTRY_ABI,
    eventName: 'ServiceUpdated',
    onLogs: logs => {
      logs.forEach((log: any) => {
        const eventServiceId = log.args?.serviceId;
        if (eventServiceId === serviceId) {
          queryClient.invalidateQueries({ queryKey: ['service', serviceId.toString()] });
        }
      });
    },
  });

  useWatchContractEvent({
    address: SERVICE_REGISTRY_ADDRESS,
    abi: SERVICE_REGISTRY_ABI,
    eventName: 'ServiceDeactivated',
    onLogs: logs => {
      logs.forEach((log: any) => {
        const eventServiceId = log.args?.serviceId;
        if (eventServiceId === serviceId) {
          queryClient.invalidateQueries({ queryKey: ['service', serviceId.toString()] });
        }
      });
    },
  });

  useWatchContractEvent({
    address: SERVICE_REGISTRY_ADDRESS,
    abi: SERVICE_REGISTRY_ABI,
    eventName: 'ServiceActivated',
    onLogs: logs => {
      logs.forEach((log: any) => {
        const eventServiceId = log.args?.serviceId;
        if (eventServiceId === serviceId) {
          queryClient.invalidateQueries({ queryKey: ['service', serviceId.toString()] });
        }
      });
    },
  });
}
