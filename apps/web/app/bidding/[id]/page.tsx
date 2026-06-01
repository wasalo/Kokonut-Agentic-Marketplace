'use client';

import { use, useEffect, type ReactNode } from 'react';
import { Loader2, CheckCircle, AlertCircle, RefreshCw, Trophy, Wallet } from 'lucide-react';
import { Card } from '@heroui/react';
import NextLink from 'next/link';
import { useBiddingSessionState } from '@/lib/hooks/useBiddingSessionState';
import { getSessionStatusBadge } from '@/lib/hooks/useBiddingSystem';
import { StatusBadge } from '@/components/StatusBadge';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { BiddingSessionHeader } from '@/components/bidding/BiddingSessionHeader';
import { CommitBidForm } from '@/components/bidding/CommitBidForm';
import { RevealBidForm } from '@/components/bidding/RevealBidForm';
import { BiddingWinnerSelection } from '@/components/bidding/BiddingWinnerSelection';
import { ExtendRevealWindow } from '@/components/bidding/ExtendRevealWindow';
import { BidRecoveryPanel } from '@/components/bidding/BidRecoveryPanel';
import { formatAmount } from '@/lib/tokenUtils';
import { ErrorDisplay } from '@/components/ErrorDisplay';

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

  const state = useBiddingSessionState({ sessionId });
  const {
    session,
    isLoading,
    isConnected,
    userBid,
    token: sessionToken,
    stake,
    isCommitBusy,
    isCommitApprovalPending,
    txStep,
    currentError,
    commitAmount,
    commitMessage,
    commitSalt,
    saltCopied,
    revealAmount,
    revealMessage,
    extendSeconds,
    isAcceptPending,
    isRejectPending,
    isCancelPending,
    isRevealPending,
    isExtendPending,
    isWithdrawPending,
    isCreatorWithdrawPending,
    isCompletePending,
    isLoadingRevealedBids,
    canCommit,
    canReveal,
    isSelectionPhase,
    selectableBids,
    selectedBid,
    canCancelSession,
    canWithdrawUserStake,
    canCompleteSession,
    canWithdrawCreatorStake,
    canExtendRevealWindow,
    hasVisibleAction,
    actionEmptyMessage,
    setCommitAmount,
    setCommitMessage,
    setCommitSalt,
    setRevealAmount,
    setRevealMessage,
    setExtendSeconds,
    setSelectedBidId,
    regenerateSalt,
    copySalt,
    handleCommitBid,
    handleRevealBid,
    handleAcceptBid,
    handleRejectBid,
    handleCancelSession,
    handleExtendWindow,
    handleWithdrawStake,
    handleWithdrawCreatorStake,
    handleCompleteSession,
    isWinner,
  } = state;

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
      <Breadcrumb
        items={[
          { label: 'Marketplace', href: '/marketplace' },
          { label: 'Bidding', href: '/marketplace?tab=bidding' },
          { label: `Session #${id}` },
        ]}
        className="mb-6"
      />

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
                    status={getSessionStatusBadge(session.status).badge}
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

            {canCommit && (
              <CommitBidForm
                commitAmount={commitAmount}
                commitMessage={commitMessage}
                commitSalt={commitSalt}
                maxBudget={session.maxBudget}
                stake={stake}
                token={sessionToken}
                tokenBalance={state.tokenBalance}
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

            {canCommit && (
              <BidRecoveryPanel sessionId={id} />
            )}

            {canReveal && (
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

            {canReveal && (
              <BidRecoveryPanel sessionId={id} />
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

            {canWithdrawUserStake && userBid && (
              <SessionActionButton
                icon={<Wallet className="size-5 text-primary" />}
                title={isWinner ? 'Claim winner stake' : 'Withdraw stake'}
                description={`Recover your ${formatAmount(userBid.stake, sessionToken, { includeSymbol: true })} bid stake.`}
                isPending={isWithdrawPending}
                disabled={isWithdrawPending}
                onClick={handleWithdrawStake}
              />
            )}

            {canCompleteSession && (
              <SessionActionButton
                icon={<CheckCircle className="size-5 text-primary" />}
                title="Complete session"
                description="Mark this bidding session as completed after the job has been created."
                isPending={isCompletePending}
                disabled={isCompletePending}
                onClick={handleCompleteSession}
              />
            )}

            {canWithdrawCreatorStake && (
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
