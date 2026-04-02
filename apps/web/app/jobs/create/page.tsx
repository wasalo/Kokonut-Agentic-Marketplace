'use client';

import { useState, useCallback, Suspense, useEffect } from 'react';
import { useAccount, useWaitForTransactionReceipt } from 'wagmi';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2, CheckCircle2, ShieldCheck, AlertTriangle } from 'lucide-react';
import NextLink from 'next/link';
import { Card } from '@heroui/react';
import { isAddress } from 'viem';
import { useService } from '@/lib/hooks/useServices';
import { useCreateJobFromService, useCreateJob } from '@/lib/hooks/useJobs';
import {
  useValidation,
  validateAddress,
  validateDeadline,
  validateStringLength,
} from '@/lib/hooks/useValidation';
import { getTransactionError } from '@/lib/toast';
import { useFormSubmit, formatTimeRemaining } from '@/lib/hooks/useDebounce';
import { useClientJobCount, MAX_JOBS_PER_CLIENT } from '@/lib/hooks/useClientJobCount';

const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}`;

// Contract constants from AgenticCommerceV4 (Phase 3 with comprehensive events)
const MAX_DESCRIPTION_LENGTH = 1000;
const MIN_EXPIRY_DURATION = 5 * 60 * 1000; // 5 minutes in ms

function CreateJobContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const serviceIdParam = searchParams.get('serviceId');
  const providerParam = searchParams.get('provider');
  const { isConnected, address } = useAccount();

  const serviceId = serviceIdParam ? BigInt(serviceIdParam) : undefined;
  const { service, isLoading: isLoadingService } = useService(serviceId ?? BigInt(0));

  // Job count tracking
  const {
    count: jobCount,
    isAtLimit,
    isNearLimit,
    percentageUsed,
    remainingJobs,
  } = useClientJobCount(address);

  // Form state - auto-fill provider from URL param or service data
  const [provider, setProvider] = useState('');
  const [evaluator, setEvaluator] = useState('');
  const [deadline, setDeadline] = useState('');
  const [description, setDescription] = useState('');

  // Auto-fill provider when service loads or from URL param
  useEffect(() => {
    if (providerParam) {
      setProvider(providerParam);
    } else if (service?.provider && !provider) {
      setProvider(service.provider);
    }
  }, [providerParam, service?.provider, provider]);

  // Validation state
  const [providerError, setProviderError] = useState<string | null>(null);
  const [evaluatorError, setEvaluatorError] = useState<string | null>(null);
  const [deadlineError, setDeadlineError] = useState<string | null>(null);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);

  // Default evaluator to connected address
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

  const txHash = serviceHash || directHash;
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Real-time validation handlers
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

  const performSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!isConnected || !address) return;

      // Validate all fields before submission
      let isValid = true;

      // Validate provider (only for direct job creation)
      if (!serviceId) {
        if (!provider) {
          setProviderError('Provider address is required');
          isValid = false;
        } else {
          isValid = validateProvider(provider) && isValid;
        }
      }

      // Validate deadline
      if (deadline) {
        isValid = validateDeadlineField(deadline) && isValid;
      }

      // Validate description
      if (description) {
        isValid = validateDescriptionField(description) && isValid;
      }

      // Validate service budget (prevent zero-budget jobs)
      if (serviceId && service && Number(service.price) === 0) {
        setProviderError('Service has a price of 0. Cannot create job.');
        isValid = false;
      }

      if (!isValid) {
        return;
      }

      // Clear validation errors
      setProviderError(null);
      setEvaluatorError(null);
      setDeadlineError(null);
      setDescriptionError(null);

      if (serviceId && service) {
        // Job from service
        const deadlineTs = deadline
          ? BigInt(Math.floor(new Date(deadline).getTime() / 1000))
          : BigInt(Math.floor(Date.now() / 1000) + 86400 * 7); // default 7 days

        createJobFromService(
          serviceId,
          effectiveEvaluator as `0x${string}`,
          deadlineTs,
          description || `Job for ${service.name}`
        );
      } else {
        // Direct job creation
        const deadlineTs = deadline
          ? BigInt(Math.floor(new Date(deadline).getTime() / 1000))
          : BigInt(Math.floor(Date.now() / 1000) + 86400 * 7);

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
      validateProvider,
      validateDeadlineField,
      validateDescriptionField,
      createJobFromService,
      createJob,
    ]
  );

  // Apply form submission debouncing (2 second cooldown)
  const { handleSubmit, isSubmitting, timeUntilNextSubmit } = useFormSubmit(performSubmit, 2000);

  const isLoading = isServicePending || isDirectPending || isConfirming;
  const error = serviceError || directError;

  // Check if form is valid for submission
  const isFormValid = !providerError && !evaluatorError && !deadlineError && !descriptionError;

  if (isConfirmed && txHash) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto text-center p-6 border border-divider">
          <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Job Created!</h2>
          <p className="text-sm text-default-500 mb-4">
            The job has been created. Fund it to start the escrow process.
          </p>
          <p className="text-xs text-default-400 font-mono break-all mb-6">TX: {txHash}</p>
          <NextLink
            href="/jobs"
            className="inline-flex items-center justify-center w-full px-6 py-3 bg-gradient-to-r from-[#009F4D] to-[#00c853] text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            View Jobs
          </NextLink>
        </Card>
      </div>
    );
  }

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
            : 'Create a direct job between you and a provider.'}
        </p>

        {/* Service Summary (if from service) */}
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

        {/* Job Count Warning */}
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
            {/* Evaluator */}
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

            {/* Provider (only for direct job creation) */}
            {!serviceId && (
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

            {/* Deadline */}
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

            {/* Description */}
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

            {/* T&C Notice */}
            <div className="p-4 bg-content2 rounded-lg flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium">Escrow Protection</p>
                <p className="text-default-500 mt-0.5">
                  Funds are held by the smart contract until work is approved. If the provider
                  doesn't deliver, you get a full refund after the deadline.
                </p>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="p-4 bg-danger-50 border border-danger-200 rounded-lg text-danger text-sm">
                {getTransactionError(error)}
              </div>
            )}

            {/* Submit */}
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
