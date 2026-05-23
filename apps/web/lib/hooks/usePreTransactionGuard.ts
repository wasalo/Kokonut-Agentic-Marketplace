'use client';

import { useMemo } from 'react';
import { useAccount, useBalance, useReadContract } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { erc20Abi, formatEther, formatUnits } from 'viem';
import type { Token } from '@/lib/tokenUtils';

export interface GuardBlocker {
  type: 'wrong-chain' | 'insufficient-eth' | 'insufficient-token' | 'wallet-disconnected' | 'insufficient-allowance';
  message: string;
  action?: { label: string; onClick: () => void };
}

export interface GuardWarning {
  type: 'high-value' | 'first-transaction' | 'low-allowance';
  message: string;
}

export function usePreTransactionGuard(
  requiredEth?: bigint,
  requiredToken?: { token: Token; amount: bigint },
  requiredAllowance?: { token: `0x${string}`; spender: `0x${string}`; amount: bigint }
) {
  const { address, chainId, isConnected } = useAccount();
  const { data: ethBalance } = useBalance({ address });
  const { data: tokenBalance } = useReadContract({
    address: requiredToken?.token.address as `0x${string}` | undefined,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!requiredToken && !!address,
    },
  });

  const { data: allowance } = useReadContract({
    address: requiredAllowance?.token,
    abi: erc20Abi,
    functionName: 'allowance',
    args: requiredAllowance && address
      ? [address, requiredAllowance.spender]
      : undefined,
    query: {
      enabled: !!requiredAllowance && !!address,
    },
  });

  const blockers = useMemo<GuardBlocker[]>(() => {
    const result: GuardBlocker[] = [];

    if (!isConnected) {
      result.push({
        type: 'wallet-disconnected',
        message: 'Connect your wallet to continue',
      });
    }

    if (chainId !== sepolia.id) {
      result.push({
        type: 'wrong-chain',
        message: `Switch to Sepolia (chain ${sepolia.id})`,
      });
    }

    if (requiredEth && ethBalance && ethBalance.value < requiredEth * 2n) {
      result.push({
        type: 'insufficient-eth',
        message: `Need ~${Number(formatEther(requiredEth * 2n)).toFixed(4)} ETH for gas`,
      });
    }

    if (requiredToken && tokenBalance && tokenBalance < requiredToken.amount) {
      result.push({
        type: 'insufficient-token',
        message: `Insufficient ${requiredToken.token.symbol} balance. Need ${Number(formatUnits(requiredToken.amount, requiredToken.token.decimals)).toFixed(2)} ${requiredToken.token.symbol}`,
      });
    }

    if (requiredAllowance && allowance !== undefined && allowance < requiredAllowance.amount) {
      result.push({
        type: 'insufficient-allowance',
        message: `Insufficient ${requiredAllowance.token.slice(0, 6)} allowance. Approve first.`,
      });
    }

    return result;
  }, [isConnected, chainId, requiredEth, ethBalance, requiredToken, tokenBalance, requiredAllowance, allowance]);

  const warnings = useMemo<GuardWarning[]>(() => {
    const result: GuardWarning[] = [];

    if (requiredToken && requiredToken.amount > 1000n * 10n ** BigInt(requiredToken.token.decimals)) {
      result.push({
        type: 'high-value',
        message: 'High-value transaction. Double-check the amount.',
      });
    }

    return result;
  }, [requiredToken]);

  return {
    canProceed: blockers.length === 0,
    blockers,
    warnings,
  };
}
