'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useAccount,
  useWalletClient,
  useWaitForTransactionReceipt,
  useWriteContract,
  useBalance,
} from 'wagmi';
import { keccak256, toHex, formatUnits } from 'viem';
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
  useFinalizeRandomEvaluator,
  useCompleteAfterTimeout,
  useRefundExpired,
  JobStatus,
  isOpenJob,
} from '@/lib/hooks/useJobs';
import { useTokenPriceConversion } from '@/lib/hooks/useTokenConversion';
import { useWatchJob } from '@/lib/hooks/useJobEvents';
import { useService } from '@/lib/hooks/useServices';
import { useUSDCAllowance, useUSDCApprove, useUSDCBalance } from '@/lib/hooks/useUSDC';
import { useDispute, useFlagDispute, useJobMilestones, type Dispute, type Milestone } from '@/lib/hooks/useMilestoneEscrow';
import { useJobBids } from '@/lib/hooks/useJobBids';
import { CONTRACTS } from '@/lib/wagmi';
import { AGENTIC_COMMERCE_ABI } from '@/lib/contracts/abis';
import { SUPPORTED_TOKENS, type Token } from '@/components/PaymentTokenSelector';
import { getTokenByAddress } from '@/lib/tokenUtils';
import { createOwnerAuthHeaders } from '@/lib/client-auth';
import { showToast } from '@/lib/toast';

const AGENTIC_COMMERCE_ADDRESS = CONTRACTS[11155111].agenticCommerce as `0x${string}`;
const USDC_ADDRESS = CONTRACTS[11155111].usdc as `0x${string}`;
const DISPUTE_WINDOW_SECONDS = 7 * 24 * 60 * 60;

export interface LlmEvaluationResult {
  meetsRequirements: boolean;
  confidenceScore: number;
  analysis: string;
  checks: { passed: string[]; failed: string[] };
}

export interface UseJobLifecycleParams {
  jobId: bigint;
}

export interface UseJobLifecycleResult {
  // Identity
  address: `0x${string}` | undefined;
  isConnected: boolean;

  // Data
  job: ReturnType<typeof useJob>['job'];
  service: ReturnType<typeof useService>['service'];
  isLoading: boolean;
  refetch: () => void;
  bidCount: number | undefined;
  bids: ReturnType<typeof useJobBids>['bids'];
  isLoadingBids: boolean;

  // Token + balance
  jobPaymentToken: Token;
  isUSDC: boolean;
  budgetDecimals: number;
  formattedBudget: string;
  usdcBalance: number | undefined;
  usdcBalanceLoading: boolean;
  ethBalance: { value: bigint; decimals: number; symbol: string } | undefined;
  ethBalanceLoading: boolean;
  hasAllowance: boolean;
  needsApproval: boolean;

  // Roles
  isClient: boolean;
  isProvider: boolean;
  isEvaluator: boolean;
  isEvaluatorFeeEnabled: boolean;
  isOpen: boolean;

  // Lifecycle state
  isExpired: boolean;
  isPastDisputeWindow: boolean;
  isTerminal: boolean;
  hasActiveDispute: boolean;
  canFlagDispute: boolean;
  hasActions: boolean;

  // Dispute
  dispute: Dispute | undefined;
  milestones: Milestone[] | undefined;

  // Approval flow
  optimisticApprovalSent: boolean;
  setOptimisticApprovalSent: (v: boolean) => void;
  isApprovingAndFunding: boolean;
  setIsApprovingAndFunding: (v: boolean) => void;
  approvalTxHash: string | undefined;
  setApprovalTxHash: (v: string | undefined) => void;

  // TX
  txStep: string | null;
  currentError: unknown;

  // Pending flags
  isFundPending: boolean;
  isFundETHPending: boolean;
  isSubmitPending: boolean;
  isApproveByClientPending: boolean;
  isFinalizePending: boolean;
  isRejectPending: boolean;
  isRefundPending: boolean;
  isCompleteAfterTimeoutPending: boolean;
  isRefundExpiredPending: boolean;
  isFinalizeRandomPending: boolean;
  isFlagPending: boolean;
  isPaymentTokenPending: boolean;
  isApprovePending: boolean;
  isBudgetPending: boolean;
  finalizeRandomHash: `0x${string}` | undefined;
  finalizeRandomError: unknown;
  flagError: unknown;

