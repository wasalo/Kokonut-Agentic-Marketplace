'use client';

import { useMemo } from 'react';
import { useAccount } from 'wagmi';
import { useJobs, type Job } from '@/lib/hooks/useJobs';
import { useBiddingSessions, SessionStatus, type BiddingSession } from '@/lib/hooks/useBiddingSystem';
import { getAttentionReason } from '@/components/marketplace/MarketplaceHubPanels';

export type ActionItemKind = 'job' | 'bidding';

export interface ActionItem {
  id: string;
  kind: ActionItemKind;
  href: string;
  title: string;
  reason: string;
  urgency: 'high' | 'medium' | 'low';
  updatedAt?: bigint;
}

const HIGH_URGENCY_REASONS = new Set([
  'Finalize evaluation',
  'Review deliverable and release payment',
  'Fund escrow to start the job',
  'Submit your deliverable',
  'Deliverable rejected — review feedback',
  'Job expired — claim refund if funded',
  'Select a winning bid',
  'Reveal your bid',
  'Withdraw stake',
]);

function urgencyFor(reason: string): ActionItem['urgency'] {
  if (HIGH_URGENCY_REASONS.has(reason)) return 'high';
  return 'medium';
}

function jobTitle(job: Job): string {
  return job.description.length > 0
    ? `Job #${job.id.toString()} — ${job.description.slice(0, 48)}${job.description.length > 48 ? '…' : ''}`
    : `Job #${job.id.toString()}`;
}

function sessionTitle(session: BiddingSession): string {
  return `Bidding Session #${session.id.toString()}`;
}

function biddingReasonFor(session: BiddingSession, user: `0x${string}`): string | null {
  const lower = user.toLowerCase();
  const isCreator = session.creator.toLowerCase() === lower;
  const isWinner = session.winner.toLowerCase() === lower;
  const nowSec = BigInt(Math.floor(Date.now() / 1000));

  if (isCreator && session.status === SessionStatus.Active && nowSec < session.deadline) {
    return 'Your session is accepting bids';
  }
  if (isCreator && session.status === SessionStatus.BiddingClosed) {
    return 'Select a winning bid';
  }
  if (isCreator && session.status === SessionStatus.WinnerSelected && session.jobId === 0n) {
    return 'Create the job from the winning bid';
  }
  if (isWinner && session.status === SessionStatus.JobCreated) {
    return 'Complete session once job is done';
  }
  if (isCreator && (session.status === SessionStatus.Completed || session.status === SessionStatus.Cancelled)) {
    return 'Withdraw creator stake';
  }
  return null;
}

export function useActionQueue(): {
  items: ActionItem[];
  jobCount: number;
  biddingCount: number;
  totalCount: number;
  isLoading: boolean;
} {
  const { address, isConnected } = useAccount();
  const { jobs, isLoading: isLoadingJobs } = useJobs(0, 100);
  const { sessions, isLoading: isLoadingSessions } = useBiddingSessions(0, 50);

  const items = useMemo<ActionItem[]>(() => {
    if (!isConnected || !address) return [];

    const jobItems: ActionItem[] = [];
    for (const job of jobs) {
      const reason = getAttentionReason(job, address);
      if (!reason) continue;
      jobItems.push({
        id: `job-${job.id.toString()}`,
        kind: 'job',
        href: `/jobs/${job.id.toString()}`,
        title: jobTitle(job),
        reason,
        urgency: urgencyFor(reason),
      });
    }

    const biddingItems: ActionItem[] = [];
    for (const session of sessions) {
      const reason = biddingReasonFor(session, address);
      if (!reason) continue;
      biddingItems.push({
        id: `bidding-${session.id.toString()}`,
        kind: 'bidding',
        href: `/bidding/${session.id.toString()}`,
        title: sessionTitle(session),
        reason,
        urgency: urgencyFor(reason),
        updatedAt: session.deadline,
      });
    }

    return [...jobItems, ...biddingItems].sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 } as const;
      return order[a.urgency] - order[b.urgency];
    });
  }, [jobs, sessions, address, isConnected]);

  const jobCount = items.filter(item => item.kind === 'job').length;
  const biddingCount = items.filter(item => item.kind === 'bidding').length;

  return {
    items,
    jobCount,
    biddingCount,
    totalCount: items.length,
    isLoading: isLoadingJobs || isLoadingSessions,
  };
}
