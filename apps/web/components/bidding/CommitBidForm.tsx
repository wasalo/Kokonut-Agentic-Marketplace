'use client';

import { Loader2, CheckCircle, Copy, AlertTriangle } from 'lucide-react';
import { formatUnits } from 'viem';
import type { Token } from '@/lib/tokenUtils';
import { formatAmount } from '@/lib/tokenUtils';
import { Input, Textarea } from '@/components/ui/Input';

interface CommitBidFormProps {
  commitAmount: string;
  commitMessage: string;
  commitSalt: string;
  maxBudget: bigint;
  stake: bigint;
  token: Token;
  tokenBalance: bigint;
  isCommitPending: boolean;
  isApprovalPending: boolean;
  saltCopied: boolean;
  onAmountChange: (value: string) => void;
  onMessageChange: (value: string) => void;
  onRegenerateSalt: () => void;
  onCommit: () => void;
  onCopySalt: () => void;
}

export function CommitBidForm({
  commitAmount,
  commitMessage,
  commitSalt,
  maxBudget,
  stake,
  token,
  tokenBalance,
  isCommitPending,
  isApprovalPending,
  saltCopied,
  onAmountChange,
  onMessageChange,
  onRegenerateSalt,
  onCommit,
  onCopySalt,
}: CommitBidFormProps) {
  const maxBudgetInputMax = formatUnits(maxBudget, token.decimals);
  const maxBudgetNumber = Number(formatUnits(maxBudget, token.decimals));
  const hasInsufficientBalance = tokenBalance < stake;

  return (
    <div className="space-y-4">
      <p className="text-default-500">
        Commit your sealed bid. You will need to reveal it after the deadline.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          id="commit-amount"
          type="number"
          label={`Amount (${token.symbol})`}
          value={commitAmount}
          onChange={e => onAmountChange(e.target.value)}
          max={maxBudgetInputMax}
          step={token.symbol === 'ETH' ? '0.001' : '1'}
          placeholder="0.0"
          variant="subtle"
        />
        <div className="sm:col-span-2">
          <Textarea
            id="commit-message"
            label="Why should you win? (optional)"
            value={commitMessage}
            onChange={e => onMessageChange(e.target.value)}
            placeholder="Describe your approach, relevant experience, timeline, or why your bid is the best fit..."
            rows={4}
            variant="subtle"
          />
        </div>
        <div className="sm:col-span-2 min-w-0">
          <label htmlFor="commit-salt" className="text-sm font-medium mb-1 block">
            Salt (secret until reveal)
          </label>
          <div className="flex flex-col sm:flex-row gap-2 min-w-0">
            <input
              id="commit-salt"
              type="text"
              value={commitSalt}
              readOnly
              placeholder="Auto-generated (SAVE THIS FOR REVEAL)"
              className="min-w-0 flex-1 px-4 py-2 bg-content1 border border-divider rounded-lg focus:outline-none focus:border-[#009F4D] font-mono text-sm"
            />
            <button
              type="button"
              onClick={onRegenerateSalt}
              className="inline-flex items-center justify-center px-3 py-2 bg-content2 border border-divider rounded-lg hover:bg-content3 transition-colors text-sm"
            >
              Regenerate
            </button>
            <button
              type="button"
              onClick={onCopySalt}
              className="inline-flex items-center justify-center px-3 py-2 bg-content2 border border-divider rounded-lg hover:bg-content3 transition-colors"
              title="Copy salt to clipboard"
            >
              {saltCopied ? (
                <CheckCircle className="size-4 text-[#009F4D]" />
              ) : (
                <Copy className="size-4" />
              )}
            </button>
          </div>
          <p className="text-xs text-warning mt-2 flex items-start gap-1.5">
            <AlertTriangle className="size-3 shrink-0 mt-0.5" />
            <span>
              This secret salt hides your bid amount during the commit phase. It is not stored onchain until reveal, so copy it somewhere durable before leaving this browser.
            </span>
          </p>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm text-default-500">
          Stake: {formatAmount(stake, token, { includeSymbol: true })}
          {hasInsufficientBalance && (
            <span className="text-danger ml-2">Insufficient balance</span>
          )}
        </p>
        <button
          type="button"
          onClick={onCommit}
          disabled={
            !commitAmount ||
            !commitSalt ||
            parseFloat(commitAmount) > maxBudgetNumber ||
            hasInsufficientBalance ||
            isCommitPending ||
            isApprovalPending
          }
          className="px-6 py-2 bg-[#009F4D] text-white font-medium rounded-lg hover:bg-[#007a3d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCommitPending || isApprovalPending ? (
            <Loader2 className="size-4 animate-spin inline" />
          ) : (
            'Commit Bid'
          )}
        </button>
      </div>
    </div>
  );
}
