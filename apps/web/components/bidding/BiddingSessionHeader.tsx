'use client';

import { Card } from '@heroui/react';
import NextLink from 'next/link';
import { StatusBadge } from '@/components/StatusBadge';
import { SessionStatus, SessionStatusType } from '@/lib/hooks/useBiddingSystem';
import type { Token } from '@/lib/tokenUtils';
import { formatAmount } from '@/lib/tokenUtils';
import { Address } from '@/components/Address';
import { PaymentTokenBadge } from '@/components/PaymentTokenSelector';

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
  paymentToken: `0x${string}`;
  serviceId: bigint;
  jobId: bigint;
  winner: `0x${string}`;
  useRandomEvaluator: boolean;
}

interface BiddingSessionHeaderProps {
  sessionId: string;
  session: Session;
  stake: bigint;
  token: Token;
}

export function BiddingSessionHeader({ sessionId, session, stake, token }: BiddingSessionHeaderProps) {
  const deadlineDate = new Date(Number(session.deadline) * 1000);
  const hasWinner = session.winner !== '0x0000000000000000000000000000000000000000';
  const hasEvaluator = session.evaluator !== '0x0000000000000000000000000000000000000000';

  return (
    <Card className="border border-divider p-5 md:p-6 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-2xl font-semibold">Session #{sessionId}</h1>
            <StatusBadge
              status={(SESSION_STATUS_BADGE[session.status] || 'active') as any}
              size="md"
            />
            <PaymentTokenBadge token={token} />
          </div>
          <p className="text-sm text-default-500 break-words">
            Commit-reveal bidding session with a 1% stake in {token.symbol}.
          </p>
        </div>
        {session.jobId > 0n && (
          <NextLink
            href={`/jobs/${session.jobId.toString()}`}
            className="shrink-0 inline-flex items-center justify-center rounded-lg border border-divider px-3 py-2 text-sm hover:bg-content2 transition-colors"
          >
            View Job
          </NextLink>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 pt-4 border-t border-divider">
        <Metric label="Max Budget" value={formatAmount(session.maxBudget, token, { includeSymbol: true })} emphasis />
        <Metric label="Stake Required" value={formatAmount(stake, token, { includeSymbol: true })} emphasis />
        <Metric label="Bidding Deadline" value={deadlineDate.toLocaleString()} />
        <Metric label="Payment Token" value={token.symbol} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5 pt-4 border-t border-divider text-sm">
        <Party label="Creator" address={session.creator} />
        <div className="min-w-0">
          <p className="text-xs text-default-400 uppercase tracking-wide mb-1">Evaluator</p>
          {session.useRandomEvaluator || !hasEvaluator ? (
            <span className="inline-flex rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
              Random Pool
            </span>
          ) : (
            <Address address={session.evaluator} truncate />
          )}
        </div>
        {hasWinner && <Party label="Winner" address={session.winner} />}
        {session.serviceId > 0n && (
          <div className="min-w-0">
            <p className="text-xs text-default-400 uppercase tracking-wide mb-1">Service</p>
            <NextLink href={`/marketplace/${session.serviceId.toString()}`} className="text-primary hover:underline">
              Service #{session.serviceId.toString()}
            </NextLink>
          </div>
        )}
      </div>
    </Card>
  );
}

function Metric({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="min-w-0 rounded-lg bg-content2/40 p-3">
      <p className="text-xs text-default-400 uppercase tracking-wide">{label}</p>
      <p className={`mt-1 break-words ${emphasis ? 'text-lg font-semibold text-success' : 'text-sm font-medium'}`}>
        {value}
      </p>
    </div>
  );
}

function Party({ label, address }: { label: string; address: `0x${string}` }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-default-400 uppercase tracking-wide mb-1">{label}</p>
      <Address address={address} truncate />
    </div>
  );
}
