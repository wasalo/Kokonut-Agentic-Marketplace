'use client';

import { useCallback } from 'react';
import { useWriteContract } from 'wagmi';
import { getContractAddress } from '@/lib/contracts/config';
import { AGENTIC_COMMERCE_ABI, PRICE_ORACLE_ABI } from '@/lib/contracts/abis';

const AGENTIC_COMMERCE_ADDRESS = getContractAddress('AGENTIC_COMMERCE');
const PRICE_ORACLE_ADDRESS = getContractAddress('PRICE_ORACLE');

export function useTokenAllowlistAdmin() {
  const { writeContractAsync, isPending, error } = useWriteContract();

  const addAllowedToken = useCallback(
    async (token: `0x${string}`) =>
      writeContractAsync({
        address: AGENTIC_COMMERCE_ADDRESS,
        abi: AGENTIC_COMMERCE_ABI,
        functionName: 'setAllowedToken',
        args: [token, true],
      }),
    [writeContractAsync]
  );

  const removeAllowedToken = useCallback(
    async (token: `0x${string}`) =>
      writeContractAsync({
        address: AGENTIC_COMMERCE_ADDRESS,
        abi: AGENTIC_COMMERCE_ABI,
        functionName: 'setAllowedToken',
        args: [token, false],
      }),
    [writeContractAsync]
  );

  const setStablecoin = useCallback(
    async (token: `0x${string}`, isStable: boolean) =>
      writeContractAsync({
        address: AGENTIC_COMMERCE_ADDRESS,
        abi: AGENTIC_COMMERCE_ABI,
        functionName: 'setStablecoin',
        args: [token, isStable],
      }),
    [writeContractAsync]
  );

  const setPriceFeed = useCallback(
    async (token: `0x${string}`, feedAddress: `0x${string}`, decimals: number) =>
      writeContractAsync({
        address: PRICE_ORACLE_ADDRESS,
        abi: PRICE_ORACLE_ABI,
        functionName: 'setPriceFeed',
        args: [token, feedAddress, decimals],
      }),
    [writeContractAsync]
  );

  return { addAllowedToken, removeAllowedToken, setStablecoin, setPriceFeed, isPending, error };
}
