'use client';

import { useCallback, useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { getContractAddress } from '@/lib/contracts/config';
import { SERVICE_REGISTRY_ABI, AGENTIC_COMMERCE_ABI } from '@/lib/contracts/abis';

const SERVICE_REGISTRY_ADDRESS = getContractAddress('SERVICE_REGISTRY');
const AGENTIC_COMMERCE_ADDRESS = getContractAddress('AGENTIC_COMMERCE');

export function useServiceAdmin() {
  const [error, setError] = useState<string | null>(null);

  const { writeContract: deactivate, data: deactivateHash } = useWriteContract();
  const { isLoading: isDeactivating, isSuccess: deactivateSuccess } = useWaitForTransactionReceipt({
    hash: deactivateHash,
  });

  const handleDeactivate = useCallback(
    (serviceId: bigint) => {
      try {
        setError(null);
        deactivate({
          address: SERVICE_REGISTRY_ADDRESS,
          abi: SERVICE_REGISTRY_ABI,
          functionName: 'deactivateService',
          args: [serviceId],
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to deactivate service');
      }
    },
    [deactivate]
  );

  const { writeContract: setRegistry, data: setRegistryHash } = useWriteContract();
  const { isLoading: isSettingRegistry, isSuccess: setRegistrySuccess } = useWaitForTransactionReceipt({
    hash: setRegistryHash,
  });

  const handleSetRegistry = useCallback(
    (newRegistry: `0x${string}`) => {
      try {
        setError(null);
        setRegistry({
          address: AGENTIC_COMMERCE_ADDRESS,
          abi: AGENTIC_COMMERCE_ABI,
          functionName: 'setServiceRegistry',
          args: [newRegistry],
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to set service registry');
      }
    },
    [setRegistry]
  );

  return {
    deactivateService: handleDeactivate,
    isDeactivating,
    deactivateSuccess,
    setServiceRegistry: handleSetRegistry,
    isSettingRegistry,
    setRegistrySuccess,
    error,
  };
}
