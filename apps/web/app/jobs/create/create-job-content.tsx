'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAccount, useWaitForTransactionReceipt, usePublicClient, useWriteContract } from 'wagmi';
import { erc20Abi, formatUnits } from 'viem';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2, ShieldCheck, AlertTriangle, Coins, AlertCircle } from 'lucide-react';
import NextLink from 'next/link';
import { Card } from '@heroui/react';
import { useService } from '@/lib/hooks/useServices';
import { useCreateJobV8, useJobCount, useSetBudget } from '@/lib/hooks/useJobs';
import { useEnableMilestones } from '@/lib/hooks/useMilestoneEscrow';
import { CONTRACT_ADDRESSES, getContractAddress } from '@/lib/contracts/config';

import { validateAddress, validateDeadline, validateStringLength } from '@/lib/hooks/useValidation';
import { TransactionError } from '@/components/TransactionError';
import { useFormSubmit, formatTimeRemaining } from '@/lib/hooks/useDebounce';
import { useClientJobCount, MAX_JOBS_PER_CLIENT } from '@/lib/hooks/useClientJobCount';
import { useMaxBudgetUsd } from '@/lib/hooks/useMinBudget';
import {
  useTokenPriceConversion,
  USDC_TOKEN,
  SUPPORTED_PAYMENT_TOKENS,
  Token,
} from '@/lib/hooks/useTokenConversion';
import { showToast } from '@/lib/toast';
import { Address } from '@/components/Address';
import { AddressInput } from '@/components/AddressInput';

