'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useWaitForTransactionReceipt } from 'wagmi';
import { Loader2, AlertTriangle, CheckCircle2, Lock, Eye, Trophy } from 'lucide-react';
import { Card } from '@heroui/react';
import {
  useCommitBid,
  useRevealBid,
  useAcceptBid,
  useUserBid,
  useJobConstants,
  useCalculateStake,
  Job,
  Bid,
} from '@/lib/hooks/useJobs';
import { getTransactionError, showToast } from '@/lib/toast';
import { useFormSubmit, formatTimeRemaining } from '@/lib/hooks/useDebounce';
import {
  useTokenPriceConversion,
  USDC_TOKEN,
  ETH_TOKEN,
  Token,
} from '@/lib/hooks/useTokenConversion';

const MIN_BUDGET_USDC = 0.01;

interface CommitBidFormProps {
  job: Job;
  onSuccess?: () => void;
}

export function CommitBidForm({ job, onSuccess }: CommitBidFormProps) {
  const { isConnected, address } = useAccount();
  const { revealWindow } = useJobConstants();
  const { calculateStake } = useCalculateStake();
  const { formatUsdValue } = useTokenPriceConversion();

  const maxBudget = job.budget > 0 ? job.budget : BigInt(100_000_000); // fallback
  const stakeAmount = calculateStake(maxBudget);
  const isEthPayment = job.paymentToken === '0x0000000000000000000000000000000000000000';
  const paymentToken: Token = isEthPayment ? ETH_TOKEN : USDC_TOKEN;
  const stakeFormatted = formatUsdValue(stakeAmount, paymentToken);

  const [bidAmount, setBidAmount] = useState('');
  const [bidMessage, setBidMessage] = useState('');
  const [salt, setSalt] = useState<`0x${string}`>(() => {
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
      const amountUsdc = BigInt(Math.floor(parseFloat(bidAmount) * 1e6));
      const hash = keccak256Hex(abiEncode(amountUsdc, bidMessage, salt));
      setCommitHash(hash as `0x${string}`);
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

    if (amount > Number(maxBudget) / 1e6) {
      setError('Bid exceeds maximum budget');
      return;
    }

    commitBid(job.id, commitHash, stakeAmount);
  }, [isConnected, address, bidAmount, maxBudget, job.id, commitHash, stakeAmount, commitBid]);

  const { handleSubmit, isSubmitting, timeUntilNextSubmit } = useFormSubmit(handleCommit, 2000);

  const isLoading = isPending || isConfirming;

  return (
    <Card className="border border-divider p-6">
      <div className="flex items-center gap-2 mb-4">
        <Lock className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">Commit Your Bid</h3>
      </div>

      <p className="text-sm text-default-500 mb-4">
        Submit a sealed bid. You cannot change it after committing. Stake 1% to bid.
      </p>

      <div className="space-y-4">
        <div className="p-3 bg-content2 rounded-lg">
          <p className="text-xs text-default-500">Maximum Budget</p>
          <p className="font-medium">${(Number(maxBudget) / 1e6).toFixed(2)} USDC</p>
        </div>

        <div className="p-3 bg-warning-50 border border-warning-200 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning" />
            <p className="text-sm font-medium text-warning">
              Stake Required: {stakeFormatted} USDC
            </p>
          </div>
          <p className="text-xs text-default-500 mt-1">
            This will be held until you reveal or withdraw your bid
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Your Bid Amount (USDC)</label>
          <input
            type="number"
            step="0.01"
            min={MIN_BUDGET_USDC}
            max={(Number(maxBudget) / 1e6).toFixed(2)}
            value={bidAmount}
            onChange={e => setBidAmount(e.target.value)}
            placeholder="0.00"
            className="w-full px-3 py-2 bg-content2 border border-divider rounded-lg"
          />
          {bidAmount && parseFloat(bidAmount) > Number(maxBudget) / 1e6 && (
            <p className="text-xs text-danger">Bid exceeds maximum budget</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Your Message (optional)</label>
          <textarea
            value={bidMessage}
            onChange={e => setBidMessage(e.target.value)}
            placeholder="Introduce yourself and explain why you're the best fit..."
            rows={3}
            className="w-full px-3 py-2 bg-content2 border border-divider rounded-lg resize-none"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Commit Hash (auto-generated)</label>
          <div className="p-3 bg-content2 rounded-lg break-all">
            <code className="text-xs text-default-500">{commitHash.slice(0, 20)}...</code>
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

        <button
          onClick={handleSubmit}
          disabled={!isConnected || isLoading || !bidAmount || isSubmitting}
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#009F4D] to-[#00c853] text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {isConfirming ? 'Confirming...' : 'Committing...'}
            </>
          ) : isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Wait {formatTimeRemaining(timeUntilNextSubmit)}...
            </>
          ) : (
            <>
              <Lock className="w-4 h-4" />
              Commit Bid (Stake {stakeFormatted} USDC)
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
  const { revealWindow } = useJobConstants();

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

    const amountUsdc = BigInt(Math.floor(parseFloat(bidAmount) * 1e6));

    revealBid(job.id, amountUsdc, bidMessage, salt as `0x${string}`);
  }, [userBid, job.id, bidAmount, bidMessage, salt, revealBid]);

  const isLoading = isPending || isConfirming;
  const canReveal = userBid && userBid.commitHash !== '0x' + '0'.repeat(64) && !userBid.revealed;

  return (
    <Card className="border border-divider p-6">
      <div className="flex items-center gap-2 mb-4">
        <Eye className="w-5 h-5 text-success" />
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
            <p className="text-xs font-mono">{userBid.commitHash.slice(0, 20)}...</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Bid Amount (USDC)</label>
            <input
              type="number"
              step="0.01"
              value={bidAmount}
              onChange={e => setBidAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 bg-content2 border border-divider rounded-lg"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Salt (from commit)</label>
            <input
              type="text"
              value={salt}
              onChange={e => setSalt(e.target.value)}
              placeholder="0x..."
              className="w-full px-3 py-2 bg-content2 border border-divider rounded-lg font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Message</label>
            <textarea
              value={bidMessage}
              onChange={e => setBidMessage(e.target.value)}
              placeholder="Your pitch message..."
              rows={2}
              className="w-full px-3 py-2 bg-content2 border border-divider rounded-lg resize-none"
            />
          </div>

          {txError && (
            <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg text-danger text-sm">
              {getTransactionError(txError)}
            </div>
          )}

          <button
            onClick={handleReveal}
            disabled={!isConnected || isLoading || !bidAmount || !salt}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#009F4D] to-[#00c853] text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {isConfirming ? 'Confirming...' : 'Revealing...'}
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" />
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
    <Card className="border border-divider p-6">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-5 h-5 text-warning" />
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
                      ${(Number(bid.proposedAmount) / 1e6).toFixed(2)} USDC
                    </p>
                    <p className="text-xs text-default-500 mt-1">
                      Bidder: {bid.bidder.slice(0, 6)}...{bid.bidder.slice(-4)}
                    </p>
                    {bid.message && <p className="text-sm text-default-600 mt-2">{bid.message}</p>}
                  </div>
                  <div className="text-right">
                    {selectedBidId === bid.bidId && (
                      <CheckCircle2 className="w-5 h-5 text-success" />
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

          <button
            onClick={handleAccept}
            disabled={!isConnected || address !== job.client || isLoading || selectedBidId === null}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#009F4D] to-[#00c853] text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {isConfirming ? 'Confirming...' : 'Accepting...'}
              </>
            ) : (
              <>
                <Trophy className="w-4 h-4" />
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
    <Card className="border border-divider p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium">Your Bid</h4>
        <span
          className={`px-2 py-0.5 text-xs rounded-full ${
            bid.accepted
              ? 'bg-success/20 text-success'
              : bid.revealed
                ? 'bg-primary/20 text-primary'
                : 'bg-warning/20 text-warning'
          }`}
        >
          {bid.accepted ? 'Accepted' : bid.revealed ? 'Revealed' : 'Committed'}
        </span>
      </div>

      {bid.revealed ? (
        <div className="space-y-1">
          <p className="text-lg font-semibold">
            ${(Number(bid.proposedAmount) / 1e6).toFixed(2)} USDC
          </p>
          {bid.message && <p className="text-sm text-default-500">{bid.message}</p>}
        </div>
      ) : (
        <p className="text-sm text-default-500">Bid amount hidden until reveal phase</p>
      )}

      <div className="mt-3 pt-3 border-t border-divider">
        <p className="text-xs text-default-500">
          Stake: ${(Number(bid.stake) / 1e6).toFixed(2)} USDC
        </p>
      </div>
    </Card>
  );
}

function keccak256Hex(data: string): string {
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    return window.crypto.subtle.digest('SHA-256', dataBuffer).then(buf => {
      return (
        '0x' +
        Array.from(new Uint8Array(buf))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')
      );
    }) as unknown as string;
  }
  return '0x' + '0'.repeat(64);
}

function abiEncode(amount: bigint, message: string, salt: string): string {
  return (
    '0x' +
    amount.toString(16).padStart(64, '0') +
    message.length.toString(16).padStart(64, '0') +
    Buffer.from(message).toString('hex').padEnd(64, '0') +
    salt.replace('0x', '').padEnd(64, '0')
  );
}
