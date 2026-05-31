export {
  useJob,
  useJobs,
  useUserJobs,
  useEvaluatorFeeEnabled,
  useJobBidCount,
  useUserBid,
  useEvaluatorPoolSize,
  useEvaluatorStatus,
} from './read';

export {
  useFundJob,
  useSubmitJob,
  useApproveByClient,
  useFinalizeByEvaluator,
  useRejectJob,
  useClaimRefund,
  useSetBudget,
  useSetPaymentToken,
  useCompleteAfterTimeout,
  useRefundExpired,
  useCreateJobV8,
  useRegisterAsEvaluator,
  useUnregisterAsEvaluator,
  useWithdrawStake,
  useFinalizeRandomEvaluator,
} from './write';

export {
  isOpenJob,
} from './utils';

export type { Job, JobStatusType, JobTypeType, Bid } from './read';
export { JobStatus, JobType } from './read';

export {
  useBiddingCalculateStake as useCalculateStake,
  useBiddingRejectBid,
  useBiddingExtendRevealWindow,
  useBiddingCancelSession,
  useBiddingCompleteSession,
} from '../useBiddingSystem';

import {
  useBiddingCommitBid,
  useBiddingRevealBid,
  useBiddingAcceptBid,
} from '../useBiddingSystem';

export function useCommitBid() {
  const { commitBid: _commitBid, hash, isPending, isConfirming, isConfirmed, writeError } = useBiddingCommitBid();
  const commitBid = (sessionId: bigint, commitHash: `0x${string}`, stake: bigint, paymentToken?: `0x${string}`) => {
    _commitBid({ sessionId, commitHash, stake, paymentToken });
  };
  return { commitBid, hash, isPending, isConfirming, isConfirmed, error: writeError };
}

export function useRevealBid() {
  const { revealBid: _revealBid, hash, isPending, isConfirming, isConfirmed, writeError } = useBiddingRevealBid();
  const revealBid = (sessionId: bigint, amount: bigint, message: string, salt: `0x${string}`) => {
    _revealBid({ sessionId, amount, message, salt });
  };
  return { revealBid, hash, isPending, isConfirming, isConfirmed, error: writeError };
}

export function useAcceptBid() {
  const { acceptBid: _acceptBid, hash, isPending, isConfirming, isConfirmed, writeError } = useBiddingAcceptBid();
  const acceptBid = (sessionId: bigint, bidId: bigint) => {
    _acceptBid({ sessionId, bidId });
  };
  return { acceptBid, hash, isPending, isConfirming, isConfirmed, error: writeError };
}
