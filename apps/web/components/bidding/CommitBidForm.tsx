'use client';

import { Loader2, CheckCircle, Copy, AlertTriangle } from 'lucide-react';

interface CommitBidFormProps {
  commitAmount: string;
  commitMessage: string;
  commitSalt: string;
  maxBudgetEth: number;
  stake: bigint;
  ethBalance?: { value: bigint } | null;
  isCommitPending: boolean;
  saltCopied: boolean;
  onAmountChange: (value: string) => void;
  onMessageChange: (value: string) => void;
  onSaltChange: (value: string) => void;
  onCommit: () => void;
  onCopySalt: () => void;
}

export function CommitBidForm({
  commitAmount,
  commitMessage,
  commitSalt,
  maxBudgetEth,
  stake,
  ethBalance,
  isCommitPending,
  saltCopied,
  onAmountChange,
  onMessageChange,
  onSaltChange,
  onCommit,
  onCopySalt,
}: CommitBidFormProps) {
  const stakeEth = Number(formatEther(stake)).toFixed(4);

  return (
    <div className="space-y-4">
      <p className="text-default-500">
        Commit your sealed bid. You will need to reveal it after the deadline.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="commit-amount" className="text-sm font-medium mb-1 block">
            Amount (ETH)
          </label>
          <input
            id="commit-amount"
            type="number"
            value={commitAmount}
            onChange={e => onAmountChange(e.target.value)}
            max={maxBudgetEth}
            step="0.001"
            placeholder="0.0"
            className="w-full px-4 py-2 bg-content1 border border-divider rounded-lg focus:outline-none focus:border-[#009F4D]"
          />
        </div>
        <div>
          <label htmlFor="commit-message" className="text-sm font-medium mb-1 block">
            Message (optional)
          </label>
          <input
            id="commit-message"
            type="text"
            value={commitMessage}
            onChange={e => onMessageChange(e.target.value)}
            placeholder="Why should you win?"
            className="w-full px-4 py-2 bg-content1 border border-divider rounded-lg focus:outline-none focus:border-[#009F4D]"
          />
        </div>
        <div>
          <label htmlFor="commit-salt" className="text-sm font-medium mb-1 block">
            Salt
          </label>
          <div className="flex gap-2">
            <input
              id="commit-salt"
              type="text"
              value={commitSalt}
              onChange={e => onSaltChange(e.target.value)}
              placeholder="Auto-generated (SAVE THIS FOR REVEAL)"
              className="flex-1 px-4 py-2 bg-content1 border border-divider rounded-lg focus:outline-none focus:border-[#009F4D] font-mono text-sm"
            />
            <button
              type="button"
              onClick={onCopySalt}
              className="px-3 py-2 bg-content2 border border-divider rounded-lg hover:bg-content3 transition-colors"
              title="Copy salt to clipboard"
            >
              {saltCopied ? (
                <CheckCircle className="size-4 text-[#009F4D]" />
              ) : (
                <Copy className="size-4" />
              )}
            </button>
          </div>
          <p className="text-xs text-warning mt-1 flex items-center gap-1">
            <AlertTriangle className="size-3" />
            Saved locally in this browser. Copy it somewhere durable before you leave.
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-default-500">
          Stake: {stakeEth} ETH
          {ethBalance && ethBalance.value < stake && (
            <span className="text-danger ml-2">Insufficient balance</span>
          )}
        </p>
        <button
          type="button"
          onClick={onCommit}
          disabled={
            !commitAmount ||
            !commitSalt ||
            parseFloat(commitAmount) > maxBudgetEth ||
            (ethBalance ? ethBalance.value < stake : false) ||
            isCommitPending
          }
          className="px-6 py-2 bg-[#009F4D] text-white font-medium rounded-lg hover:bg-[#008F3D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCommitPending ? (
            <Loader2 className="size-4 animate-spin inline" />
          ) : (
            'Commit Bid'
          )}
        </button>
      </div>
      {commitSalt && (
        <div className="mt-4 p-3 bg-content2 rounded-lg border border-divider">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-default-500">Your salt:</p>
            <button
              type="button"
              onClick={onCopySalt}
              className="text-xs text-[#009F4D] hover:underline flex items-center gap-1"
            >
              {saltCopied ? <CheckCircle className="size-3" /> : <Copy className="size-3" />}
              {saltCopied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <p className="text-sm font-mono break-all">{commitSalt}</p>
        </div>
      )}
    </div>
  );
}

function formatEther(value: bigint): string {
  const str = value.toString();
  const padded = str.padStart(19, '0');
  const intPart = padded.slice(0, -18) || '0';
  const decPart = padded.slice(-18).replace(/0+$/, '') || '0';
  return `${intPart}.${decPart}`;
}
