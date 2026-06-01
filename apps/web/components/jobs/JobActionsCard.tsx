'use client';

import { Card } from '@heroui/react';
import type { ReactNode } from 'react';
import {
  AlertTriangle,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Clock,
  Gavel,
  Loader2,
  RefreshCw,
  Send,
  ShieldAlert,
  XSquare,
} from 'lucide-react';
import { Address } from '@/components/Address';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { StatusBadge } from '@/components/StatusBadge';
import { JobStatus, type Job } from '@/lib/hooks/useJobs';
import { JobLifecycleStepper, type JobRole } from '@/components/jobs/JobLifecycleStepper';
import type { Token } from '@/lib/hooks/useTokenConversion';

interface EvaluationResult {
  meetsRequirements: boolean;
  confidenceScore: number;
  analysis: string;
  checks: { passed: string[]; failed: string[] };
}

interface JobDispute {
  flagger?: string;
  arbiter?: string;
  resolved?: boolean;
}

interface JobMilestoneSummary {
  description?: string;
}

interface JobActionsCardProps {
  job: Job;
  jobPaymentToken: Token;
  hasActions: boolean;
  isClient: boolean;
  isProvider: boolean;
  isEvaluator: boolean;
  isExpired: boolean | undefined;
  isPastDisputeWindow: boolean | undefined;
  isTerminal: boolean;
  hasActiveDispute: boolean;
  canFlagDispute: boolean;
  dispute?: JobDispute | null;
  milestones?: JobMilestoneSummary[];
  formattedBudget: string;
  isUSDC: boolean;
  txStep: string | null;
  fulfillmentText: string;
  showFulfillmentInput: boolean;
  clientApproved: boolean;
  evaluationResult: EvaluationResult | null;
  isEvaluating: boolean;
  showDisputeForm: boolean;
  disputeMilestoneIndex: number;
  isSubmitPending: boolean;
  isApproveByClientPending: boolean;
  isFinalizePending: boolean;
  isRejectPending: boolean;
  isRefundPending: boolean;
  isCompleteAfterTimeoutPending: boolean;
  isRefundExpiredPending: boolean;
  isFlagPending: boolean;
  flagError: unknown;
  onFulfillmentTextChange: (value: string) => void;
  onShowFulfillmentInputChange: (value: boolean) => void;
  onSubmitDeliverable: () => void;
  onClientApprove: () => void;
  onFinalize: () => void;
  onEvaluate: () => void;
  onReject: () => void;
  onClaimRefund: () => void;
  onCompleteAfterTimeout: () => void;
  onRefundExpired: () => void;
  onToggleDisputeForm: () => void;
  onDisputeMilestoneChange: (index: number) => void;
  onFlagDispute: () => void;
}

