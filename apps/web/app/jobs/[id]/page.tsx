'use client';

import { use, useState, useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useAccount,
  useWaitForTransactionReceipt,
  useWriteContract,
  usePublicClient,
  useBalance,
} from 'wagmi';
import NextLink from 'next/link';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Clock,
  DollarSign,
  Send,
  CheckSquare,
  XSquare,
  RefreshCw,
  CircleDot,
  AlertTriangle,
  Gavel,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
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
  useJobBidCount,
  useWithdrawStake,
  useEvaluatorFeeEnabled,
  useCompleteAfterTimeout,
  useRefundExpired,
  JobStatus,
  isOpenJob,
  Bid,
} from '@/lib/hooks/useJobs';
import { useTokenPriceConversion, ETH_TOKEN } from '@/lib/hooks/useTokenConversion';
import { useWatchJob } from '@/lib/hooks/useJobEvents';
import { useService } from '@/lib/hooks/useServices';
import { useUSDCAllowance, useUSDCApprove, useUSDCBalance } from '@/lib/hooks/useUSDC';
import { CONTRACTS } from '@/lib/wagmi';
import { AGENTIC_COMMERCE_ABI } from '@/lib/contracts/abis';
import {
  PaymentTokenSelector,
  SUPPORTED_TOKENS,
  Token,
} from '@/components/PaymentTokenSelector';
import dynamic from 'next/dynamic';

const AcceptBidForm = dynamic(() => import('@/components/BiddingForms').then(m => m.AcceptBidForm), {
  loading: () => <div className="animate-pulse h-32 bg-content2 rounded-lg" />,
});
const MilestoneSection = dynamic(() => import('@/components/MilestoneSection').then(m => m.MilestoneSection), {
  loading: () => <div className="animate-pulse h-48 bg-content2 rounded-lg" />,
});
import { Address } from '@/components/Address';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { showToast } from '@/lib/toast';
import { useDispute, useFlagDispute, useJobMilestones } from '@/lib/hooks/useMilestoneEscrow';
import { JobHeader } from '@/components/jobs/JobHeader';
import { JobWarnings } from '@/components/jobs/JobWarnings';
import { BalanceCard } from '@/components/jobs/BalanceCard';
import { TransactionStatusCard } from '@/components/jobs/TransactionStatusCard';
import { DeliverableDisplay } from '@/components/jobs/DeliverableDisplay';
import { JobSettingsCard } from '@/components/jobs/JobSettingsCard';
import { FeedbackCard } from '@/components/jobs/FeedbackCard';
import { BiddingSectionForProvider } from '@/components/jobs/BiddingSectionForProvider';

