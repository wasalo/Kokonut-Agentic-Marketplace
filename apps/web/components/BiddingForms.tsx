'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useWaitForTransactionReceipt } from 'wagmi';
import { Loader2, AlertTriangle, CheckCircle2, Lock, Eye, Trophy } from 'lucide-react';
import { Card } from '@heroui/react';
import { keccak256, encodeAbiParameters } from 'viem';
import {
  useCommitBid,
  useRevealBid,
  useAcceptBid,
  useUserBid,
  useCalculateStake,
  Job,
  Bid,
} from '@/lib/hooks/useJobs';
import { getTransactionError, showToast } from '@/lib/toast';
import { useFormSubmit, formatTimeRemaining } from '@/lib/hooks/useDebounce';
import { Address } from '@/components/Address';
import { StatusBadge } from '@/components/StatusBadge';
import { Input, Textarea } from '@/components/ui/Input';
import { card, btn } from '@/lib/design-system';
import {
  useTokenPriceConversion,
  USDC_TOKEN,
  ETH_TOKEN,
  Token,
} from '@/lib/hooks/useTokenConversion';
import { amountToNumber, formatAmount, parseAmount } from '@/lib/tokenUtils';

const MIN_BUDGET_USDC = 0.01;

interface CommitBidFormProps {
  job: Job;
  onSuccess?: () => void;
}

export function CommitBidForm({ job, onSuccess }: CommitBidFormProps) {
  const { isConnected, address } = useAccount();
  const { calculateStake } = useCalculateStake();
  const { formatUsdValue } = useTokenPriceConversion();

  const maxBudget = job.budget > 0 ? job.budget : BigInt(100_000_000); // fallback
  const stakeAmount = calculateStake(maxBudget);
  const isEthPayment = job.paymentToken === '0x0000000000000000000000000000000000000000';
  const paymentToken: Token = isEthPayment ? ETH_TOKEN : USDC_TOKEN;
  const stakeFormatted = typeof stakeAmount === 'bigint' 
    ? formatUsdValue(stakeAmount, paymentToken)
    : 'N/A';

  const [bidAmount, setBidAmount] = useState('');
  const [bidMessage, setBidMessage] = useState('');
  const [salt] = useState<`0x${string}`>(() => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return ('0x' +
      Array.from(array)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')) as `0x${string}`;
  });

  const [commitHash, setCommitHash] = useState<`0x${string}`>(
    ('0x' + '0'.repeat(64)) as `0x${string}`
  );
  const [error, setError] = useState<string | null>(null);

  const { commitBid, hash, isPending, error: txError } = useCommitBid();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (bidAmount && salt) {
      const amountEth = parseAmount(bidAmount, 18);
      const hash = keccak256(
        encodeAbiParameters(
          [{ type: 'uint256' }, { type: 'string' }, { type: 'bytes32' }],
          [amountEth, bidMessage, salt]
        )
      );
      setCommitHash(hash);
    }
  }, [bidAmount, bidMessage, salt]);

  useEffect(() => {
    if (isSuccess && hash) {
      showToast.success('Bid Committed!', 'Your sealed bid has been submitted.');
      onSuccess?.();
    }
  }, [isSuccess, hash, onSuccess]);

  const handleCommit = useCallback(() => {
    if (!isConnected || !address) return;

    setError(null);

    const amount = parseFloat(bidAmount);
    if (isNaN(amount) || amount < MIN_BUDGET_USDC) {
      setError(`Minimum bid is $${MIN_BUDGET_USDC}`);
      return;
    }

    if (amount > amountToNumber(maxBudget, paymentToken)) {
      setError('Bid exceeds maximum budget');
      return;
    }

    if (typeof stakeAmount === 'bigint') {
      commitBid(job.id, commitHash, stakeAmount);
    } else {
      setError('Failed to calculate stake amount');
    }
  }, [isConnected, address, bidAmount, maxBudget, paymentToken, job.id, commitHash, stakeAmount, commitBid]);

  const { handleSubmit, isSubmitting, timeUntilNextSubmit } = useFormSubmit(handleCommit, 2000);

  const isLoading = isPending || isConfirming;

  return (
    <Card className={card('padded', 'p-6')}>
      <div className="flex items-center gap-2 mb-4">
        <Lock className="size-5 text-primary" />
        <h3 className="font-semibold">Commit Your Bid</h3>
      </div>

      <p className="text-sm text-default-500 mb-4">
        Submit a sealed bid. You cannot change it after committing. Stake 1% to bid.
      </p>

      <div className="space-y-4">
        <div className="p-3 bg-content2 rounded-lg">
          <p className="text-xs text-default-500">Maximum Budget</p>
          <p className="font-medium">
            {formatAmount(maxBudget, paymentToken, {
              includeSymbol: true,
              minFractionDigits: paymentToken.symbol === 'USDC' ? 2 : 0,
              maxFractionDigits: paymentToken.symbol === 'USDC' ? 2 : 6,
            })}
          </p>
        </div>

        <div className="p-3 bg-warning-50 border border-warning-200 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-warning" />
            <p className="text-sm font-medium text-warning">
              Stake Required: {stakeFormatted}
            </p>
          </div>
          <p className="text-xs text-default-500 mt-1">
            This will be held until you reveal or withdraw your bid
          </p>
        </div>

        <div className="space-y-2">
          <Input
            type="number"
            label="Your Bid Amount (ETH)"
            step="0.001"
            min="0.001"
            max={(Number(maxBudget) / 1e18).toFixed(3)}
            value={bidAmount}
            onChange={e => setBidAmount(e.target.value)}
            placeholder="0.000"
            error={bidAmount && parseFloat(bidAmount) > Number(maxBudget) / 1e18 ? 'Bid exceeds maximum budget' : undefined}
          />
        </div>

        <div className="space-y-2">
          <Textarea
            label="Your Message (optional)"
            value={bidMessage}
            onChange={e => setBidMessage(e.target.value)}
            placeholder="Introduce yourself and explain why you're the best fit…"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Commit Hash (auto-generated)</label>
          <div className="p-3 bg-content2 rounded-lg break-all">
            <code className="text-xs text-default-500">{commitHash.slice(0, 20)}…</code>
          </div>
          <p className="text-xs text-default-500">
            This hash hides your bid amount until the reveal phase
          </p>
        </div>

        {(error || txError) && (
          <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg text-danger text-sm">
            {error || getTransactionError(txError)}
          </div>
        )}

        <button type="button"
          onClick={handleSubmit}
          disabled={!isConnected || isLoading || !bidAmount || isSubmitting}
          className={btn('primary', 'w-full px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed')}
        >
          {isLoading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {isConfirming ? 'Confirming…' : 'Committing…'}
            </>
          ) : isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Wait {formatTimeRemaining(timeUntilNextSubmit)}...
            </>
          ) : (
              <>
                <Lock className="size-4" />
                Commit Bid (Stake {stakeFormatted})
              </>
          )}
        </button>
      </div>
    </Card>
  );
}

