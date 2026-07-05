'use client';

import { useCallback } from 'react';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { erc20Abi, maxUint256 } from 'viem';
import { sepolia } from 'wagmi/chains';

export function useAllowance(token: `0x${string}`, spender: `0x${string}`) {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const { data: allowance, refetch } = useReadContract({
    address: token,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address ? [address, spender] : undefined,
    query: {
      enabled: !!address && !!token && !!spender,
    },
  });

  const isUnlimited = allowance === maxUint256;

  const hasSufficient = useCallback(
    (required: bigint) => {
      if (!allowance) return false;
      return allowance >= required;
    },
    [allowance]
  );

  const approve = useCallback(
    async (amount: bigint) => {
      if (!address) throw new Error('Wallet not connected');
      const hash = await writeContractAsync({
        chainId: sepolia.id,
        address: token,
        abi: erc20Abi,
        functionName: 'approve',
        args: [spender, amount],
      });
      await refetch();
      return hash;
    },
    [address, token, spender, writeContractAsync, refetch]
  );

  const approveUnlimited = useCallback(async () => {
    return approve(maxUint256);
  }, [approve]);

  return {
    allowance,
    isUnlimited,
    hasSufficient,
    approve,
    approveUnlimited,
    refetch,
  };
}
