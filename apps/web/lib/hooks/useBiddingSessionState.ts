'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAccount, useBalance, usePublicClient, useWriteContract } from 'wagmi';
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
  useCloseBidding,
  useSlashNoShow,
  useWithdrawBidRefund,
  usePendingBidRefund,
  SessionStatus,
  type BiddingSession,
  type BidInfo,
} from '@/lib/hooks/useBiddingSystem';
import { useUSDCBalance } from '@/lib/hooks/useUSDC';
import { useUSDCApproval } from '@/lib/hooks/useUSDCApproval';
import { buildBidCommitHash, useBiddingSalt } from '@/lib/hooks/useBiddingSalt';
import { getContractAddress } from '@/lib/contracts/config';
import { formatAmount, getTokenByAddress, parseAmount, type Token } from '@/lib/tokenUtils';

const BIDDING_SYSTEM_ADDRESS = getContractAddress('BIDDING_SYSTEM');

export type ApprovalPhase = 'idle' | 'checking' | 'approving' | 'creating';
export type BiddingPhase = 'commit' | 'reveal' | 'selection' | 'completed';

export interface UseBiddingSessionStateParams {
  sessionId: bigint;
}

export interface UseBiddingSessionStateResult {
  address: `0x${string}` | undefined;
  isConnected: boolean;

  session: BiddingSession | undefined;
  userBid: BidInfo | undefined;
  revealedBids: BidInfo[];
  selectableBids: BidInfo[];
  selectedBid: BidInfo | undefined;
  isLoading: boolean;
  isLoadingRevealedBids: boolean;

  token: Token;
  tokenBalance: bigint;
  stake: bigint;

  phase: BiddingPhase;
  isCreator: boolean;
  isBidder: boolean;
  isWinner: boolean;
  isOpenStatus: boolean;
  hasDeadlinePassed: boolean;

  commitAmount: string;
  commitMessage: string;
  commitSalt: string;
  revealAmount: string;
  revealMessage: string;
  saltCopied: boolean;
  setCommitAmount: (v: string) => void;
  setCommitMessage: (v: string) => void;
  setCommitSalt: (v: string) => void;
  regenerateSalt: () => void;
  setRevealAmount: (v: string) => void;
  setRevealMessage: (v: string) => void;
  copySalt: () => void;
  persistCommitForReveal: () => void;

  extendSeconds: string;
  setExtendSeconds: (v: string) => void;
  selectedBidId: bigint | null;
  setSelectedBidId: (v: bigint | null) => void;

  canCommit: boolean;
  canReveal: boolean;
  canAccept: boolean;
  canReject: boolean;
  canCancelSession: boolean;
  canExtendRevealWindow: boolean;
  canWithdrawUserStake: boolean;
  canWithdrawCreatorStake: boolean;
  canCompleteSession: boolean;
  canCloseBidding: boolean;     // Phase 45b O-2
  canSlashNoShow: (bidder: `0x${string}`) => boolean; // Phase 45b O-3
  hasVisibleAction: boolean;
  actionEmptyMessage: string;

  commitApprovalPhase: ApprovalPhase;
  isCommitBusy: boolean;
  isCommitApprovalPending: boolean;
  isAcceptPending: boolean;
  isRejectPending: boolean;
  isCancelPending: boolean;
  isRevealPending: boolean;
  isWithdrawPending: boolean;
  isCreatorWithdrawPending: boolean;
  isCompletePending: boolean;
  isExtendPending: boolean;
  isClosePending: boolean;     // Phase 45b O-2
  isSlashPending: boolean;     // Phase 45b O-3
  isSelectionPhase: boolean;
  txStep: string | null;
  currentError: Error | null;

  handleCommitBid: () => Promise<void>;
  handleRevealBid: () => void;
  handleAcceptBid: () => void;
  handleRejectBid: () => void;
  handleCancelSession: () => void;
  handleExtendWindow: () => void;
  handleWithdrawStake: () => void;
  handleWithdrawCreatorStake: () => void;
  handleCompleteSession: () => void;
  handleCloseBidding: () => void;                 // Phase 45b O-2
  handleSlashNoShow: (bidder: `0x${string}`) => void; // Phase 45b O-3
  handleWithdrawBidRefund: () => void;            // Phase 47
  canWithdrawBidRefund: boolean;                    // Phase 47
  pendingRefundAmount: bigint;                     // Phase 47
  isWithdrawBidRefundPending: boolean;            // Phase 47
}

