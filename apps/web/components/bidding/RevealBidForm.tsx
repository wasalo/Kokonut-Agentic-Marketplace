'use client';

import { Loader2, CheckCircle, Copy } from 'lucide-react';
import type { Token } from '@/lib/tokenUtils';
import { Input } from '@/components/ui/Input';

interface RevealBidFormProps {
  revealAmount: string;
  revealMessage: string;
  commitSalt: string | null;
  token: Token;
  isRevealPending: boolean;
  saltCopied: boolean;
  onAmountChange: (value: string) => void;
  onMessageChange: (value: string) => void;
  onSaltChange: (value: string) => void;
  onReveal: () => void;
  onCopySalt: () => void;
}

export function RevealBidForm({
  revealAmount,
  revealMessage,
  commitSalt,
  token,
  isRevealPending,
  saltCopied,
  onAmountChange,
  onMessageChange,
  onSaltChange,
  onReveal,
  onCopySalt,
}: RevealBidFormProps) {
  const hasSavedSalt = Boolean(commitSalt);

  return (
    <div className="space-y-4">
      <p className="text-default-500">
        The bidding deadline has passed. Reveal your bid to be considered.
      </p>
      {hasSavedSalt ? (
        <div className="p-3 bg-content2 rounded-lg border border-divider min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-1">
            <p className="text-xs text-default-500">Your saved salt (required for reveal):</p>
            <button
              type="button"
              onClick={onCopySalt}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              {saltCopied ? <CheckCircle className="size-3" /> : <Copy className="size-3" />}
              {saltCopied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <p className="text-sm font-mono break-all min-w-0">{commitSalt}</p>
        </div>
      ) : (
        <div className="p-3 bg-warning/10 rounded-lg border border-warning/30">
          <label htmlFor="reveal-salt" className="text-sm font-medium mb-1 block text-warning">
            Recovery salt required
          </label>
          <input
            id="reveal-salt"
            type="text"
            value={commitSalt || ''}
            onChange={e => onSaltChange(e.target.value)}
            placeholder="Paste the salt you copied when committing your bid"
            className="w-full px-4 py-2 bg-content1 border border-warning/30 rounded-lg focus:outline-none focus:border-warning font-mono text-sm"
          />
          <p className="text-xs text-default-500 mt-2">
            The salt was intentionally kept offchain during commit to keep your bid sealed. Enter the exact salt used when committing or the reveal will fail.
          </p>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          id="reveal-amount"
          type="number"
          label={`Amount (${token.symbol})`}
          value={revealAmount}
          onChange={e => onAmountChange(e.target.value)}
          step={token.symbol === 'ETH' ? '0.001' : '1'}
          placeholder="Same as committed amount"
          variant="subtle"
        />
        <Input
          id="reveal-message"
          type="text"
          label="Message"
          value={revealMessage}
          onChange={e => onMessageChange(e.target.value)}
          placeholder="Same as committed message"
          variant="subtle"
        />
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onReveal}
          disabled={!revealAmount || !commitSalt || isRevealPending}
          className="w-full sm:w-auto px-6 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRevealPending ? (
            <Loader2 className="size-4 animate-spin inline" />
          ) : (
            'Reveal Bid'
          )}
        </button>
      </div>
    </div>
  );
}
