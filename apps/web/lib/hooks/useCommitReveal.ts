import { useWriteContract, useReadContract, usePublicClient, useAccount } from 'wagmi';
import { useEffect, useState, useMemo } from 'react';
import { parseAbiItem, type Address, type Hash } from 'viem';
import { getContractAddress, SEPOLIA_CHAIN_ID } from '@/lib/contracts/config';
import { COMMIT_REVEAL_ABI } from '@/lib/contracts/abis';

const COMMIT_REVEAL_ADDRESS = getContractAddress('COMMIT_REVEAL');

export type CommitRevealEventKind = 'committed' | 'revealed';

export interface CommitRevealEvent {
  kind: CommitRevealEventKind;
  hash: Hash;
  commitment: Hash;
  sender?: Address;
  value?: bigint;
  blockNumber: bigint;
  transactionHash: Hash;
  logIndex: number;
}

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

/**
 * Phase 45d: Full commit-reveal event subscription with helpers.
 * Watches both CommitCommitted and RevealRevealed events for the connected
 * address and exposes aggregated state (committed but not yet revealed,
 * revealed, ready-to-reveal time).
 */
export function useCommitReveal(address?: Address | undefined) {
  const publicClient = usePublicClient();
  const { address: connectedAddress } = useAccount();
  const target = address ?? connectedAddress;
  const [recentEvents, setRecentEvents] = useState<CommitRevealEvent[]>([]);

  useEffect(() => {
    if (!publicClient || !target) return;
    const client = publicClient;
    const addr = target.toLowerCase();
    let cancelled = false;

    async function fetchHistory() {
      try {
        const currentBlock = await client.getBlockNumber();
        const fromBlock = currentBlock > 10000n ? currentBlock - 10000n : 0n;

        const [committedLogs, revealedLogs] = await Promise.all([
          client.getLogs({
            address: COMMIT_REVEAL_ADDRESS,
            event: parseAbiItem(
              'event CommitCommitted(bytes32 indexed commitment, address indexed sender, uint256 value, uint256 timestamp)'
            ),
            fromBlock,
            toBlock: currentBlock,
          }),
          client.getLogs({
            address: COMMIT_REVEAL_ADDRESS,
            event: parseAbiItem(
              'event RevealRevealed(bytes32 indexed commitment, address indexed sender, uint256 value, bytes data)'
            ),
            fromBlock,
            toBlock: currentBlock,
          }),
        ]);

        const events: CommitRevealEvent[] = [];
        for (const log of committedLogs) {
          const { commitment, sender, value } = log.args as {
            commitment: Hash;
            sender: Address;
            value: bigint;
          };
          if (sender.toLowerCase() !== addr) continue;
          events.push({
            kind: 'committed',
            hash: commitment,
            commitment,
            sender,
            value,
            blockNumber: log.blockNumber ?? 0n,
            transactionHash: log.transactionHash ?? '0x',
            logIndex: Number(log.logIndex ?? 0),
          });
        }
        for (const log of revealedLogs) {
          const { commitment, sender, value } = log.args as {
            commitment: Hash;
            sender: Address;
            value: bigint;
          };
          if (sender.toLowerCase() !== addr) continue;
          events.push({
            kind: 'revealed',
            hash: commitment,
            commitment,
            sender,
            value,
            blockNumber: log.blockNumber ?? 0n,
            transactionHash: log.transactionHash ?? '0x',
            logIndex: Number(log.logIndex ?? 0),
          });
        }
        events.sort((a, b) => Number(b.blockNumber - a.blockNumber));
        if (!cancelled) setRecentEvents(events.slice(0, 50));
      } catch {
        // Polling will retry
      }
    }

    void fetchHistory();
    const interval = setInterval(fetchHistory, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [publicClient, target]);

  const committed = useMemo(
    () => recentEvents.filter(e => e.kind === 'committed'),
    [recentEvents]
  );
  const revealed = useMemo(
    () => recentEvents.filter(e => e.kind === 'revealed'),
    [recentEvents]
  );
  const pending = useMemo(() => {
    const revealedHashes = new Set(revealed.map(e => e.hash));
    return committed.filter(e => !revealedHashes.has(e.hash));
  }, [committed, revealed]);

  return {
    recentEvents,
    committed,
    revealed,
    pending,
    pendingCount: pending.length,
    isEmpty: recentEvents.length === 0,
  };
}

/**
 * Phase 45d: Query helper — check whether a commitment is still valid
 * (committed but not yet revealed, and within the reveal window).
 */
export function useIsRevealed(commitment: Hash | undefined) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: COMMIT_REVEAL_ADDRESS,
    abi: COMMIT_REVEAL_ABI,
    functionName: 'isCommitmentValid',
    args: commitment ? [commitment] : undefined,
    query: {
      enabled: Boolean(commitment),
      retry: 2,
      staleTime: 15 * 1000,
    },
  });
  return { isRevealed: !data, isLoading, error, refetch };
}
