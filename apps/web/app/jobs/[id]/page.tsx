'use client';

import { use, useState, useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Settings } from 'lucide-react';
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
  CheckCircle2,
  AlertCircle,
  Clock,
  DollarSign,
  Send,
  CheckSquare,
  XSquare,
  RefreshCw,
  CircleDot,
  Link,
} from 'lucide-react';
import { Card } from '@heroui/react';
import { formatUnits, toHex, keccak256 } from 'viem';
import {
  useJob,
  useFundJob,
  useSubmitJob,
  useCompleteJob,
  useRejectJob,
  useClaimRefund,
  useSetProvider,
  useSetBudget,
  useSetPaymentToken,
  useJobBidCount,
  useUserBid,
  useWithdrawStake,
  useEvaluatorFeeEnabled,
  getJobStatusLabel,
  getJobStatusColor,
  JobStatus,
  isOpenJob,
  Job,
  Bid,
} from '@/lib/hooks/useJobs';
import { useWatchJob } from '@/lib/hooks/useJobEvents';
import { useService } from '@/lib/hooks/useServices';
import { useUSDCAllowance, useUSDCApprove, useUSDCBalance } from '@/lib/hooks/useUSDC';
import { ERC8004_ABI } from '@/lib/8004contracts';
import { CONTRACTS } from '@/lib/wagmi';
import { AGENTIC_COMMERCE_ABI } from '@/lib/contracts/abis';
import {
  PaymentTokenSelector,
  SUPPORTED_TOKENS,
  Token,
  PaymentTokenBadge,
} from '@/components/PaymentTokenSelector';
import {
  CommitBidForm,
  RevealBidForm,
  AcceptBidForm,
  BidStatusCard,
} from '@/components/BiddingForms';
import { Address } from '@/components/Address';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { ConfirmModal } from '@/components/ConfirmModal';

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

  // Payment token setup for direct jobs
  const {
    setPaymentToken,
    hash: paymentTokenHash,
    isPending: isPaymentTokenPending,
  } = useSetPaymentToken();
  const [showPaymentTokenModal, setShowPaymentTokenModal] = useState(false);
  const [selectedPaymentToken, setSelectedPaymentToken] = useState<Token>(SUPPORTED_TOKENS[0]); // Default to USDC

  const [txStep, setTxStep] = useState<string | null>(null);

  const { fundJob, hash: fundHash, isPending: isFundPending, error: fundError } = useFundJob();

  // ETH funding with value
  const {
    writeContract: writeFundETH,
    data: fundETHTxHash,
    isPending: isFundETHPending,
  } = useWriteContract();

  const fundJobWithETH = useCallback(
    (jobId: bigint, value: bigint) => {
      writeFundETH({
        address: AGENTIC_COMMERCE_ADDRESS,
        abi: AGENTIC_COMMERCE_ABI,
        functionName: 'fund',
        args: [jobId],
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
    completeJob,
    hash: completeHash,
    isPending: isCompletePending,
    error: completeError,
  } = useCompleteJob();
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

  const { setProvider, hash: providerHash, isPending: isProviderPending } = useSetProvider();

  const { setBudget, hash: budgetHash, isPending: isBudgetPending } = useSetBudget();

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

        const results = await publicClient.multicall({ contracts: calls });
        const fetchedBids = results
          .filter(
            (r): r is { status: 'success'; result: Bid } => r.status === 'success' && !!r.result
          )
          .map(r => r.result);
        setBids(fetchedBids);
      } catch (err) {
        console.error('Error fetching bids:', err);
        setBids([]);
      } finally {
        setIsLoadingBids(false);
      }
    };

    void void fetchBids();
  }, [publicClient, job?.id, bidCount, jobIsOpen]);

  const [newProvider, setNewProvider] = useState('');
  const [newBudget, setNewBudget] = useState('');

  const txHash =
    fundHash ||
    fundETHTxHash ||
    submitHash ||
    completeHash ||
    rejectHash ||
    refundHash ||
    approveHash ||
    providerHash ||
    budgetHash ||
    paymentTokenHash ||
    withdrawHash;
  const { isSuccess: isTxConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  // Track when approval tx is sent to optimistically update UI
  useEffect(() => {
    if (approveHash && approveHash !== prevApproveHashRef.current) {
      prevApproveHashRef.current = approveHash;
      setOptimisticApprovalSent(true);
    }
  }, [approveHash]);

  // After approval tx confirms, invalidate allowance query and clear optimistic state
  useEffect(() => {
    if (isTxConfirmed && txStep === 'Approving USDC') {
      setTxStep(null);
      setOptimisticApprovalSent(false);
      // Immediately invalidate USDC allowance query so next read gets fresh value
      queryClient.invalidateQueries({
        queryKey: ['useReadContract', USDC_ADDRESS, 'allowance'],
      });
      void refetch();
    } else if (isTxConfirmed && txStep) {
      setTxStep(null);
      void refetch();
    }
  }, [isTxConfirmed, txStep, refetch, queryClient]);

  const handleAction = useCallback((action: string, fn: () => void) => {
    setTxStep(action);
    fn();
  }, []);

  const isClient = job && address && job.client.toLowerCase() === address.toLowerCase();
  const isProvider = job && address && job.provider.toLowerCase() === address.toLowerCase();
  const isEvaluator = job && address && job.evaluator.toLowerCase() === address.toLowerCase();

  // USDC approval check - includes optimistic state
  const hasAllowance = (allowance && job && allowance >= job.budget) || optimisticApprovalSent;
  const _needsApproval = !hasAllowance && job?.status === JobStatus.Open && isClient;
  const isExpired = job && Date.now() / 1000 > Number(job.expiredAt);

  const anyPending =
    isFundPending ||
    isFundETHPending ||
    isSubmitPending ||
    isCompletePending ||
    isRejectPending ||
    isRefundPending ||
    isWithdrawPending;
  const currentError = fundError || submitError || completeError || rejectError || refundError;

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto animate-pulse space-y-4">
          <div className="h-8 bg-content2 rounded w-1/3" />
          <div className="h-64 bg-content2 rounded" />
        </div>
      </div>
    );
  }

  if (!job || Number(job.id) === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto border border-divider p-8 text-center">
          <AlertCircle className="w-12 h-12 text-default-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Job Not Found</h2>
          <p className="text-default-500 text-sm">This job does not exist.</p>
        </Card>
      </div>
    );
  }

  const statusLabel = getJobStatusLabel(job.status);
  const statusColor = getJobStatusColor(job.status);
  const formattedBudget = formatUnits(job.budget, 6);
  const deadlineDate = new Date(Number(job.expiredAt) * 1000);

  return (
    <div className="container mx-auto px-4 py-8">
      <NextLink
        href="/jobs"
        className="inline-flex items-center text-sm text-default-500 hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Jobs
      </NextLink>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Job Header */}
        <Card className="border border-divider p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-semibold">Job #{job.id.toString()}</h1>
              <p className="text-sm text-default-500 mt-1">{job.description}</p>
            </div>
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                statusColor === 'success'
                  ? 'bg-success/10 text-success'
                  : statusColor === 'warning'
                    ? 'bg-warning/10 text-warning'
                    : statusColor === 'danger'
                      ? 'bg-danger/10 text-danger'
                      : statusColor === 'primary'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-default/10 text-default-500'
              }`}
            >
              {statusLabel}
            </span>
          </div>

          {service && Number(service.id) > 0 && (
            <NextLink
              href={`/marketplace/${service.id}`}
              className="text-sm text-primary hover:underline"
            >
              Service: {service.name}
            </NextLink>
          )}

          <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-divider">
            <div>
              <p className="text-xs text-default-400 uppercase tracking-wide">Budget</p>
              <div className="flex items-center gap-2">
                <p className="text-lg font-semibold text-success">${formattedBudget}</p>
                {job.paymentToken &&
                  job.paymentToken !== '0x0000000000000000000000000000000000000000' && (
                    <PaymentTokenBadge
                      token={
                        SUPPORTED_TOKENS.find(
                          t => t.address.toLowerCase() === job.paymentToken.toLowerCase()
                        ) || SUPPORTED_TOKENS[0]
                      }
                    />
                  )}
              </div>
            </div>
            <div>
              <p className="text-xs text-default-400 uppercase tracking-wide">Deadline</p>
              <p className="text-sm flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {deadlineDate.toLocaleDateString()} {deadlineDate.toLocaleTimeString()}
              </p>
              {isExpired && <p className="text-xs text-danger mt-0.5">Expired</p>}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-divider text-xs">
            <div>
              <p className="text-default-400 uppercase tracking-wide">Client</p>
              <Address address={job.client as `0x${string}`} truncate className="mt-0.5" />
              {isClient && <span className="text-primary">(You)</span>}
            </div>
            <div>
              <p className="text-default-400 uppercase tracking-wide">Provider</p>
              {job.provider === '0x0000000000000000000000000000000000000000' ? (
                <span className="text-default-500 mt-0.5">Open (Bidding)</span>
              ) : (
                <>
                  <Address address={job.provider as `0x${string}`} truncate className="mt-0.5" />
                  {isProvider && <span className="text-primary">(You)</span>}
                </>
              )}
            </div>
            <div>
              <p className="text-default-400 uppercase tracking-wide">Evaluator</p>
              <Address address={job.evaluator as `0x${string}`} truncate className="mt-0.5" />
              {isEvaluator && <span className="text-primary">(You)</span>}
              {isEvaluatorFeeEnabled && (
                <span className="block text-xs text-success mt-1">+1% evaluator fee</span>
              )}
            </div>
          </div>
        </Card>

        {/* Evaluator Fee Badge for Clients */}
        {isClient && isEvaluatorFeeEnabled && (
          <Card className="border border-success/20 bg-success/5 p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-success" />
              <span className="text-sm text-success">
                Evaluator fee enabled (+1% of budget on completion)
              </span>
            </div>
          </Card>
        )}

        {/* Hook Address Display */}
        {job.hook && job.hook !== '0x0000000000000000000000000000000000000000' && (
          <Card className="border border-divider p-4">
            <div className="flex items-center gap-2">
              <Link className="w-4 h-4 text-default-400" />
              <span className="text-sm text-default-500">Hook:</span>
              <Address address={job.hook as `0x${string}`} className="text-sm" />
            </div>
          </Card>
        )}

        {/* Evaluator Conflict Warning */}
        {isClient && job.evaluator.toLowerCase() === address?.toLowerCase() && (
          <Card className="border border-warning/30 bg-warning/5 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-warning">Conflict of Interest</p>
                <p className="text-sm text-default-500 mt-1">
                  You are both the client and evaluator for this job. Consider assigning a different
                  evaluator for impartial evaluation.
                </p>
              </div>
            </div>
          </Card>
        )}

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
        <Card className="border border-divider p-6">
          <h2 className="text-base font-semibold mb-4">Actions</h2>
          <div className="space-y-3">
            {job.status === JobStatus.Open && isClient && (
              <>
                {/* USDC Flow: Show approve button only for USDC payments */}
                {selectedPaymentToken.symbol === 'USDC' && !hasAllowance && (
                  <button
                    onClick={() =>
                      handleAction('Approving USDC', () =>
                        approve(AGENTIC_COMMERCE_ADDRESS, job.budget)
                      )
                    }
                    disabled={isApprovePending || anyPending || !!txStep}
                    className="w-full flex items-center gap-3 p-4 border border-warning/30 rounded-lg hover:bg-warning/5 transition-colors disabled:opacity-50"
                  >
                    <DollarSign className="w-5 h-5 text-warning" />
                    <div className="text-left">
                      <p className="font-medium">Approve USDC</p>
                      <p className="text-xs text-default-500">
                        Approve ${formattedBudget} USDC for escrow
                      </p>
                    </div>
                    {isApprovePending && (
                      <Loader2 className="w-5 h-5 animate-spin text-warning ml-auto" />
                    )}
                  </button>
                )}

                {/* Fund Button - Works for both USDC (after approval) and ETH (native) */}
                <button
                  onClick={() => {
                    // Check if payment token is set for direct jobs
                    if (
                      !job.paymentToken ||
                      job.paymentToken === '0x0000000000000000000000000000000000000000'
                    ) {
                      setShowPaymentTokenModal(true);
                    } else {
                      // For ETH, pass value. For USDC, just call fund
                      handleAction('Funding job', () => {
                        if (selectedPaymentToken.symbol === 'ETH') {
                          // Use writeContract with value for ETH
                          fundJobWithETH(job.id, job.budget);
                        } else {
                          fundJob(job.id);
                        }
                      });
                    }
                  }}
                  disabled={anyPending || !!txStep || isPaymentTokenPending}
                  className="w-full flex items-center gap-3 p-4 border border-success/30 rounded-lg hover:bg-success/5 transition-colors disabled:opacity-50"
                >
                  {selectedPaymentToken.symbol === 'ETH' ? (
                    <CircleDot className="w-5 h-5 text-success" />
                  ) : (
                    <DollarSign className="w-5 h-5 text-success" />
                  )}
                  <div className="text-left">
                    <p className="font-medium">Fund Job</p>
                    <p className="text-xs text-default-500">
                      Deposit{' '}
                      {selectedPaymentToken.symbol === 'ETH'
                        ? `${formatUnits(job.budget, 18)} ETH`
                        : `$${formattedBudget} USDC`}{' '}
                      into escrow
                    </p>
                  </div>
                  {isFundPending && (
                    <Loader2 className="w-5 h-5 animate-spin text-success ml-auto" />
                  )}
                </button>

                {/* Change Payment Token Button */}
                <button
                  onClick={() => setShowPaymentTokenModal(true)}
                  disabled={anyPending || !!txStep || isPaymentTokenPending}
                  className="w-full flex items-center gap-3 p-4 border border-divider rounded-lg hover:bg-content2 transition-colors disabled:opacity-50"
                >
                  <Settings className="w-5 h-5 text-default-500" />
                  <div className="text-left">
                    <p className="font-medium">Change Payment Token</p>
                    <p className="text-xs text-default-500">Switch between USDC and ETH</p>
                  </div>
                </button>
              </>
            )}

            {job.status === JobStatus.Funded && isProvider && (
              <button
                onClick={() =>
                  handleAction('Submitting deliverable', () =>
                    submitJob(job.id, keccak256(toHex('deliverable-submitted')))
                  )
                }
                disabled={anyPending || !!txStep}
                className="w-full flex items-center gap-3 p-4 border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors disabled:opacity-50"
              >
                <Send className="w-5 h-5 text-primary" />
                <div className="text-left">
                  <p className="font-medium">Submit Deliverable</p>
                  <p className="text-xs text-default-500">Mark your work as submitted for review</p>
                </div>
              </button>
            )}

            {job.status === JobStatus.Submitted && isEvaluator && (
              <button
                onClick={() =>
                  handleAction('Approving work', () =>
                    completeJob(job.id, keccak256(toHex('approved')))
                  )
                }
                disabled={anyPending || !!txStep}
                className="w-full flex items-center gap-3 p-4 border border-success/30 rounded-lg hover:bg-success/5 transition-colors disabled:opacity-50"
              >
                <CheckSquare className="w-5 h-5 text-success" />
                <div className="text-left">
                  <p className="font-medium">Approve & Release Payment</p>
                  <p className="text-xs text-default-500">
                    Release ${formattedBudget} USDC to provider
                  </p>
                </div>
              </button>
            )}

            {(job.status === JobStatus.Funded || job.status === JobStatus.Submitted) &&
              isEvaluator && (
                <button
                  onClick={() =>
                    handleAction('Rejecting work', () =>
                      rejectJob(job.id, keccak256(toHex('rejected')))
                    )
                  }
                  disabled={anyPending || !!txStep}
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
                  disabled={anyPending || !!txStep}
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

            {(job.status === JobStatus.Completed ||
              job.status === JobStatus.Rejected ||
              job.status === JobStatus.Expired) && (
              <div className="text-center py-4 text-default-400 text-sm">
                This job has reached a terminal state. No further actions available.
              </div>
            )}
          </div>
        </Card>

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

        {/* Job Settings - Only for client before funding (not for open jobs) */}
        {job.status === JobStatus.Open && isClient && (
          <Card className="border border-divider p-6">
            <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Job Settings
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Update Provider</label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="text"
                    placeholder="0x..."
                    value={newProvider}
                    onChange={e => setNewProvider(e.target.value)}
                    className="flex-1 px-3 py-2 bg-content2 border border-divider rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                  <button
                    onClick={() =>
                      handleAction('Updating provider', () =>
                        setProvider(job.id, newProvider as `0x${string}`)
                      )
                    }
                    disabled={!newProvider || isProviderPending}
                    className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
                  >
                    {isProviderPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update'}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Update Budget (USDC)</label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="New budget amount"
                    value={newBudget}
                    onChange={e => setNewBudget(e.target.value)}
                    className="flex-1 px-3 py-2 bg-content2 border border-divider rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                  <button
                    onClick={() =>
                      handleAction('Updating budget', () =>
                        setBudget(job.id, BigInt(Math.floor(parseFloat(newBudget) * 1e6)))
                      )
                    }
                    disabled={!newBudget || isBudgetPending}
                    className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
                  >
                    {isBudgetPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update'}
                  </button>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Deliverable */}
        {job.status >= JobStatus.Submitted &&
          job.deliverable !==
            '0x0000000000000000000000000000000000000000000000000000000000000000' && (
            <Card className="border border-divider p-6">
              <h2 className="text-base font-semibold mb-3">Deliverable</h2>
              <p className="text-xs font-mono text-default-500 break-all bg-content2 p-3 rounded">
                {job.deliverable}
              </p>
            </Card>
          )}

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

function FeedbackCard({ agentId, jobId }: { agentId: bigint; jobId: bigint }) {
  const [rating, setRating] = useState('850');
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const { writeContract, data: txHash, isPending, error } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const ERC8004_REP = process.env.NEXT_PUBLIC_8004_REPUTATION_ADDRESS as `0x${string}`;

  const handleSubmit = useCallback(() => {
    const salt = keccak256(toHex(`feedback-${jobId}-${Date.now()}`));
    writeContract({
      address: ERC8004_REP,
      abi: ERC8004_ABI,
      functionName: 'giveFeedback',
      args: [
        agentId,
        BigInt(rating),
        2, // decimals (e.g., 850 with 2 decimals = 8.50)
        comment || `Feedback for job #${jobId}`,
        '',
        '',
        '',
        salt,
      ],
    });
  }, [agentId, rating, comment, jobId, writeContract, ERC8004_REP]);

  if (isSuccess && !submitted) {
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <Card className="border border-success/30 p-6">
        <div className="flex items-center gap-2 text-success">
          <CheckCircle2 className="w-5 h-5" />
          <p className="font-medium">Feedback Submitted!</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="border border-divider p-6">
      <h2 className="text-base font-semibold mb-4">Leave Feedback</h2>
      <p className="text-sm text-default-500 mb-4">
        Rate the provider's work on this job. Your feedback is recorded onchain.
      </p>
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium">Rating (0-1000)</label>
          <input
            type="range"
            min="0"
            max="1000"
            value={rating}
            onChange={e => setRating(e.target.value)}
            className="w-full mt-1"
          />
          <div className="flex justify-between text-xs text-default-400">
            <span>0 (Poor)</span>
            <span className="font-medium text-default-700">{rating}</span>
            <span>1000 (Excellent)</span>
          </div>
        </div>
        <div>
          <label className="text-sm font-medium">Comment</label>
          <textarea
            placeholder="How was the work?"
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={2}
            className="w-full mt-1 px-3 py-2 bg-content2 border border-divider rounded-lg focus:outline-none focus:ring-2 focus:ring-success resize-none"
          />
        </div>
        {error && (
          <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg text-danger text-sm">
            {error.message}
          </div>
        )}
        <button
          onClick={handleSubmit}
          disabled={isPending}
          className="w-full px-6 py-3 bg-gradient-to-r from-[#009F4D] to-[#00c853] text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? 'Submitting...' : 'Submit Feedback'}
        </button>
      </div>
    </Card>
  );
}

