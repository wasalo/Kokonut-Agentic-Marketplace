'use client';

import { useState, useCallback, Suspense, useEffect } from 'react';
import { useAccount, useReadContract, useWaitForTransactionReceipt } from 'wagmi';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  AlertTriangle,
  Coins,
  Users,
} from 'lucide-react';
import NextLink from 'next/link';
import { Card, Switch } from '@heroui/react';
import { isAddress } from 'viem';
import { useService } from '@/lib/hooks/useServices';
import {
  useCreateJobFromService,
  useCreateJob,
  useCreateOpenJob,
  useJobConstants,
  useCalculateStake,
} from '@/lib/hooks/useJobs';
import { CONTRACT_ADDRESSES, getContractAddress } from '@/lib/contracts/config';
import { AGENTIC_COMMERCE_ABI } from '@/lib/contracts/abis';
import {
  useValidation,
  validateAddress,
  validateDeadline,
  validateStringLength,
} from '@/lib/hooks/useValidation';
import { TransactionError } from '@/components/TransactionError';
import { useFormSubmit, formatTimeRemaining } from '@/lib/hooks/useDebounce';
import { useClientJobCount, MAX_JOBS_PER_CLIENT } from '@/lib/hooks/useClientJobCount';
import {
  useTokenPriceConversion,
  USDC_TOKEN,
  ETH_TOKEN,
  SUPPORTED_PAYMENT_TOKENS,
  Token,
} from '@/lib/hooks/useTokenConversion';
import { showToast } from '@/lib/toast';

