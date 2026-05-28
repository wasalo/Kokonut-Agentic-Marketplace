'use client';

import { use, useState, useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useAccount,
  useWalletClient,
  useWaitForTransactionReceipt,
  useWriteContract,
  useBalance,
} from 'wagmi';
import NextLink from 'next/link';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Card } from '@heroui/react';
import { formatUnits, toHex, keccak256 } from 'viem';
import {
  useJob,
  useFundJob,
  useSubmitJob,
  useApproveByClient,
  useFinalizeByEvaluator,
  useRejectJob,
  useClaimRefund,
  useSetBudget,
  useSetPaymentToken,
  useEvaluatorFeeEnabled,
  useCompleteAfterTimeout,
  useRefundExpired,
  JobStatus,
  isOpenJob,
} from '@/lib/hooks/useJobs';
import { useTokenPriceConversion } from '@/lib/hooks/useTokenConversion';
import { useWatchJob } from '@/lib/hooks/useJobEvents';
import { useService } from '@/lib/hooks/useServices';
import { useUSDCAllowance, useUSDCApprove, useUSDCBalance } from '@/lib/hooks/useUSDC';
import { CONTRACTS } from '@/lib/wagmi';
import { AGENTIC_COMMERCE_ABI } from '@/lib/contracts/abis';
import { SUPPORTED_TOKENS, Token } from '@/components/PaymentTokenSelector';
import dynamic from 'next/dynamic';
const MilestoneSection = dynamic(() => import('@/components/MilestoneSection').then(m => m.MilestoneSection), {
  loading: () => <div className="animate-pulse h-48 bg-content2 rounded-lg" />,
});
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { showToast } from '@/lib/toast';
import { createOwnerAuthHeaders } from '@/lib/client-auth';
import { useDispute, useFlagDispute, useJobMilestones } from '@/lib/hooks/useMilestoneEscrow';
import { JobHeader } from '@/components/jobs/JobHeader';
import { JobWarnings } from '@/components/jobs/JobWarnings';
import { BalanceCard } from '@/components/jobs/BalanceCard';
import { TransactionStatusCard } from '@/components/jobs/TransactionStatusCard';
import { DeliverableDisplay } from '@/components/jobs/DeliverableDisplay';
import { JobSettingsCard } from '@/components/jobs/JobSettingsCard';
import { FeedbackCard } from '@/components/jobs/FeedbackCard';
import { BiddingSectionForProvider } from '@/components/jobs/BiddingSectionForProvider';
import { JobFundingSection } from '@/components/jobs/JobFundingSection';
import { JobActionsCard } from '@/components/jobs/JobActionsCard';
import { JobBidListCard } from '@/components/jobs/JobBidListCard';
import { PaymentTokenSetupModal } from '@/components/jobs/PaymentTokenSetupModal';
import { useJobBids } from '@/lib/hooks/useJobBids';
import { getTokenByAddress } from '@/lib/tokenUtils';

