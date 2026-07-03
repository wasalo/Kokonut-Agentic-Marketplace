'use client';

import { useQuery } from '@tanstack/react-query';
import { usePublicClient } from 'wagmi';
import { AGENTIC_COMMERCE_ABI } from '@/lib/contracts/abis';
import { CONTRACTS } from '@/lib/wagmi';
import { type Bid, useJobBidCount } from '@/lib/hooks/useJobs';

const AGENTIC_COMMERCE_ADDRESS = CONTRACTS[11155111].agenticCommerce as `0x${string}`;

export function useJobBids(jobId: bigint | undefined, enabled: boolean) {
  const publicClient = usePublicClient();
  const { count: bidCount } = useJobBidCount(jobId);

  const query = useQuery<Bid[]>({
    queryKey: ['job-bids', jobId],
    queryFn: async () => {
      const calls = Array.from({ length: bidCount }, (_, i) => ({
        address: AGENTIC_COMMERCE_ADDRESS,
        abi: AGENTIC_COMMERCE_ABI,
        functionName: 'jobBids' as const,
        args: [jobId, BigInt(i)],
      }));

      const results = await publicClient!.multicall({ contracts: calls } as any);
      const fetchedBids: Bid[] = [];

      for (const result of results) {
        if (result.status !== 'success') continue;
        const bidResult = result as unknown as { result?: unknown };
        if (!bidResult.result || typeof bidResult.result !== 'object') continue;
        const bid = bidResult.result as { bidId?: bigint };
        if (bid.bidId) fetchedBids.push(bidResult.result as Bid);
      }

      return fetchedBids;
    },
    enabled: !!publicClient && !!jobId && enabled && bidCount > 0,
    staleTime: 60_000,
  });

  return { bidCount, bids: query.data ?? [], isLoadingBids: query.isLoading };
}