export default function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): JSX.Element {
  const { id } = use(params);
  const jobId = BigInt(id);
  const { address } = useAccount();
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

  // Bidding hooks for open jobs
  const { count: bidCount } = useJobBidCount(job?.id);
  const { hash: withdrawHash, isPending: isWithdrawPending } = useWithdrawStake();
  const { isEvaluatorFeeEnabled } = useEvaluatorFeeEnabled(job?.id);

  // Fetch bids using useReadContracts
  const publicClient = usePublicClient();
  const [bids, setBids] = useState<Bid[]>([]);
  const [isLoadingBids, setIsLoadingBids] = useState(false);
  const jobIsOpen = job ? isOpenJob(job) : false;

  useEffect(() => {
    if (!publicClient || !job?.id || !jobIsOpen || bidCount === 0) {
      setBids([]);
      return;
    }

    const fetchBids = async () => {
      setIsLoadingBids(true);
      try {
        const calls = Array.from({ length: bidCount }, (_, i) => ({
          address: AGENTIC_COMMERCE_ADDRESS,
          abi: AGENTIC_COMMERCE_ABI,
          functionName: 'jobBids' as const,
          args: [job.id, BigInt(i)],
        }));

        const results = await publicClient.multicall({ contracts: calls } as any);
        const fetchedBids: Bid[] = [];
        for (const r of results) {
          if (r.status === 'success') {
            const result = r as unknown as { result?: unknown };
            if (result?.result && typeof result.result === 'object') {
              const bid = result.result as { bidId?: bigint };
              if (bid?.bidId) {
                fetchedBids.push(bid as unknown as Bid);
              }
            }
          }
        }
        setBids(fetchedBids);
      } catch (err) {
        console.error('Error fetching bids:', err);
        setBids([]);
      } finally {
        setIsLoadingBids(false);
      }
    };

    void fetchBids();
  }, [publicClient, job?.id, bidCount, jobIsOpen, AGENTIC_COMMERCE_ADDRESS]);

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
    paymentTokenHash ||
    withdrawHash;
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
    if (!fulfillmentText || !job?.description) return;
    setIsEvaluating(true);
    setEvaluationResult(null);
    try {
      const response = await fetch('/api/llm/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
  }, [fulfillmentText, job?.description]);

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
  const isUSDC = job 
    ? (job.paymentToken && job.paymentToken.toLowerCase() !== '0x0000000000000000000000000000000000000000'
      ? SUPPORTED_TOKENS.find(t => t.address.toLowerCase() === job.paymentToken.toLowerCase())?.symbol === 'USDC'
      : true)
    : true;

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
          <AlertCircle className="w-10 h-10 md:w-12 md:h-12 text-default-400 mx-auto mb-3 md:mb-4" />
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
        href="/jobs"
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
                <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
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
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <div>
                <p className="text-sm font-medium text-primary">{txStep}...</p>
                <p className="text-xs text-default-400">Waiting for confirmation</p>
              </div>
            </div>
          </Card>
        )}

        {currentError && <ErrorDisplay error={currentError} />}

        {/* Balance Info */}
        {isClient && job.status === JobStatus.Open && (
          <Card className="border border-divider p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-default-600">
                    Your {selectedPaymentToken.symbol} Balance
                  </p>
                  {selectedPaymentToken.symbol === 'ETH' && (
                    <CircleDot className="w-4 h-4 text-default-400" />
                  )}
                  {selectedPaymentToken.symbol === 'USDC' && (
                    <DollarSign className="w-4 h-4 text-default-400" />
                  )}
                </div>
                <p className="text-2xl font-bold text-success">
                  {usdcBalanceLoading || ethBalanceLoading ? (
                    <span className="animate-pulse">Loading...</span>
                  ) : selectedPaymentToken.symbol === 'ETH' ? (
                    `${ethBalance ? formatUnits(ethBalance.value, ethBalance.decimals) : '0.00'} ETH`
                  ) : (
                    `${usdcBalance || '0.00'} USDC`
                  )}
                </p>
              </div>
              {/* Insufficient balance warning */}
              {job &&
                selectedPaymentToken.symbol === 'USDC' &&
                usdcBalance &&
                Number(usdcBalance) < Number(formatUnits(job.budget, 6)) && (
                  <div className="px-4 py-2 bg-danger/10 text-danger rounded-lg text-sm">
                    Insufficient balance
                  </div>
                )}
              {job &&
                selectedPaymentToken.symbol === 'ETH' &&
                ethBalance &&
                Number(ethBalance.value) < job.budget && (
                  <div className="px-4 py-2 bg-danger/10 text-danger rounded-lg text-sm">
                    Insufficient balance
                  </div>
                )}
            </div>
          </Card>
        )}

        {/* Actions */}
        {hasActions && (
        <Card className="border border-divider p-6">
          <h2 className="text-xl font-bold mb-5">Actions</h2>

          {/* Active Dispute Banner */}
          {hasActiveDispute && (
            <div className="mb-4 p-4 bg-warning/10 border border-warning/30 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-warning" />
                  <p className="text-sm font-medium text-warning">Dispute Active</p>
                </div>
                <Gavel className="w-5 h-5 text-warning" />
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
            {job.status === JobStatus.Open && isClient && (
              <>
                {needsApproval && isUSDC && (
                  <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg text-sm text-warning">
                    USDC approval required before funding
                  </div>
                )}
                {/* Unified Fund Job Button - handles approval + funding */}
                <button
                  onClick={() => {
                    // Check if payment token is set for direct jobs
                    if (
                      !job.paymentToken ||
                      job.paymentToken === '0x0000000000000000000000000000000000000000'
                    ) {
                      setShowPaymentTokenModal(true);
                      return;
                    }
                    
                    // Need approval first - start unified flow
                    if (isUSDC && !hasAllowance) {
                      setIsApprovingAndFunding(true);
                      approve(AGENTIC_COMMERCE_ADDRESS, job.budget);
                      // The useEffect will capture approveHash when it arrives
                    } else {
                      // Direct funding
                      handleAction('Funding job', () => {
                        if (!isUSDC) {
                          fundJobWithETH(job.id, job.budget, job.budget);
                        } else {
                          fundJob(job.id, job.budget);
                        }
                      });
                    }
                  }}
                  disabled={!!txStep || isApprovePending || isFundPending || isFundETHPending || isApprovingAndFunding || isPaymentTokenPending}
                  className="w-full flex items-center gap-3 p-4 border border-success/30 rounded-lg hover:bg-success/5 transition-colors disabled:opacity-50"
                >
                  {!isUSDC ? (
                    <CircleDot className="w-5 h-5 text-success" />
                  ) : (
                    <DollarSign className="w-5 h-5 text-success" />
                  )}
                  <div className="text-left">
                    <p className="font-medium">
                      {isApprovingAndFunding 
                        ? 'Approving USDC...' 
                        : isFundPending 
                          ? 'Funding Job...' 
                          : isUSDC && !hasAllowance 
                            ? 'Approve & Fund Job' 
                            : 'Fund Job'}
                    </p>
                    <p className="text-xs text-default-500">
                      {isUSDC 
                        ? `$${formattedBudget} USDC` 
                        : `${formatUnits(job.budget, 18)} ETH`} into escrow
                      {!isUSDC && !isPriceLoading && (
                        <span className="ml-1">({formatUsdValue(job.budget, ETH_TOKEN)} USD)</span>
                      )}
                    </p>
                  </div>
                  {(isApprovingAndFunding || isFundPending) && (
                    <Loader2 className="w-5 h-5 animate-spin text-success ml-auto" />
                  )}
                </button>
              </>
            )}

            {job.status === JobStatus.Funded && isProvider && (
              <>
                {!showFulfillmentInput ? (
                  <button
                    onClick={() => setShowFulfillmentInput(true)}
                    disabled={isSubmitPending || !!txStep}
                    className="w-full flex items-center gap-3 p-4 border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors disabled:opacity-50"
                  >
                    <Send className="w-5 h-5 text-primary" />
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
                      onChange={e => setFulfillmentText(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 bg-content2 border border-divider rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none text-sm"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setShowFulfillmentInput(false);
                          setFulfillmentText('');
                        }}
                        className="px-4 py-2 text-sm border border-divider rounded-lg hover:bg-content2"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() =>
                          handleAction('Submitting deliverable', () => {
                            const deliverableHash = fulfillmentText
                              ? keccak256(toHex(fulfillmentText))
                              : keccak256(toHex('deliverable-submitted'));
                            submitJob(job.id, deliverableHash);
                          })
                        }
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

            {/* V7: Client approval for PendingClientApproval status */}
            {job.status === JobStatus.PendingClientApproval && isClient && (
              <button
                onClick={handleClientApprove}
                disabled={isApproveByClientPending || !!txStep}
                className="w-full flex items-center gap-3 p-4 border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors disabled:opacity-50"
              >
                <CheckSquare className="w-5 h-5 text-primary" />
                <div className="text-left">
                  <p className="font-medium">Approve Delivery</p>
                  <p className="text-xs text-default-500">
                    Approve the deliverable to release payment to provider
                  </p>
                </div>
              </button>
            )}

            {/* Legacy: Direct client approval in Submitted status (for V6 jobs without client review) */}
            {job.status === JobStatus.Submitted && isClient && (
              <button
                onClick={handleClientApprove}
                disabled={isApproveByClientPending || !!txStep || clientApproved}
                className="w-full flex items-center gap-3 p-4 border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors disabled:opacity-50"
              >
                <CheckSquare className="w-5 h-5 text-primary" />
                <div className="text-left">
                  <p className="font-medium">{clientApproved ? 'Approved' : 'Review & Approve'}</p>
                  <p className="text-xs text-default-500">
                    {clientApproved ? 'You approved the delivery' : 'Mark delivery as satisfactory'}
                  </p>
                </div>
              </button>
            )}

            {job.status === JobStatus.Submitted && isEvaluator && (
              <>
                <div className="space-y-3">
                  <button
                    onClick={() =>
                      handleAction('Finalizing evaluation', () =>
                        finalizeByEvaluator(job.id, keccak256(toHex('approved')))
                      )
                    }
                    disabled={isFinalizePending || !!txStep}
                    className="w-full flex items-center gap-3 p-4 border border-success/30 rounded-lg hover:bg-success/5 transition-colors disabled:opacity-50"
                  >
                    <CheckSquare className="w-5 h-5 text-success" />
                    <div className="text-left">
                      <p className="font-medium">Finalize & Release Payment</p>
                      <p className="text-xs text-default-500">
                        Release {formattedBudget} {isUSDC ? 'USDC' : 'ETH'} to provider
                      </p>
                    </div>
                  </button>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={handleEvaluate}
                    disabled={!!txStep || isEvaluating}
                    className="w-full flex items-center gap-3 p-3 border border-divider rounded-lg hover:bg-content2 transition-colors disabled:opacity-50"
                  >
                    <Loader2 className={`w-4 h-4 ${isEvaluating ? 'animate-spin' : ''}`} />
                    <div className="text-left">
                      <p className="font-medium text-sm">Evaluate with AI</p>
                      <p className="text-xs text-default-500">Analyze fulfillment against requirements</p>
                    </div>
                  </button>

                  {evaluationResult && (
                    <div className="p-3 bg-content2 rounded-lg border border-divider">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">AI Analysis</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            evaluationResult.meetsRequirements
                              ? 'bg-success/20 text-success'
                              : 'bg-danger/20 text-danger'
                          }`}
                        >
                          {evaluationResult.meetsRequirements ? 'Meets Requirements' : 'Does Not Meet'}
                        </span>
                      </div>
                      <p className="text-xs text-default-500 mb-2">{evaluationResult.analysis}</p>
                      <div className="text-xs space-y-1">
                        {evaluationResult.checks?.passed?.length > 0 && (
                          <p className="text-success">
                            ✓ {evaluationResult.checks.passed.join(', ')}
                          </p>
                        )}
                        {evaluationResult.checks?.failed?.length > 0 && (
                          <p className="text-danger">
                            ✗ {evaluationResult.checks.failed.join(', ')}
                          </p>
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

            {(job.status === JobStatus.Funded || job.status === JobStatus.Submitted) &&
              isEvaluator && (
                <button
                  onClick={() =>
                    handleAction('Rejecting work', () =>
                      rejectJob(job.id, keccak256(toHex('rejected')))
                    )
                  }
                  disabled={isRejectPending || !!txStep}
                  className="w-full flex items-center gap-3 p-4 border border-danger/30 rounded-lg hover:bg-danger/5 transition-colors disabled:opacity-50"
                >
                  <XSquare className="w-5 h-5 text-danger" />
                  <div className="text-left">
                    <p className="font-medium">Reject & Refund</p>
                    <p className="text-xs text-default-500">Return funds to client</p>
                  </div>
                </button>
              )}

            {isExpired &&
              (job.status === JobStatus.Funded || job.status === JobStatus.Submitted) && (
                <button
                  onClick={() => handleAction('Claiming refund', () => claimRefund(job.id))}
                  disabled={isRefundPending || !!txStep}
                  className="w-full flex items-center gap-3 p-4 border border-warning/30 rounded-lg hover:bg-warning/5 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className="w-5 h-5 text-warning" />
                  <div className="text-left">
                    <p className="font-medium">Claim Refund</p>
                    <p className="text-xs text-default-500">
                      Job has expired — reclaim ${formattedBudget} USDC
                    </p>
                  </div>
                </button>
              )}

            {/* Phase 14: Permissionless Complete After Timeout - for unresponsive evaluators */}
            {isClient && job.status === JobStatus.Submitted && isPastDisputeWindow && (
              <button
                onClick={() =>
                  handleAction('Completing job after timeout', () => completeAfterTimeout(job.id))
                }
                disabled={!!txStep || isCompleteAfterTimeoutPending}
                className="w-full flex items-center gap-3 p-4 border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors disabled:opacity-50"
              >
                <Clock className="w-5 h-5 text-primary" />
                <div className="text-left">
                  <p className="font-medium">Complete After Timeout</p>
                  <p className="text-xs text-default-500">
                    Evaluator unresponsive — auto-complete after dispute window
                  </p>
                </div>
              </button>
            )}

            {/* Phase 14: Permissionless Refund - anyone can trigger for expired jobs */}
            {isExpired &&
              job.status !== JobStatus.Completed &&
              job.status !== JobStatus.Rejected &&
              job.status !== JobStatus.Expired && (
                <button
                  onClick={() =>
                    handleAction('Triggering permissionless refund', () => refundExpired(job.id))
                  }
                  disabled={!!txStep || isRefundExpiredPending}
                  className="w-full flex items-center gap-3 p-4 border border-danger/30 rounded-lg hover:bg-danger/5 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className="w-5 h-5 text-danger" />
                  <div className="text-left">
                    <p className="font-medium">Trigger Refund (Anyone)</p>
                    <p className="text-xs text-default-500">
                      Permissionless — refund expired job for client
                    </p>
                  </div>
                </button>
              )}

            {(job.status === JobStatus.Completed ||
              job.status === JobStatus.Rejected ||
              job.status === JobStatus.Expired) && (
              <div className="text-center py-4 text-default-400 text-sm">
                This job has reached a terminal state. No further actions available.
              </div>
            )}

            {/* Dispute Resolution — Collapsed by default when no active dispute */}
            {canFlagDispute && !hasActiveDispute && (
              <div className="pt-4 border-t border-divider mt-2">
                <button
                  type="button"
                  onClick={() => setShowDisputeForm(!showDisputeForm)}
                  className="w-full flex items-center justify-between p-3 text-sm text-default-500 hover:text-default-700 hover:bg-content2 rounded-lg transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-warning" />
                    Need help? Open a dispute
                  </span>
                  {showDisputeForm ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
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
                          onChange={(e) => setDisputeMilestoneIndex(Number(e.target.value))}
                          className="w-full px-2 py-1.5 text-sm border border-divider rounded-lg bg-background"
                        >
                          {milestones.map((m, i) => (
                            <option key={i} value={i}>
                              Phase {i + 1}: {m.description?.slice(0, 40)}{m.description?.length > 40 ? '...' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={handleFlagDispute}
                      disabled={isFlagPending}
                      className="px-4 py-2 bg-warning text-white text-sm rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
                    >
                      {isFlagPending ? 'Flagging...' : 'Flag Dispute'}
                    </button>
                    {flagError && <ErrorDisplay error={flagError} />}
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
        )}

        {/* Open Job Bidding Section */}
        {jobIsOpen && (
          <>
            {/* Bid Status for Providers */}
            {!isClient && address && (
              <BiddingSectionForProvider job={job} address={address} refetch={refetch} />
            )}

            {/* Client: Show bid count and Accept Bid Form */}
            {isClient && (
              <>
                {/* Bid Overview */}
                <Card className="border border-divider p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-semibold">Bids Received</h2>
                    <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                      {bidCount} bid{bidCount !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {isLoadingBids ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : bids.length === 0 ? (
                    <p className="text-sm text-default-500 text-center py-4">
                      No bids yet. Providers will commit their bids before the deadline.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {bids.map((bid, idx) => (
                        <div key={bid.bidId.toString()} className="p-3 bg-content2 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs text-default-500">Bidder {idx + 1}</p>
                              <Address address={bid.bidder as `0x${string}`} className="text-sm" />
                            </div>
                            <div className="text-right">
                              <span
                                className={`px-2 py-0.5 text-xs rounded-full ${
                                  bid.accepted
                                    ? 'bg-success/20 text-success'
                                    : bid.revealed
                                      ? 'bg-primary/20 text-primary'
                                      : 'bg-warning/20 text-warning'
                                }`}
                              >
                                {bid.accepted
                                  ? 'Accepted'
                                  : bid.revealed
                                    ? 'Revealed'
                                    : 'Committed'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                {/* Accept Bid Form */}
                <AcceptBidForm job={job} bids={bids} onSuccess={() => void refetch()} />
              </>
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

        {/* Payment Token Setup Modal */}
        {showPaymentTokenModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <Card className="max-w-md w-full mx-4 border border-divider p-6">
              <h2 className="text-xl font-semibold mb-4">Setup Payment Token</h2>
              <p className="text-default-500 text-sm mb-6">
                This job was created without a service, so you need to select a payment token before
                funding. This is a one-time setup step.
              </p>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-sm font-medium mb-2 block">Select Payment Token</label>
                  <PaymentTokenSelector
                    selectedToken={selectedPaymentToken}
                    onSelectToken={setSelectedPaymentToken}
                    disabled={isPaymentTokenPending}
                  />
                </div>

                <div className="bg-content2 rounded-lg p-4">
                  <h3 className="font-medium mb-2">Next Steps:</h3>
                  <ol className="text-sm text-default-500 space-y-2 list-decimal list-inside">
                    <li>Set {selectedPaymentToken.symbol} as payment token</li>
                    <li>
                      Fund the job with ${formattedBudget} {selectedPaymentToken.symbol}
                    </li>
                  </ol>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowPaymentTokenModal(false)}
                  className="flex-1 px-4 py-2 border border-divider rounded-lg hover:bg-content2 transition-colors"
                  disabled={isPaymentTokenPending}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleAction('Setting payment token', () =>
                      setPaymentToken(jobId, selectedPaymentToken.address)
                    );
                    setShowPaymentTokenModal(false);
                  }}
                  disabled={isPaymentTokenPending}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-[#009F4D] to-[#00c853] text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {isPaymentTokenPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Setting...
                    </span>
                  ) : (
                    `Set ${selectedPaymentToken.symbol} Token`
                  )}
                </button>
              </div>
            </Card>
          </div>
        )}
      </div>


      </div>
    );
  }

