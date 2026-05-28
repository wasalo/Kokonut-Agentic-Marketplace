'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAccount, useWaitForTransactionReceipt, usePublicClient, useWriteContract } from 'wagmi';
import { formatUnits } from 'viem';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2, ShieldCheck } from 'lucide-react';
import NextLink from 'next/link';
import { Card } from '@heroui/react';
import { useService } from '@/lib/hooks/useServices';
import { useCreateJobV8 } from '@/lib/hooks/useJobs';
import { useEnableMilestones } from '@/lib/hooks/useMilestoneEscrow';
import { CONTRACT_ADDRESSES, getContractAddress } from '@/lib/contracts/config';
import { validateAddress, validateDeadline, validateStringLength } from '@/lib/hooks/useValidation';
import { TransactionError } from '@/components/TransactionError';
import { useFormSubmit, formatTimeRemaining } from '@/lib/hooks/useDebounce';
import { useClientJobCount } from '@/lib/hooks/useClientJobCount';
import { useMaxBudgetUsd, useMinBudget } from '@/lib/hooks/useMinBudget';
import { USDC_TOKEN, Token } from '@/lib/hooks/useTokenConversion';
import { formatAmount, getTokenByAddress, parseAmount } from '@/lib/tokenUtils';
import { showToast } from '@/lib/toast';
import { AddressInput } from '@/components/AddressInput';
import { extractJobIdFromReceipt } from '@/lib/utils';
import { CreateJobServiceCard } from '@/components/jobs/create/CreateJobServiceCard';
import { CreateJobLimitWarning } from '@/components/jobs/create/CreateJobLimitWarning';
import { CreateJobMilestoneToggle } from '@/components/jobs/create/CreateJobMilestoneToggle';
import { CreateJobFeeDisplay } from '@/components/jobs/create/CreateJobFeeDisplay';
import { CreateJobBudgetSection } from '@/components/jobs/create/CreateJobBudgetSection';
import { JobPaymentTokenSelector } from '@/components/jobs/create/JobPaymentTokenSelector';
import { useUSDCApproval } from '@/lib/hooks/useUSDCApproval';

const MAX_DESCRIPTION_LENGTH = 1000;
const MIN_EXPIRY_DURATION = 5 * 60 * 1000;
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

function CreateJobContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const serviceIdParam = searchParams.get('serviceId');
  const providerParam = searchParams.get('provider');
  const { isConnected, address } = useAccount();

  const serviceId = serviceIdParam ? BigInt(serviceIdParam) : undefined;
  const { service } = useService(serviceId ?? BigInt(0));

  const {
    count: jobCount,
    isAtLimit,
    isNearLimit,
    percentageUsed,
    remainingJobs,
  } = useClientJobCount(address);

  const platformFeePercent = 1;

  const [provider, setProvider] = useState('');
  const [deadline, setDeadline] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [paymentToken, setPaymentToken] = useState<Token>(USDC_TOKEN);
  const [useMilestones, setUseMilestones] = useState(false);
  const [clientReview] = useState(true);
  const [fundJobNow, setFundJobNow] = useState(false);

  useMaxBudgetUsd();

  const { minBudgetRaw, isLoading: isMinBudgetLoading } = useMinBudget(
    paymentToken.address,
    paymentToken.decimals
  );
  const minBudgetInToken = minBudgetRaw
    ? Number(formatUnits(minBudgetRaw, paymentToken.decimals))
    : 0;

  useEffect(() => {
    if (providerParam) {
      setProvider(providerParam);
    } else if (service?.provider && !provider) {
      setProvider(service.provider);
    }
  }, [providerParam, service?.provider, provider]);

  useEffect(() => {
    if (serviceId && service?.paymentToken) {
      setPaymentToken(getTokenByAddress(service.paymentToken));
    }
  }, [serviceId, service?.paymentToken]);

  const [providerError, setProviderError] = useState<string | null>(null);
  const [deadlineError, setDeadlineError] = useState<string | null>(null);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [budgetError, setBudgetError] = useState<string | null>(null);

  const {
    createJob: createJobV8,
    hash: v8Hash,
    isPending: isV8Pending,
    error: v8Error,
  } = useCreateJobV8();

  const {
    enableMilestones,
    isSuccess: isEnableMilestonesSuccess,
    isPending: isEnableMilestonesPending,
  } = useEnableMilestones();

  const txHash = v8Hash;
  const {
    data: txReceipt,
    isLoading: isConfirming,
    isSuccess: isConfirmed,
  } = useWaitForTransactionReceipt({ hash: txHash });

  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [submitPhase, setSubmitPhase] = useState<'idle' | 'checking' | 'approving' | 'creating'>('idle');
  const AGENTIC_COMMERCE_PROXY: `0x${string}` = getContractAddress(
    process.env.NEXT_PUBLIC_AGENTIC_COMMERCE_ADDRESS,
    CONTRACT_ADDRESSES.sepolia.agenticCommerce
  );

  const [isEnablingMilestones, setIsEnablingMilestones] = useState(false);
  const [createdJobId, setCreatedJobId] = useState<bigint | null>(null);
  const [handledTxHash, setHandledTxHash] = useState<`0x${string}` | null>(null);
  const { ensureUSDCApproval } = useUSDCApproval({
    account: address,
    publicClient,
    spender: AGENTIC_COMMERCE_PROXY,
    writeContractAsync,
    setPhase: setSubmitPhase,
  });

  useEffect(() => {
    if (!isConfirmed || !txHash || !txReceipt || handledTxHash === txHash || isEnablingMilestones) {
      return;
    }

    const newJobId = extractJobIdFromReceipt(txReceipt);
    setHandledTxHash(txHash);
    setSubmitPhase('idle');

    if (!newJobId) {
      showToast.warning('Job created', 'Could not read the job id from the receipt. Opening jobs.');
      router.push('/marketplace?tab=jobs');
      return;
    }

    const effectiveProvider = service?.provider ?? provider;
    const effectiveToken = service?.paymentToken ?? paymentToken.address;
    const effectiveBudget = service?.price ?? parseAmount(budget || '0', paymentToken);

    setCreatedJobId(newJobId);
    showToast.success('Job Created!', 'Opening the new job…');

    if (useMilestones && address && effectiveProvider) {
      setIsEnablingMilestones(true);
      enableMilestones(
        newJobId,
        address,
        effectiveProvider as `0x${string}`,
        effectiveToken as `0x${string}`,
        effectiveBudget
      );
    } else {
      router.push(`/jobs/${newJobId.toString()}`);
    }
  }, [
    isConfirmed, txHash, txReceipt, handledTxHash, isEnablingMilestones,
    service, provider, paymentToken, budget, useMilestones, address, enableMilestones, router,
  ]);

  useEffect(() => {
    if (isEnableMilestonesSuccess && isEnablingMilestones && createdJobId) {
      setIsEnablingMilestones(false);
      showToast.success('Milestones Enabled!', 'Redirecting to job detail…');
      router.push(`/jobs/${createdJobId.toString()}`);
    }
  }, [isEnableMilestonesSuccess, isEnablingMilestones, createdJobId, router]);

  const validateProvider = useCallback(
    (value: string) => {
      if (!serviceId && !value) {
        setProviderError('Provider address is required');
        return false;
      }
      if (value) {
        const error = validateAddress(value);
        setProviderError(error);
        return !error;
      }
      setProviderError(null);
      return true;
    },
    [serviceId]
  );

  const validateDeadlineField = useCallback((value: string) => {
    if (value) {
      const error = validateDeadline(value, MIN_EXPIRY_DURATION);
      setDeadlineError(error);
      return !error;
    }
    setDeadlineError(null);
    return true;
  }, []);

  const validateDescriptionField = useCallback((value: string) => {
    const error = validateStringLength(value, 1, MAX_DESCRIPTION_LENGTH, 'Description');
    setDescriptionError(error);
    return !error;
  }, []);

  const validateBudgetField = useCallback(
    (value: string) => {
      if (!serviceId && !value) {
        setBudgetError('Budget is required');
        return false;
      }
      if (value) {
        if (!minBudgetRaw) {
          setBudgetError('Minimum budget is still loading');
          return false;
        }
        const numValue = parseFloat(value);
        if (isNaN(numValue) || numValue < minBudgetInToken) {
          setBudgetError(`Minimum budget is ${formatAmount(minBudgetRaw, paymentToken, { includeSymbol: true })}`);
          return false;
        }
      }
      setBudgetError(null);
      return true;
    },
    [serviceId, minBudgetInToken, minBudgetRaw, paymentToken]
  );

  const performSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!isConnected || !address) return;

      let isValid = true;

      setProviderError(null);
      setDeadlineError(null);
      setDescriptionError(null);
      setBudgetError(null);

      if (serviceId && service) {
        if (!description) {
          setDescriptionError('Description is required');
          isValid = false;
        }
        if (service.price === 0n) {
          setProviderError('Service has price of 0');
          isValid = false;
        }
      } else {
        if (!provider || !provider.startsWith('0x')) {
          setProviderError('Provider address is required');
          isValid = false;
        }
        if (!validateBudgetField(budget)) isValid = false;
        if (!description) {
          setDescriptionError('Description is required');
          isValid = false;
        }
      }

      if (deadline && !validateDeadlineField(deadline)) isValid = false;

      if (!isValid) return;

      const deadlineTs = deadline
        ? BigInt(Math.floor(new Date(deadline).getTime() / 1000))
        : BigInt(Math.floor(Date.now() / 1000) + 86400 * 7);

      if (serviceId && service) {
        const serviceProvider = service.provider as `0x${string}`;
        createJobV8(
          serviceProvider, service.price, service.paymentToken as `0x${string}`,
          serviceId, deadlineTs, description || `Job for ${service.name}`,
          ZERO_ADDRESS, ZERO_ADDRESS, true, clientReview, false, 0n
        );
      } else {
        const budgetAmount = parseAmount(budget || '0', paymentToken);
        const paymentTokenAddr = paymentToken.address as `0x${string}`;

        const fundAmount = fundJobNow && paymentToken.symbol === 'ETH' ? budgetAmount : 0n;

        if (fundJobNow && paymentToken.symbol === 'USDC') {
          const isApproved = await ensureUSDCApproval(budgetAmount, budget);
          if (!isApproved) return;
        }

        setSubmitPhase('creating');
        createJobV8(
          provider as `0x${string}`, budgetAmount, paymentTokenAddr, 0n,
          deadlineTs, description || 'Direct job', ZERO_ADDRESS, ZERO_ADDRESS,
          true, clientReview, fundJobNow, fundAmount
        );
      }
    },
    [
      isConnected, address, serviceId, service, deadline, description, provider, budget,
      paymentToken, validateDeadlineField, validateBudgetField, createJobV8, clientReview,
      fundJobNow, ensureUSDCApproval,
    ]
  );

  const { handleSubmit, isSubmitting, timeUntilNextSubmit } = useFormSubmit(performSubmit, 2000);

  const isFormLoading = isV8Pending || isConfirming || submitPhase !== 'idle' || isEnableMilestonesPending || isEnablingMilestones;
  const error = v8Error;

  useEffect(() => {
    if (error && submitPhase !== 'idle') setSubmitPhase('idle');
  }, [error, submitPhase]);

  let isFormValid = false;
  if (serviceId) {
    isFormValid = !!provider && provider.startsWith('0x') && !!description && !!service && service.price > 0n;
  } else {
    isFormValid = !!provider && provider.startsWith('0x') && !!budget && !!minBudgetRaw && parseFloat(budget || '0') >= minBudgetInToken * 0.999 && !!description;
  }

  const handleBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBudget(e.target.value);
    validateBudgetField(e.target.value);
  };

  const serviceToken = service ? getTokenByAddress(service.paymentToken) : USDC_TOKEN;
  const formattedServicePrice = service
    ? formatAmount(service.price, serviceToken, {
        includeSymbol: true,
        minFractionDigits: serviceToken.symbol === 'USDC' ? 2 : 0,
        maxFractionDigits: serviceToken.symbol === 'USDC' ? 2 : 6,
      })
    : '';

  return (
    <div className="container mx-auto px-4 py-8">
      <NextLink
        href={serviceId ? `/marketplace/${serviceId}` : '/jobs'}
        className="inline-flex items-center text-sm text-default-500 hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        {serviceId ? 'Back to Service' : 'Back to Jobs'}
      </NextLink>

      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">{serviceId ? 'Purchase Service' : 'Create Job'}</h1>
        <p className="text-default-500 mb-8">
          {serviceId
            ? 'Create an escrow job for this service. Payment will be held until work is approved.'
            : 'Create a direct job or open job for bidding.'}
        </p>

        {service && (
          <CreateJobServiceCard
            service={service}
            serviceToken={serviceToken}
            formattedServicePrice={formattedServicePrice}
          />
        )}

        {address && (
          <CreateJobLimitWarning
            jobCount={jobCount}
            isAtLimit={isAtLimit}
            isNearLimit={isNearLimit}
            percentageUsed={percentageUsed}
            remainingJobs={remainingJobs}
          />
        )}

        <Card className="border border-divider p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {!serviceId && (
              <>
                <CreateJobMilestoneToggle
                  useMilestones={useMilestones}
                  onToggle={setUseMilestones}
                />
                <JobPaymentTokenSelector
                  selectedToken={paymentToken}
                  onSelect={setPaymentToken}
                  disabled={isFormLoading}
                />
              </>
            )}

            {!serviceId && (
              <div className="space-y-2">
                <label htmlFor="provider" className="text-sm font-medium">
                  Provider Address <span className="text-danger">*</span>
                </label>
                <AddressInput
                  value={provider}
                  onChange={e => {
                    setProvider(e);
                    validateProvider(e);
                  }}
                  onBlur={() => validateProvider(provider)}
                  placeholder="0x…"
                  error={providerError}
                  showValidation={true}
                  resolveEns={true}
                />
                {providerError && <p className="text-xs text-danger">{providerError}</p>}
              </div>
            )}

            {(platformFeePercent > 0 || !serviceId) && (
              <CreateJobFeeDisplay
                platformFeePercent={platformFeePercent}
                showEvaluatorFee={!serviceId}
              />
            )}

            {serviceId ? (
              <div className="flex justify-between items-center bg-content2 p-4 rounded-xl border border-divider">
                <span className="font-medium text-default-700">Predefined Service Price</span>
                <span className="text-xl font-bold text-[#009F4D]">
                  {service ? formattedServicePrice : 'Loading…'}
                </span>
              </div>
            ) : (
              <CreateJobBudgetSection
                budget={budget}
                paymentToken={paymentToken}
                minBudgetRaw={minBudgetRaw}
                minBudgetInToken={minBudgetInToken}
                isMinBudgetLoading={isMinBudgetLoading}
                budgetError={budgetError}
                useMilestones={useMilestones}
                fundJobNow={fundJobNow}
                serviceId={serviceId}
                onBudgetChange={handleBudgetChange}
                onFundJobNowChange={setFundJobNow}
              />
            )}

            <div className="space-y-2">
              <label htmlFor="deadline" className="text-sm font-medium">Deadline</label>
              <input
                id="deadline"
                type="datetime-local"
                value={deadline}
                onChange={e => {
                  setDeadline(e.target.value);
                  validateDeadlineField(e.target.value);
                }}
                onBlur={() => validateDeadlineField(deadline)}
                min={new Date(Date.now() + MIN_EXPIRY_DURATION).toISOString().slice(0, 16)}
                className={`w-full px-3 py-2 bg-content2 border rounded-lg text-default-700 focus:outline-none focus:ring-2 focus:ring-success focus:border-transparent ${
                  deadlineError ? 'border-danger' : 'border-divider'
                }`}
              />
              {deadlineError ? (
                <p className="text-xs text-danger">{deadlineError}</p>
              ) : (
                <p className="text-xs text-default-400">
                  Must be at least 5 minutes in the future. Defaults to 7 days.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">Job Description</label>
              <textarea
                id="description"
                placeholder="Describe what you need…"
                value={description}
                onChange={e => {
                  setDescription(e.target.value);
                  validateDescriptionField(e.target.value);
                }}
                onBlur={() => validateDescriptionField(description)}
                rows={3}
                maxLength={MAX_DESCRIPTION_LENGTH}
                className={`w-full px-3 py-2 bg-content2 border rounded-lg text-default-700 placeholder:text-default-400 focus:outline-none focus:ring-2 focus:ring-success focus:border-transparent resize-none ${
                  descriptionError ? 'border-danger' : 'border-divider'
                }`}
              />
              <div className="flex justify-between">
                {descriptionError ? (
                  <p className="text-xs text-danger">{descriptionError}</p>
                ) : (
                  <p className="text-xs text-default-400">Describe what work is expected.</p>
                )}
                <p className="text-xs text-default-400">
                  {description.length}/{MAX_DESCRIPTION_LENGTH}
                </p>
              </div>
            </div>

            <div className="p-4 bg-content2 rounded-lg flex items-start gap-3">
              <ShieldCheck className="size-5 text-primary mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium">Escrow Protection</p>
                <p className="text-default-500 mt-0.5">
                  Funds are held by the smart contract until work is approved. If the provider
                  doesn&apos;t deliver, you get a full refund after the deadline.
                </p>
              </div>
            </div>

            <TransactionError error={error} />

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={!isConnected || isFormLoading || !isFormValid || isSubmitting || isAtLimit}
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 border-2 border-[#009F4D] text-[#009F4D] rounded-lg font-semibold hover:bg-primary/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitPhase === 'checking' ? (
                  <><Loader2 className="size-4 animate-spin" />Checking USDC allowance...</>
                ) : submitPhase === 'approving' ? (
                  <><Loader2 className="size-4 animate-spin" />Approving USDC...</>
                ) : submitPhase === 'creating' ? (
                  <><Loader2 className="size-4 animate-spin" />Creating Job...</>
                ) : isEnableMilestonesPending || isEnablingMilestones ? (
                  <><Loader2 className="size-4 animate-spin" />Enabling Milestones...</>
                ) : isConfirming ? (
                  <><Loader2 className="size-4 animate-spin" />Confirming...</>
                ) : isSubmitting ? (
                  <><Loader2 className="size-4 animate-spin" />Wait {formatTimeRemaining(timeUntilNextSubmit)}...</>
                ) : isAtLimit ? (
                  'Job Limit Reached'
                ) : serviceId ? (
                  'Purchase Service'
                ) : (
                  'Create Job'
                )}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-3 border border-divider rounded-lg hover:bg-content2 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

export default CreateJobContent;
