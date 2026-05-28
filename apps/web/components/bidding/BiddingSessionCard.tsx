'use client';

import NextLink from 'next/link';
import { Card } from '@heroui/react';
import { Clock, DollarSign } from 'lucide-react';
import { formatEther } from 'viem';
import { StatusBadge, type StatusType } from '@/components/StatusBadge';
import {
  SessionStatus,
  type BiddingSession,
  type SessionStatusType,
} from '@/lib/hooks/useBiddingSystem';

const SESSION_STATUS_BADGE: Record<SessionStatusType, StatusType> = {
  [SessionStatus.Active]: 'active',
  [SessionStatus.BiddingClosed]: 'pending',
  [SessionStatus.WinnerSelected]: 'under-review',
  [SessionStatus.JobCreated]: 'under-review',
  [SessionStatus.Completed]: 'completed',
  [SessionStatus.Cancelled]: 'cancelled',
};

interface BiddingSessionCardProps {
  session: BiddingSession;
  isConnected: boolean;
}

export function BiddingSessionCard({ session, isConnected }: BiddingSessionCardProps) {
  const sessionIdStr = session.id.toString();
  const isActive = session.status === SessionStatus.Active;
  const maxBudgetEth = Number(formatEther(session.maxBudget));
  const deadlineDate = new Date(Number(session.deadline) * 1000);

  return (
    <Card className="border border-divider p-4 hover:border-[#009F4D]/30 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <NextLink href={`/bidding/${sessionIdStr}`} className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">Session #{sessionIdStr}</h3>
            <StatusBadge status={SESSION_STATUS_BADGE[session.status]} size="sm" />
          </div>
          <p className="text-sm text-default-500 mt-0.5 truncate">Evaluator: {session.evaluator}</p>
          <div className="flex items-center gap-4 mt-2 text-xs text-default-400">
            <span className="flex items-center gap-1">
              <DollarSign className="size-3" />
              Max: {maxBudgetEth.toFixed(4)} ETH
            </span>
            <span className="flex items-center gap-1">
              <Clock className="size-3" />
              Deadline: {deadlineDate.toLocaleDateString()}
            </span>
            {session.serviceId > 0n && (
              <span className="flex items-center gap-1">
                Service #{session.serviceId.toString()}
              </span>
            )}
          </div>
        </NextLink>

        {isActive && (
          <div className="shrink-0">
            {isConnected ? (
              <NextLink
                href={`/bidding/${sessionIdStr}`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#009F4D] to-[#00c853] text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
              >
                View Session
              </NextLink>
            ) : (
              <span className="text-xs text-default-400 bg-content2 px-3 py-2 rounded-lg">
                Connect wallet to bid
              </span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
