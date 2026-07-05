'use client';

import { useMemo } from 'react';
import { useReadContracts } from 'wagmi';
import { BIDDING_SYSTEM_ABI } from '@/lib/contracts/abis';
import { getContractAddress } from '@/lib/contracts/config';
import { useBiddingSessions } from '@/lib/hooks/useBiddingSystem';

const BIDDING_SYSTEM_ADDRESS = getContractAddress('BIDDING_SYSTEM');
const SCAN_LIMIT = 50;

export interface MyBidEntry {
  sessionId: bigint;
  /** Raw bid tuple decoded by viem; may include committed/revealed amounts and a stake. */
  bid: unknown;
}

/**
 * Scans the most recent sessions and returns the subset where the supplied
 * bidder has an on-chain bid. The number of sessions scanned is bounded by
 * `SCAN_LIMIT` to keep RPC cost predictable.
 */
export function useMyBids(bidder: `0x${string}` | undefined): {
  entries: MyBidEntry[];
  isLoading: boolean;
} {
  const { sessions, totalCount, isLoading: isSessionsLoading } = useBiddingSessions();
  const sessionIds = useMemo(() => {
    if (!sessions) return [];
    return sessions.slice(0, SCAN_LIMIT).map(s => s.id);
  }, [sessions]);

  const { data, isLoading: isMulticallLoading } = useReadContracts({
    contracts: sessionIds.map(id => ({
      address: BIDDING_SYSTEM_ADDRESS as `0x${string}`,
      abi: BIDDING_SYSTEM_ABI,
      functionName: 'getUserBid' as const,
      args: [id, bidder ?? '0x0000000000000000000000000000000000000000'] as const,
    })),
    query: {
      enabled: Boolean(bidder) && sessionIds.length > 0,
      staleTime: 15 * 1000,
    },
  });

  const entries = useMemo<MyBidEntry[]>(() => {
    if (!data || !bidder) return [];
    const out: MyBidEntry[] = [];
    data.forEach((result, idx) => {
      if (result.status !== 'success') return;
      const value = result.result as { bidId?: bigint; revealed?: boolean } | null | undefined;
      if (value && typeof value.bidId === 'bigint' && value.bidId > 0n) {
        out.push({ sessionId: sessionIds[idx], bid: value });
      }
    });
    return out;
  }, [data, bidder, sessionIds]);

  return {
    entries,
    isLoading: isSessionsLoading || isMulticallLoading || (Boolean(bidder) && totalCount === undefined),
  };
}
