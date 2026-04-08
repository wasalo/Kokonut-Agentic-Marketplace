'use client';

import { use, useState, useCallback, useEffect } from 'react';
import { useAccount, useWaitForTransactionReceipt } from 'wagmi';
import NextLink from 'next/link';
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Award,
  Users,
  Send,
  Unlock,
  X,
} from 'lucide-react';
import { Card } from '@heroui/react';
import { formatEther } from 'viem';
import {
  useProposal,
  useProposalEvaluations,
  useEvaluation,
  useSubmitEvaluation,
  useAttestDecision,
  useClaimReward,
  useReleaseStake,
  useCancelProposal,
} from '@/lib/hooks/useProposals';
import { Address } from '@/components/Address';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { ConfirmModal } from '@/components/ConfirmModal';

const PROPOSAL_STATUS: Record<number, string> = {
  0: 'Open',
  1: 'Under Review',
  2: 'Decided',
  3: 'Cancelled',
};

export default function ProposalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): JSX.Element {
  const { id } = use(params);
  const proposalId = BigInt(id);
  const { address } = useAccount();

  const { proposal, isLoading, refetch } = useProposal(proposalId);
  const { evaluators } = useProposalEvaluations(proposalId);
  const { evaluation: myEvaluation } = useEvaluation(
    proposalId,
    address ?? '0x0000000000000000000000000000000000000000'
  );

  const [txStep, setTxStep] = useState<string | null>(null);
  const [score, setScore] = useState('500');
  const [reasoning, setReasoning] = useState('');
  const [stake, setStake] = useState('0.01');
  const [selectedWinner, setSelectedWinner] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);

  const {
    submitEvaluation,
    hash: evalHash,
    isPending: isEvalPending,
    error: evalError,
  } = useSubmitEvaluation();
  const {
    attestDecision,
    hash: attestHash,
    isPending: isAttestPending,
    error: attestError,
  } = useAttestDecision();
  const {
    claimReward,
    hash: claimHash,
    isPending: isClaimPending,
    error: claimError,
  } = useClaimReward();
  const {
    releaseStake,
    hash: releaseHash,
    isPending: isReleasePending,
    error: releaseError,
  } = useReleaseStake();
  const {
    cancelProposal,
    hash: cancelHash,
    isPending: isCancelPending,
    error: cancelError,
  } = useCancelProposal();

  const txHash = evalHash || attestHash || claimHash || releaseHash || cancelHash;
  const { isSuccess: isTxConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  const handleSubmitEvaluation = useCallback(() => {
    setTxStep('Submitting evaluation');
    submitEvaluation(
      proposalId,
      BigInt(score),
      reasoning || '',
      BigInt(Math.floor(parseFloat(stake) * 1e18))
    );
  }, [proposalId, score, reasoning, stake, submitEvaluation]);

  const handleAttest = useCallback(() => {
    if (!selectedWinner) return;
    setTxStep('Attesting decision');
    attestDecision(proposalId, selectedWinner as `0x${string}`);
  }, [proposalId, selectedWinner, attestDecision]);

  const handleClaim = useCallback(() => {
    setTxStep('Claiming reward');
    claimReward(proposalId);
  }, [proposalId, claimReward]);

  const handleRelease = useCallback(() => {
    setTxStep('Releasing stake');
    releaseStake(proposalId);
  }, [proposalId, releaseStake]);

  const handleCancel = useCallback(() => {
    setShowCancelModal(true);
  }, []);

  const confirmCancel = useCallback(() => {
    setShowCancelModal(false);
    setTxStep('Cancelling proposal');
    cancelProposal(proposalId);
  }, [proposalId, cancelProposal]);

  useEffect(() => {
    if (isTxConfirmed && txStep) {
      setTxStep(null);
      void refetch();
    }
  }, [isTxConfirmed, txStep, refetch]);

  const anyPending =
    isEvalPending || isAttestPending || isClaimPending || isReleasePending || isCancelPending;
  const currentError = evalError || attestError || claimError || releaseError || cancelError;

  const isProposer =
    proposal && address && proposal.proposer.toLowerCase() === address.toLowerCase();
  const isWinner =
    proposal && address && proposal.winningEvaluator.toLowerCase() === address.toLowerCase();
  const deadlinePassed = proposal && Date.now() / 1000 > Number(proposal.decisionDeadline);
  const hasEvaluated = myEvaluation && Number(myEvaluation.submittedAt) > 0;

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto animate-pulse space-y-4">
          <div className="h-8 bg-content2 rounded w-1/3" />
          <div className="h-48 bg-content2 rounded" />
        </div>
      </div>
    );
  }

  if (!proposal || Number(proposal.id) === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto border border-divider p-8 text-center">
          <AlertCircle className="w-12 h-12 text-default-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Proposal Not Found</h2>
        </Card>
      </div>
    );
  }

  // NOTE: cancelProposal is not available in current contract ABI
  // const handleCancel = useCallback(() => {
  //   if (confirm('Are you sure you want to cancel this proposal? This action cannot be undone.')) {
  //     setTxStep('Cancelling proposal');
  //     cancelProposal(proposalId);
  //   }
  // }, [proposalId, cancelProposal]);

  return (
    <div className="container mx-auto px-4 py-8">
      <NextLink
        href="/review"
        className="inline-flex items-center text-sm text-default-500 hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Review
      </NextLink>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Proposal Header */}
        <Card className="border border-divider p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-semibold">{proposal.title}</h1>
              <p className="text-xs text-default-400 mt-1">Proposal #{proposal.id.toString()}</p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                proposal.status === 0
                  ? 'bg-primary/10 text-primary'
                  : proposal.status === 1
                    ? 'bg-warning/10 text-warning'
                    : proposal.status === 2
                      ? 'bg-success/10 text-success'
                      : 'bg-default/10 text-default-500'
              }`}
            >
              {PROPOSAL_STATUS[proposal.status] ?? 'Unknown'}
            </span>
          </div>

          <p className="text-default-600 mb-4">{proposal.description}</p>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-divider">
            <div>
              <p className="text-xs text-default-400 uppercase tracking-wide">Reward</p>
              <p className="text-lg font-semibold text-success">
                {formatEther(proposal.reward)} ETH
              </p>
            </div>
            <div>
              <p className="text-xs text-default-400 uppercase tracking-wide">Evaluators</p>
              <p className="text-lg font-semibold">{evaluators.length}</p>
            </div>
            <div>
              <p className="text-xs text-default-400 uppercase tracking-wide">Deadline</p>
              <p className="text-sm flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(Number(proposal.decisionDeadline) * 1000).toLocaleDateString()}
              </p>
              {deadlinePassed && <p className="text-xs text-success">Past deadline</p>}
            </div>
          </div>

          {/* Cancel Proposal (proposer only, Open status) - NOT AVAILABLE IN CURRENT CONTRACT */}
          {/* NOTE: cancelProposal function is not in the current AgentReview ABI
          {isProposer && proposal.status === 0 && (
            <div className="mt-4 pt-4 border-t border-divider">
              <button
                onClick={handleCancel}
                disabled={anyPending || !!txStep}
                className="w-full px-4 py-2 border border-danger text-danger rounded-lg font-medium hover:bg-danger/10 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" />
                Cancel Proposal
              </button>
              <p className="text-xs text-default-400 mt-2 text-center">
                Cancel and refund your staked ETH
              </p>
            </div>
          )} */}
        </Card>

        {/* Transaction Status */}
        {txStep && (
          <Card className="border border-primary/20 p-4">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <div>
                <p className="text-sm font-medium text-primary">{txStep}...</p>
              </div>
            </div>
          </Card>
        )}

        {currentError && <ErrorDisplay error={currentError} />}

        {/* Existing Evaluations */}
        {evaluators.length > 0 && (
          <Card className="border border-divider p-6">
            <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Evaluations ({evaluators.length})
            </h2>
            <div className="space-y-3">
              {evaluators.map(ev => (
                <div
                  key={ev}
                  className="flex items-center justify-between p-3 bg-content2 rounded-lg text-sm"
                >
                  <Address address={ev as `0x${string}`} truncate />
                  {proposal.winningEvaluator.toLowerCase() === ev.toLowerCase() && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success font-medium">
                      Winner
                    </span>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Submit Evaluation (if Open/UnderReview and not yet evaluated) */}
        {(proposal.status === 0 || proposal.status === 1) && !hasEvaluated && (
          <Card className="border border-divider p-6">
            <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
              <Send className="w-4 h-4 text-primary" />
              Submit Evaluation
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Confidence Score (-1000 to +1000)</label>
                <input
                  type="number"
                  min="-1000"
                  max="1000"
                  value={score}
                  onChange={e => setScore(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-content2 border border-divider rounded-lg focus:outline-none focus:ring-2 focus:ring-success"
                />
                <p className="text-xs text-default-400 mt-0.5">
                  Positive = confident, Negative = skeptical
                </p>
              </div>

              <div>
                <label className="text-sm font-medium">Reasoning URI</label>
                <input
                  type="text"
                  placeholder="ipfs://... or https://..."
                  value={reasoning}
                  onChange={e => setReasoning(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-content2 border border-divider rounded-lg focus:outline-none focus:ring-2 focus:ring-success"
                />
              </div>

              <div>
                <label className="text-sm font-medium">ETH Stake (min 0.001)</label>
                <input
                  type="number"
                  step="0.001"
                  min="0.001"
                  value={stake}
                  onChange={e => setStake(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-content2 border border-divider rounded-lg focus:outline-none focus:ring-2 focus:ring-success"
                />
              </div>

              <button
                onClick={handleSubmitEvaluation}
                disabled={anyPending || !!txStep}
                className="w-full px-6 py-3 bg-gradient-to-r from-[#009F4D] to-[#00c853] text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
              >
                {isEvalPending ? 'Submitting...' : 'Submit Evaluation'}
              </button>
            </div>
          </Card>
        )}

        {/* Attest Decision (proposer only, after deadline) */}
        {isProposer && deadlinePassed && proposal.status <= 1 && evaluators.length > 0 && (
          <Card className="border border-success/30 p-6">
            <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
              <Award className="w-4 h-4 text-success" />
              Select Winner
            </h2>
            <div className="space-y-3">
              {evaluators.map(ev => (
                <label
                  key={ev}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedWinner === ev
                      ? 'border-success/50 bg-success/5'
                      : 'border-divider bg-content2'
                  }`}
                >
                  <input
                    type="radio"
                    name="winner"
                    checked={selectedWinner === ev}
                    onChange={() => setSelectedWinner(ev)}
                    className="h-4 w-4 text-success"
                  />
                  <span className="font-mono text-sm">
                    {ev.slice(0, 12)}...{ev.slice(-6)}
                  </span>
                </label>
              ))}
              <button
                onClick={handleAttest}
                disabled={!selectedWinner || anyPending || !!txStep}
                className="w-full px-6 py-3 bg-gradient-to-r from-[#009F4D] to-[#00c853] text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
              >
                {isAttestPending ? 'Attesting...' : 'Attest Decision'}
              </button>
            </div>
          </Card>
        )}

        {/* Cancel Proposal (proposer only, if Open) */}
        {isProposer && proposal.status === 0 && (
          <Card className="border border-warning/30 bg-warning/5 p-6">
            <h2 className="text-base font-semibold mb-2 flex items-center gap-2">
              <X className="w-4 h-4 text-warning" />
              Cancel Proposal
            </h2>
            <p className="text-sm text-default-500 mb-4">
              If you no longer need an evaluation, you can cancel this proposal. Your staked ETH
              will be refunded.
            </p>
            <button
              onClick={handleCancel}
              disabled={anyPending || !!txStep}
              className="w-full px-6 py-3 border border-warning/30 bg-warning/10 text-warning rounded-lg font-medium hover:bg-warning/20 disabled:opacity-50"
            >
              {isCancelPending ? 'Cancelling...' : 'Cancel Proposal'}
            </button>
          </Card>
        )}

        {/* Claim Reward (winner) */}
        {isWinner && proposal.status === 2 && (
          <Card className="border border-success/30 p-6">
            <h2 className="text-base font-semibold mb-2 flex items-center gap-2">
              {myEvaluation?.rewardClaimed ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-success" />
                  Reward Claimed!
                </>
              ) : (
                'You Won!'
              )}
            </h2>
            <p className="text-sm text-default-500 mb-4">
              {myEvaluation?.rewardClaimed
                ? 'You have already claimed your reward of ' +
                  formatEther(proposal.reward) +
                  ' ETH.'
                : 'Claim your stake back plus the reward of ' +
                  formatEther(proposal.reward) +
                  ' ETH.'}
            </p>
            {!myEvaluation?.rewardClaimed && (
              <button
                onClick={handleClaim}
                disabled={anyPending || !!txStep}
                className="w-full px-6 py-3 bg-gradient-to-r from-[#009F4D] to-[#00c853] text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
              >
                {isClaimPending ? 'Claiming...' : 'Claim Reward'}
              </button>
            )}
          </Card>
        )}

        {/* Release Stake (non-winners, after decision) */}
        {hasEvaluated && !isWinner && proposal.status === 2 && (
          <Card className="border border-divider p-6">
            <h2 className="text-base font-semibold mb-2 flex items-center gap-2">
              <Unlock className="w-4 h-4" />
              {myEvaluation?.stakeReleased ? 'Stake Released' : 'Release Your Stake'}
            </h2>
            <p className="text-sm text-default-500 mb-4">
              {myEvaluation?.stakeReleased
                ? 'You have already released your stake.'
                : 'The decision has been made. Release your stake back.'}
            </p>
            {!myEvaluation?.stakeReleased && (
              <button
                onClick={handleRelease}
                disabled={anyPending || !!txStep}
                className="w-full px-6 py-3 border border-divider rounded-lg font-medium hover:bg-content2 disabled:opacity-50"
              >
                {isReleasePending ? 'Releasing...' : 'Release Stake'}
              </button>
            )}
          </Card>
        )}

        <ConfirmModal
          isOpen={showCancelModal}
          onConfirm={confirmCancel}
          onCancel={() => setShowCancelModal(false)}
          title="Cancel Proposal"
          message="Are you sure you want to cancel this proposal? Your staked ETH will be refunded."
          confirmText="Cancel Proposal"
          variant="warning"
          isPending={isCancelPending}
        />
      </div>
    </div>
  );
}