interface RevealBidFormProps {
  job: Job;
  onSuccess?: () => void;
}

export function RevealBidForm({ job, onSuccess }: RevealBidFormProps) {
  const { isConnected, address } = useAccount();
  const { bid: userBid } = useUserBid(job.id, address);

  const { revealBid, hash, isPending, error: txError } = useRevealBid();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const [bidAmount, setBidAmount] = useState('');
  const [bidMessage, setBidMessage] = useState('');
  const [salt, setSalt] = useState('');

  useEffect(() => {
    if (isSuccess) {
      showToast.success('Bid Revealed!', 'Your bid is now visible to the client.');
      onSuccess?.();
    }
  }, [isSuccess, onSuccess]);

  const handleReveal = useCallback(() => {
    if (!userBid || userBid.commitHash === '0x' + '0'.repeat(64)) {
      showToast.error('No committed bid found');
      return;
    }

    const amountEth = parseAmount(bidAmount, 18);

    revealBid(job.id, amountEth, bidMessage, salt as `0x${string}`);
  }, [userBid, job.id, bidAmount, bidMessage, salt, revealBid]);

  const isLoading = isPending || isConfirming;
  const canReveal = userBid && userBid.commitHash !== '0x' + '0'.repeat(64) && !userBid.revealed;

  return (
    <Card className={card('padded', 'p-6')}>
      <div className="flex items-center gap-2 mb-4">
        <Eye className="size-5 text-success" />
        <h3 className="font-semibold">Reveal Your Bid</h3>
      </div>

      {!canReveal ? (
        <div className="text-center py-4">
          <p className="text-sm text-default-500">
            {userBid?.revealed
              ? 'You have already revealed your bid.'
              : 'You have not committed a bid for this job.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-default-500 mb-4">
            Enter the same amount and salt you used when committing. Your bid will be visible to the
            client.
          </p>

          <div className="p-3 bg-content2 rounded-lg">
            <p className="text-xs text-default-500">Committed Amount</p>
            <p className="text-xs font-mono">{userBid.commitHash.slice(0, 20)}…</p>
          </div>

          <div className="space-y-2">
            <Input
              type="number"
              label="Bid Amount (ETH)"
              step="0.001"
              value={bidAmount}
              onChange={e => setBidAmount(e.target.value)}
              placeholder="0.000"
            />
          </div>

          <div className="space-y-2">
            <Input
              type="text"
              label="Salt (from commit)"
              value={salt}
              onChange={e => setSalt(e.target.value)}
              placeholder="0x…"
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <Textarea
              label="Message"
              value={bidMessage}
              onChange={e => setBidMessage(e.target.value)}
              placeholder="Your pitch message…"
              rows={2}
            />
          </div>

          {txError && (
            <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg text-danger text-sm">
              {getTransactionError(txError)}
            </div>
          )}

          <button type="button"
            onClick={handleReveal}
            disabled={!isConnected || isLoading || !bidAmount || !salt}
            className={btn('primary', 'w-full px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed')}
          >
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {isConfirming ? 'Confirming…' : 'Revealing…'}
              </>
            ) : (
              <>
                <Eye className="size-4" />
                Reveal Bid
              </>
            )}
          </button>
        </div>
      )}
    </Card>
  );
}