  // Price
  formatUsdValue: (v: bigint, token: Token) => string;
  isPriceLoading: boolean;

  // Budget edit
  newBudget: string;
  setNewBudget: (v: string) => void;
  setBudget: ReturnType<typeof useSetBudget>['setBudget'];

  // Payment token modal
  showPaymentTokenModal: boolean;
  setShowPaymentTokenModal: (v: boolean) => void;
  selectedPaymentToken: Token;
  setSelectedPaymentToken: (v: Token) => void;

  // Handlers
  handleFundJob: () => void;
  handleSubmitDeliverable: (deliverableText: string) => void;
  handleFinalize: () => void;
  handleRejectWork: () => void;
  handleClaimRefund: () => void;
  handleCompleteAfterTimeout: () => void;
  handleRefundExpired: () => void;
  handlePaymentTokenSetup: () => void;
  handleClientApprove: () => void;
  handleFlagDispute: (milestoneIndex: number) => void;
  handleEvaluate: (params: { fulfillmentText: string; setFulfillmentText: (v: string) => void; setEvaluationResult: (r: LlmEvaluationResult | null) => void; setIsEvaluating: (v: boolean) => void; }) => Promise<void>;
  finalizeRandomEvaluator: () => void;
  setBudgetWithStep: () => void;
}

