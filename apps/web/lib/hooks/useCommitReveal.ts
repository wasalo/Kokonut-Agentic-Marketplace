import { useReadContract, useWriteContract } from 'wagmi';
import { encodeAbiParameters, keccak256, toHex } from 'viem';
import { getContractAddress } from '@/lib/contracts/config';
import { COMMIT_REVEAL_ABI } from '@/lib/contracts/abis';

const COMMIT_REVEAL_ADDRESS = getContractAddress('COMMIT_REVEAL');

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
    commitment: data,
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
    isValid: data,
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
    revealDelay: data,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Generate a commitment hash for the CommitReveal pattern
 * @param userAddress The user's address (msg.sender in contract)
 * @param secret A random secret (bytes32)
 * @param serviceId The service ID being committed to
 * @returns The commitment hash (keccak256 of abi.encode(user, secret, serviceId))
 */
export function generateCommitmentHash(
  userAddress: `0x${string}`,
  secret: `0x${string}`,
  serviceId: bigint
): `0x${string}` {
  const encoded = encodeAbiParameters(
    [{ type: 'address' }, { type: 'bytes32' }, { type: 'uint256' }],
    [userAddress, secret, serviceId]
  );
  return keccak256(encoded);
}

/**
 * Generate a random secret for commitment
 * @returns A random bytes32 hex string
 */
export function generateSecret(): `0x${string}` {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return toHex(array);
}
