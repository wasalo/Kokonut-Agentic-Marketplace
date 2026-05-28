'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount, useBalance } from 'wagmi';
import { ArrowLeft, Loader2, AlertCircle, DollarSign, Clock } from 'lucide-react';
import { Card } from '@heroui/react';
import NextLink from 'next/link';
import { parseEther, formatEther, toHex } from 'viem';
import { useBiddingCalculateStake, useCreateBiddingSession } from '@/lib/hooks/useBiddingSystem';
import { validateAddress } from '@/lib/hooks/useValidation';
import { showToast } from '@/lib/toast';

const MIN_DEADLINE = 5 * 60; // 5 minutes in seconds
const MAX_DEADLINE = 365 * 24 * 60 * 60; // 1 year in seconds
export default function CreateBiddingSessionPage(): JSX.Element {
  useEffect(() => {
    document.title = 'Create Bidding Session | Kokonut Agent Economy';
  }, []);

  const router = useRouter();
  const { address, isConnected } = useAccount();

  // Form state
  const [evaluator, setEvaluator] = useState('');
  const [maxBudget, setMaxBudget] = useState('');
  const [deadline, setDeadline] = useState('');
  const [metadata, setMetadata] = useState('');
  const [serviceId, setServiceId] = useState('');

  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ETH balance
  const { data: ethBalance } = useBalance({ address });

  // Calculate stake
  const { stakePerEth } = useBiddingCalculateStake();
  const calculatedStake =
    stakePerEth && maxBudget ? (parseEther(maxBudget) * stakePerEth) / parseEther('1') : 0n;

  // Create session hook
  const { createSession, hash, isPending, isConfirming, isConfirmed, writeError } =
    useCreateBiddingSession();

  // Validate form
  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!evaluator) {
      newErrors.evaluator = 'Evaluator address is required';
    } else if (!validateAddress(evaluator)) {
      newErrors.evaluator = 'Invalid Ethereum address';
    }

    if (!maxBudget) {
      newErrors.maxBudget = 'Maximum budget is required';
    } else if (parseFloat(maxBudget) <= 0) {
      newErrors.maxBudget = 'Budget must be greater than 0';
    } else if (parseFloat(maxBudget) < 0.005) {
      newErrors.maxBudget = 'Minimum budget is 0.005 ETH';
    }

    if (!deadline) {
      newErrors.deadline = 'Deadline is required';
    } else {
      const deadlineSeconds = parseInt(deadline) * 60; // Convert minutes to seconds
      if (deadlineSeconds < MIN_DEADLINE) {
        newErrors.deadline = 'Minimum deadline is 5 minutes';
      } else if (deadlineSeconds > MAX_DEADLINE) {
        newErrors.deadline = 'Maximum deadline is 1 year';
      }
    }

    if (serviceId && (isNaN(parseInt(serviceId)) || parseInt(serviceId) < 0)) {
      newErrors.serviceId = 'Invalid service ID';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [evaluator, maxBudget, deadline, serviceId]);

  // Handle form submission
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (!validate()) return;

      const deadlineSeconds = BigInt(parseInt(deadline) * 60);
      const budgetWei = parseEther(maxBudget);
      const sid = serviceId ? BigInt(parseInt(serviceId)) : 0n;

      createSession({
        evaluator: evaluator as `0x${string}`,
        maxBudget: budgetWei,
        deadline: deadlineSeconds,
        metadata: toHex(metadata.trim()) as `0x${string}`,
        serviceId: sid,
      });
    },
    [validate, evaluator, maxBudget, deadline, metadata, serviceId, createSession]
  );

  useEffect(() => {
    if (!isConfirmed || !hash) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      showToast.success('Session created!', 'Your bidding session has been created successfully.');
      router.push('/bidding');
    }, 2000);

    return () => window.clearTimeout(timeoutId);
  }, [hash, isConfirmed, router]);

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="border border-divider p-12 text-center">
          <AlertCircle className="size-122 mx-auto text-default-300 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Wallet Not Connected</h3>
          <p className="text-default-500 mb-4">
            Please connect your wallet to create a bidding session.
          </p>
          <NextLink href="/bidding" className="text-[#009F4D] hover:underline">
            Back to Bidding Sessions
          </NextLink>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <NextLink href="/bidding" className="p-2 hover:bg-content2 rounded-lg transition-colors">
          <ArrowLeft className="size-5" />
        </NextLink>
        <div>
          <h1 className="text-2xl font-bold">Create Bidding Session</h1>
          <p className="text-default-500">Set up a new bidding session for your project</p>
        </div>
      </div>

      {/* Form */}
      <Card className="border border-divider p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Evaluator */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Evaluator Address <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={evaluator}
              onChange={e => setEvaluator(e.target.value)}
              placeholder="0x…"
              className={`w-full px-4 py-2 bg-content1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009F4D]/50 ${
                errors.evaluator ? 'border-danger' : 'border-divider'
              }`}
            />
            {errors.evaluator && <p className="text-danger text-sm mt-1">{errors.evaluator}</p>}
            <p className="text-xs text-default-400 mt-1">
              The address that will evaluate the winning bid
            </p>
          </div>

          {/* Max Budget */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Maximum Budget (ETH) <span className="text-danger">*</span>
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-default-400" />
              <input
                type="text"
                inputMode="decimal"
                value={maxBudget}
                onChange={e => setMaxBudget(e.target.value)}
                placeholder="0.0"
                step="0.001"
                min="0.005"
                className={`w-full pl-10 pr-4 py-2 bg-content1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009F4D]/50 ${
                  errors.maxBudget ? 'border-danger' : 'border-divider'
                }`}
              />
            </div>
            {errors.maxBudget && <p className="text-danger text-sm mt-1">{errors.maxBudget}</p>}
            <p className="text-xs text-default-400 mt-1">
              The maximum amount you are willing to pay
            </p>
          </div>

          {/* Stake Info */}
          <div className="p-4 bg-[#009F4D]/10 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="size-4 text-[#009F4D]" />
              <span className="text-sm font-medium text-[#009F4D]">Required Stake</span>
            </div>
            <p className="text-2xl font-bold">
              {maxBudget ? Number(formatEther(calculatedStake)).toFixed(6) : '0'} ETH
            </p>
            <p className="text-xs text-default-400 mt-1">
              Providers must stake 1% of max budget to commit bids
            </p>
            {ethBalance && ethBalance.value < calculatedStake && (
              <p className="text-danger text-sm mt-2">
                Insufficient balance. You need at least{' '}
                {Number(formatEther(calculatedStake)).toFixed(6)} ETH to create this session.
              </p>
            )}
          </div>

          {/* Deadline */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Deadline (minutes from now) <span className="text-danger">*</span>
            </label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-default-400" />
              <input
                type="number"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                placeholder="60"
                min="5"
                max={MAX_DEADLINE / 60}
                className={`w-full pl-10 pr-4 py-2 bg-content1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009F4D]/50 ${
                  errors.deadline ? 'border-danger' : 'border-divider'
                }`}
              />
            </div>
            {errors.deadline && <p className="text-danger text-sm mt-1">{errors.deadline}</p>}
            <p className="text-xs text-default-400 mt-1">
              After this deadline, a 1-hour reveal window opens
            </p>
          </div>

          {/* Service ID (Optional) */}
          <div>
            <label className="block text-sm font-medium mb-2">Service ID (optional)</label>
            <input
              type="number"
              value={serviceId}
              onChange={e => setServiceId(e.target.value)}
              placeholder="0"
              min="0"
              className={`w-full px-4 py-2 bg-content1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009F4D]/50 ${
                errors.serviceId ? 'border-danger' : 'border-divider'
              }`}
            />
            {errors.serviceId && <p className="text-danger text-sm mt-1">{errors.serviceId}</p>}
            <p className="text-xs text-default-400 mt-1">
              Link to a service on the marketplace (optional)
            </p>
          </div>

          {/* Metadata (Optional) */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Description / Metadata (optional)
            </label>
            <textarea
              value={metadata}
              onChange={e => setMetadata(e.target.value)}
              placeholder="Describe your project or requirements…"
              rows={4}
              className="w-full px-4 py-2 bg-content1 border border-divider rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009F4D]/50 resize-none"
            />
            <p className="text-xs text-default-400 mt-1">
              Additional information for bidders (stored as bytes)
            </p>
          </div>

          {/* Error */}
          {writeError && (
            <div className="p-4 bg-danger/10 border border-danger/30 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="size-4 text-danger" />
                <span className="text-sm font-medium text-danger">Transaction Failed</span>
              </div>
              <p className="text-sm text-danger/80 mt-1">
                {writeError.message || 'An error occurred'}
              </p>
            </div>
          )}

          {/* Submit */}
          <div className="flex items-center justify-between pt-4">
            <NextLink href="/bidding" className="text-default-500 hover:text-default-700">
              Cancel
            </NextLink>
            <button type="submit"
              disabled={
                !isConnected ||
                isPending ||
                isConfirming ||
                !maxBudget ||
                !evaluator ||
                !deadline ||
                (ethBalance ? ethBalance.value < calculatedStake : true)
              }
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#009F4D] to-[#00c853] text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isPending || isConfirming ? (
                <Loader2 className="size-5 animate-spin inline" />
              ) : isConfirmed ? (
                'Session Created!'
              ) : (
                'Create Session'
              )}
            </button>
          </div>
        </form>
      </Card>

      {/* Info */}
      <Card className="border border-divider p-4 mt-6">
        <h3 className="text-sm font-semibold mb-2">How Bidding Works</h3>
        <ol className="text-sm text-default-500 space-y-2 list-decimal list-inside">
          <li>Create a session with your maximum budget and deadline</li>
          <li>Providers commit sealed bids with 1% ETH stake</li>
          <li>After the deadline, providers reveal their bids</li>
          <li>You accept the winning bid to create a funded job</li>
          <li>The winner&apos;s stake is returned; you fund the job</li>
        </ol>
      </Card>
    </div>
  );
}