export function useJobLifecycle({ jobId }: UseJobLifecycleParams): UseJobLifecycleResult {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const queryClient = useQueryClient();

  const { job, isLoading, refetch } = useJob(jobId);
  const { service } = useService(job?.serviceId ?? BigInt(0));

  useWatchJob(jobId);

  const { allowance } = useUSDCAllowance(address, AGENTIC_COMMERCE_ADDRESS);
  const { formattedBalance: usdcBalance, isLoading: usdcBalanceLoading } = useUSDCBalance(address);
  const { data: ethBalance, isLoading: ethBalanceLoading } = useBalance({ address });
  const { approve, hash: approveHash, isPending: isApprovePending } = useUSDCApprove();

  const [optimisticApprovalSent, setOptimisticApprovalSent] = useState(false);
  const prevApproveHashRef = useRef<string | undefined>(undefined);
  const [isApprovingAndFunding, setIsApprovingAndFunding] = useState(false);
  const [approvalTxHash, setApprovalTxHash] = useState<string | undefined>();

  const { setPaymentToken, hash: paymentTokenHash, isPending: isPaymentTokenPending } = useSetPaymentToken();
  const [showPaymentTokenModal, setShowPaymentTokenModal] = useState(false);
  const [selectedPaymentToken, setSelectedPaymentToken] = useState<Token>(SUPPORTED_TOKENS[0]);
  const { formatUsdValue, isLoading: isPriceLoading } = useTokenPriceConversion();

  const [txStep, setTxStep] = useState<string | null>(null);

  const { dispute } = useDispute(jobId);
  const { milestones } = useJobMilestones(jobId);
  const { flagDispute, isPending: isFlagPending, writeError: flagError } = useFlagDispute();
  const { fundJob, hash: fundHash, isPending: isFundPending, error: fundError } = useFundJob();

  const { writeContract: writeFundETH, data: fundETHTxHash, isPending: isFundETHPending } = useWriteContract();
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
    [writeFundETH]
  );

  const { submitJob, hash: submitHash, isPending: isSubmitPending, error: submitError } = useSubmitJob();
  const { approveByClient, hash: approveByClientHash, isPending: isApproveByClientPending, error: approveByClientError } = useApproveByClient();
  const { finalizeByEvaluator, hash: finalizeHash, isPending: isFinalizePending, error: finalizeError } = useFinalizeByEvaluator();
  const { rejectJob, hash: rejectHash, isPending: isRejectPending, error: rejectError } = useRejectJob();
  const { claimRefund, hash: refundHash, isPending: isRefundPending, error: refundError } = useClaimRefund();
  const { setBudget, hash: budgetHash, isPending: isBudgetPending } = useSetBudget();
  const { completeAfterTimeout, isPending: isCompleteAfterTimeoutPending, error: completeAfterTimeoutError } = useCompleteAfterTimeout();
  const { refundExpired, isPending: isRefundExpiredPending, error: refundExpiredError } = useRefundExpired();
  const { finalizeRandomEvaluator, hash: finalizeRandomHash, isPending: isFinalizeRandomPending, error: finalizeRandomError } = useFinalizeRandomEvaluator();

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
    paymentTokenHash ||
    finalizeRandomHash;
  const { isSuccess: isTxConfirmed } = useWaitForTransactionReceipt({ hash: txHash });
  const { isSuccess: isApprovalConfirmed } = useWaitForTransactionReceipt({ hash: approvalTxHash as `0x${string}` });

  useEffect(() => {
    if (approveHash && approveHash !== prevApproveHashRef.current) {
      prevApproveHashRef.current = approveHash;
      setOptimisticApprovalSent(true);
      if (isApprovingAndFunding) {
        setApprovalTxHash(approveHash);
      }
    }
  }, [approveHash, isApprovingAndFunding]);

  useEffect(() => {
    if (isTxConfirmed && txStep === 'Approving USDC') {
      setTxStep(null);
      setOptimisticApprovalSent(false);
      queryClient.invalidateQueries({ queryKey: ['useReadContract', USDC_ADDRESS, 'allowance'] });
      void refetch();
    } else if (isTxConfirmed && txStep) {
      showToast.success(`${txStep} completed!`, 'Transaction confirmed.');
      setTxStep(null);
      void refetch();
    }
  }, [isTxConfirmed, txStep, refetch, queryClient]);

  const handleAction = useCallback((action: string, fn: () => void) => {
    setTxStep(action);
    fn();
  }, []);

  const jobPaymentToken = useMemo<Token>(
    () => (job ? getTokenByAddress(job.paymentToken) : SUPPORTED_TOKENS[0]),
    [job]
  );
  const isUSDC = jobPaymentToken.symbol === 'USDC';
  const budgetDecimals = isUSDC ? 6 : 18;
  const formattedBudget = useMemo(
    () => (job ? formatUnits(job.budget, budgetDecimals) : '0'),
    [job, budgetDecimals]
  );

  useEffect(() => {
    if (!job?.paymentToken) return;
    setSelectedPaymentToken(getTokenByAddress(job.paymentToken));
  }, [job?.paymentToken]);

  useEffect(() => {
    if (!job) return;
    if (isApprovalConfirmed && isApprovingAndFunding) {
      setIsApprovingAndFunding(false);
      setApprovalTxHash(undefined);
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
  const hasAllowance = (allowance && job && allowance >= job.budget) || optimisticApprovalSent;
  const needsApproval = !hasAllowance && job?.status === JobStatus.Open && isClient;
  const isExpired = !!job && Date.now() / 1000 > Number(job.expiredAt);
  const isPastDisputeWindow = !!job && Date.now() / 1000 > Number(job.expiredAt) + DISPUTE_WINDOW_SECONDS;

  const isTerminal = !!(
    job?.status === JobStatus.Completed ||
    job?.status === JobStatus.Rejected ||
    job?.status === JobStatus.Expired
  );
  const hasActiveDispute = !!dispute?.flagger && !dispute?.resolved;
  const canFlagDispute = (isClient || isProvider) && !dispute?.resolved && !isTerminal;
  const hasActions =
    isClient || isProvider || isEvaluator || hasActiveDispute || canFlagDispute || isTerminal;

  const currentError =
    fundError ||
    submitError ||
    approveByClientError ||
    finalizeError ||
    rejectError ||
    refundError ||
    completeAfterTimeoutError ||
    refundExpiredError ||
    finalizeRandomError;

  useEffect(() => {
    if (currentError) {
      showToast.error('Transaction failed', (currentError as { message?: string }).message || 'Please try again.');
    }
  }, [currentError]);

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
  }, [job, isUSDC, hasAllowance, approve, handleAction, fundJobWithETH, fundJob]);

  const handleSubmitDeliverable = useCallback(
    (deliverableText: string) => {
      if (!job) return;
      handleAction('Submitting deliverable', () => {
        const deliverableHash = deliverableText
          ? keccak256(toHex(deliverableText))
          : keccak256(toHex('deliverable-submitted'));
        submitJob(job.id, deliverableHash);
      });
    },
    [job, submitJob, handleAction]
  );

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

  const handleClientApprove = useCallback(() => {
    if (!job) return;
    handleAction('Approving delivery', () => approveByClient(job.id));
  }, [job, approveByClient, handleAction]);

  const handleFlagDispute = useCallback(
    (milestoneIndex: number) => {
      if (!job) return;
      handleAction('Flagging dispute', () => flagDispute(job.id, BigInt(milestoneIndex)));
    },
    [job, flagDispute, handleAction]
  );

  const handleEvaluate = useCallback(
    async (params: {
      fulfillmentText: string;
      setFulfillmentText: (v: string) => void;
      setEvaluationResult: (r: LlmEvaluationResult | null) => void;
      setIsEvaluating: (v: boolean) => void;
    }) => {
      if (!params.fulfillmentText || !job?.description || !address || !walletClient) return;
      params.setIsEvaluating(true);
      params.setEvaluationResult(null);
      try {
        const authHeaders = await createOwnerAuthHeaders(address, walletClient);
        const response = await fetch('/api/llm/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify({ jobDescription: job.description, fulfillmentText: params.fulfillmentText }),
        });
        const data = await response.json();
        if (data.success) {
          params.setEvaluationResult(data);
          params.setFulfillmentText('');
        }
      } catch (error) {
        console.error('Evaluation failed:', error);
      } finally {
        params.setIsEvaluating(false);
      }
    },
    [job?.description, address, walletClient]
  );

  const handleFinalizeRandom = useCallback(() => {
    if (!job) return;
    finalizeRandomEvaluator(job.id);
  }, [job, finalizeRandomEvaluator]);

  const setBudgetWithStep = useCallback(() => {
    if (!job) return;
    handleAction('Updating budget', () => setBudget(job.id, BigInt(newBudget || '0')));
  }, [job, newBudget, setBudget, handleAction]);

  return {
    address,
    isConnected: !!address,
    job,
    service,
    isLoading,
    refetch: () => void refetch(),
    bidCount,
    bids,
    isLoadingBids,
    jobPaymentToken,
    isUSDC,
    budgetDecimals,
    formattedBudget,
    usdcBalance,
    usdcBalanceLoading,
    ethBalance,
    ethBalanceLoading,
    hasAllowance: !!hasAllowance,
    needsApproval: !!needsApproval,
    isClient,
    isProvider,
    isEvaluator,
    isEvaluatorFeeEnabled,
    isOpen: jobIsOpen,
    isExpired,
    isPastDisputeWindow,
    isTerminal,
    hasActiveDispute,
    canFlagDispute,
    hasActions,
    dispute,
    milestones,
    optimisticApprovalSent,
    setOptimisticApprovalSent,
    isApprovingAndFunding,
    setIsApprovingAndFunding,
    approvalTxHash,
    setApprovalTxHash,
    txStep,
    currentError,
    isFundPending,
    isFundETHPending,
    isSubmitPending,
    isApproveByClientPending,
    isFinalizePending,
    isRejectPending,
    isRefundPending,
    isCompleteAfterTimeoutPending,
    isRefundExpiredPending,
    isFinalizeRandomPending,
    isFlagPending,
    isPaymentTokenPending,
    isApprovePending,
    isBudgetPending,
    finalizeRandomHash,
    finalizeRandomError,
    flagError,
    formatUsdValue,
    isPriceLoading,
    newBudget,
    setNewBudget,
    setBudget,
    showPaymentTokenModal,
    setShowPaymentTokenModal,
    selectedPaymentToken,
    setSelectedPaymentToken,
    handleFundJob,
    handleSubmitDeliverable,
    handleFinalize,
    handleRejectWork,
    handleClaimRefund,
    handleCompleteAfterTimeout,
    handleRefundExpired,
    handlePaymentTokenSetup,
    handleClientApprove,
    handleFlagDispute,
    handleEvaluate,
    finalizeRandomEvaluator: handleFinalizeRandom,
    setBudgetWithStep,
  };
}
