import { useState, useCallback } from 'react';
import { owsSigner, SignOptions, SignResult } from '@/lib/ows/signer';
import { useOWSWallet } from './useOWSWallet';
import { OWSChain } from '@/lib/ows/types';

export interface UseSignTransactionOptions {
  walletId: string;
  to: `0x${string}`;
  value?: bigint;
  data?: string;
  chain: OWSChain;
  metadata?: Record<string, unknown>;
}

export function useSignTransaction() {
  const { wallets, getPolicy } = useOWSWallet();
  const [isSigning, setIsSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sign = useCallback(async (options: UseSignTransactionOptions): Promise<SignResult> => {
    setIsSigning(true);
    setError(null);

    try {
      const result = await owsSigner.sign({
        walletId: options.walletId,
        to: options.to,
        value: options.value,
        data: options.data,
        chain: options.chain,
        metadata: options.metadata,
      });

      if (!result.success && result.error) {
        setError(result.error);
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsSigning(false);
    }
  }, []);

  const signMessage = useCallback(async (walletId: string, message: string): Promise<SignResult> => {
    setIsSigning(true);
    setError(null);

    try {
      const result = await owsSigner.signMessage(walletId, message);
      if (!result.success && result.error) {
        setError(result.error);
      }
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsSigning(false);
    }
  }, []);

  const estimateGas = useCallback((options: Omit<UseSignTransactionOptions, 'walletId'>) => {
    return owsSigner.estimateGas({
      walletId: '',
      to: options.to,
      value: options.value,
      data: options.data,
      chain: options.chain,
    });
  }, []);

  const getPolicyCheck = useCallback((walletId: string, to: `0x${string}`, value?: bigint, chain?: OWSChain) => {
    const wallet = wallets.find((w: { id: string }) => w.id === walletId);
    if (!wallet?.policyId) return { allowed: true };
    
    const policy = getPolicy(wallet.policyId);
    if (!policy) return { allowed: true };

    const { policyEngine } = require('@/lib/ows/policy-engine');
    return policyEngine.canSign(wallet.policyId, {
      walletId,
      to,
      value,
      chain: chain || wallet.chain,
    });
  }, [wallets, getPolicy]);

  return {
    sign,
    signMessage,
    estimateGas,
    getPolicyCheck,
    isSigning,
    error,
  };
}

export function useOWSBalance(walletId: string) {
  const [balance, setBalance] = useState<{ native: bigint; usdc?: bigint }>({ native: 0n });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!walletId) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const result = await owsSigner.getBalance(walletId);
      setBalance(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch balance');
    } finally {
      setIsLoading(false);
    }
  }, [walletId]);

  return {
    balance,
    isLoading,
    error,
    refetch: fetchBalance,
  };
}