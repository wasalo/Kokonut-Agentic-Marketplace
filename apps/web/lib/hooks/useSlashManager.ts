import { useReadContract, useWriteContract } from 'wagmi';
import { getContractAddress } from '@/lib/contracts/config';
import { SLASH_MANAGER_ABI } from '@/lib/contracts/abis';

const SLASH_MANAGER_ADDRESS = getContractAddress('SLASH_MANAGER');

/**
 * Hook to check if an address is a registered signer
 * @param address The address to check
 * @returns Boolean indicating if address is a signer
 */
export function useIsSigner(address: `0x${string}` | undefined) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: SLASH_MANAGER_ADDRESS,
    abi: SLASH_MANAGER_ABI,
    functionName: 'isSigner',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      retry: 2,
      staleTime: 30 * 1000,
    },
  });

  return {
    isSigner: data,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to get the list of all signers
 * @returns Array of signer addresses
 */
export function useSigners() {
  const { data, isLoading, error, refetch } = useReadContract({
    address: SLASH_MANAGER_ADDRESS,
    abi: SLASH_MANAGER_ABI,
    functionName: 'getSigners',
    query: {
      retry: 2,
      staleTime: 60 * 1000,
    },
  });

  return {
    signers: data,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to get the required number of confirmations
 * @returns Number of confirmations required (e.g., 3 for 3-of-5)
 */
export function useRequiredConfirmations() {
  const { data, isLoading, error, refetch } = useReadContract({
    address: SLASH_MANAGER_ADDRESS,
    abi: SLASH_MANAGER_ABI,
    functionName: 'requiredConfirmations',
    query: {
      retry: 2,
      staleTime: Infinity,
    },
  });

  return {
    required: data,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to get a slash proposal by ID
 * @param proposalId The proposal ID (bytes32)
 * @returns Proposal details
 */
export function useSlashProposal(proposalId: `0x${string}` | undefined) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: SLASH_MANAGER_ADDRESS,
    abi: SLASH_MANAGER_ABI,
    functionName: 'getProposal',
    args: proposalId ? [proposalId] : undefined,
    query: {
      enabled: !!proposalId,
      retry: 2,
      staleTime: 30 * 1000,
    },
  });

  return {
    proposal: data as
      | {
          evaluator: `0x${string}`;
          proposalId: bigint;
          amount: bigint;
          reason: string;
          createdAt: bigint;
          executeAfter: bigint;
          confirmations: bigint;
          executed: boolean;
        }
      | undefined,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to create a new slash proposal
 * @returns Create function and transaction state
 */
export function useCreateSlashProposal() {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();

  return {
    createProposal: (
      evaluator: `0x${string}`,
      proposalId: bigint,
      amount: bigint,
      reason: string
    ) =>
      writeContract({
        address: SLASH_MANAGER_ADDRESS,
        abi: SLASH_MANAGER_ABI,
        functionName: 'createProposal',
        args: [evaluator, proposalId, amount, reason],
      }),
    hash,
    isPending,
    error,
    reset,
  };
}

/**
 * Hook to confirm a slash proposal
 * @returns Confirm function and transaction state
 */
export function useConfirmSlashProposal() {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();

  return {
    confirm: (proposalId: `0x${string}`) =>
      writeContract({
        address: SLASH_MANAGER_ADDRESS,
        abi: SLASH_MANAGER_ABI,
        functionName: 'confirmProposal',
        args: [proposalId],
      }),
    hash,
    isPending,
    error,
    reset,
  };
}

/**
 * Hook to execute a confirmed slash proposal
 * @returns Execute function and transaction state
 */
export function useExecuteSlashProposal() {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();

  return {
    execute: (proposalId: `0x${string}`) =>
      writeContract({
        address: SLASH_MANAGER_ADDRESS,
        abi: SLASH_MANAGER_ABI,
        functionName: 'executeSlash',
        args: [proposalId],
      }),
    hash,
    isPending,
    error,
    reset,
  };
}

/**
 * Hook to cancel a slash proposal
 * @returns Cancel function and transaction state
 */
export function useCancelSlashProposal() {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();

  return {
    cancel: (proposalId: `0x${string}`) =>
      writeContract({
        address: SLASH_MANAGER_ADDRESS,
        abi: SLASH_MANAGER_ABI,
        functionName: 'cancelProposal',
        args: [proposalId],
      }),
    hash,
    isPending,
    error,
    reset,
  };
}

/**
 * Hook to get the execution delay (timelock)
 * @returns Execution delay in seconds
 */
export function useExecutionDelay() {
  const { data, isLoading, error, refetch } = useReadContract({
    address: SLASH_MANAGER_ADDRESS,
    abi: SLASH_MANAGER_ABI,
    functionName: 'executionDelay',
    query: {
      retry: 2,
      staleTime: Infinity,
    },
  });

  return {
    delay: data,
    delayInHours: data ? Number(data) / 3600 : undefined,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to get the maximum slash amount
 * @returns Maximum slash amount in wei
 */
export function useMaxSlashAmount() {
  const { data, isLoading, error, refetch } = useReadContract({
    address: SLASH_MANAGER_ADDRESS,
    abi: SLASH_MANAGER_ABI,
    functionName: 'maxSlashAmount',
    query: {
      retry: 2,
      staleTime: Infinity,
    },
  });

  return {
    maxAmount: data,
    maxAmountInEth: data ? Number(data) / 1e18 : undefined,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to get the contract owner
 * @returns Owner address
 */
export function useSlashManagerOwner() {
  const { data, isLoading, error, refetch } = useReadContract({
    address: SLASH_MANAGER_ADDRESS,
    abi: SLASH_MANAGER_ABI,
    functionName: 'owner',
    query: {
      retry: 2,
      staleTime: 60 * 1000,
    },
  });

  return {
    owner: data,
    isLoading,
    error,
    refetch,
  };
}