const MAX_DESCRIPTION_LENGTH = 1000;
const MIN_EXPIRY_DURATION = 5 * 60 * 1000;

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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
  const { service } = useService(serviceId ?? BigInt(0));

  useTokenPriceConversion();

  const {
    count: jobCount,
    isAtLimit,
    isNearLimit,
    percentageUsed,
    remainingJobs,
  } = useClientJobCount(address);

  // V9 has hardcoded 1% platform fee (100 basis points)
  const platformFeePercent = 1;

  const [provider, setProvider] = useState('');
  const [deadline, setDeadline] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [paymentToken, setPaymentToken] = useState<Token>(USDC_TOKEN);
  const [useMilestones, setUseMilestones] = useState(false);
  const [clientReview] = useState(true);
  const [fundJobNow, setFundJobNow] = useState(false);

  // maxBudgetUsd is enforced on-chain by AgenticCommerceV9 — no frontend guard needed
  useMaxBudgetUsd();

  // Static per-token minimum budgets (replaces dynamic contract call for better UX)
  const MIN_BUDGETS: Record<string, { min: number; label: string }> = {
    USDC: { min: 5, label: '5 USDC' },
    ETH: { min: 0.0025, label: '0.0025 ETH' },
  };
  const minBudgetInToken = MIN_BUDGETS[paymentToken.symbol]?.min ?? 5;

  useEffect(() => {
    if (providerParam) {
      setProvider(providerParam);
    } else if (service?.provider && !provider) {
      setProvider(service.provider);
    }
  }, [providerParam, service?.provider, provider]);

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

  const { setBudget: setJobBudget } = useSetBudget();
  const jobCounter = useJobCount();

  const {
    enableMilestones,
    isSuccess: isEnableMilestonesSuccess,
    isPending: isEnableMilestonesPending,
  } = useEnableMilestones();

  const txHash = v8Hash;
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Lazy on-demand approval: hooks for direct contract interaction
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [submitPhase, setSubmitPhase] = useState<'idle' | 'checking' | 'approving' | 'creating'>('idle');
  const AGENTIC_COMMERCE_PROXY: `0x${string}` = getContractAddress(
    process.env.NEXT_PUBLIC_AGENTIC_COMMERCE_ADDRESS,
    CONTRACT_ADDRESSES.sepolia.agenticCommerce
  );

  const [isEnablingMilestones, setIsEnablingMilestones] = useState(false);

  // After createJob confirms, set budget then optionally enable milestones
  useEffect(() => {
    let active = true;
    if (isConfirmed && txHash && jobCounter && !isEnablingMilestones) {
      const handleConfirm = async () => {
        const { data: refetchedCount } = await jobCounter.refetch();
        if (!active) return;
        const currentCount = refetchedCount ? Number(refetchedCount) : jobCounter.count;
        const newJobId = BigInt(currentCount); // 1-indexed
        const budgetAmount = BigInt(Math.floor(parseFloat(budget || '0') * Math.pow(10, paymentToken.decimals)));
        
        if (!fundJobNow && budget) {
          setJobBudget(newJobId, budgetAmount);
        }
        setSubmitPhase('idle');
        showToast.success('Job Created!', '');

        if (useMilestones) {
          setIsEnablingMilestones(true);
          enableMilestones(
            newJobId,
            address!,
            provider as `0x${string}`,
            paymentToken.address as `0x${string}`,
            budgetAmount
          );
        } else {
          router.push('/jobs');
        }
      };
      
      handleConfirm();
    }
    return () => {
      active = false;
    };
  }, [isConfirmed, txHash, jobCounter, useMilestones, address, provider, paymentToken, budget, setJobBudget, fundJobNow, router, isEnablingMilestones, enableMilestones]);

  // Redirect after milestones are successfully enabled
  useEffect(() => {
    if (isEnableMilestonesSuccess && isEnablingMilestones && jobCounter) {
      const newJobId = BigInt(jobCounter.count); // 1-indexed
      setIsEnablingMilestones(false);
      showToast.success('Milestones Enabled!', 'Redirecting to job detail...');
      router.push(`/jobs/${newJobId.toString()}`);
    }
  }, [isEnableMilestonesSuccess, isEnablingMilestones, jobCounter, router]);

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
        const numValue = parseFloat(value);
        if (isNaN(numValue) || numValue < minBudgetInToken) {
          setBudgetError(`Minimum budget is ${minBudgetInToken.toFixed(paymentToken.decimals === 6 ? 0 : 4)} ${paymentToken.symbol}`);
          return false;
        }
      }
      setBudgetError(null);
      return true;
    },
    [serviceId, paymentToken, minBudgetInToken]
  );

  const performSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!isConnected || !address) {
        return;
      }

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
        if (Number(service.price) === 0) {
          setProviderError('Service has price of 0');
          isValid = false;
        }
      } else {
        if (!provider || !provider.startsWith('0x')) {
          setProviderError('Provider address is required');
          isValid = false;
        }
        if (!validateBudgetField(budget)) {
          isValid = false;
        }
        if (!description) {
          setDescriptionError('Description is required');
          isValid = false;
        }
      }

      if (deadline && !validateDeadlineField(deadline)) {
        isValid = false;
      }

      if (!isValid) {
        return;
      }

      const deadlineTs = deadline
        ? BigInt(Math.floor(new Date(deadline).getTime() / 1000))
        : BigInt(Math.floor(Date.now() / 1000) + 86400 * 7);

      if (serviceId && service) {
        const serviceProvider = (service as any).provider as `0x${string}`;
        createJobV8(
          serviceProvider,
          0n,
          paymentToken.address as `0x${string}`,
          serviceId,
          deadlineTs,
          description || `Job for ${service.name}`,
          '0x0000000000000000000000000000000000000000',
          '0x0000000000000000000000000000000000000000',
          true,
          clientReview,
          false,
          0n
        );
      } else {
        const budgetRaw = parseFloat(budget || '0');
        const budgetAmount = BigInt(
          Math.floor(budgetRaw * Math.pow(10, paymentToken.decimals))
        );
        const paymentTokenAddr = paymentToken.address as `0x${string}`;
        
        const fundAmount = fundJobNow && paymentToken.symbol === 'ETH'
          ? budgetAmount
          : 0n;

        if (fundJobNow && paymentToken.symbol === 'USDC') {
          try {
            setSubmitPhase('checking');
            const balance = await publicClient!.readContract({
              address: USDC_TOKEN.address,
              abi: erc20Abi,
              functionName: 'balanceOf',
              args: [address!],
            });
            if (balance < budgetAmount) {
              const formattedBalance = formatUnits(balance, 6);
              showToast.error('Insufficient USDC balance',
                `You need ${budget} USDC but only have ${formattedBalance} USDC`);
              setSubmitPhase('idle');
              return;
            }
            
            const allowance = await publicClient!.readContract({
              address: USDC_TOKEN.address,
              abi: erc20Abi,
              functionName: 'allowance',
              args: [address!, AGENTIC_COMMERCE_PROXY],
            });

            if (allowance < budgetAmount) {
              setSubmitPhase('approving');
              showToast.info('USDC approval needed', `Approving exact amount: ${budget} USDC`);
              
              const approveHash = await writeContractAsync({
                address: USDC_TOKEN.address,
                abi: erc20Abi,
                functionName: 'approve',
                args: [AGENTIC_COMMERCE_PROXY, budgetAmount],
              });

              showToast.info('Approval submitted', 'Waiting for confirmation...');
              
              let confirmed = false;
              let attempts = 0;
              const maxAttempts = 60;
              
              while (!confirmed && attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                try {
                  const receipt = await publicClient!.getTransactionReceipt({ hash: approveHash });
                  if (receipt && receipt.status === 'success') {
                    confirmed = true;
                    showToast.success('USDC approved', 'You can now create the job');
                  }
                } catch {}
                attempts++;
              }

              if (!confirmed) {
                showToast.error('Approval timeout', 'Please check your wallet and try again');
                setSubmitPhase('idle');
                return;
              }
            }
          } catch (err: any) {
            console.error('[CreateJob] Allowance/approval error:', err);
            showToast.error('Approval failed', err.message || 'Please try again');
            setSubmitPhase('idle');
            return;
          }
        }

        setSubmitPhase('creating');
        createJobV8(
          provider as `0x${string}`,
          budgetAmount,
          paymentTokenAddr,
          0n,
          deadlineTs,
          description || 'Direct job',
          '0x0000000000000000000000000000000000000000',
          '0x0000000000000000000000000000000000000000',
          true,
          clientReview,
          fundJobNow,
          fundAmount
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
      provider,
      budget,
      paymentToken,
      validateDeadlineField,
      validateBudgetField,
      createJobV8,
      clientReview,
      fundJobNow,
      publicClient,
      writeContractAsync,
      AGENTIC_COMMERCE_PROXY,
    ]
  );