const ZERO_WINNER = '0x0000000000000000000000000000000000000000';

export function useBiddingSessionState({
  sessionId,
}: UseBiddingSessionStateParams): UseBiddingSessionStateResult {
  const [currentTimestamp, setCurrentTimestamp] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTimestamp(Math.floor(Date.now() / 1000));
    }, 15_000);
    return () => window.clearInterval(intervalId);
  }, []);

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
  // Phase 45b O-2 + O-3
  const { closeBidding, isPending: isClosePending, writeError: closeError } = useCloseBidding();
  const { slashNoShow, isPending: isSlashPending, writeError: slashError } = useSlashNoShow();
  // Phase 47
  const { withdrawBidRefund, isPending: isWithdrawBidRefundPending, error: withdrawBidRefundError } = useWithdrawBidRefund();
  const { refund: pendingRefundAmount } = usePendingBidRefund(sessionId, address);

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
  const sessionToken = useMemo(
    () => getTokenByAddress(session?.paymentToken),
    [session?.paymentToken]
  );
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
                      : isWithdrawBidRefundPending
                        ? 'Claiming bid refund'
                        : isCompletePending
                          ? 'Completing session'
                          : null;

  const currentError = commitWriteError || revealError || acceptError || rejectError || cancelError ||
    extendError || withdrawError || creatorWithdrawError || completeError || closeError || slashError ||
    withdrawBidRefundError;

  const { ensureUSDCApproval } = useUSDCApproval({
    account: address,
    publicClient,
    spender: BIDDING_SYSTEM_ADDRESS,
    writeContractAsync: writeApprovalAsync,
    setPhase: setCommitApprovalPhase,
  });

  const isCreator = Boolean(
    session && address && session.creator.toLowerCase() === address.toLowerCase()
  );
  const isBidder = Boolean(
    userBid && address && userBid.bidder.toLowerCase() === address.toLowerCase()
  );
  const isWinner = Boolean(userBid && userBid.accepted);
  const now = BigInt(currentTimestamp);
  const isOpenStatus = session?.status === SessionStatus.Active || session?.status === SessionStatus.BiddingClosed;
  const hasDeadlinePassed = Boolean(session && now >= session.deadline);

  const isCommitPhase = Boolean(
    session && session.status === SessionStatus.Active && now < session.deadline
  );
  const isRevealPhase = Boolean(
    session && isOpenStatus && now >= session.deadline && now < session.revealWindowEnd
  );
  const isSelectionPhase = Boolean(
    session && isCreator && isOpenStatus && now >= session.revealWindowEnd
  );
  const isCompletedPhase = Boolean(
    session &&
      (session.status === SessionStatus.Completed || session.status === SessionStatus.Cancelled)
  );

  const phase: BiddingPhase = isCompletedPhase
    ? 'completed'
    : isSelectionPhase
      ? 'selection'
      : isRevealPhase
        ? 'reveal'
        : 'commit';

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

  const canCommit = Boolean(isCommitPhase && !isCreator && !userBid && isConnected);
  const canReveal = Boolean(isRevealPhase && userBid && !userBid.revealed && isConnected);
  const canAccept = isSelectionPhase && Boolean(selectedBid);
  const canReject = isSelectionPhase && Boolean(selectedBid);
  const canCancelSession = Boolean(
    isCreator &&
      (session?.status === SessionStatus.Active || session?.status === SessionStatus.BiddingClosed) &&
      session.winner === ZERO_WINNER &&
      !session.jobCreated &&
      revealedBids.length === 0
  );
  const canExtendRevealWindow = Boolean(isCreator && isRevealPhase);
  // Phase 47: winners and rejected bidders must use withdrawBidRefund, not withdrawStake
  const isTerminalBid = Boolean(userBid && (userBid.accepted || userBid.rejected));
  const canWithdrawUserStake = Boolean(
    userBid && userBid.stake > 0n && !userBid.stakeWithdrawn && !isTerminalBid
  );
  const canWithdrawBidRefund = Boolean(
    userBid && isTerminalBid && pendingRefundAmount > 0n
  );
  const canWithdrawCreatorStake = Boolean(
    isCreator &&
      (session?.status === SessionStatus.Completed || session?.status === SessionStatus.Cancelled)
  );
  const canCompleteSession = Boolean(isCreator && session?.status === SessionStatus.JobCreated);
  // Phase 45b O-2: anyone can call closeBidding once deadline has passed and status is still Active
  const canCloseBidding = Boolean(
    session?.status === SessionStatus.Active && hasDeadlinePassed
  );
  // Phase 45b O-3: only the creator can slash no-shows, and only after the full reveal window has ended
  const revealWindowEnded = Boolean(session && now >= session.revealWindowEnd);
  const canSlashNoShow = (bidder: `0x${string}`) => Boolean(
    isCreator &&
      session &&
      revealWindowEnded &&
      session.status !== SessionStatus.Cancelled &&
      session.status !== SessionStatus.Completed &&
      session.status !== SessionStatus.JobCreated &&
      bidder !== ZERO_WINNER
  );

  const hasVisibleAction = Boolean(
    !isConnected ||
      canCommit ||
      canReveal ||
      isSelectionPhase ||
      canWithdrawUserStake ||
      canWithdrawBidRefund ||
      canCompleteSession ||
      canWithdrawCreatorStake ||
      canCancelSession ||
      canExtendRevealWindow ||
      canCloseBidding
  );

  const actionEmptyMessage = isCreator && isCommitPhase
    ? 'Your session is accepting bids. You can cancel while no bids have been revealed.'
    : !userBid && hasDeadlinePassed && isOpenStatus
      ? 'Bidding has closed for new bids.'
      : userBid?.revealed && isOpenStatus
        ? 'Your bid is revealed. Waiting for the creator to select a winner.'
        : 'No actions are available for your wallet at this session state.';

  const handleCommitBid = useCallback(async () => {
    if (!commitAmount || !commitSalt || !session) return;

    if (sessionToken.symbol === 'USDC') {
      const approved = await ensureUSDCApproval(stake, formatAmount(stake, sessionToken));
      if (!approved) return;
    }

    setCommitApprovalPhase('creating');
    persistCommitForReveal();
    if (!address) return;
    const commitHashValue = buildBidCommitHash(
      sessionId,
      address,
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
  }, [
    sessionId, commitAmount, commitMessage, commitSalt, stake, session, sessionToken,
    ensureUSDCApproval, commitBid, persistCommitForReveal, address,
  ]);

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

  // Phase 45b O-2
  const handleCloseBidding = useCallback(() => {
    closeBidding(sessionId);
  }, [sessionId, closeBidding]);

  // Phase 45b O-3
  const handleSlashNoShow = useCallback((bidder: `0x${string}`) => {
    slashNoShow({ sessionId, bidder });
  }, [sessionId, slashNoShow]);

  // Phase 47: pull-based bid refund for accepted/rejected bids
  const handleWithdrawBidRefund = useCallback(() => {
    withdrawBidRefund(sessionId);
  }, [sessionId, withdrawBidRefund]);

  return {
    address,
    isConnected,
    session,
    userBid,
    revealedBids,
    selectableBids,
    selectedBid,
    isLoading,
    isLoadingRevealedBids,
    token: sessionToken,
    tokenBalance,
    stake,
    phase,
    isCreator,
    isBidder,
    isWinner,
    isOpenStatus,
    hasDeadlinePassed,
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
    extendSeconds,
    setExtendSeconds,
    selectedBidId,
    setSelectedBidId,
    canCommit,
    canReveal,
    canAccept,
    canReject,
    canCancelSession,
    canExtendRevealWindow,
    canWithdrawUserStake,
    canWithdrawCreatorStake,
    canCompleteSession,
    canCloseBidding,
    canSlashNoShow,
    hasVisibleAction,
    actionEmptyMessage,
    commitApprovalPhase,
    isCommitBusy,
    isCommitApprovalPending,
    isAcceptPending,
    isRejectPending,
    isCancelPending,
    isRevealPending,
    isWithdrawPending,
    isCreatorWithdrawPending,
    isCompletePending,
    isExtendPending,
    isClosePending,
    isSlashPending,
    isSelectionPhase,
    txStep,
    currentError,
    handleCommitBid,
    handleRevealBid,
    handleAcceptBid,
    handleRejectBid,
    handleCancelSession,
    handleExtendWindow,
    handleWithdrawStake,
    handleWithdrawCreatorStake,
    handleCompleteSession,
    handleCloseBidding,
    handleSlashNoShow,
    handleWithdrawBidRefund,
    canWithdrawBidRefund,
    pendingRefundAmount,
    isWithdrawBidRefundPending,
  };
}
