'use client';

import NextLink from 'next/link';
import { Card } from '@heroui/react';
import { CircleDot, Clock, DollarSign } from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import {
  SessionStatus,
  getSessionStatusBadge,
  type BiddingSession,
} from '@/lib/hooks/useBiddingSystem';
import { formatAmount, getTokenByAddress } from '@/lib/tokenUtils';

interface BiddingSessionCardProps {
  session: BiddingSession;
  isConnected: boolean;
}

export function BiddingSessionCard({ session, isConnected }: BiddingSessionCardProps) {
  const sessionIdStr = session.id.toString();
  const isActive = session.status === SessionStatus.Active;
  const token = getTokenByAddress(session.paymentToken);
  const BudgetIcon = token.symbol === 'ETH' ? CircleDot : DollarSign;
  const deadlineDate = new Date(Number(session.deadline) * 1000);
  const evaluatorLabel = session.useRandomEvaluator || session.evaluator === '0x0000000000000000000000000000000000000000'
    ? 'Random Pool'
    : session.evaluator;

  return (
    <Card className="border border-divider p-4 hover:border-[#009F4D]/30 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <NextLink href={`/bidding/${sessionIdStr}`} className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">Session #{sessionIdStr}</h3>
            <StatusBadge status={getSessionStatusBadge(session.status).badge} size="sm" />
          </div>
          <p className="text-sm text-default-500 mt-0.5 truncate">Evaluator: {evaluatorLabel}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-xs text-default-400">
            <span className="flex items-center gap-1">
              <BudgetIcon className="size-3" />
              Max: {formatAmount(session.maxBudget, token, { includeSymbol: true })}
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
          <div className="shrink-0 sm:text-right">
            {isConnected ? (
              <NextLink
                href={`/bidding/${sessionIdStr}`}
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-[#009F4D] to-[#00c853] text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
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
