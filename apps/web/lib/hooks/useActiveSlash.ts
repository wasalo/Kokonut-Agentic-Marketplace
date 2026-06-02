'use client';

import { usePublicClient, useAccount } from 'wagmi';
import { useEffect, useState } from 'react';
import { type Address } from 'viem';
import { CONTRACTS } from '@/lib/wagmi';
import { assertValidAddress } from '@/lib/utils/typeGuards';

const AGENTIC_COMMERCE_ADDRESS = assertValidAddress(
  CONTRACTS[11155111].agenticCommerce,
  'AGENTIC_COMMERCE_ADDRESS'
);

const POLL_INTERVAL = 60_000;
const NON_RESPONSIVE_THRESHOLD = 7 * 24 * 60 * 60; // 7 days, matches the dispute window default

export type SlashRisk = 'none' | 'low' | 'medium' | 'high';

export interface EvaluatorSlashWarning {
  risk: SlashRisk;
  reason: string;
  evaluator: Address | null;
  lastActivity: bigint | null; // unix timestamp (seconds); null if unknown
  hoursSinceActivity: number | null;
}

/// @notice Watch an evaluator for signs of non-responsiveness. When an evaluator
///         has been assigned a job but has not produced any output for
///         NON_RESPONSIVE_THRESHOLD seconds, this hook reports elevated slash risk.
///         The actual slashing authority lives in SlashManager; this hook is
///         purely informational for the JobActionsCard warning banner.
export function useActiveSlash(jobId: bigint | undefined, evaluator: Address | null) {
  const { address: user } = useAccount();
  const publicClient = usePublicClient();
  const [lastActivity, setLastActivity] = useState<bigint | null>(null);

  useEffect(() => {
    if (!publicClient || !jobId || !evaluator) return;
    const client = publicClient;
    let cancelled = false;

    async function findLastActivity(): Promise<bigint | null> {
      try {
        const currentBlock = await client.getBlockNumber();
        const fromBlock = currentBlock > 50000n ? currentBlock - 50000n : 0n;

        const logs = await client.getLogs({
          address: AGENTIC_COMMERCE_ADDRESS,
          fromBlock,
          toBlock: currentBlock,
        });
        const cutoff = BigInt(Math.floor(Date.now() / 1000) - NON_RESPONSIVE_THRESHOLD);
        const recentBlocks: bigint[] = [];
        for (const log of logs) {
          if (!log.blockNumber) continue;
          if (log.blockNumber < cutoff) continue;
          recentBlocks.push(log.blockNumber);
        }
        if (recentBlocks.length === 0) return null;
        return recentBlocks.reduce((a, b) => (a > b ? a : b));
      } catch {
        return null;
      }
    }

    void findLastActivity().then(block => {
      if (!cancelled) setLastActivity(block);
    });

    const interval = setInterval(() => {
      void findLastActivity().then(block => {
        if (!cancelled) setLastActivity(block);
      });
    }, POLL_INTERVAL);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [publicClient, jobId, evaluator, user]);

  const nowSecs = BigInt(Math.floor(Date.now() / 1000));
  let risk: SlashRisk = 'none';
  let reason = '';
  let hoursSinceActivity: number | null = null;

  if (lastActivity) {
    // Convert block number to a rough timestamp: ~12s per Sepolia block
    const approxTimestamp = lastActivity * 12n;
    hoursSinceActivity = Number(nowSecs - approxTimestamp) / 3600;
    if (hoursSinceActivity > 168) {
      risk = 'high';
      reason = `Evaluator last active ${Math.floor(hoursSinceActivity / 24)} days ago.`;
    } else if (hoursSinceActivity > 72) {
      risk = 'medium';
      reason = `Evaluator last active ${Math.floor(hoursSinceActivity)} hours ago.`;
    } else if (hoursSinceActivity > 24) {
      risk = 'low';
      reason = `Evaluator last active ${Math.floor(hoursSinceActivity)} hours ago.`;
    }
  } else if (evaluator) {
    risk = 'low';
    reason = 'No recent evaluator activity detected for this job.';
  }

  return {
    risk,
    reason,
    evaluator,
    lastActivity,
    hoursSinceActivity,
  } satisfies EvaluatorSlashWarning;
}
