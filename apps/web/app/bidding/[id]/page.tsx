'use client';

import { use, useState, useCallback } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { ArrowLeft, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Card } from '@heroui/react';
import NextLink from 'next/link';
import { formatEther, parseEther, keccak256, toHex, encodePacked } from 'viem';
import {
  useBiddingSession,
  useBiddingUserBid,
  useBiddingAcceptBid,
  useBiddingWithdrawStake,
  useBiddingClaimStake,
  useBiddingCancelSession,
  useBiddingExtendRevealWindow,
  useBiddingCommitBid,
  useBiddingRevealBid,
  SessionStatus,
  SessionStatusType,
} from '@/lib/hooks/useBiddingSystem';
import { StatusBadge } from '@/components/StatusBadge';

const SESSION_STATUS_BADGE: Record<SessionStatusType, string> = {
  [SessionStatus.Active]: 'active',
  [SessionStatus.BiddingClosed]: 'pending',
  [SessionStatus.WinnerSelected]: 'under-review',
  [SessionStatus.JobCreated]: 'under-review',
  [SessionStatus.Completed]: 'completed',
  [SessionStatus.Cancelled]: 'cancelled',
};

export default function BiddingSessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): JSX.Element {
  const { id } = use(params);
  const sessionId = BigInt(id);
  const { address, isConnected } = useAccount();

  const { session, isLoading } = useBiddingSession(sessionId);
  const { bid: userBid } = useBiddingUserBid(sessionId, address);
  const { acceptBid, isPending: isAcceptPending } = useBiddingAcceptBid();
  const {
    withdrawStake,
    isPending: isWithdrawPending,
  } = useBiddingWithdrawStake();
  const { claimStake, isPending: isClaimPending } = useBiddingClaimStake();
  const { cancelSession, isPending: isCancelPending } = useBiddingCancelSession();
  const {
    extendRevealWindow,
    isPending: isExtendPending,
  } = useBiddingExtendRevealWindow();
  const { commitBid, isPending: isCommitPending } = useBiddingCommitBid();
  const { revealBid, isPending: isRevealPending } = useBiddingRevealBid();

  const { data: ethBalance } = useBalance({ address });

  const [commitAmount, setCommitAmount] = useState('');
  const [commitMessage, setCommitMessage] = useState('');
  const [commitSalt, setCommitSalt] = useState('');
  const [revealAmount, setRevealAmount] = useState('');
  const [revealMessage, setRevealMessage] = useState('');
  const [extendSeconds, setExtendSeconds] = useState('3600');

  const stake = session ? (session.maxBudget * 100n) / 10000n : 0n;

  const isCreator = session && address && session.creator.toLowerCase() === address.toLowerCase();
  const isWinner = userBid && userBid.accepted;

  const handleCommitBid = useCallback(() => {
    if (!commitAmount || !commitSalt || !session) return;

    const amount = parseEther(commitAmount);
    const saltHash = keccak256(toHex(commitSalt));
    const commitHashValue = keccak256(
      encodePacked(['uint256', 'string', 'bytes32'], [amount, commitMessage, saltHash])
    );

    commitBid({
      sessionId,
      commitHash: commitHashValue as `0x${string}`,
      stake,
    });
  }, [sessionId, commitAmount, commitMessage, commitSalt, stake, session, commitBid]);

  const handleRevealBid = useCallback(() => {
    if (!revealAmount || !session) return;

    const amount = parseEther(revealAmount);
    const saltHash = keccak256(toHex(commitSalt || 'default-salt'));

    revealBid({
      sessionId,
      amount,
      message: revealMessage,
      salt: saltHash,
    });
  }, [sessionId, revealAmount, revealMessage, commitSalt, session, revealBid]);

  const handleAcceptBid = useCallback(() => {
    if (!userBid) return;
    acceptBid({ sessionId, bidId: userBid.bidId });
  }, [sessionId, userBid, acceptBid]);

  const handleWithdrawStake = useCallback(() => {
    withdrawStake(sessionId);
  }, [sessionId, withdrawStake]);

  const handleClaimStake = useCallback(() => {
    claimStake(sessionId);
  }, [sessionId, claimStake]);

  const handleCancelSession = useCallback(() => {
    cancelSession(sessionId);
  }, [sessionId, cancelSession]);

  const handleExtendWindow = useCallback(() => {
    extendRevealWindow({ sessionId, additionalSeconds: BigInt(extendSeconds) });
  }, [sessionId, extendSeconds, extendRevealWindow]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#009F4D]" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="border border-divider p-12 text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-default-300 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Session not found</h3>
          <p className="text-default-500 mb-4">
            This bidding session does not exist or has been removed.
          </p>
          <NextLink href="/bidding" className="text-[#009F4D] hover:underline">
            Back to Bidding Sessions
          </NextLink>
        </Card>
      </div>
    );
  }

  const deadlineDate = new Date(Number(session.deadline) * 1000);
  const maxBudgetEth = Number(formatEther(session.maxBudget));

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center gap-4 mb-8">
        <NextLink href="/bidding" className="p-2 hover:bg-content2 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </NextLink>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Session #{id}</h1>
            <StatusBadge
              status={
                (SESSION_STATUS_BADGE[session.status as SessionStatusType] || 'active') as any
              }
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
                status={
                  (SESSION_STATUS_BADGE[session.status as SessionStatusType] || 'active') as any
                }
                size="sm"
              />
            </div>
          </div>
        </Card>
      </div>

      {isConnected && (
        <Card className="border border-divider p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Your Bid Status</h2>
          {userBid ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-default-500">Status</span>
                <StatusBadge
                  status={
                    (SESSION_STATUS_BADGE[session.status as SessionStatusType] || 'active') as any
                  }
                  size="md"
                />
              </div>
              {userBid.revealed && (
                <div className="flex items-center justify-between">
                  <span className="text-default-500">Proposed Amount</span>
                  <span className="font-semibold">
                    {Number(formatEther(userBid.proposedAmount)).toFixed(4)} ETH
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-default-500">Stake</span>
                <span className="font-semibold">
                  {Number(formatEther(userBid.stake)).toFixed(4)} ETH
                </span>
              </div>
              {userBid.accepted && (
                <div className="mt-4 p-4 bg-[#009F4D]/10 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-[#009F4D] mb-2" />
                  <p className="font-semibold text-[#009F4D]">You are the winner!</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-default-500">You have not submitted a bid for this session.</p>
          )}
        </Card>
      )}

      <Card className="border border-divider p-6">
        <h2 className="text-lg font-semibold mb-4">Actions</h2>

        {session.status === SessionStatus.Active && !userBid && isConnected && (
          <div className="space-y-4">
            <p className="text-default-500">
              Commit your sealed bid. You will need to reveal it after the deadline.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Amount (ETH)</label>
                <input
                  type="number"
                  value={commitAmount}
                  onChange={e => setCommitAmount(e.target.value)}
                  max={maxBudgetEth}
                  step="0.001"
                  placeholder="0.0"
                  className="w-full px-4 py-2 bg-content1 border border-divider rounded-lg focus:outline-none focus:border-[#009F4D]"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Message (optional)</label>
                <input
                  type="text"
                  value={commitMessage}
                  onChange={e => setCommitMessage(e.target.value)}
                  placeholder="Why should you win?"
                  className="w-full px-4 py-2 bg-content1 border border-divider rounded-lg focus:outline-none focus:border-[#009F4D]"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Salt</label>
                <input
                  type="text"
                  value={commitSalt}
                  onChange={e => setCommitSalt(e.target.value)}
                  placeholder="Random string"
                  className="w-full px-4 py-2 bg-content1 border border-divider rounded-lg focus:outline-none focus:border-[#009F4D]"
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-default-500">
                Stake: {Number(formatEther(stake)).toFixed(4)} ETH
                {ethBalance && ethBalance.value < stake && (
                  <span className="text-danger ml-2">Insufficient balance</span>
                )}
              </p>
              <button
                onClick={handleCommitBid}
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
                  <Loader2 className="w-4 h-4 animate-spin inline" />
                ) : (
                  'Commit Bid'
                )}
              </button>
            </div>
          </div>
        )}

        {session.status === SessionStatus.BiddingClosed &&
          userBid &&
          !userBid.revealed &&
          isConnected && (
            <div className="space-y-4">
              <p className="text-default-500">
                The bidding deadline has passed. Reveal your bid to be considered.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Amount (ETH)</label>
                  <input
                    type="number"
                    value={revealAmount}
                    onChange={e => setRevealAmount(e.target.value)}
                    step="0.001"
                    placeholder="Same as committed amount"
                    className="w-full px-4 py-2 bg-content1 border border-divider rounded-lg focus:outline-none focus:border-[#009F4D]"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Message</label>
                  <input
                    type="text"
                    value={revealMessage}
                    onChange={e => setRevealMessage(e.target.value)}
                    placeholder="Same as committed message"
                    className="w-full px-4 py-2 bg-content1 border border-divider rounded-lg focus:outline-none focus:border-[#009F4D]"
                  />
                </div>
              </div>
              <button
                onClick={handleRevealBid}
                disabled={!revealAmount || isRevealPending}
                className="px-6 py-2 bg-[#009F4D] text-white font-medium rounded-lg hover:bg-[#008F3D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRevealPending ? (
                  <Loader2 className="w-4 h-4 animate-spin inline" />
                ) : (
                  'Reveal Bid'
                )}
              </button>
            </div>
          )}

        {isCreator && session.status === SessionStatus.BiddingClosed && (
          <div className="space-y-4">
            <p className="text-default-500">The bidding is closed. Select a winner to proceed.</p>
            <div className="flex gap-4">
              <button
                onClick={handleAcceptBid}
                disabled={!userBid || userBid.accepted || isAcceptPending}
                className="px-6 py-2 bg-[#009F4D] text-white font-medium rounded-lg hover:bg-[#008F3D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAcceptPending ? (
                  <Loader2 className="w-4 h-4 animate-spin inline" />
                ) : userBid?.accepted ? (
                  'Accepted'
                ) : (
                  'Accept Winning Bid'
                )}
              </button>
              <button
                onClick={handleCancelSession}
                disabled={isCancelPending}
                className="px-6 py-2 bg-danger text-white font-medium rounded-lg hover:opacity-80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCancelPending ? (
                  <Loader2 className="w-4 h-4 animate-spin inline" />
                ) : (
                  'Cancel Session'
                )}
              </button>
            </div>
          </div>
        )}

        {!isWinner && userBid && userBid.stake > 0n && !userBid.stakeWithdrawn && (
          <button
            onClick={handleWithdrawStake}
            disabled={isWithdrawPending}
            className="px-6 py-2 bg-[#009F4D] text-white font-medium rounded-lg hover:bg-[#008F3D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isWithdrawPending ? (
              <Loader2 className="w-4 h-4 animate-spin inline" />
            ) : (
              'Withdraw Stake'
            )}
          </button>
        )}

        {isWinner && userBid && userBid.stake > 0n && !userBid.stakeWithdrawn && (
          <button
            onClick={handleClaimStake}
            disabled={isClaimPending}
            className="px-6 py-2 bg-[#009F4D] text-white font-medium rounded-lg hover:bg-[#008F3D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isClaimPending ? (
              <Loader2 className="w-4 h-4 animate-spin inline" />
            ) : (
              'Claim Stake (as Job Funding)'
            )}
          </button>
        )}

        {isCreator &&
          (session.status === SessionStatus.Active ||
            session.status === SessionStatus.BiddingClosed) && (
            <div className="mt-6 pt-6 border-t border-divider">
              <p className="text-sm text-default-500 mb-4">Extend reveal window if needed:</p>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  value={extendSeconds}
                  onChange={e => setExtendSeconds(e.target.value)}
                  placeholder="3600"
                  className="w-32 px-4 py-2 bg-content1 border border-divider rounded-lg focus:outline-none focus:border-[#009F4D]"
                />
                <span className="text-default-500">seconds</span>
                <button
                  onClick={handleExtendWindow}
                  disabled={isExtendPending || !extendSeconds}
                  className="px-6 py-2 bg-content2 border border-divider font-medium rounded-lg hover:bg-content3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isExtendPending ? (
                    <Loader2 className="w-4 h-4 animate-spin inline" />
                  ) : (
                    'Extend Window'
                  )}
                </button>
              </div>
            </div>
          )}
      </Card>
    </div>
  );
}