const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}`;

const MAX_DESCRIPTION_LENGTH = 1000;
const MIN_EXPIRY_DURATION = 5 * 60 * 1000;
const MIN_BUDGET_USDC = 0.01;

function PaymentTokenSelector({
  selectedToken,
  onSelect,
  disabled,
}: {
  selectedToken: Token;
  onSelect: (token: Token) => void;
  disabled?: boolean;
}) {
  const { ethToUsdcRate, isLoading: isRateLoading } = useTokenPriceConversion();

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Payment Token</label>
      <div className="grid grid-cols-2 gap-3">
        {SUPPORTED_PAYMENT_TOKENS.map(token => (
          <button
            key={token.symbol}
            type="button"
            onClick={() => onSelect(token)}
            disabled={disabled}
            className={`p-4 rounded-lg border-2 transition-all ${
              selectedToken.symbol === token.symbol
                ? 'border-success bg-success/5'
                : 'border-divider hover:border-default-300'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  token.symbol === 'USDC' ? 'bg-[#2775CA]' : 'bg-[#627EEA]'
                }`}
              >
                <Coins className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <p className="font-medium">{token.symbol}</p>
                <p className="text-xs text-default-500">{token.name}</p>
              </div>
            </div>
            {isRateLoading && token.symbol === 'ETH' && (
              <p className="text-xs text-default-400 mt-2">Loading rate...</p>
            )}
            {ethToUsdcRate && token.symbol === 'ETH' && (
              <p className="text-xs text-default-400 mt-2">1 ETH ≈ ${ethToUsdcRate.toFixed(2)}</p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function CreateJobContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const serviceIdParam = searchParams.get('serviceId');
  const providerParam = searchParams.get('provider');
  const { isConnected, address } = useAccount();

  const serviceId = serviceIdParam ? BigInt(serviceIdParam) : undefined;
  const { service, isLoading: isLoadingService } = useService(serviceId ?? BigInt(0));

  const { formatUsdValue } = useTokenPriceConversion();

  const {
    count: jobCount,
    isAtLimit,
    isNearLimit,
    percentageUsed,
    remainingJobs,
  } = useClientJobCount(address);

  const AGENTIC_COMMERCE_ADDRESS = getContractAddress(
    process.env.NEXT_PUBLIC_AGENTIC_COMMERCE_ADDRESS,
    CONTRACT_ADDRESSES.sepolia.agenticCommerce
  );

  const { data: platformFeeBp } = useReadContract({
    address: AGENTIC_COMMERCE_ADDRESS,
    abi: AGENTIC_COMMERCE_ABI,
    functionName: 'platformFeeBP',
  });

  const platformFeePercent = platformFeeBp ? Number(platformFeeBp) / 100 : 1;

  const [provider, setProvider] = useState('');
  const [evaluator, setEvaluator] = useState('');
  const [deadline, setDeadline] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [paymentToken, setPaymentToken] = useState<Token>(USDC_TOKEN);
  const [isOpenJob, setIsOpenJob] = useState(false);
  const [maxBudget, setMaxBudget] = useState('');

  useEffect(() => {
    if (providerParam) {
      setProvider(providerParam);
    } else if (service?.provider && !provider) {
      setProvider(service.provider);
    }
  }, [providerParam, service?.provider, provider]);

  const [providerError, setProviderError] = useState<string | null>(null);
  const [evaluatorError, setEvaluatorError] = useState<string | null>(null);
  const [deadlineError, setDeadlineError] = useState<string | null>(null);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [budgetError, setBudgetError] = useState<string | null>(null);
  const [maxBudgetError, setMaxBudgetError] = useState<string | null>(null);

  const effectiveEvaluator = evaluator || address || '0x0000000000000000000000000000000000000000';

  const {
    createJobFromService,
    hash: serviceHash,
    isPending: isServicePending,
    error: serviceError,
  } = useCreateJobFromService();

  const {
    createJob,
    hash: directHash,
    isPending: isDirectPending,
    error: directError,
  } = useCreateJob();

  const {
    createOpenJob,
    hash: openHash,
    isPending: isOpenPending,
    error: openError,
  } = useCreateOpenJob();

  const { revealWindow } = useJobConstants();
  const { stakeAmount } = useCalculateStake();

  const txHash = serviceHash || directHash || openHash;
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  useEffect(() => {
    if (isConfirmed && txHash) {
      showToast.success('Job Created!', 'Redirecting to your jobs...');
      router.push('/jobs');
    }
  }, [isConfirmed, txHash, router]);

  const validateProvider = useCallback(
    (value: string) => {
      if (!serviceId && value) {
        const error = validateAddress(value);
        setProviderError(error);
        return !error;
      }
      setProviderError(null);
      return true;
    },
    [serviceId]
  );

  const validateEvaluatorField = useCallback(
    (value: string) => {
      if (value && value !== address) {
        const error = validateAddress(value);
        setEvaluatorError(error);
        return !error;
      }
      setEvaluatorError(null);
      return true;
    },
    [address]
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
      if (!serviceId && !value && !isOpenJob) {
        setBudgetError('Budget is required for direct jobs');
        return false;
      }
      if (value && !isOpenJob) {
        const numValue = parseFloat(value);
        if (isNaN(numValue) || numValue < MIN_BUDGET_USDC) {
          setBudgetError(`Minimum budget is $${MIN_BUDGET_USDC} USDC`);
          return false;
        }
      }
      setBudgetError(null);
      return true;
    },
    [serviceId, isOpenJob]
  );

  const validateMaxBudgetField = useCallback(
    (value: string) => {
      if (isOpenJob && !value) {
        setMaxBudgetError('Maximum budget is required for open jobs');
        return false;
      }
      if (value && isOpenJob) {
        const numValue = parseFloat(value);
        if (isNaN(numValue) || numValue < MIN_BUDGET_USDC) {
          setMaxBudgetError(`Minimum max budget is $${MIN_BUDGET_USDC} USDC`);
          return false;
        }
        if (numValue > 1000000) {
          setMaxBudgetError('Maximum budget cannot exceed $1,000,000 USDC');
          return false;
        }
      }
      setMaxBudgetError(null);
      return true;
    },
    [isOpenJob]
  );

  const performSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!isConnected || !address) return;

      let isValid = true;

      if (!serviceId) {
        if (!provider) {
          setProviderError('Provider address is required');
          isValid = false;
        } else {
          isValid = validateProvider(provider) && isValid;
        }

        if (!validateBudgetField(budget)) {
          isValid = false;
        }
      }

      if (deadline) {
        isValid = validateDeadlineField(deadline) && isValid;
      }

      if (description) {
        isValid = validateDescriptionField(description) && isValid;
      }

      if (serviceId && service && Number(service.price) === 0) {
        setProviderError('Service has a price of 0. Cannot create job.');
        isValid = false;
      }

      if (!isValid) {
        return;
      }

      setProviderError(null);
      setEvaluatorError(null);
      setDeadlineError(null);
      setDescriptionError(null);
      setBudgetError(null);
      setMaxBudgetError(null);

      const deadlineTs = deadline
        ? BigInt(Math.floor(new Date(deadline).getTime() / 1000))
        : BigInt(Math.floor(Date.now() / 1000) + 86400 * 7);

      if (isOpenJob) {
        const maxBudgetUsdc = Math.floor(parseFloat(maxBudget) * 1e6);
        createOpenJob(
          BigInt(maxBudgetUsdc),
          effectiveEvaluator as `0x${string}`,
          deadlineTs,
          description || 'Open job - bid for this work',
          paymentToken.address
        );
      } else if (serviceId && service) {
        createJobFromService(
          serviceId,
          effectiveEvaluator as `0x${string}`,
          deadlineTs,
          description || `Job for ${service.name}`
        );
      } else {
        const budgetUsdc = Math.floor(parseFloat(budget) * 1e6);
        createJob(
          provider as `0x${string}`,
          effectiveEvaluator as `0x${string}`,
          deadlineTs,
          description || 'Direct job'
        );
      }
    },
    [
      isConnected,
      address,
      serviceId,
      service,
      deadline,
      description,
      effectiveEvaluator,
      provider,
      budget,
      maxBudget,
      isOpenJob,
      paymentToken,
      validateProvider,
      validateDeadlineField,
      validateDescriptionField,
      validateBudgetField,
      validateMaxBudgetField,
      createJobFromService,
      createJob,
      createOpenJob,
    ]
  );

  const { handleSubmit, isSubmitting, timeUntilNextSubmit } = useFormSubmit(performSubmit, 2000);

  const isLoading = isServicePending || isDirectPending || isOpenPending || isConfirming;
  const error = serviceError || directError || openError;

  const isFormValid =
    !providerError &&
    !evaluatorError &&
    !deadlineError &&
    !descriptionError &&
    !budgetError &&
    !maxBudgetError &&
    (!serviceId || isOpenJob
      ? !!maxBudget && parseFloat(maxBudget) >= MIN_BUDGET_USDC
      : !!budget && parseFloat(budget) >= MIN_BUDGET_USDC);

  const budgetInUsdc =
    budget && parseFloat(budget) > 0
      ? formatUsdValue(
          BigInt(Math.floor(parseFloat(budget) * 10 ** paymentToken.decimals)),
          paymentToken
        )
      : null;

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
          <Card className="border border-divider mb-6 p-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold">{service.name}</h3>
                <p className="text-sm text-default-500 mt-0.5">{service.description}</p>
                <p className="text-xs text-default-400 mt-1">
                  Provider: {service.provider.slice(0, 6)}...{service.provider.slice(-4)}
                </p>
                <p className="text-xs text-default-400 mt-1">
                  Job Budget:{' '}
                  <span className="text-success font-medium">
                    ${(Number(service.price) / 1e6).toFixed(2)} USDC
                  </span>
                  {Number(service.price) === 0 && (
                    <span className="text-danger ml-2">(Warning: Service price is 0)</span>
                  )}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-success">
                  ${(Number(service.price) / 1e6).toFixed(2)}
                </p>
                <p className="text-xs text-default-400">USDC</p>
              </div>
            </div>
          </Card>
        )}

        {address && (
          <Card
            className={`border mb-6 p-4 ${isAtLimit ? 'border-danger bg-danger-50' : isNearLimit ? 'border-warning bg-warning-50' : 'border-divider'}`}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle
                className={`w-5 h-5 flex-shrink-0 ${isAtLimit ? 'text-danger' : isNearLimit ? 'text-warning' : 'text-default-400'}`}
              />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <p
                    className={`text-sm font-medium ${isAtLimit ? 'text-danger' : isNearLimit ? 'text-warning' : 'text-foreground'}`}
                  >
                    Job Limit: {jobCount} / {MAX_JOBS_PER_CLIENT}
                  </p>
                  <span className="text-xs text-default-500">
                    {percentageUsed.toFixed(0)}% used
                  </span>
                </div>
                <div className="w-full h-2 bg-content2 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${isAtLimit ? 'bg-danger' : isNearLimit ? 'bg-warning' : 'bg-success'}`}
                    style={{ width: `${Math.min(100, percentageUsed)}%` }}
                  />
                </div>
                {isAtLimit && (
                  <p className="text-xs text-danger mt-2">
                    You have reached the maximum job limit. Complete or cancel existing jobs to
                    create new ones.
                  </p>
                )}
                {isNearLimit && !isAtLimit && (
                  <p className="text-xs text-warning-600 mt-2">
                    You are approaching the job limit. Only {remainingJobs} job
                    {remainingJobs !== 1 ? 's' : ''} remaining.
                  </p>
                )}
              </div>
            </div>
          </Card>
        )}

        <Card className="border border-divider p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {!serviceId && (
              <>
                <div className="flex items-start gap-4 p-4 bg-content2 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-primary" />
                      <span className="font-medium">Open Job (Bidding)</span>
                    </div>
                    <p className="text-sm text-default-500 mt-1">
                      Allow providers to bid on your job. You set a maximum budget and accept the
                      best bid.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpenJob(!isOpenJob);
                      if (isOpenJob) setMaxBudget('');
                      else setBudget('');
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      isOpenJob ? 'bg-success' : 'bg-default-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${
                        isOpenJob ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <PaymentTokenSelector
                  selectedToken={paymentToken}
                  onSelect={setPaymentToken}
                  disabled={isLoading}
                />
              </>
            )}

            <div className="space-y-2">
              <label htmlFor="evaluator" className="text-sm font-medium">
                Evaluator Address
              </label>
              <input
                id="evaluator"
                type="text"
                placeholder={address || '0x...'}
                value={evaluator}
                onChange={e => {
                  setEvaluator(e.target.value);
                  validateEvaluatorField(e.target.value);
                }}
                onBlur={() => validateEvaluatorField(evaluator)}
                className={`w-full px-3 py-2 bg-content2 border rounded-lg text-default-700 placeholder:text-default-400 focus:outline-none focus:ring-2 focus:ring-success focus:border-transparent ${
                  evaluatorError ? 'border-danger' : 'border-divider'
                }`}
              />
              {evaluatorError ? (
                <p className="text-xs text-danger">{evaluatorError}</p>
              ) : (
                <p className="text-xs text-default-400">
                  Who approves/rejects the work? Defaults to your address.
                </p>
              )}
            </div>

            {!serviceId && !isOpenJob && (
              <div className="space-y-2">
                <label htmlFor="provider" className="text-sm font-medium">
                  Provider Address <span className="text-danger">*</span>
                </label>
                <input
                  id="provider"
                  type="text"
                  placeholder="0x..."
                  value={provider}
                  onChange={e => {
                    setProvider(e.target.value);
                    validateProvider(e.target.value);
                  }}
                  onBlur={() => validateProvider(provider)}
                  required
                  className={`w-full px-3 py-2 bg-content2 border rounded-lg text-default-700 placeholder:text-default-400 focus:outline-none focus:ring-2 focus:ring-success focus:border-transparent ${
                    providerError ? 'border-danger' : 'border-divider'
                  }`}
                />
                {providerError && <p className="text-xs text-danger">{providerError}</p>}
              </div>
            )}

            {!serviceId && !isOpenJob && (
              <div className="space-y-2">
                <label htmlFor="budget" className="text-sm font-medium">
                  Budget ({paymentToken.symbol}) <span className="text-danger">*</span>
                </label>
                <div className="relative">
                  <input
                    id="budget"
                    type="number"
                    step={paymentToken.symbol === 'USDC' ? '0.01' : '0.001'}
                    min={MIN_BUDGET_USDC}
                    placeholder={`0.00`}
                    value={budget}
                    onChange={e => {
                      setBudget(e.target.value);
                      validateBudgetField(e.target.value);
                    }}
                    onBlur={() => validateBudgetField(budget)}
                    required
                    className={`w-full px-3 py-2 bg-content2 border rounded-lg text-default-700 placeholder:text-default-400 focus:outline-none focus:ring-2 focus:ring-success focus:border-transparent ${
                      budgetError ? 'border-danger' : 'border-divider'
                    }`}
                  />
                </div>
                {budgetError ? (
                  <p className="text-xs text-danger">{budgetError}</p>
                ) : budgetInUsdc ? (
                  <p className="text-xs text-default-400">≈ {budgetInUsdc} USD</p>
                ) : (
                  <p className="text-xs text-default-400">
                    Minimum ${MIN_BUDGET_USDC} USD equivalent
                  </p>
                )}
              </div>
            )}

            {!serviceId && isOpenJob && (
              <div className="space-y-2">
                <label htmlFor="maxBudget" className="text-sm font-medium">
                  Maximum Budget ({paymentToken.symbol}) <span className="text-danger">*</span>
                </label>
                <div className="relative">
                  <input
                    id="maxBudget"
                    type="number"
                    step={paymentToken.symbol === 'USDC' ? '0.01' : '0.001'}
                    min={MIN_BUDGET_USDC}
                    placeholder={`0.00`}
                    value={maxBudget}
                    onChange={e => {
                      setMaxBudget(e.target.value);
                      validateMaxBudgetField(e.target.value);
                    }}
                    onBlur={() => validateMaxBudgetField(maxBudget)}
                    required
                    className={`w-full px-3 py-2 bg-content2 border rounded-lg text-default-700 placeholder:text-default-400 focus:outline-none focus:ring-2 focus:ring-success focus:border-transparent ${
                      maxBudgetError ? 'border-danger' : 'border-divider'
                    }`}
                  />
                </div>
                {maxBudgetError ? (
                  <p className="text-xs text-danger">{maxBudgetError}</p>
                ) : maxBudget && parseFloat(maxBudget) > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs text-default-400">
                      ≈ ${parseFloat(maxBudget).toFixed(2)} USD max budget
                    </p>
                    <p className="text-xs text-primary">
                      Providers will stake 1% (${(parseFloat(maxBudget) * 0.01).toFixed(2)}) to bid.
                      Bid amount can be less than max.
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-default-400">
                    The maximum you're willing to pay. Providers bid lower.
                  </p>
                )}
              </div>
            )}

            {platformFeePercent > 0 && (
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <Coins className="w-4 h-4 text-primary" />
                  <span className="font-medium text-primary">
                    Platform Fee: {platformFeePercent}%
                  </span>
                </div>
                <p className="text-xs text-default-500 mt-1 ml-6">
                  {platformFeePercent > 0
                    ? `A ${platformFeePercent}% platform fee applies. Evaluator fee is additional 1%.`
                    : 'No platform fees applied.'}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="deadline" className="text-sm font-medium">
                Deadline
              </label>
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
              <label htmlFor="description" className="text-sm font-medium">
                Job Description
              </label>
              <textarea
                id="description"
                placeholder="Describe what you need..."
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
              <ShieldCheck className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium">
                  {isOpenJob ? 'Open Job Protection' : 'Escrow Protection'}
                </p>
                <p className="text-default-500 mt-0.5">
                  {isOpenJob
                    ? 'Providers stake 1% to bid. After deadline, you have 1 hour to review and accept bids. Funds held in escrow until work is approved.'
                    : "Funds are held by the smart contract until work is approved. If the provider doesn't deliver, you get a full refund after the deadline."}
                </p>
              </div>
            </div>

            <TransactionError error={error} />

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={!isConnected || isLoading || !isFormValid || isSubmitting || isAtLimit}
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#009F4D] to-[#00c853] text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {isConfirming ? 'Confirming...' : 'Creating...'}
                  </>
                ) : isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Wait {formatTimeRemaining(timeUntilNextSubmit)}...
                  </>
                ) : isAtLimit ? (
                  'Job Limit Reached'
                ) : isOpenJob ? (
                  'Create Open Job'
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

export default function CreateJobPage(): JSX.Element {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse h-48 bg-content2 rounded max-w-2xl mx-auto" />
        </div>
      }
    >
      <CreateJobContent />
    </Suspense>
  );
}
