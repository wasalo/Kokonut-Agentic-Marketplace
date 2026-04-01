import { useReadContract, useWriteContract } from 'wagmi';
import { CONTRACTS } from '@/lib/wagmi';
import { COMMIT_REVEAL_ABI } from '@/lib/contracts/abis';
import { assertValidAddress } from '@/lib/utils/typeGuards';

const COMMIT_REVEAL_ADDRESS = assertValidAddress(
  CONTRACTS[11155111].commitReveal,
  'COMMIT_REVEAL_ADDRESS'
);

/**
 * Hook to make a commitment (front-running protection)
 * @returns Commit function and transaction state
 */
export function useCommit() {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();

  return {
    commit: (commitmentHash: `0x${string}`) =>
      writeContract({
        address: COMMIT_REVEAL_ADDRESS,
        abi: COMMIT_REVEAL_ABI,
        functionName: 'commit',
        args: [commitmentHash],
      }),
    hash,
    isPending,
    error,
    reset,
  };
}

/**
 * Hook to reveal a commitment and execute the purchase
 * @returns Reveal function and transaction state
 */
export function useReveal() {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();

  return {
    reveal: (data: string, nonce: bigint, serviceId: bigint) =>
      writeContract({
        address: COMMIT_REVEAL_ADDRESS,
        abi: COMMIT_REVEAL_ABI,
        functionName: 'reveal',
        args: [data, nonce, serviceId],
      }),
    hash,
    isPending,
    error,
    reset,
  };
}

/**
 * Hook to cancel a commitment before it's revealed
 * @returns Cancel function and transaction state
 */
export function useCancelCommitment() {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();

  return {
    cancel: (commitmentHash: `0x${string}`) =>
      writeContract({
        address: COMMIT_REVEAL_ADDRESS,
        abi: COMMIT_REVEAL_ABI,
        functionName: 'cancel',
        args: [commitmentHash],
      }),
    hash,
    isPending,
    error,
    reset,
  };
}

/**
 * Hook to get commitment details for a user
 * @param user The user address
 * @param commitmentHash The commitment hash to query
 * @returns Commitment details
 */
export function useCommitment(
  user: `0x${string}` | undefined,
  commitmentHash: `0x${string}` | undefined
) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: COMMIT_REVEAL_ADDRESS,
    abi: COMMIT_REVEAL_ABI,
    functionName: 'getCommitment',
    args: user && commitmentHash ? [user, commitmentHash] : undefined,
    query: {
      enabled: !!user && !!commitmentHash,
      retry: 2,
      staleTime: 30 * 1000,
    },
  });

  return {
    commitment: data as { blockNumber: bigint; exists: boolean } | undefined,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to check if a commitment is valid and can be revealed
 * @param commitmentHash The commitment hash to check
 * @returns Boolean indicating if commitment is valid
 */
export function useIsCommitmentValid(commitmentHash: `0x${string}` | undefined) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: COMMIT_REVEAL_ADDRESS,
    abi: COMMIT_REVEAL_ABI,
    functionName: 'isCommitmentValid',
    args: commitmentHash ? [commitmentHash] : undefined,
    query: {
      enabled: !!commitmentHash,
      retry: 2,
      staleTime: 30 * 1000,
    },
  });

  return {
    isValid: data as boolean | undefined,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to get the reveal delay (in blocks)
 * @returns Number of blocks required before reveal
 */
export function useRevealDelay() {
  const { data, isLoading, error, refetch } = useReadContract({
    address: COMMIT_REVEAL_ADDRESS,
    abi: COMMIT_REVEAL_ABI,
    functionName: 'REVEAL_DELAY',
    query: {
      retry: 2,
      staleTime: Infinity,
    },
  });

  return {
    revealDelay: data as bigint | undefined,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Helper function to generate a commitment hash
 * Use this client-side before calling useCommit
 * @param data The data to commit (e.g., serviceId + timestamp)
 * @param nonce A random nonce
 * @returns The commitment hash
 */
export function generateCommitmentHash(data: string, nonce: bigint): `0x${string}` {
  // This would use ethers.js or viem to hash
  // Implementation depends on the exact hashing algorithm used in the contract
  // For now, this is a placeholder that should be implemented based on contract logic
  throw new Error('generateCommitmentHash must be implemented based on contract hashing algorithm');
}