interface BiddingSectionForProviderProps {
  job: Job;
  address: `0x${string}`;
  refetch: () => void;
}

function BiddingSectionForProvider({ job, address, refetch }: BiddingSectionForProviderProps) {
  const { bid: userBid } = useUserBid(job.id, address);
  const { withdrawStake, isPending: isWithdrawPending } = useWithdrawStake();
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  const canWithdrawStake =
    userBid &&
    userBid.bidId > BigInt(0) &&
    userBid.revealed &&
    !userBid.accepted &&
    (job.status === JobStatus.Completed ||
      job.status === JobStatus.Rejected ||
      job.status === JobStatus.Expired);

  const handleWithdrawClick = () => {
    setShowWithdrawModal(true);
  };

  const handleWithdrawConfirm = () => {
    setShowWithdrawModal(false);
    withdrawStake(job.id);
  };

  return (
    <div className="space-y-4">
      {/* User's Bid Status */}
      {userBid && userBid.bidId > BigInt(0) && <BidStatusCard bid={userBid} />}

      {/* Withdraw Stake Button - for losing bidders */}
      {canWithdrawStake && (
        <>
          <button
            onClick={handleWithdrawClick}
            disabled={isWithdrawPending}
            className="w-full flex items-center gap-3 p-4 border border-warning/30 rounded-lg hover:bg-warning/5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className="w-5 h-5 text-warning" />
            <div className="text-left">
              <p className="font-medium">Withdraw Stake</p>
              <p className="text-xs text-default-500">
                Reclaim your staked funds (bid was not accepted)
              </p>
            </div>
            {isWithdrawPending && <Loader2 className="w-5 h-5 animate-spin text-warning ml-auto" />}
          </button>
          <ConfirmModal
            isOpen={showWithdrawModal}
            onConfirm={handleWithdrawConfirm}
            onCancel={() => setShowWithdrawModal(false)}
            title="Withdraw Stake"
            message="Withdraw your staked funds? This will forfeit your bid."
            confirmText="Withdraw"
            variant="warning"
            isPending={isWithdrawPending}
          />
        </>
      )}

      {/* Commit or Reveal Form */}
      {!userBid?.revealed ? (
        <CommitBidForm job={job} onSuccess={refetch} />
      ) : !userBid?.accepted ? (
        <>
          <RevealBidForm job={job} onSuccess={refetch} />
          {!canWithdrawStake && (
            <p className="text-sm text-default-500 text-center">
              Waiting for client to accept a bid...
            </p>
          )}
        </>
      ) : (
        <Card className="border border-success/30 p-6">
          <div className="flex items-center gap-2 text-success">
            <CheckCircle2 className="w-5 h-5" />
            <p className="font-medium">Your bid was accepted!</p>
          </div>
          <p className="text-sm text-default-500 mt-2">
            The client has accepted your bid. Check the Actions section to submit your deliverable.
          </p>
        </Card>
      )}
    </div>
  );
}