export default function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): JSX.Element {
  useEffect(() => {
    document.title = 'Job Details | Kokonut Agent Economy';
  }, []);

  const { id } = use(params);
  const jobId = BigInt(id);
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const queryClient = useQueryClient();

  const { job, isLoading, refetch } = useJob(jobId);
  const { service } = useService(job?.serviceId ?? BigInt(0));

  // Enable event-driven updates for this specific job
  useWatchJob(jobId);

  // USDC approval and balance hooks
  const AGENTIC_COMMERCE_ADDRESS = CONTRACTS[11155111].agenticCommerce as `0x${string}`;
  const USDC_ADDRESS = CONTRACTS[11155111].usdc as `0x${string}`;
  const { allowance } = useUSDCAllowance(address, AGENTIC_COMMERCE_ADDRESS);
  const { formattedBalance: usdcBalance, isLoading: usdcBalanceLoading } = useUSDCBalance(address);
  const { data: ethBalance, isLoading: ethBalanceLoading } = useBalance({ address });
  const { approve, hash: approveHash, isPending: isApprovePending } = useUSDCApprove();

  // Optimistic approval state - immediately show "Fund Job" after approve is clicked
  const [optimisticApprovalSent, setOptimisticApprovalSent] = useState(false);
  const prevApproveHashRef = useRef<string | undefined>(undefined);

  // Unified Fund Job flow state - chains approval then funding
  const [isApprovingAndFunding, setIsApprovingAndFunding] = useState(false);
  const [approvalTxHash, setApprovalTxHash] = useState<string | undefined>();

  // Payment token setup for direct jobs
  const {
    setPaymentToken,
    hash: paymentTokenHash,
    isPending: isPaymentTokenPending,
  } = useSetPaymentToken();
  const [showPaymentTokenModal, setShowPaymentTokenModal] = useState(false);
  const [selectedPaymentToken, setSelectedPaymentToken] = useState<Token>(SUPPORTED_TOKENS[0]); // Default to USDC
  const { formatUsdValue, isLoading: isPriceLoading } = useTokenPriceConversion();

  const [txStep, setTxStep] = useState<string | null>(null);

  // LLM Evaluation state
  const [fulfillmentText, setFulfillmentText] = useState('');
  const [evaluationResult, setEvaluationResult] = useState<{
    meetsRequirements: boolean;
    confidenceScore: number;
    analysis: string;
    checks: { passed: string[]; failed: string[] };
  } | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [showFulfillmentInput, setShowFulfillmentInput] = useState(false);

  // Client review state (Phase 3)
  const [clientApproved] = useState(false);

  // Dispute state
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeMilestoneIndex, setDisputeMilestoneIndex] = useState<number>(0);
  const { dispute } = useDispute(jobId);
  const { milestones } = useJobMilestones(jobId);
  const { flagDispute, isPending: isFlagPending, writeError: flagError } = useFlagDispute();

  const { fundJob, hash: fundHash, isPending: isFundPending, error: fundError } = useFundJob();

  // ETH funding with value
  const {
    writeContract: writeFundETH,
    data: fundETHTxHash,
    isPending: isFundETHPending,
  } = useWriteContract();

  const fundJobWithETH = useCallback(
    (jobId: bigint, value: bigint, expectedBudget: bigint) => {
      writeFundETH({
        address: AGENTIC_COMMERCE_ADDRESS,
        abi: AGENTIC_COMMERCE_ABI,
        chainId: 11155111,
        functionName: 'fund',
        args: [jobId, expectedBudget],
        value,
      });
    },
    [writeFundETH, AGENTIC_COMMERCE_ADDRESS]
  );

  const {
    submitJob,
    hash: submitHash,
    isPending: isSubmitPending,
    error: submitError,
  } = useSubmitJob();
  const {
    approveByClient,
    hash: approveByClientHash,
    isPending: isApproveByClientPending,
    error: approveByClientError,
  } = useApproveByClient();
  const {
    finalizeByEvaluator,
    hash: finalizeHash,
    isPending: isFinalizePending,
    error: finalizeError,
  } = useFinalizeByEvaluator();
  const {
    rejectJob,
    hash: rejectHash,
    isPending: isRejectPending,
    error: rejectError,
  } = useRejectJob();
  const {
    claimRefund,
    hash: refundHash,
    isPending: isRefundPending,
    error: refundError,
  } = useClaimRefund();

  const { setBudget, hash: budgetHash, isPending: isBudgetPending } = useSetBudget();

  // Phase 14/15 - New hooks for permissionless operations
  const {
    completeAfterTimeout,
    isPending: isCompleteAfterTimeoutPending,
    error: completeAfterTimeoutError,
  } = useCompleteAfterTimeout();
  const {
    refundExpired,
    isPending: isRefundExpiredPending,
    error: refundExpiredError,
  } = useRefundExpired();

  const { isEvaluatorFeeEnabled } = useEvaluatorFeeEnabled(job?.id);
  const jobIsOpen = job ? isOpenJob(job) : false;
  const { bidCount, bids, isLoadingBids } = useJobBids(job?.id, jobIsOpen);

  const [newBudget, setNewBudget] = useState('');

  const txHash =
    fundHash ||
    fundETHTxHash ||
    submitHash ||
    approveByClientHash ||
    finalizeHash ||
    rejectHash ||
    refundHash ||
    approveHash ||
    budgetHash ||
    paymentTokenHash;
  const { isSuccess: isTxConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  // Wait for approval to confirm before auto-funding
  const { isSuccess: isApprovalConfirmed } = useWaitForTransactionReceipt({ 
    hash: approvalTxHash as `0x${string}`,
  });

  // Track when approval tx is sent to optimistically update UI
  useEffect(() => {
    if (approveHash && approveHash !== prevApproveHashRef.current) {
      prevApproveHashRef.current = approveHash;
      setOptimisticApprovalSent(true);
      // Capture approval hash for the unified flow
      if (isApprovingAndFunding) {
        setApprovalTxHash(approveHash);
      }
    }
  }, [approveHash, isApprovingAndFunding]);

  // After approval tx confirms, invalidate allowance query and clear optimistic state
  useEffect(() => {
    if (isTxConfirmed && txStep === 'Approving USDC') {
      setTxStep(null);
      setOptimisticApprovalSent(false);
      queryClient.invalidateQueries({
        queryKey: ['useReadContract', USDC_ADDRESS, 'allowance'],
      });
      void refetch();
    } else if (isTxConfirmed && txStep) {
      showToast.success(`${txStep} completed!`, 'Transaction confirmed.');
      setTxStep(null);
      void refetch();
    }
  }, [isTxConfirmed, txStep, refetch, queryClient, USDC_ADDRESS]);

  // Moved after isUSDC is defined (line ~457)

  const handleAction = useCallback((action: string, fn: () => void) => {
    setTxStep(action);
    fn();
  }, []);

  // LLM Evaluation handler
  const handleEvaluate = useCallback(async () => {
    if (!fulfillmentText || !job?.description || !address || !walletClient) return;
    setIsEvaluating(true);
    setEvaluationResult(null);
    try {
      const authHeaders = await createOwnerAuthHeaders(address, walletClient);
      const response = await fetch('/api/llm/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          jobDescription: job.description,
          fulfillmentText,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setEvaluationResult(data);
      }
    } catch (error) {
      console.error('Evaluation failed:', error);
    } finally {
      setIsEvaluating(false);
    }
  }, [fulfillmentText, job?.description, address, walletClient]);

  // Client review handler (Phase 3) — actually calls approveByClient on-chain
  const handleClientApprove = useCallback(() => {
    if (!job) return;
    handleAction('Approving delivery', () => approveByClient(job.id));
  }, [job, approveByClient, handleAction]);

  // Dispute handler
  const handleFlagDispute = useCallback(() => {
    if (!job) return;
    handleAction('Flagging dispute', () => flagDispute(job.id, BigInt(disputeMilestoneIndex)));
  }, [job, disputeMilestoneIndex, flagDispute, handleAction]);

  // Determine if job uses USDC or ETH - defined before early returns to maintain hooks order
  // Note: Uses fallback values since job might be undefined at this point
  const jobPaymentToken = job ? getTokenByAddress(job.paymentToken) : SUPPORTED_TOKENS[0];
  const isUSDC = jobPaymentToken.symbol === 'USDC';

  useEffect(() => {
    if (!job?.paymentToken) return;
    setSelectedPaymentToken(getTokenByAddress(job.paymentToken));
  }, [job?.paymentToken]);

  // Auto-fund job after approval confirms in unified flow - MUST be before early returns
  useEffect(() => {
    if (!job) return;
    if (isApprovalConfirmed && isApprovingAndFunding) {
      setIsApprovingAndFunding(false);
      setApprovalTxHash(undefined);
      // Now fund the job
      if (!isUSDC) {
        fundJobWithETH(job.id, job.budget, job.budget);
      } else {
        fundJob(job.id, job.budget);
      }
    }
  }, [isApprovalConfirmed, isApprovingAndFunding, job, isUSDC, fundJob, fundJobWithETH]);

  const isClient = !!(job && address && job.client.toLowerCase() === address.toLowerCase());
  const isProvider = !!(job && address && job.provider.toLowerCase() === address.toLowerCase());
  const isEvaluator = !!(job && address && job.evaluator.toLowerCase() === address.toLowerCase());

  // USDC approval check - includes optimistic state
  const hasAllowance = (allowance && job && allowance >= job.budget) || optimisticApprovalSent;
  const needsApproval = !hasAllowance && job?.status === JobStatus.Open && isClient;
  const isExpired = job && Date.now() / 1000 > Number(job.expiredAt);

  // Phase 14: Calculate dispute window - 7 days after expiration for auto-complete
  // After expiredAt + 7 days, anyone can call completeAfterTimeout
  const DISPUTE_WINDOW_SECONDS = 7 * 24 * 60 * 60; // 7 days
  const isPastDisputeWindow =
    job && Date.now() / 1000 > Number(job.expiredAt) + DISPUTE_WINDOW_SECONDS;

  const handleFundJob = useCallback(() => {
    if (!job) return;

    if (!job.paymentToken) {
      setShowPaymentTokenModal(true);
      return;
    }

    if (isUSDC && !hasAllowance) {
      setIsApprovingAndFunding(true);
      approve(AGENTIC_COMMERCE_ADDRESS, job.budget);
      return;
    }

    handleAction('Funding job', () => {
      if (!isUSDC) {
        fundJobWithETH(job.id, job.budget, job.budget);
      } else {
        fundJob(job.id, job.budget);
      }
    });
  }, [job, isUSDC, hasAllowance, approve, AGENTIC_COMMERCE_ADDRESS, handleAction, fundJobWithETH, fundJob]);

  const handleSubmitDeliverable = useCallback(() => {
    if (!job) return;
    handleAction('Submitting deliverable', () => {
      const deliverableHash = fulfillmentText
        ? keccak256(toHex(fulfillmentText))
        : keccak256(toHex('deliverable-submitted'));
      submitJob(job.id, deliverableHash);
    });
  }, [job, fulfillmentText, submitJob, handleAction]);

  const handleFinalize = useCallback(() => {
    if (!job) return;
    handleAction('Finalizing evaluation', () => finalizeByEvaluator(job.id, keccak256(toHex('approved'))));
  }, [job, finalizeByEvaluator, handleAction]);

  const handleRejectWork = useCallback(() => {
    if (!job) return;
    handleAction('Rejecting work', () => rejectJob(job.id, keccak256(toHex('rejected'))));
  }, [job, rejectJob, handleAction]);

  const handleClaimRefund = useCallback(() => {
    if (!job) return;
    handleAction('Claiming refund', () => claimRefund(job.id));
  }, [job, claimRefund, handleAction]);

  const handleCompleteAfterTimeout = useCallback(() => {
    if (!job) return;
    handleAction('Completing job after timeout', () => completeAfterTimeout(job.id));
  }, [job, completeAfterTimeout, handleAction]);

  const handleRefundExpired = useCallback(() => {
    if (!job) return;
    handleAction('Triggering permissionless refund', () => refundExpired(job.id));
  }, [job, refundExpired, handleAction]);

  const handlePaymentTokenSetup = useCallback(() => {
    handleAction('Setting payment token', () => setPaymentToken(jobId, selectedPaymentToken.address));
    setShowPaymentTokenModal(false);
  }, [handleAction, setPaymentToken, jobId, selectedPaymentToken.address]);

  // Determine if there are any actionable items for the current viewer
  const isTerminal =
    job?.status === JobStatus.Completed ||
    job?.status === JobStatus.Rejected ||
    job?.status === JobStatus.Expired;
  const hasActiveDispute = !!dispute?.flagger && !dispute?.resolved;
  const canFlagDispute = (isClient || isProvider) && !dispute?.resolved && !isTerminal;
  const hasActions =
    isClient ||
    isProvider ||
    isEvaluator ||
    hasActiveDispute ||
    canFlagDispute ||
    isTerminal;
  const currentError =
    fundError ||
    submitError ||
    approveByClientError ||
    finalizeError ||
    rejectError ||
    refundError ||
    completeAfterTimeoutError ||
    refundExpiredError;

  // Show error toasts for transaction failures
  useEffect(() => {
    if (currentError) {
      showToast.error('Transaction failed', (currentError as any).message || 'Please try again.');
    }
  }, [currentError]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-3 md:px-4 py-6 md:py-8">
        <div className="max-w-2xl mx-auto animate-pulse space-y-4">
          <div className="h-8 bg-content2 rounded w-1/3" />
          <div className="h-64 bg-content2 rounded" />
        </div>
      </div>
    );
  }

  if (!job || Number(job.id) === 0) {
    return (
      <div className="container mx-auto px-3 md:px-4 py-6 md:py-8">
        <Card className="max-w-2xl mx-auto border border-divider p-6 md:p-8 text-center">
          <AlertCircle className="size-10 md:w-12 md:h-12 text-default-400 mx-auto mb-3 md:mb-4" />
          <h2 className="text-lg md:text-xl font-semibold mb-2">Job Not Found</h2>
          <p className="text-default-500 text-sm">This job does not exist.</p>
        </Card>
      </div>
    );
  }

  const budgetDecimals = isUSDC ? 6 : 18;
  const formattedBudget = formatUnits(job.budget, budgetDecimals);

  return (
    <div className="container mx-auto px-3 md:px-4 py-6 md:py-8">
      <NextLink
        href="/marketplace?tab=jobs"
        className="inline-flex items-center text-sm text-default-500 hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Jobs
      </NextLink>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Job Header */}
        <JobHeader job={job} service={service} isClient={isClient} isProvider={isProvider} isEvaluator={isEvaluator} />

        {/* Warnings */}
        <JobWarnings job={job} isClient={isClient} isProvider={isProvider} isEvaluatorFeeEnabled={isEvaluatorFeeEnabled} address={address} />

        {/* Transaction Status */}
        <TransactionStatusCard txStep={txStep} />

        {currentError && <ErrorDisplay error={currentError} />}

        {/* Balance Card */}
        <BalanceCard job={job} isClient={isClient} address={address} />

        {/* Milestone Section */}
        <MilestoneSection
          jobId={jobId}
          client={job.client}
          provider={job.provider}
          paymentToken={job.paymentToken}
          budget={job.budget}
          jobStatus={job.status}
          isClient={isClient}
          isProvider={isProvider}
          onRefetch={refetch}
        />

        {/* Evaluator = Provider Warning */}
        {job.provider &&
          job.provider !== '0x0000000000000000000000000000000000000000' &&
          job.evaluator.toLowerCase() === job.provider.toLowerCase() && (
            <Card className="border border-warning/30 bg-warning/5 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="size-5 text-warning shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-warning">Conflict of Interest</p>
                  <p className="text-sm text-default-500 mt-1">
                    The evaluator is the same as the provider. This may affect job evaluation
                    impartiality.
                  </p>
                </div>
              </div>
            </Card>
          )}

        {/* Transaction Status */}
        {txStep && (
          <Card className="border border-primary/20 p-4">
            <div className="flex items-center gap-3">
              <Loader2 className="size-5 animate-spin text-primary" />
              <div>
                <p className="text-sm font-medium text-primary">{txStep}…</p>
                <p className="text-xs text-default-400">Waiting for confirmation</p>
              </div>
            </div>
          </Card>
        )}

        {currentError && <ErrorDisplay error={currentError} />}

        <JobFundingSection
          job={job}
          isClient={isClient}
          selectedPaymentToken={selectedPaymentToken}
          usdcBalance={usdcBalance}
          usdcBalanceLoading={usdcBalanceLoading}
          ethBalance={ethBalance}
          ethBalanceLoading={ethBalanceLoading}
          needsApproval={needsApproval}
          isUSDC={isUSDC}
          hasAllowance={!!hasAllowance}
          formattedBudget={formattedBudget}
          txStep={txStep}
          isApprovePending={isApprovePending}
          isFundPending={isFundPending}
          isFundETHPending={isFundETHPending}
          isApprovingAndFunding={isApprovingAndFunding}
          isPaymentTokenPending={isPaymentTokenPending}
          isPriceLoading={isPriceLoading}
          formatUsdValue={formatUsdValue}
          onFund={handleFundJob}
        />

        <JobActionsCard
          job={job}
          jobPaymentToken={jobPaymentToken}
          hasActions={hasActions}
          isClient={isClient}
          isProvider={isProvider}
          isEvaluator={isEvaluator}
          isExpired={isExpired}
          isPastDisputeWindow={isPastDisputeWindow}
          isTerminal={isTerminal}
          hasActiveDispute={hasActiveDispute}
          canFlagDispute={canFlagDispute}
          dispute={dispute}
          milestones={milestones}
          formattedBudget={formattedBudget}
          isUSDC={isUSDC}
          txStep={txStep}
          fulfillmentText={fulfillmentText}
          showFulfillmentInput={showFulfillmentInput}
          clientApproved={clientApproved}
          evaluationResult={evaluationResult}
          isEvaluating={isEvaluating}
          showDisputeForm={showDisputeForm}
          disputeMilestoneIndex={disputeMilestoneIndex}
          isSubmitPending={isSubmitPending}
          isApproveByClientPending={isApproveByClientPending}
          isFinalizePending={isFinalizePending}
          isRejectPending={isRejectPending}
          isRefundPending={isRefundPending}
          isCompleteAfterTimeoutPending={isCompleteAfterTimeoutPending}
          isRefundExpiredPending={isRefundExpiredPending}
          isFlagPending={isFlagPending}
          flagError={flagError}
          onFulfillmentTextChange={setFulfillmentText}
          onShowFulfillmentInputChange={setShowFulfillmentInput}
          onSubmitDeliverable={handleSubmitDeliverable}
          onClientApprove={handleClientApprove}
          onFinalize={handleFinalize}
          onEvaluate={handleEvaluate}
          onReject={handleRejectWork}
          onClaimRefund={handleClaimRefund}
          onCompleteAfterTimeout={handleCompleteAfterTimeout}
          onRefundExpired={handleRefundExpired}
          onToggleDisputeForm={() => setShowDisputeForm(!showDisputeForm)}
          onDisputeMilestoneChange={setDisputeMilestoneIndex}
          onFlagDispute={handleFlagDispute}
        />

        {/* Open Job Bidding Section */}
        {jobIsOpen && (
          <>
            {!isClient && address && (
              <BiddingSectionForProvider job={job} address={address} refetch={refetch} />
            )}
            {isClient && (
              <JobBidListCard
                job={job}
                bidCount={bidCount}
                bids={bids}
                isLoadingBids={isLoadingBids}
                onAccepted={() => void refetch()}
              />
            )}
          </>
        )}

        {/* Job Settings */}
        <JobSettingsCard job={job} isClient={isClient} isUSDC={isUSDC} budgetDecimals={budgetDecimals} newBudget={newBudget} setNewBudget={setNewBudget} setBudget={setBudget} isBudgetPending={isBudgetPending} handleAction={handleAction} />

        {/* Deliverable */}
        <DeliverableDisplay job={job} />

        {/* Submit Feedback (client only, after completion) */}
        {job.status === JobStatus.Completed &&
          isClient &&
          service &&
          Number(service.agentId) > 0 && <FeedbackCard agentId={service.agentId} jobId={job.id} />}

        {showPaymentTokenModal && (
          <PaymentTokenSetupModal
            job={job}
            selectedPaymentToken={selectedPaymentToken}
            setSelectedPaymentToken={setSelectedPaymentToken}
            onSetup={handlePaymentTokenSetup}
            isPending={isPaymentTokenPending}
            onClose={() => setShowPaymentTokenModal(false)}
          />
        )}
      </div>


      </div>
    );
  }
