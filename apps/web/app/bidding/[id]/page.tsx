'use client';

import { use, useState, useCallback, useEffect, useMemo, type ReactNode } from 'react';
import { useAccount, useBalance, usePublicClient, useWriteContract } from 'wagmi';
import { ArrowLeft, Loader2, CheckCircle, AlertCircle, RefreshCw, Trophy, Wallet } from 'lucide-react';
import { Card } from '@heroui/react';
import NextLink from 'next/link';
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
import { useUSDCBalance } from '@/lib/hooks/useUSDC';
import { useUSDCApproval } from '@/lib/hooks/useUSDCApproval';
import { getContractAddress } from '@/lib/contracts/config';
import { formatAmount, getTokenByAddress, parseAmount } from '@/lib/tokenUtils';
import { ErrorDisplay } from '@/components/ErrorDisplay';

const BIDDING_SYSTEM_ADDRESS = getContractAddress('BIDDING_SYSTEM');

type ApprovalPhase = 'idle' | 'checking' | 'approving' | 'creating';

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

  const [currentTimestamp, setCurrentTimestamp] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTimestamp(Math.floor(Date.now() / 1000));
    }, 15_000);
    return () => window.clearInterval(intervalId);
  }, []);

  const { id } = use(params);
  const sessionId = BigInt(id);
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync: writeApprovalAsync } = useWriteContract();

  const { session, isLoading } = useBiddingSession(sessionId);
  const { bid: userBid } = useBiddingUserBid(sessionId, address);
  const { bids: revealedBids, isLoading: isLoadingRevealedBids } = useBiddingRevealedBids(sessionId);
  const { acceptBid, isPending: isAcceptPending, writeError: acceptError } = useBiddingAcceptBid();
  const { withdrawStake, isPending: isWithdrawPending, error: withdrawError } = useBiddingWithdrawStake();
  const { cancelSession, isPending: isCancelPending, writeError: cancelError } = useBiddingCancelSession();
  const { extendRevealWindow, isPending: isExtendPending, writeError: extendError } = useBiddingExtendRevealWindow();
  const {
    commitBid,
    isPending: isCommitPending,
    isConfirming: isCommitConfirming,
    isConfirmed: isCommitConfirmed,
    writeError: commitWriteError,
  } = useBiddingCommitBid();
  const { revealBid, isPending: isRevealPending, writeError: revealError } = useBiddingRevealBid();
  const { rejectBid, isPending: isRejectPending, writeError: rejectError } = useBiddingRejectBid();
  const { completeSession, isPending: isCompletePending, writeError: completeError } = useBiddingCompleteSession();
  const { withdrawCreatorStake, isPending: isCreatorWithdrawPending, error: creatorWithdrawError } = useBiddingWithdrawCreatorStake();

  const { data: ethBalance } = useBalance({ address });
  const { balance: usdcBalance } = useUSDCBalance(address);

  const [extendSeconds, setExtendSeconds] = useState('3600');
  const [selectedBidId, setSelectedBidId] = useState<bigint | null>(null);
  const [commitApprovalPhase, setCommitApprovalPhase] = useState<ApprovalPhase>('idle');
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
    regenerateSalt,
    setRevealAmount,
    setRevealMessage,
    copySalt,
    persistCommitForReveal,
  } = useBiddingSalt(sessionId, Boolean(userBid && !userBid.revealed), userBid?.revealed);

  const stake = session ? (session.maxBudget * 100n) / 10000n : 0n;
  const sessionToken = useMemo(() => getTokenByAddress(session?.paymentToken), [session?.paymentToken]);
  const tokenBalance = sessionToken.symbol === 'ETH' ? ethBalance?.value ?? 0n : usdcBalance ?? 0n;
  const isCommitApprovalPending = commitApprovalPhase !== 'idle';
  const isCommitBusy = isCommitPending || isCommitConfirming || isCommitApprovalPending;
  const txStep = commitApprovalPhase === 'checking'
    ? 'Checking USDC allowance'
    : commitApprovalPhase === 'approving'
      ? 'Approving USDC stake'
      : isCommitBusy
        ? 'Committing bid'
        : isRevealPending
          ? 'Revealing bid'
          : isAcceptPending
            ? 'Accepting bid'
            : isRejectPending
              ? 'Rejecting bid'
              : isCancelPending
                ? 'Cancelling session'
                : isExtendPending
                  ? 'Extending reveal window'
                  : isWithdrawPending || isCreatorWithdrawPending
                    ? 'Withdrawing stake'
                    : isCompletePending
                      ? 'Completing session'
                      : null;
  const currentError = commitWriteError || revealError || acceptError || rejectError || cancelError ||
    extendError || withdrawError || creatorWithdrawError || completeError;
  const { ensureUSDCApproval } = useUSDCApproval({
    account: address,
    publicClient,
    spender: BIDDING_SYSTEM_ADDRESS,
    writeContractAsync: writeApprovalAsync,
    setPhase: setCommitApprovalPhase,
  });

  const isCreator = session && address && session.creator.toLowerCase() === address.toLowerCase();
  const isWinner = userBid && userBid.accepted;
  const now = BigInt(currentTimestamp);
  const isOpenStatus = session?.status === SessionStatus.Active || session?.status === SessionStatus.BiddingClosed;
  const hasDeadlinePassed = Boolean(session && now >= session.deadline);
  const isCommitPhase = Boolean(session && session.status === SessionStatus.Active && now < session.deadline);
  const isRevealPhase = Boolean(session && isOpenStatus && now >= session.deadline && now < session.revealWindowEnd);
  const isSelectionPhase = Boolean(session && isCreator && isOpenStatus && now >= session.deadline);
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

  const handleCommitBid = useCallback(async () => {
    if (!commitAmount || !commitSalt || !session) return;

    if (sessionToken.symbol === 'USDC') {
      const approved = await ensureUSDCApproval(stake, formatAmount(stake, sessionToken));
      if (!approved) return;
    }

    setCommitApprovalPhase('creating');
    persistCommitForReveal();
    const commitHashValue = buildBidCommitHash(
      commitAmount,
      commitMessage,
      commitSalt as `0x${string}`,
      sessionToken.decimals
    );

    commitBid({
      sessionId,
      commitHash: commitHashValue as `0x${string}`,
      stake,
      paymentToken: session.paymentToken,
    });
  }, [sessionId, commitAmount, commitMessage, commitSalt, stake, session, sessionToken, ensureUSDCApproval, commitBid, persistCommitForReveal]);

  const handleRevealBid = useCallback(() => {
    if (!revealAmount || !commitSalt || !session) return;

    const amount = parseAmount(revealAmount, sessionToken);

    revealBid({
      sessionId,
      amount,
      message: revealMessage,
      salt: commitSalt as `0x${string}`,
    });
  }, [sessionId, revealAmount, revealMessage, commitSalt, session, sessionToken, revealBid]);

  useEffect(() => {
    if (commitWriteError || isCommitConfirmed) setCommitApprovalPhase('idle');
  }, [commitWriteError, isCommitConfirmed]);

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

  const canWithdrawUserStake = Boolean(userBid && userBid.stake > 0n && !userBid.stakeWithdrawn);
  const canCancelSession = Boolean(
    isCreator &&
    session?.status === SessionStatus.Active &&
    session.winner === '0x0000000000000000000000000000000000000000' &&
    !session.jobCreated &&
    revealedBids.length === 0
  );
  const canExtendRevealWindow = Boolean(isCreator && isRevealPhase);
  const hasVisibleAction = Boolean(
    !isConnected ||
    (isCommitPhase && !isCreator && !userBid) ||
    (isRevealPhase && userBid && !userBid.revealed) ||
    isSelectionPhase ||
    canWithdrawUserStake ||
    (isCreator && session?.status === SessionStatus.JobCreated) ||
    (isCreator && (session?.status === SessionStatus.Completed || session?.status === SessionStatus.Cancelled)) ||
    canCancelSession ||
    canExtendRevealWindow
  );
  const actionEmptyMessage = isCreator && isCommitPhase
    ? 'Your session is accepting bids. You can cancel while no bids have been revealed.'
    : !userBid && hasDeadlinePassed && isOpenStatus
      ? 'Bidding has closed for new bids.'
      : userBid?.revealed && isOpenStatus
        ? 'Your bid is revealed. Waiting for the creator to select a winner.'
        : 'No actions are available for your wallet at this session state.';

  if (isLoading) {
    return (
      <div className="container mx-auto px-3 md:px-4 py-6 md:py-8">
        <div className="max-w-2xl mx-auto animate-pulse space-y-4">
          <div className="h-8 bg-content2 rounded w-1/3" />
          <div className="h-56 bg-content2 rounded" />
          <div className="h-40 bg-content2 rounded" />
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container mx-auto px-3 md:px-4 py-6 md:py-8">
        <Card className="max-w-2xl mx-auto border border-divider p-6 md:p-8 text-center">
          <AlertCircle className="size-12 mx-auto text-default-300 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Session not found</h3>
          <p className="text-default-500 mb-4">
            This bidding session does not exist or has been removed.
          </p>
          <NextLink href="/marketplace?tab=bidding" className="text-[#009F4D] hover:underline">
            Back to Bidding Sessions
          </NextLink>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-3 md:px-4 py-6 md:py-8">
      <NextLink
        href="/marketplace?tab=bidding"
        className="inline-flex items-center text-sm text-default-500 hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Bidding Sessions
      </NextLink>

      <div className="max-w-2xl mx-auto space-y-6">
        <BiddingSessionHeader sessionId={id} session={session} stake={stake} token={sessionToken} />

        {txStep && (
          <Card className="border border-primary/20 p-4">
            <div className="flex items-center gap-3">
              <Loader2 className="size-5 animate-spin text-primary" />
              <div>
                <p className="text-sm font-medium text-primary">{txStep}…</p>
                <p className="text-xs text-default-400">Waiting for wallet or network confirmation</p>
              </div>
            </div>
          </Card>
        )}

        {currentError && <ErrorDisplay error={currentError} title="Transaction failed" />}

      {isConnected && (
        <Card className="border border-divider p-5 md:p-6">
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
                    {formatAmount(userBid.proposedAmount, sessionToken, { includeSymbol: true })}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-default-500">Stake</span>
                <span className="font-semibold">
                  {formatAmount(userBid.stake, sessionToken, { includeSymbol: true })}
                </span>
              </div>
              {userBid.accepted && (
                <div className="mt-4 p-4 bg-[#009F4D]/10 rounded-lg border border-[#009F4D]/20">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="size-5 text-[#009F4D] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-[#009F4D]">You are the winner!</p>
                      <p className="text-sm text-default-500">The creator accepted your revealed bid.</p>
                    </div>
                  </div>
                </div>
              )}
              {userBid.rejected && (
                <div className="mt-4 p-4 bg-danger/10 rounded-lg border border-danger/20">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="size-5 text-danger shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-danger">Your bid was rejected.</p>
                      <p className="text-sm text-default-500">Your stake can be withdrawn if it has not already been claimed.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-default-500">You have not submitted a bid for this session.</p>
          )}
        </Card>
      )}

      <Card className="border border-divider p-5 md:p-6">
        <h2 className="text-xl font-bold mb-5">Actions</h2>

        <div className="space-y-4">
        {!isConnected && (
          <div className="rounded-lg border border-divider bg-content2/40 p-4">
            <p className="font-medium">Connect wallet to continue</p>
            <p className="text-sm text-default-500 mt-1">
              Connect your wallet to commit bids, reveal bids, or manage this session.
            </p>
          </div>
        )}

        {isCommitPhase && !isCreator && !userBid && isConnected && (
          <CommitBidForm
            commitAmount={commitAmount}
            commitMessage={commitMessage}
            commitSalt={commitSalt}
            maxBudget={session.maxBudget}
            stake={stake}
            token={sessionToken}
            tokenBalance={tokenBalance}
            isCommitPending={isCommitBusy}
            isApprovalPending={isCommitApprovalPending}
            saltCopied={saltCopied}
            onAmountChange={setCommitAmount}
            onMessageChange={setCommitMessage}
            onRegenerateSalt={regenerateSalt}
            onCommit={handleCommitBid}
            onCopySalt={copySalt}
          />
        )}

        {isRevealPhase && userBid && !userBid.revealed && isConnected && (
          <RevealBidForm
            revealAmount={revealAmount}
            revealMessage={revealMessage}
            commitSalt={commitSalt}
            token={sessionToken}
            isRevealPending={isRevealPending}
            saltCopied={saltCopied}
            onAmountChange={setRevealAmount}
            onMessageChange={setRevealMessage}
            onSaltChange={setCommitSalt}
            onReveal={handleRevealBid}
            onCopySalt={copySalt}
          />
        )}

        {isSelectionPhase && (
          <BiddingWinnerSelection
            selectableBids={selectableBids}
            selectedBid={selectedBid}
            token={sessionToken}
            isLoadingRevealedBids={isLoadingRevealedBids}
            isAcceptPending={isAcceptPending}
            isRejectPending={isRejectPending}
            isCancelPending={isCancelPending}
            canCancelSession={canCancelSession}
            onSelectBid={setSelectedBidId}
            onAcceptBid={handleAcceptBid}
            onRejectBid={handleRejectBid}
            onCancelSession={handleCancelSession}
          />
        )}

        {canCancelSession && !isSelectionPhase && (
          <SessionActionButton
            icon={<AlertCircle className="size-5 text-danger" />}
            title="Cancel session"
            description="Cancel this session before any revealed bids are available."
            isPending={isCancelPending}
            disabled={isCancelPending}
            onClick={handleCancelSession}
          />
        )}

        {canWithdrawUserStake && (
          <SessionActionButton
            icon={<Wallet className="size-5 text-primary" />}
            title={isWinner ? 'Claim winner stake' : 'Withdraw stake'}
            description={`Recover your ${formatAmount(userBid!.stake, sessionToken, { includeSymbol: true })} bid stake.`}
            isPending={isWithdrawPending}
            disabled={isWithdrawPending}
            onClick={handleWithdrawStake}
          />
        )}

        {isCreator && session.status === SessionStatus.JobCreated && (
          <SessionActionButton
            icon={<CheckCircle className="size-5 text-primary" />}
            title="Complete session"
            description="Mark this bidding session as completed after the job has been created."
            isPending={isCompletePending}
            disabled={isCompletePending}
            onClick={handleCompleteSession}
          />
        )}

        {isCreator && (session.status === SessionStatus.Completed || session.status === SessionStatus.Cancelled) && (
          <SessionActionButton
            icon={<Trophy className="size-5 text-primary" />}
            title="Withdraw creator stake"
            description={`Recover your creator stake of ${formatAmount(stake, sessionToken, { includeSymbol: true })}.`}
            isPending={isCreatorWithdrawPending}
            disabled={isCreatorWithdrawPending}
            onClick={handleWithdrawCreatorStake}
          />
        )}

        {canExtendRevealWindow && (
          <ExtendRevealWindow
            extendSeconds={extendSeconds}
            isExtendPending={isExtendPending}
            onSecondsChange={setExtendSeconds}
            onExtend={handleExtendWindow}
          />
        )}

        {isConnected && !hasVisibleAction && (
          <div className="rounded-lg border border-divider bg-content2/40 p-4 text-sm text-default-500">
            {actionEmptyMessage}
          </div>
        )}
        </div>
      </Card>
      </div>
    </div>
  );
}

function SessionActionButton({
  icon,
  title,
  description,
  isPending,
  disabled,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  isPending: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center justify-between gap-4 p-4 border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <span className="flex items-center gap-3 text-left min-w-0">
        <span className="shrink-0">{icon}</span>
        <span className="min-w-0">
          <span className="block font-medium">{title}</span>
          <span className="block text-xs text-default-500 break-words">{description}</span>
        </span>
      </span>
      {isPending ? (
        <Loader2 className="size-4 animate-spin shrink-0" />
      ) : (
        <RefreshCw className="size-4 text-default-400 shrink-0" />
      )}
    </button>
  );
}
