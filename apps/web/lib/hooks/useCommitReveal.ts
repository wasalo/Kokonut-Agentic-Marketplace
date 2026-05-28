import { useWriteContract } from 'wagmi';
import { getContractAddress } from '@/lib/contracts/config';
import { COMMIT_REVEAL_ABI } from '@/lib/contracts/abis';

const COMMIT_REVEAL_ADDRESS = getContractAddress('COMMIT_REVEAL');
const SEPOLIA_CHAIN_ID = 11155111;

/**
 * Hook to make a commitment (front-running protection)
 * @returns Commit function and transaction state
 */
export function useCommit() {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();

  return {
    commit: (commitmentHash: `0x${string}`) =>
      writeContract({
        chainId: SEPOLIA_CHAIN_ID,
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