const { handleSubmit, isSubmitting, timeUntilNextSubmit } = useFormSubmit(performSubmit, 2000);

const isFormLoading = isV8Pending || isConfirming || submitPhase !== 'idle' || isEnableMilestonesPending || isEnablingMilestones;
const error = v8Error;

useEffect(() => {
  if (error && submitPhase !== 'idle') {
    setSubmitPhase('idle');
  }
}, [error, submitPhase]);

let isFormValid = false;
if (serviceId) {
  isFormValid = !!provider && provider.startsWith('0x') && !!description;
} else {
  isFormValid = !!provider && provider.startsWith('0x') && !!budget && parseFloat(budget || '0') >= minBudgetInToken * 0.999 && !!description;
}

const renderBudgetWarning = () => {
  if (serviceId) return null;
  return budget && parseFloat(budget || '0') > 0 && parseFloat(budget || '0') < minBudgetInToken ? (
    <p className="text-danger text-sm mt-2 flex items-center">
      <AlertCircle className="w-4 h-4 mr-1" />
      Minimum budget is {minBudgetInToken.toFixed(2)} {paymentToken.symbol}
    </p>
  ) : null;
};

const handleBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setBudget(e.target.value);
  validateBudgetField(e.target.value);
};

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
                  Provider: <Address address={service.provider} truncate />
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
                <div className="flex items-start gap-4 p-4 bg-primary/5 border border-[#009F4D]/20 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Coins className="w-5 h-5 text-[#009F4D]" />
                      <span className="font-medium">Milestone-Based Payment</span>
                    </div>
                    <p className="text-sm text-default-500 mt-1">
                      Release funds in phases. Client funds full budget upfront, you receive payments as each milestone is completed.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUseMilestones(!useMilestones)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      useMilestones ? 'bg-primary' : 'bg-default-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${
                        useMilestones ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <PaymentTokenSelector
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
                  placeholder="0x..."
                  error={providerError}
                  showValidation={true}
                  resolveEns={true}
                />
                {providerError && <p className="text-xs text-danger">{providerError}</p>}
              </div>
            )}

            {(platformFeePercent > 0 || !serviceId) && (
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-primary" />
                  <span className="font-medium">Fees</span>
                </div>
                <div className="mt-2 space-y-1">
                  {!serviceId && (
                    <p className="text-sm text-default-500">
                      <ShieldCheck className="w-4 h-4 inline mr-1" />
                      Evaluator fee: 1% (included automatically)
                    </p>
                  )}
                  {platformFeePercent > 0 && (
                    <p className="text-sm text-default-500">
                      <Coins className="w-4 h-4 inline mr-1" />
                      Platform fee: {platformFeePercent}%
                    </p>
                  )}
                </div>
              </div>
            )}

            {serviceId ? (
              <div className="flex justify-between items-center bg-content2 p-4 rounded-xl border border-divider">
                <span className="font-medium text-default-700">Predefined Service Price</span>
                <span className="text-xl font-bold text-[#009F4D]">
                  {(Number(service?.price || 0) / 1e6).toFixed(2)} USDC
                </span>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Budget ({paymentToken.symbol})
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-4 text-default-400 font-medium">$</span>
                  <input
                    id="budget"
                    type="number"
                    step="0.01"
                    min={minBudgetInToken}
                    value={budget}
                    onChange={handleBudgetChange}
                    placeholder={`Min ${minBudgetInToken.toFixed(2)}`}
                    className="w-full bg-content2 border border-divider rounded-xl py-3 pl-8 pr-4 text-default-900 focus:outline-none focus:ring-2 focus:ring-[#009F4D] transition-all"
                    required
                  />
                </div>
                {renderBudgetWarning()}
                {budgetError && (
                  <p className="text-danger text-xs mt-1">{budgetError}</p>
                )}
                <p className="text-default-400 text-xs mt-2">
                  Funds are held securely in a smart contract escrow.
                </p>
                {useMilestones && (
                  <p className="text-xs text-[#009F4D] bg-primary/10 p-2 rounded mt-2">
                    💰 Funds will be held in escrow and released per milestone upon completion verification
                  </p>
                )}
                {!serviceId && budget && parseFloat(budget || '0') > 0 && (
                  <label className="flex items-center gap-3 p-3 border border-divider rounded-lg cursor-pointer hover:bg-content2/50 mt-4">
                    <input
                      type="checkbox"
                      checked={fundJobNow}
                      onChange={e => setFundJobNow(e.target.checked)}
                      className="w-5 h-5 rounded border-default-300 text-success focus:ring-success"
                    />
                    <div>
                      <p className="text-sm font-medium">Fund Job Now</p>
                      <p className="text-xs text-default-400">
                        Pay {paymentToken.symbol} {budget} now in a single transaction (recommended)
                      </p>
                    </div>
                  </label>
                )}
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
                <p className="font-medium">Escrow Protection</p>
                <p className="text-default-500 mt-0.5">
                  Funds are held by the smart contract until work is approved. If the provider doesn't deliver, you get a full refund after the deadline.
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
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Checking USDC allowance...
                  </>
                ) : submitPhase === 'approving' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Approving USDC...
                  </>
                ) : submitPhase === 'creating' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating Job...
                  </>
                ) : isEnableMilestonesPending || isEnablingMilestones ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Enabling Milestones...
                  </>
                ) : isConfirming ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Confirming...
                  </>
                ) : isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Wait {formatTimeRemaining(timeUntilNextSubmit)}...
                  </>
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