export function JobActionsCard({
  job,
  jobPaymentToken,
  hasActions,
  isClient,
  isProvider,
  isEvaluator,
  isExpired,
  isPastDisputeWindow,
  isTerminal,
  hasActiveDispute,
  canFlagDispute,
  dispute,
  milestones,
  formattedBudget,
  isUSDC,
  txStep,
  fulfillmentText,
  showFulfillmentInput,
  clientApproved,
  evaluationResult,
  isEvaluating,
  showDisputeForm,
  disputeMilestoneIndex,
  isSubmitPending,
  isApproveByClientPending,
  isFinalizePending,
  isRejectPending,
  isRefundPending,
  isCompleteAfterTimeoutPending,
  isRefundExpiredPending,
  isFlagPending,
  flagError,
  onFulfillmentTextChange,
  onShowFulfillmentInputChange,
  onSubmitDeliverable,
  onClientApprove,
  onFinalize,
  onEvaluate,
  onReject,
  onClaimRefund,
  onCompleteAfterTimeout,
  onRefundExpired,
  onToggleDisputeForm,
  onDisputeMilestoneChange,
  onFlagDispute,
}: JobActionsCardProps) {
  if (!hasActions) return null;
  const role: JobRole = isClient ? 'client' : isProvider ? 'provider' : isEvaluator ? 'evaluator' : 'observer';

  return (
    <Card className="border border-divider p-6">
      <h2 className="text-xl font-bold mb-5">Actions</h2>

      <div className="mb-5">
        <JobLifecycleStepper status={job.status} role={role} />
      </div>

      {hasActiveDispute && dispute?.flagger && (
        <div className="mb-4 p-4 bg-warning/10 border border-warning/30 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="size-5 text-warning" />
              <p className="text-sm font-medium text-warning">Dispute Active</p>
            </div>
            <Gavel className="size-5 text-warning" />
          </div>
          <p className="text-xs text-default-500 mt-1">
            Flagged by: <Address address={dispute.flagger} truncate />
          </p>
          {dispute.arbiter && (
            <p className="text-xs text-default-500 mt-1">
              Arbiter: <Address address={dispute.arbiter} truncate />
            </p>
          )}
        </div>
      )}

      <div className="space-y-3">
        {job.status === JobStatus.Funded && isProvider && (
          <>
            {!showFulfillmentInput ? (
              <button
                type="button"
                onClick={() => onShowFulfillmentInputChange(true)}
                disabled={isSubmitPending || !!txStep}
                className="w-full flex items-center gap-3 p-4 border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors disabled:opacity-50"
              >
                <Send className="size-5 text-primary" />
                <div className="text-left">
                  <p className="font-medium">Submit Deliverable</p>
                  <p className="text-xs text-default-500">Describe the work you've completed</p>
                </div>
              </button>
            ) : (
              <div className="space-y-3 p-4 border border-primary/30 rounded-lg">
                <p className="font-medium">Submit Delivery Description</p>
                <textarea
                  placeholder="Describe what you delivered for this job..."
                  value={fulfillmentText}
                  onChange={event => onFulfillmentTextChange(event.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 bg-content2 border border-divider rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none text-sm"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onShowFulfillmentInputChange(false);
                      onFulfillmentTextChange('');
                    }}
                    className="px-4 py-2 text-sm border border-divider rounded-lg hover:bg-content2"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={onSubmitDeliverable}
                    disabled={isSubmitPending || !!txStep || !fulfillmentText.trim()}
                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
                  >
                    {isSubmitPending ? 'Submitting...' : 'Submit'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {job.status === JobStatus.PendingClientApproval && isClient && (
          <ActionButton
            icon={<CheckSquare className="size-5 text-primary" />}
            title="Approve Delivery"
            description="Approve the deliverable to release payment to provider"
            disabled={isApproveByClientPending || !!txStep}
            onClick={onClientApprove}
          />
        )}

        {job.status === JobStatus.Submitted && isClient && (
          <ActionButton
            icon={<CheckSquare className="size-5 text-primary" />}
            title={clientApproved ? 'Approved' : 'Review & Approve'}
            description={clientApproved ? 'You approved the delivery' : 'Mark delivery as satisfactory'}
            disabled={isApproveByClientPending || !!txStep || clientApproved}
            onClick={onClientApprove}
          />
        )}

        {job.status === JobStatus.Submitted && isEvaluator && (
          <>
            <ActionButton
              icon={<CheckSquare className="size-5 text-success" />}
              title="Finalize & Release Payment"
              description={`Release ${formattedBudget} ${isUSDC ? 'USDC' : 'ETH'} to provider`}
              disabled={isFinalizePending || !!txStep}
              onClick={onFinalize}
              tone="success"
            />

            <div className="space-y-2">
              <button
                type="button"
                onClick={onEvaluate}
                disabled={!!txStep || isEvaluating}
                className="w-full flex items-center gap-3 p-3 border border-divider rounded-lg hover:bg-content2 transition-colors disabled:opacity-50"
              >
                <Loader2 className={`size-4 ${isEvaluating ? 'animate-spin' : ''}`} />
                <div className="text-left">
                  <p className="font-medium text-sm">Evaluate with AI</p>
                  <p className="text-xs text-default-500">Analyze fulfillment against requirements</p>
                </div>
              </button>

              {evaluationResult && (
                <div className="p-3 bg-content2 rounded-lg border border-divider">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">AI Analysis</span>
                    <StatusBadge status={evaluationResult.meetsRequirements ? 'success' : 'error'} size="sm" />
                  </div>
                  <p className="text-xs text-default-500 mb-2">{evaluationResult.analysis}</p>
                  <div className="text-xs space-y-1">
                    {evaluationResult.checks?.passed?.length > 0 && (
                      <p className="text-success">Passed: {evaluationResult.checks.passed.join(', ')}</p>
                    )}
                    {evaluationResult.checks?.failed?.length > 0 && (
                      <p className="text-danger">Failed: {evaluationResult.checks.failed.join(', ')}</p>
                    )}
                  </div>
                  <p className="text-xs text-default-400 mt-2">
                    Confidence: {evaluationResult.confidenceScore}%
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {(job.status === JobStatus.Funded || job.status === JobStatus.Submitted) && isEvaluator && (
          <ActionButton
            icon={<XSquare className="size-5 text-danger" />}
            title="Reject & Refund"
            description="Return funds to client"
            disabled={isRejectPending || !!txStep}
            onClick={onReject}
            tone="danger"
          />
        )}

        {isExpired && (job.status === JobStatus.Funded || job.status === JobStatus.Submitted) && (
          <ActionButton
            icon={<RefreshCw className="size-5 text-warning" />}
            title="Claim Refund"
            description={`Job has expired - reclaim ${formattedBudget} ${jobPaymentToken.symbol}`}
            disabled={isRefundPending || !!txStep}
            onClick={onClaimRefund}
            tone="warning"
          />
        )}

        {isClient && job.status === JobStatus.Submitted && isPastDisputeWindow && (
          <ActionButton
            icon={<Clock className="size-5 text-primary" />}
            title="Complete After Timeout"
            description="Evaluator unresponsive - auto-complete after dispute window"
            disabled={!!txStep || isCompleteAfterTimeoutPending}
            onClick={onCompleteAfterTimeout}
          />
        )}

        {isExpired && !isTerminal && (
          <ActionButton
            icon={<RefreshCw className="size-5 text-danger" />}
            title="Trigger Refund (Anyone)"
            description="Permissionless - refund expired job for client"
            disabled={!!txStep || isRefundExpiredPending}
            onClick={onRefundExpired}
            tone="danger"
          />
        )}

        {isTerminal && (
          <div className="text-center py-4 text-default-400 text-sm">
            This job has reached a terminal state. No further actions available.
          </div>
        )}

        {canFlagDispute && !hasActiveDispute && (
          <div className="pt-4 border-t border-divider mt-2">
            <button
              type="button"
              onClick={onToggleDisputeForm}
              className="w-full flex items-center justify-between p-3 text-sm text-default-500 hover:text-default-700 hover:bg-content2 rounded-lg transition-colors"
            >
              <span className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-warning" />
                Need help? Open a dispute
              </span>
              {showDisputeForm ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </button>

            {showDisputeForm && (
              <div className="mt-2 p-4 bg-default-50 rounded-lg space-y-3">
                <p className="text-xs text-default-500">
                  Having an issue? Flag a dispute to engage an arbiter. A fee will be paid in the job payment token.
                </p>
                {milestones && milestones.length > 0 && (
                  <div>
                    <label className="text-xs text-default-600 block mb-1">Milestone to dispute:</label>
                    <select
                      value={disputeMilestoneIndex}
                      onChange={event => onDisputeMilestoneChange(Number(event.target.value))}
                      className="w-full px-2 py-1.5 text-sm border border-divider rounded-lg bg-background"
                    >
                      {milestones.map((milestone, index) => (
                        <option key={index} value={index}>
                          Phase {index + 1}: {milestone.description?.slice(0, 40)}
                          {milestone.description && milestone.description.length > 40 ? '...' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <button
                  type="button"
                  onClick={onFlagDispute}
                  disabled={isFlagPending}
                  className="px-4 py-2 bg-warning text-white text-sm rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {isFlagPending ? 'Flagging...' : 'Flag Dispute'}
                </button>
                {flagError ? <ErrorDisplay error={flagError} /> : null}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

function ActionButton({
  icon,
  title,
  description,
  disabled,
  onClick,
  tone = 'primary',
}: {
  icon: ReactNode;
  title: string;
  description: string;
  disabled: boolean;
  onClick: () => void;
  tone?: 'primary' | 'success' | 'warning' | 'danger';
}) {
  const border = {
    primary: 'border-primary/30 hover:bg-primary/5',
    success: 'border-success/30 hover:bg-success/5',
    warning: 'border-warning/30 hover:bg-warning/5',
    danger: 'border-danger/30 hover:bg-danger/5',
  }[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-3 p-4 border rounded-lg transition-colors disabled:opacity-50 ${border}`}
    >
      {icon}
      <div className="text-left">
        <p className="font-medium">{title}</p>
        <p className="text-xs text-default-500">{description}</p>
      </div>
    </button>
  );
}