interface AcceptBidFormProps {
  job: Job;
  bids: Bid[];
  onSuccess?: () => void;
}

export function AcceptBidForm({ job, bids, onSuccess }: AcceptBidFormProps) {
  const { isConnected, address } = useAccount();
  const { acceptBid, hash, isPending, error: txError } = useAcceptBid();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const [selectedBidId, setSelectedBidId] = useState<bigint | null>(null);
  const { formatUsdValue } = useTokenPriceConversion();

  useEffect(() => {
    if (isSuccess) {
      showToast.success('Bid Accepted!', 'The job has been assigned to the selected provider.');
      onSuccess?.();
    }
  }, [isSuccess, onSuccess]);

  const handleAccept = useCallback(() => {
    if (selectedBidId === null) return;
    acceptBid(job.id, selectedBidId);
  }, [job.id, selectedBidId, acceptBid]);

  const isLoading = isPending || isConfirming;
  const revealedBids = bids.filter(b => b.revealed && !b.accepted);

  return (
    <Card className={card('padded', 'p-6')}>
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="size-5 text-warning" />
        <h3 className="font-semibold">Accept a Bid</h3>
      </div>

      {revealedBids.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-sm text-default-500">
            No bids have been revealed yet. Wait for providers to reveal their bids.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-default-500 mb-4">
            Select a bid to accept. The provider will be assigned and their stake returned.
          </p>

          <div className="space-y-3">
            {revealedBids.map(bid => (
              <div
                key={bid.bidId.toString()}
                onClick={() => setSelectedBidId(bid.bidId)}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  selectedBidId === bid.bidId
                    ? 'border-success bg-success/5'
                    : 'border-divider hover:border-default-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">
                      {Number(bid.proposedAmount) / 1e18} ETH
                    </p>
                    <p className="text-xs text-default-400 mt-0.5">
                      ≈ {formatUsdValue(bid.proposedAmount, ETH_TOKEN)} USD
                    </p>
                    <p className="text-xs text-default-500 mt-1">
                      Bidder: <Address address={bid.bidder as `0x${string}`} truncate />
                    </p>
                    {bid.message && <p className="text-sm text-default-600 mt-2">{bid.message}</p>}
                  </div>
                  <div className="text-right">
                    {selectedBidId === bid.bidId && (
                      <CheckCircle2 className="size-5 text-success" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {txError && (
            <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg text-danger text-sm">
              {getTransactionError(txError)}
            </div>
          )}

          <button type="button"
            onClick={handleAccept}
            disabled={!isConnected || address !== job.client || isLoading || selectedBidId === null}
            className={btn('primary', 'w-full px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed')}
          >
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {isConfirming ? 'Confirming…' : 'Accepting…'}
              </>
            ) : (
              <>
                <Trophy className="size-4" />
                Accept Bid & Fund Job
              </>
            )}
          </button>

          <p className="text-xs text-default-500 text-center">
            Accepting will set the budget to the bid amount and trigger job funding
          </p>
        </div>
      )}
    </Card>
  );
}

export function BidStatusCard({ bid }: { bid: Bid }) {
  return (
    <Card className={card('padded')}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium">Your Bid</h4>
        <span>
          {bid.accepted ? (
            <StatusBadge status="completed" size="sm" />
          ) : bid.revealed ? (
            <StatusBadge status="active" size="sm" />
          ) : (
            <StatusBadge status="pending" size="sm" />
          )}
        </span>
      </div>

      {bid.revealed ? (
        <div className="space-y-1">
          <p className="text-lg font-semibold">
            {Number(bid.proposedAmount) / 1e18} ETH
          </p>
          {bid.message && <p className="text-sm text-default-500">{bid.message}</p>}
        </div>
      ) : (
        <p className="text-sm text-default-500">Bid amount hidden until reveal phase</p>
      )}

      <div className="mt-3 pt-3 border-t border-divider">
        <p className="text-xs text-default-500">
          Stake: {Number(bid.stake) / 1e18} ETH
        </p>
      </div>
    </Card>
  );
}
