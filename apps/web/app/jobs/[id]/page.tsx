'use client';

import { use, useState, useCallback, useEffect } from 'react';
import { Settings } from 'lucide-react';
import { useAccount, useWaitForTransactionReceipt, useWriteContract, usePublicClient } from 'wagmi';
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
} from 'lucide-react';
import { Card } from '@heroui/react';
import { formatUnits, toHex, keccak256, toBytes } from 'viem';
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
  useJobBid,
  useUserBid,
  getJobStatusLabel,
  getJobStatusColor,
  JobStatus,
  isOpenJob,
  Job,
  Bid,
} from '@/lib/hooks/useJobs';
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

export default function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): JSX.Element {
  const { id } = use(params);
  const jobId = BigInt(id);
  const { address } = useAccount();

  const { job, isLoading, refetch } = useJob(jobId);
  const { service } = useService(job?.serviceId ?? BigInt(0));

  // USDC approval and balance hooks
  const AGENTIC_COMMERCE_ADDRESS = CONTRACTS[11155111].agenticCommerce as `0x${string}`;
  const USDC_ADDRESS = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' as `0x${string}`;
  const { allowance, isLoading: allowanceLoading } = useUSDCAllowance(
    address,
    AGENTIC_COMMERCE_ADDRESS
  );
  const { formattedBalance: usdcBalance, isLoading: balanceLoading } = useUSDCBalance(address);
  const { approve, hash: approveHash, isPending: isApprovePending } = useUSDCApprove();

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
    reset,
  } = useClaimRefund();

  const { setProvider, hash: providerHash, isPending: isProviderPending } = useSetProvider();

  const { setBudget, hash: budgetHash, isPending: isBudgetPending } = useSetBudget();

  // Bidding hooks for open jobs
  const { count: bidCount } = useJobBidCount(job?.id);

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

    void fetchBids();
  }, [publicClient, job?.id, bidCount, jobIsOpen]);

  const [newProvider, setNewProvider] = useState('');
  const [newBudget, setNewBudget] = useState('');

  const txHash =
    fundHash ||
    submitHash ||
    completeHash ||
    rejectHash ||
    refundHash ||
    approveHash ||
    providerHash ||
    budgetHash ||
    paymentTokenHash;
  const { isSuccess: isTxConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (isTxConfirmed && txStep) {
      setTxStep(null);
      void refetch();
    }
  }, [isTxConfirmed, txStep, refetch]);

  const handleAction = useCallback((action: string, fn: () => void) => {
    setTxStep(action);
    fn();
  }, []);

  const isClient = job && address && job.client.toLowerCase() === address.toLowerCase();
  const isProvider = job && address && job.provider.toLowerCase() === address.toLowerCase();
  const isEvaluator = job && address && job.evaluator.toLowerCase() === address.toLowerCase();

  // USDC approval check
  const hasAllowance = allowance && job && allowance >= job.budget;
  const needsApproval = !hasAllowance && job?.status === JobStatus.Open && isClient;
  const isExpired = job && Date.now() / 1000 > Number(job.expiredAt);

  const anyPending =
    isFundPending || isSubmitPending || isCompletePending || isRejectPending || isRefundPending;
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
              <p className="font-mono mt-0.5">
                {job.client.slice(0, 10)}...{job.client.slice(-4)}
              </p>
              {isClient && <span className="text-primary">(You)</span>}
            </div>
            <div>
              <p className="text-default-400 uppercase tracking-wide">Provider</p>
              <p className="font-mono mt-0.5">
                {job.provider.slice(0, 6)}...{job.provider.slice(-4)}
              </p>
              {isProvider && <span className="text-primary">(You)</span>}
            </div>
            <div>
              <p className="text-default-400 uppercase tracking-wide">Evaluator</p>
              <p className="font-mono mt-0.5">
                {job.evaluator.slice(0, 10)}...{job.evaluator.slice(-4)}
              </p>
              {isEvaluator && <span className="text-primary">(You)</span>}
            </div>
          </div>
        </Card>

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

        {currentError && (
          <div className="p-4 bg-danger-50 border border-danger-200 rounded-lg text-danger text-sm">
            Error: {currentError.message}
          </div>
        )}

        {/* USDC Balance Info */}
        {isClient && job.status === JobStatus.Open && (
          <Card className="border border-divider p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-default-600">Your USDC Balance</p>
                <p className="text-2xl font-bold text-success">
                  {balanceLoading ? (
                    <span className="animate-pulse">Loading...</span>
                  ) : (
                    `${usdcBalance || '0.00'} USDC`
                  )}
                </p>
              </div>
              {usdcBalance && job && Number(usdcBalance) < Number(formatUnits(job.budget, 6)) && (
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
                {!hasAllowance ? (
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
                ) : (
                  <button
                    onClick={() => {
                      // Check if payment token is set for direct jobs
                      if (
                        !job.paymentToken ||
                        job.paymentToken === '0x0000000000000000000000000000000000000000'
                      ) {
                        setShowPaymentTokenModal(true);
                      } else {
                        handleAction('Funding job', () => fundJob(job.id));
                      }
                    }}
                    disabled={anyPending || !!txStep || isPaymentTokenPending}
                    className="w-full flex items-center gap-3 p-4 border border-success/30 rounded-lg hover:bg-success/5 transition-colors disabled:opacity-50"
                  >
                    <DollarSign className="w-5 h-5 text-success" />
                    <div className="text-left">
                      <p className="font-medium">Fund Job</p>
                      <p className="text-xs text-default-500">
                        Deposit ${formattedBudget} USDC into escrow
                      </p>
                    </div>
                    {isPaymentTokenPending && (
                      <Loader2 className="w-5 h-5 animate-spin text-success ml-auto" />
                    )}
                  </button>
                )}

                {/* Change Payment Token - only for Open jobs with payment token already set */}
                {job.paymentToken &&
                  job.paymentToken !== '0x0000000000000000000000000000000000000000' && (
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
                      {isPaymentTokenPending && (
                        <Loader2 className="w-5 h-5 animate-spin text-default-500 ml-auto" />
                      )}
                    </button>
                  )}
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
                              <p className="font-mono text-sm">
                                {bid.bidder.slice(0, 6)}...{bid.bidder.slice(-4)}
                              </p>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
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

  return (
    <div className="space-y-4">
      {/* User's Bid Status */}
      {userBid && userBid.bidId > BigInt(0) && <BidStatusCard bid={userBid} />}

      {/* Commit or Reveal Form */}
      {!userBid?.revealed ? (
        <CommitBidForm job={job} onSuccess={refetch} />
      ) : !userBid?.accepted ? (
        <RevealBidForm job={job} onSuccess={refetch} />
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
