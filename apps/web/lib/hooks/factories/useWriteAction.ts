// Generic write action factory for contract interactions
// Eliminates duplicate useWriteContract pattern across 25+ hooks

import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useCallback } from 'react';

export interface WriteActionConfig {
  address: string;
  abi: unknown[];
  functionName: string;
}

export interface WriteActionResult {
  execute: (args: unknown[]) => Promise<`0x${string}` | undefined>;
  writeContract: ReturnType<typeof useWriteContract>['writeContract'];
  hash: `0x${string}` | undefined;
  isPending: boolean;
  isConfirming: boolean;
  isConfirmed: boolean;
  error: Error | null;
  reset: () => void;
}

/**
 * Creates a reusable write action hook for any contract function
 * 
 * @example
 * const useCreateJob = createWriteAction({
 *   address: AGENTIC_COMMERCE_ADDRESS,
 *   abi: AGENTIC_COMMERCE_ABI,
 *   functionName: 'createJob'
 * });
 * 
 * // Usage in component
 * const { execute, isPending } = useCreateJob();
 * const handleCreate = async () => {
 *   const hash = await execute([arg1, arg2, arg3]);
 * };
 */
export function createWriteAction(config: WriteActionConfig) {
  return function useWriteAction(): WriteActionResult {
    const { writeContract, data: hash, isPending, error, reset } = useWriteContract();

    const execute = useCallback(
      async (args: unknown[]): Promise<`0x${string}` | undefined> => {
        try {
          const txHash = (await writeContract({
            address: config.address as `0x${string}`,
            abi: config.abi as readonly unknown[],
            functionName: config.functionName,
            args,
          })) as unknown as `0x${string}`;
          return txHash;
        } catch (err) {
          throw err;
        }
      },
      [writeContract, config.address, config.abi, config.functionName]
    );

    return {
      execute,
      writeContract,
      hash,
      isPending,
      isConfirming: false, // Could extend with useWaitForTransactionReceipt
      isConfirmed: false,
      error,
      reset,
    };
  };
}

// ============================================================================
// SPECIALIZED FACTORIES
// ============================================================================

/**
 * Creates a write action that waits for transaction confirmation
 */
export function createWriteActionWithConfirmation(config: WriteActionConfig) {
  return function useWriteActionWithConfirmation(): Omit<WriteActionResult, 'isConfirming' | 'isConfirmed'> & {
    data: `0x${string}` | undefined;
    isConfirming: boolean;
    isConfirmed: boolean;
  } {
    const { writeContract, data, isPending, error, reset } = useWriteContract();

    const { isLoading: isConfirming, isSuccess: isConfirmed } =
      useWaitForTransactionReceipt({
        hash: data,
      });

    const execute = useCallback(
      async (args: unknown[]): Promise<`0x${string}` | undefined> => {
        const txHash = (await writeContract({
          address: config.address as `0x${string}`,
          abi: config.abi as readonly unknown[],
          functionName: config.functionName,
          args,
        })) as unknown as `0x${string}`;
        return txHash;
      },
      [writeContract, config.address, config.abi, config.functionName]
    );

    return {
      execute,
      writeContract,
      data,
      hash: data,
      isPending,
      isConfirming,
      isConfirmed,
      error,
      reset,
    };
  };
}

/**
 * Creates a simple write action without confirmation waiting
 * Use for fire-and-forget transactions
 */
export function createSimpleWriteAction(config: WriteActionConfig) {
  return function useSimpleWriteAction() {
    const { writeContract, data, isPending, error, reset } = useWriteContract();

    return {
      execute: (args: unknown[]) =>
        writeContract({
          address: config.address as `0x${string}`,
          abi: config.abi as readonly unknown[],
          functionName: config.functionName,
          args,
        }),
      hash: data,
      isPending,
      error,
      reset,
    };
  };
}