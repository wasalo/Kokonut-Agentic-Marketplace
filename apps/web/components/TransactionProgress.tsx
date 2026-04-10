'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useWaitForTransactionReceipt, useTransactionConfirmations } from 'wagmi';

export type TransactionPhase = 'pending' | 'confirming' | 'mining' | 'success' | 'error';

export interface TransactionProgressOptions {
  hash: `0x${string}`;
  description?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export interface UseTransactionProgressReturn {
  phase: TransactionPhase;
  confirmations: number;
  gasUsed?: bigint;
  error?: Error;
  toastId: string | number;
}

/**
 * Hook that tracks transaction progress through all phases
 * Uses toast-based UI for real-time feedback
 */
export function useTransactionProgress({
  hash,
  description = 'Transaction',
  onSuccess,
  onError,
}: TransactionProgressOptions): UseTransactionProgressReturn {
  const [phase, setPhase] = useState<TransactionPhase>('pending');
  const [toastId, setToastId] = useState<string | number>('');
  const [gasUsed, setGasUsed] = useState<bigint | undefined>();
  const [txError, setTxError] = useState<Error | undefined>();

  const {
    isLoading: isConfirming,
    isSuccess,
    data: receipt,
    error: waitError,
  } = useWaitForTransactionReceipt({
    hash,
    query: {
      retry: true,
      retryDelay: 2000,
    },
  });

  const { data: confirmations = 0n } = useTransactionConfirmations({
    hash,
    query: {
      enabled: !!hash,
      staleTime: 30_000,
    },
  });

  // Phase 1: Initial pending
  useEffect(() => {
    if (hash && !toastId) {
      const id = toast.loading('⏳ Pending transaction...', {
        description: description,
        duration: Infinity,
      });
      setToastId(id);
      setPhase('pending');
    }
  }, [hash, description]);

  // Phase 2: Confirming (waiting for first confirmation)
  useEffect(() => {
    if (isConfirming && phase !== 'confirming') {
      setPhase('confirming');
      if (toastId) {
        toast.loading('🔄 Confirming transaction...', {
          id: toastId,
          description: `${confirmations > 0n ? `${Number(confirmations)} confirmation(s)` : 'Waiting for first confirmation'}`,
          duration: Infinity,
        });
      }
    }
  }, [isConfirming, confirmations, phase, toastId]);

  // Phase 3: Mining (got receipt, checking status)
  useEffect(() => {
    if (receipt && !isSuccess && !waitError && phase === 'confirming') {
      setPhase('mining');
      if (toastId) {
        const blockNum = (receipt as { blockNumber?: bigint }).blockNumber;
        toast.loading('⛏️ Mining transaction...', {
          id: toastId,
          description: `Block #${blockNum !== undefined ? blockNum.toString() : 'pending'}`,
          duration: Infinity,
        });
      }
    }
  }, [receipt, isSuccess, waitError, phase, toastId]);

  // Phase 4: Success
  useEffect(() => {
    if (isSuccess && receipt) {
      setGasUsed(receipt.gasUsed);
      setPhase('success');
      if (toastId) {
        const blockNum = (receipt as { blockNumber?: bigint }).blockNumber;
        toast.success('✅ Transaction confirmed!', {
          id: toastId,
          description: `Gas used: ${Number(receipt.gasUsed).toLocaleString()} | Block: ${blockNum !== undefined ? blockNum.toString() : 'N/A'}`,
          duration: 5000,
        });
      }
      onSuccess?.();
    }
  }, [isSuccess, receipt, toastId, onSuccess]);

  // Phase 5: Error
  useEffect(() => {
    if (waitError) {
      setTxError(waitError as Error);
      setPhase('error');
      if (toastId) {
        const error = waitError as Error;
        const errorMessage = getFriendlyError(error);
        toast.error('❌ Transaction failed', {
          id: toastId,
          description: errorMessage,
          duration: 8000,
        });
      }
      onError?.(waitError as Error);
    }
  }, [waitError, toastId, onError]);

  return {
    phase,
    confirmations: Number(confirmations),
    gasUsed,
    error: txError,
    toastId,
  };
}

/**
 * Get friendly error message for common transaction failures
 */
function getFriendlyError(error: Error): string {
  const message = error.message.toLowerCase();

  if (message.includes('rejected') || message.includes('denied')) {
    return 'Transaction was rejected in your wallet';
  }
  if (message.includes('insufficient funds')) {
    return 'Insufficient balance for this transaction';
  }
  if (message.includes('nonce')) {
    return 'Please try again with the correct nonce';
  }
  if (message.includes('gas')) {
    return 'Try increasing the gas limit';
  }

  return 'Check transaction details and try again';
}

/**
 * Component wrapper for transaction progress display
 */
export function TransactionProgressCard({
  phase,
  confirmations,
  gasUsed,
}: {
  phase: TransactionPhase;
  confirmations: number;
  gasUsed?: bigint;
}) {
  const phaseConfig = {
    pending: { icon: '⏳', label: 'Pending', color: 'text-gray-500' },
    confirming: { icon: '🔄', label: 'Confirming', color: 'text-yellow-500' },
    mining: { icon: '⛏️', label: 'Mining', color: 'text-blue-500' },
    success: { icon: '✅', label: 'Confirmed', color: 'text-green-500' },
    error: { icon: '❌', label: 'Failed', color: 'text-red-500' },
  };

  const config = phaseConfig[phase];

  return (
    <div className="flex flex-col gap-2 p-4 rounded-lg bg-default-100">
      <div className={`flex items-center gap-2 ${config.color}`}>
        <span className="text-xl">{config.icon}</span>
        <span className="font-medium">{config.label}</span>
      </div>

      {confirmations > 0 && (
        <div className="text-sm text-default-500">
          {confirmations} confirmation{confirmations !== 1 ? 's' : ''}
        </div>
      )}

      {gasUsed && (
        <div className="text-sm text-default-500">Gas used: {Number(gasUsed).toLocaleString()}</div>
      )}
    </div>
  );
}

export default TransactionProgressCard;
