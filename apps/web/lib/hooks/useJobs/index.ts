export {
  useJobCount,
  useJob,
  useJobs,
  useUserJobs,
  useActiveJobCount,
  useJobConstants,
  useEvaluatorFeeEnabled,
  useTotalStakesHeld,
  useJobBidCount,
  useJobBid,
  useUserBid,
  useEvaluatorPoolSize,
  useEvaluatorStatus,
} from './read';

export {
  useCreateJob,
  useFundJob,
  useSubmitJob,
  useApproveByClient,
  useFinalizeByEvaluator,
  useRejectJob,
  useClaimRefund,
  useSetBudget,
  useSetPaymentToken,
  useFundJobWithETH,
  useCompleteAfterTimeout,
  useRefundExpired,
  useCreateJobWithRandomEvaluator,
  useCreateJobV8,
  useCreateJobV7,
  useRegisterAsEvaluator,
  useUnregisterAsEvaluator,
  useEnableJobMilestones,
  useWithdrawStake,
} from './write';

export {
  getJobStatusLabel,
  getJobStatusColor,
  isOpenJob,
  getJobTypeLabel,
  formatStake,
  formatAmount,
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
  const commitBid = (sessionId: bigint, commitHash: `0x${string}`, stake: bigint) => {
    _commitBid({ sessionId, commitHash, stake });
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
