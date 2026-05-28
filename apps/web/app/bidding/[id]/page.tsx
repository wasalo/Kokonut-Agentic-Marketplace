'use client';

import { use, useState, useCallback, useEffect, useMemo } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Card } from '@heroui/react';
import NextLink from 'next/link';
import { formatEther, parseEther } from 'viem';
import {
  useBiddingSession,
  useBiddingUserBid,
  useBiddingRevealedBids,
  useBiddingAcceptBid,
  useBiddingWithdrawStake,
  useBiddingCancelSession,
  useBiddingExtendRevealWindow,
  useBiddingCommitBid,
  useBiddingRevealBid,
  useBiddingRejectBid,
  useBiddingCompleteSession,
  useBiddingWithdrawCreatorStake,
  SessionStatus,
  SessionStatusType,
} from '@/lib/hooks/useBiddingSystem';
import { StatusBadge } from '@/components/StatusBadge';
import { buildBidCommitHash, useBiddingSalt } from '@/lib/hooks/useBiddingSalt';
import { BiddingSessionHeader } from '@/components/bidding/BiddingSessionHeader';
import { CommitBidForm } from '@/components/bidding/CommitBidForm';
import { RevealBidForm } from '@/components/bidding/RevealBidForm';
import { BiddingWinnerSelection } from '@/components/bidding/BiddingWinnerSelection';
import { ExtendRevealWindow } from '@/components/bidding/ExtendRevealWindow';

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
  useEffect(() => {
    document.title = 'Bidding Session | Kokonut Agent Economy';
  }, []);

  const { id } = use(params);
  const sessionId = BigInt(id);
  const { address, isConnected } = useAccount();

  const { session, isLoading } = useBiddingSession(sessionId);
  const { bid: userBid } = useBiddingUserBid(sessionId, address);
  const { bids: revealedBids, isLoading: isLoadingRevealedBids } = useBiddingRevealedBids(sessionId);
  const { acceptBid, isPending: isAcceptPending } = useBiddingAcceptBid();
  const { withdrawStake, isPending: isWithdrawPending } = useBiddingWithdrawStake();
  const { cancelSession, isPending: isCancelPending } = useBiddingCancelSession();
  const { extendRevealWindow, isPending: isExtendPending } = useBiddingExtendRevealWindow();
  const { commitBid, isPending: isCommitPending } = useBiddingCommitBid();
  const { revealBid, isPending: isRevealPending } = useBiddingRevealBid();
  const { rejectBid, isPending: isRejectPending } = useBiddingRejectBid();
  const { completeSession, isPending: isCompletePending } = useBiddingCompleteSession();
  const { withdrawCreatorStake, isPending: isCreatorWithdrawPending } = useBiddingWithdrawCreatorStake();

  const { data: ethBalance } = useBalance({ address });

  const [extendSeconds, setExtendSeconds] = useState('3600');
  const [selectedBidId, setSelectedBidId] = useState<bigint | null>(null);
  const {
    commitAmount,
    commitMessage,
    commitSalt,
    revealAmount,
    revealMessage,
    saltCopied,
    setCommitAmount,
    setCommitMessage,
    setCommitSalt,
    setRevealAmount,
    setRevealMessage,
    copySalt,
    persistCommitForReveal,
  } = useBiddingSalt(sessionId, Boolean(userBid && !userBid.revealed), userBid?.revealed);

  const stake = session ? (session.maxBudget * 100n) / 10000n : 0n;

  const isCreator = session && address && session.creator.toLowerCase() === address.toLowerCase();
  const isWinner = userBid && userBid.accepted;
  const selectableBids = useMemo(
    () => revealedBids.filter(bid => !bid.rejected),
    [revealedBids]
  );
  const selectedBid = selectableBids.find(bid => bid.bidId === selectedBidId) ?? selectableBids[0];

  useEffect(() => {
    if (selectableBids.length === 0) {
      setSelectedBidId(null);
      return;
    }
    if (!selectedBidId || !selectableBids.some(bid => bid.bidId === selectedBidId)) {
      setSelectedBidId(selectableBids[0].bidId);
    }
  }, [selectableBids, selectedBidId]);

  const handleCommitBid = useCallback(() => {
    if (!commitAmount || !commitSalt || !session) return;

    persistCommitForReveal();
    const commitHashValue = buildBidCommitHash(commitAmount, commitMessage, commitSalt as `0x${string}`);

    commitBid({
      sessionId,
      commitHash: commitHashValue as `0x${string}`,
      stake,
    });
  }, [sessionId, commitAmount, commitMessage, commitSalt, stake, session, commitBid, persistCommitForReveal]);

  const handleRevealBid = useCallback(() => {
    if (!revealAmount || !session) return;

    const amount = parseEther(revealAmount);

    revealBid({
      sessionId,
      amount,
      message: revealMessage,
      salt: commitSalt as `0x${string}`,
    });
  }, [sessionId, revealAmount, revealMessage, commitSalt, session, revealBid]);

  const handleAcceptBid = useCallback(() => {
    if (!selectedBid) return;
    acceptBid({ sessionId, bidId: selectedBid.bidId });
  }, [sessionId, selectedBid, acceptBid]);

  const handleWithdrawStake = useCallback(() => {
    withdrawStake(sessionId);
  }, [sessionId, withdrawStake]);

  const handleWithdrawCreatorStake = useCallback(() => {
    withdrawCreatorStake(sessionId);
  }, [sessionId, withdrawCreatorStake]);

  const handleCancelSession = useCallback(() => {
    cancelSession(sessionId);
  }, [sessionId, cancelSession]);

  const handleCompleteSession = useCallback(() => {
    completeSession(sessionId);
  }, [sessionId, completeSession]);

  const handleRejectBid = useCallback(() => {
    if (!selectedBid) return;
    rejectBid({ sessionId, bidId: selectedBid.bidId, reason: 'Bid rejected by session creator' });
  }, [sessionId, selectedBid, rejectBid]);

  const handleExtendWindow = useCallback(() => {
    extendRevealWindow({ sessionId, additionalSeconds: BigInt(extendSeconds) });
  }, [sessionId, extendSeconds, extendRevealWindow]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="size-8 animate-spin text-[#009F4D]" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="border border-divider p-12 text-center">
          <AlertCircle className="size-12 mx-auto text-default-300 mb-4" />
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

  const maxBudgetEth = Number(formatEther(session.maxBudget));

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <BiddingSessionHeader sessionId={id} session={session} stake={stake} />

      {isConnected && (
        <Card className="border border-divider p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Your Bid Status</h2>
          {userBid ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-default-500">Status</span>
                <StatusBadge
                  status={(SESSION_STATUS_BADGE[session.status as SessionStatusType] || 'active') as any}
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
                  <CheckCircle className="size-5 text-[#009F4D] mb-2" />
                  <p className="font-semibold text-[#009F4D]">You are the winner!</p>
                </div>
              )}
              {userBid.rejected && (
                <div className="mt-4 p-4 bg-danger/10 rounded-lg">
                  <AlertCircle className="size-5 text-danger mb-2" />
                  <p className="font-semibold text-danger">Your bid was rejected.</p>
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
          <CommitBidForm
            commitAmount={commitAmount}
            commitMessage={commitMessage}
            commitSalt={commitSalt}
            maxBudgetEth={maxBudgetEth}
            stake={stake}
            ethBalance={ethBalance}
            isCommitPending={isCommitPending}
            saltCopied={saltCopied}
            onAmountChange={setCommitAmount}
            onMessageChange={setCommitMessage}
            onSaltChange={setCommitSalt}
            onCommit={handleCommitBid}
            onCopySalt={copySalt}
          />
        )}

        {session.status === SessionStatus.BiddingClosed && userBid && !userBid.revealed && isConnected && (
          <RevealBidForm
            revealAmount={revealAmount}
            revealMessage={revealMessage}
            commitSalt={commitSalt}
            isRevealPending={isRevealPending}
            saltCopied={saltCopied}
            onAmountChange={setRevealAmount}
            onMessageChange={setRevealMessage}
            onReveal={handleRevealBid}
            onCopySalt={copySalt}
          />
        )}

        {isCreator && session.status === SessionStatus.BiddingClosed && (
          <BiddingWinnerSelection
            selectableBids={selectableBids}
            selectedBid={selectedBid}
            isLoadingRevealedBids={isLoadingRevealedBids}
            isAcceptPending={isAcceptPending}
            isRejectPending={isRejectPending}
            isCancelPending={isCancelPending}
            onSelectBid={setSelectedBidId}
            onAcceptBid={handleAcceptBid}
            onRejectBid={handleRejectBid}
            onCancelSession={handleCancelSession}
          />
        )}

        {!isWinner && userBid && userBid.stake > 0n && !userBid.stakeWithdrawn && (
          <button
            type="button"
            onClick={handleWithdrawStake}
            disabled={isWithdrawPending}
            className="px-6 py-2 bg-[#009F4D] text-white font-medium rounded-lg hover:bg-[#008F3D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isWithdrawPending ? <Loader2 className="size-4 animate-spin inline" /> : 'Withdraw Stake'}
          </button>
        )}

        {isWinner && userBid && userBid.stake > 0n && !userBid.stakeWithdrawn && (
          <button
            type="button"
            onClick={handleWithdrawStake}
            disabled={isWithdrawPending}
            className="px-6 py-2 bg-[#009F4D] text-white font-medium rounded-lg hover:bg-[#008F3D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isWithdrawPending ? <Loader2 className="size-4 animate-spin inline" /> : 'Withdraw Stake'}
          </button>
        )}

        {isCreator && session.status === SessionStatus.JobCreated && (
          <button
            type="button"
            onClick={handleCompleteSession}
            disabled={isCompletePending}
            className="px-6 py-2 bg-[#009F4D] text-white font-medium rounded-lg hover:bg-[#008F3D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCompletePending ? <Loader2 className="size-4 animate-spin inline" /> : 'Complete Session'}
          </button>
        )}

        {isCreator && (session.status === SessionStatus.Completed || session.status === SessionStatus.Cancelled) && (
          <button
            type="button"
            onClick={handleWithdrawCreatorStake}
            disabled={isCreatorWithdrawPending}
            className="px-6 py-2 bg-[#009F4D] text-white font-medium rounded-lg hover:bg-[#008F3D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreatorWithdrawPending ? <Loader2 className="size-4 animate-spin inline" /> : 'Withdraw Creator Stake'}
          </button>
        )}

        {isCreator && (session.status === SessionStatus.Active || session.status === SessionStatus.BiddingClosed) && (
          <ExtendRevealWindow
            extendSeconds={extendSeconds}
            isExtendPending={isExtendPending}
            onSecondsChange={setExtendSeconds}
            onExtend={handleExtendWindow}
          />
        )}
      </Card>
    </div>
  );
}
