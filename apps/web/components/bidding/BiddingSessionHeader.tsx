'use client';

import { Card } from '@heroui/react';
import { ArrowLeft } from 'lucide-react';
import NextLink from 'next/link';
import { formatEther } from 'viem';
import { StatusBadge } from '@/components/StatusBadge';
import { SessionStatus, SessionStatusType } from '@/lib/hooks/useBiddingSystem';

const SESSION_STATUS_BADGE: Record<SessionStatusType, string> = {
  [SessionStatus.Active]: 'active',
  [SessionStatus.BiddingClosed]: 'pending',
  [SessionStatus.WinnerSelected]: 'under-review',
  [SessionStatus.JobCreated]: 'under-review',
  [SessionStatus.Completed]: 'completed',
  [SessionStatus.Cancelled]: 'cancelled',
};

interface Session {
  creator: `0x${string}`;
  maxBudget: bigint;
  evaluator: `0x${string}`;
  deadline: bigint;
  status: SessionStatusType;
}

interface BiddingSessionHeaderProps {
  sessionId: string;
  session: Session;
  stake: bigint;
}

export function BiddingSessionHeader({ sessionId, session, stake }: BiddingSessionHeaderProps) {
  const deadlineDate = new Date(Number(session.deadline) * 1000);
  const maxBudgetEth = Number(formatEther(session.maxBudget));

  return (
    <>
      <div className="flex items-center gap-4 mb-8">
        <NextLink href="/marketplace?tab=bidding" className="p-2 hover:bg-content2 rounded-lg transition-colors">
          <ArrowLeft className="size-5" />
        </NextLink>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Session #{sessionId}</h1>
            <StatusBadge
              status={(SESSION_STATUS_BADGE[session.status] || 'active') as any}
              size="md"
            />
          </div>
          <p className="text-default-500">Created by {session.creator}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card className="border border-divider p-6">
          <h2 className="text-lg font-semibold mb-4">Session Details</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-default-500">Max Budget</span>
              <span className="font-semibold">{maxBudgetEth.toFixed(4)} ETH</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-default-500">Stake Required</span>
              <span className="font-semibold text-[#009F4D]">
                {Number(formatEther(stake)).toFixed(4)} ETH
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-default-500">Evaluator</span>
              <span className="font-mono text-sm">{session.evaluator}</span>
            </div>
          </div>
        </Card>

        <Card className="border border-divider p-6">
          <h2 className="text-lg font-semibold mb-4">Timeline</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-default-500">Bidding Deadline</span>
              <span className="font-semibold">{deadlineDate.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-default-500">Status</span>
              <StatusBadge
                status={(SESSION_STATUS_BADGE[session.status] || 'active') as any}
                size="sm"
              />
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
