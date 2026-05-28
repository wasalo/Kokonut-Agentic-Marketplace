'use client';

import { useEffect, useState } from 'react';
import { usePublicClient } from 'wagmi';
import { AGENTIC_COMMERCE_ABI } from '@/lib/contracts/abis';
import { CONTRACTS } from '@/lib/wagmi';
import { type Bid, useJobBidCount } from '@/lib/hooks/useJobs';

const AGENTIC_COMMERCE_ADDRESS = CONTRACTS[11155111].agenticCommerce as `0x${string}`;

export function useJobBids(jobId: bigint | undefined, enabled: boolean) {
  const publicClient = usePublicClient();
  const { count: bidCount } = useJobBidCount(jobId);
  const [bids, setBids] = useState<Bid[]>([]);
  const [isLoadingBids, setIsLoadingBids] = useState(false);

  useEffect(() => {
    if (!publicClient || !jobId || !enabled || bidCount === 0) {
      setBids([]);
      return;
    }

    const fetchBids = async () => {
      setIsLoadingBids(true);
      try {
        const calls = Array.from({ length: bidCount }, (_, i) => ({
          address: AGENTIC_COMMERCE_ADDRESS,
          abi: AGENTIC_COMMERCE_ABI,
          functionName: 'jobBids' as const,
          args: [jobId, BigInt(i)],
        }));

        const results = await publicClient.multicall({ contracts: calls } as any);
        const fetchedBids: Bid[] = [];

        for (const result of results) {
          if (result.status !== 'success') continue;
          const bidResult = result as unknown as { result?: unknown };
          if (!bidResult.result || typeof bidResult.result !== 'object') continue;
          const bid = bidResult.result as { bidId?: bigint };
          if (bid.bidId) fetchedBids.push(bidResult.result as Bid);
        }

        setBids(fetchedBids);
      } catch (err) {
        console.error('Error fetching bids:', err);
        setBids([]);
      } finally {
        setIsLoadingBids(false);
      }
    };

    void fetchBids();
  }, [publicClient, jobId, bidCount, enabled]);

  return { bidCount, bids, isLoadingBids };
}
