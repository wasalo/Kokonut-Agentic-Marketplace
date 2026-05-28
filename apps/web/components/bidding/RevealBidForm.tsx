'use client';

import { Loader2, CheckCircle, Copy } from 'lucide-react';

interface RevealBidFormProps {
  revealAmount: string;
  revealMessage: string;
  commitSalt: string | null;
  isRevealPending: boolean;
  saltCopied: boolean;
  onAmountChange: (value: string) => void;
  onMessageChange: (value: string) => void;
  onReveal: () => void;
  onCopySalt: () => void;
}

export function RevealBidForm({
  revealAmount,
  revealMessage,
  commitSalt,
  isRevealPending,
  saltCopied,
  onAmountChange,
  onMessageChange,
  onReveal,
  onCopySalt,
}: RevealBidFormProps) {
  return (
    <div className="space-y-4">
      <p className="text-default-500">
        The bidding deadline has passed. Reveal your bid to be considered.
      </p>
      {commitSalt && (
        <div className="p-3 bg-content2 rounded-lg border border-divider">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-default-500">Your salt (required for reveal):</p>
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="reveal-amount" className="text-sm font-medium mb-1 block">
            Amount (ETH)
          </label>
          <input
            id="reveal-amount"
            type="number"
            value={revealAmount}
            onChange={e => onAmountChange(e.target.value)}
            step="0.001"
            placeholder="Same as committed amount"
            className="w-full px-4 py-2 bg-content1 border border-divider rounded-lg focus:outline-none focus:border-[#009F4D]"
          />
        </div>
        <div>
          <label htmlFor="reveal-message" className="text-sm font-medium mb-1 block">
            Message
          </label>
          <input
            id="reveal-message"
            type="text"
            value={revealMessage}
            onChange={e => onMessageChange(e.target.value)}
            placeholder="Same as committed message"
            className="w-full px-4 py-2 bg-content1 border border-divider rounded-lg focus:outline-none focus:border-[#009F4D]"
          />
        </div>
      </div>
      <button
        type="button"
        onClick={onReveal}
        disabled={!revealAmount || isRevealPending}
        className="px-6 py-2 bg-[#009F4D] text-white font-medium rounded-lg hover:bg-[#008F3D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isRevealPending ? (
          <Loader2 className="size-4 animate-spin inline" />
        ) : (
          'Reveal Bid'
        )}
      </button>
    </div>
  );
}
