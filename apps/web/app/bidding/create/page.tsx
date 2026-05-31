'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount, useBalance, usePublicClient, useWriteContract } from 'wagmi';
import { ArrowLeft, Loader2, AlertCircle, Clock, Shield, Wallet } from 'lucide-react';
import { Card, Button } from '@heroui/react';
import NextLink from 'next/link';
import { parseEther, formatEther, formatUnits, parseUnits, toHex } from 'viem';
import { useCreateBiddingSession } from '@/lib/hooks/useBiddingSystem';
import { useEvaluatorPoolSize } from '@/lib/hooks/useJobs';
import { useTokenPriceConversion, ETH_TOKEN, USDC_TOKEN, type Token } from '@/lib/hooks/useTokenConversion';
import { useUSDCBalance } from '@/lib/hooks/useUSDC';
import { useUSDCApproval } from '@/lib/hooks/useUSDCApproval';
import { getContractAddress } from '@/lib/contracts/config';
import { showToast } from '@/lib/toast';

// Contract limits (must match BiddingSystem.sol)
const MIN_DEADLINE_MINUTES = 5;
const MAX_DEADLINE_DAYS = 30;
const MAX_DEADLINE_MINUTES = MAX_DEADLINE_DAYS * 24 * 60;
const GAS_BUFFER_WEI = parseEther('0.01'); // 0.01 ETH buffer for gas
const MAX_METADATA_LENGTH = 2000;

const PAYMENT_TOKENS: Token[] = [ETH_TOKEN, USDC_TOKEN];
const BIDDING_SYSTEM_ADDRESS = getContractAddress('BIDDING_SYSTEM');

type ApprovalPhase = 'idle' | 'checking' | 'approving' | 'creating';

const DEADLINE_PRESETS = [
  { label: '1 hour', minutes: 60 },
  { label: '6 hours', minutes: 360 },
  { label: '1 day', minutes: 1440 },
  { label: '3 days', minutes: 4320 },
  { label: '7 days', minutes: 10080 },
];

export default function CreateBiddingSessionPage(): JSX.Element {
  useEffect(() => {
    document.title = 'Create Bidding Session | Kokonut Agent Economy';
  }, []);

  const router = useRouter();
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync: writeApprovalAsync } = useWriteContract();

  // Form state
  const [maxBudget, setMaxBudget] = useState('');
  const [deadlineMinutes, setDeadlineMinutes] = useState('');
  const [metadata, setMetadata] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [paymentToken, setPaymentToken] = useState<Token>(ETH_TOKEN);
  const [showConfirm, setShowConfirm] = useState(false);
  const [approvalPhase, setApprovalPhase] = useState<ApprovalPhase>('idle');

  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Balances
  const { data: ethBalance } = useBalance({ address });
  const { balance: usdcBalance, formattedBalance: usdcFormatted } = useUSDCBalance(address);

  // Price conversion
  const { ethPriceInUsd } = useTokenPriceConversion();

  // Get the relevant balance for the selected token
  const tokenBalance = useMemo(() => {
    if (paymentToken.symbol === 'ETH') {
      return ethBalance?.value ?? 0n;
    }
    return usdcBalance ?? 0n;
  }, [paymentToken, ethBalance, usdcBalance]);

  const tokenBalanceFormatted = useMemo(() => {
    if (paymentToken.symbol === 'ETH') {
      return ethBalance ? Number(formatEther(ethBalance.value)).toFixed(4) : '0';
    }
    return usdcFormatted !== undefined ? usdcFormatted.toFixed(2) : '0';
  }, [paymentToken, ethBalance, usdcFormatted]);

  // USD equivalent of budget
  const budgetUsd = useMemo(() => {
    if (!maxBudget || !ethPriceInUsd) return null;
    try {
      const budgetUnits = parseUnits(maxBudget, paymentToken.decimals);
      const usdValue = paymentToken.symbol === 'ETH'
        ? Number(formatEther(budgetUnits)) * ethPriceInUsd
        : Number(formatUnits(budgetUnits, 6)); // USDC is already in USD
      return usdValue;
    } catch {
      return null;
    }
  }, [maxBudget, ethPriceInUsd, paymentToken]);

  // Evaluator pool info
  const { count: evaluatorPoolSize } = useEvaluatorPoolSize();

  // Calculate stake (1% of budget, local only)
  const calculatedStake = useMemo(() => {
    if (!maxBudget) return 0n;
    try {
      const budgetUnits = parseUnits(maxBudget, paymentToken.decimals);
      return (budgetUnits * 100n) / 10000n;
    } catch {
      return 0n;
    }
  }, [maxBudget, paymentToken]);

  // Calculate deadline as absolute timestamp
  const deadlineTimestamp = useMemo(() => {
    if (!deadlineMinutes) return 0n;
    const minutes = parseInt(deadlineMinutes);
    if (isNaN(minutes) || minutes < MIN_DEADLINE_MINUTES) return 0n;
    return BigInt(Math.floor(Date.now() / 1000)) + BigInt(minutes * 60);
  }, [deadlineMinutes]);

  // Balance sufficiency (including gas buffer for ETH)
  const hasEnoughBalance = useMemo(() => {
    if (calculatedStake === 0n) return false;
    if (paymentToken.symbol === 'ETH') {
      return tokenBalance >= calculatedStake + GAS_BUFFER_WEI;
    }
    return tokenBalance >= calculatedStake;
  }, [tokenBalance, calculatedStake, paymentToken]);

  // Create session hook
  const { createSession, hash, isPending, isConfirming, isConfirmed, writeError } =
    useCreateBiddingSession();
  const { ensureUSDCApproval } = useUSDCApproval({
    account: address,
    publicClient,
    spender: BIDDING_SYSTEM_ADDRESS,
    writeContractAsync: writeApprovalAsync,
    setPhase: setApprovalPhase,
  });
  const isBusy = isPending || isConfirming || approvalPhase !== 'idle';

  // Validate form
  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!maxBudget) {
      newErrors.maxBudget = 'Maximum budget is required';
    } else {
      try {
        const budgetUnits = parseUnits(maxBudget, paymentToken.decimals);
        if (budgetUnits <= 0n) {
          newErrors.maxBudget = 'Budget must be greater than 0';
        }
      } catch {
        newErrors.maxBudget = 'Invalid budget amount';
      }
    }

    if (!deadlineMinutes) {
      newErrors.deadline = 'Deadline is required';
    } else {
      const minutes = parseInt(deadlineMinutes);
      if (isNaN(minutes) || minutes < MIN_DEADLINE_MINUTES) {
        newErrors.deadline = `Minimum deadline is ${MIN_DEADLINE_MINUTES} minutes`;
      } else if (minutes > MAX_DEADLINE_MINUTES) {
        newErrors.deadline = `Maximum deadline is ${MAX_DEADLINE_DAYS} days`;
      }
    }

    if (serviceId && (isNaN(parseInt(serviceId)) || parseInt(serviceId) < 0)) {
      newErrors.serviceId = 'Invalid service ID';
    }

    if (metadata.length > MAX_METADATA_LENGTH) {
      newErrors.metadata = `Description must be ${MAX_METADATA_LENGTH} characters or less`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [maxBudget, paymentToken.decimals, deadlineMinutes, serviceId, metadata]);

  // Handle form submission
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!validate()) return;
      setShowConfirm(true);
    },
    [validate]
  );

  // Confirm and execute
  const handleConfirm = useCallback(async () => {
    const budgetUnits = parseUnits(maxBudget, paymentToken.decimals);
    const sid = serviceId ? BigInt(parseInt(serviceId)) : 0n;

    if (paymentToken.symbol === 'USDC') {
      const amountLabel = formatUnits(calculatedStake, paymentToken.decimals);
      const approved = await ensureUSDCApproval(calculatedStake, amountLabel);
      if (!approved) return;
    }

    setApprovalPhase('creating');

    createSession({
      evaluator: '0x0000000000000000000000000000000000000000' as `0x${string}`,
      maxBudget: budgetUnits,
      deadline: deadlineTimestamp,
      metadata: toHex(metadata.trim()) as `0x${string}`,
      serviceId: sid,
      paymentToken: paymentToken.address,
    });

    setShowConfirm(false);
  }, [maxBudget, paymentToken, calculatedStake, ensureUSDCApproval, deadlineTimestamp, metadata, serviceId, createSession]);

  useEffect(() => {
    if (writeError) setApprovalPhase('idle');
  }, [writeError]);

  // Redirect after confirmation
  useEffect(() => {
    if (!isConfirmed || !hash) return;
    const timeoutId = window.setTimeout(() => {
      showToast.success('Session created!', 'Your bidding session has been created successfully.');
      router.push('/marketplace?tab=bidding');
    }, 2000);
    return () => window.clearTimeout(timeoutId);
  }, [hash, isConfirmed, router]);

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="border border-divider p-12 text-center">
          <AlertCircle className="size-12 mx-auto text-default-300 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Wallet Not Connected</h3>
          <p className="text-default-500 mb-4">
            Please connect your wallet to create a bidding session.
          </p>
          <NextLink href="/marketplace?tab=bidding" className="text-[#009F4D] hover:underline">
            Back to Bidding Sessions
          </NextLink>
        </Card>
      </div>
    );
  }

  // Confirmation modal
  if (showConfirm) {
    const days = Math.floor(parseInt(deadlineMinutes) / 1440);
    const hours = Math.floor((parseInt(deadlineMinutes) % 1440) / 60);
    const confirmLabel = approvalPhase === 'checking'
      ? 'Checking USDC...'
      : approvalPhase === 'approving'
        ? 'Approving USDC...'
        : isConfirmed
          ? 'Session Created!'
          : 'Confirm & Create';

    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="border border-divider p-6">
          <h2 className="text-xl font-bold mb-4">Confirm Session Creation</h2>
          <div className="space-y-3 mb-6">
            <div className="flex justify-between py-2 border-b border-divider">
              <span className="text-default-500">Evaluator</span>
              <span className="font-medium flex items-center gap-1">
                <Shield className="size-4 text-[#009F4D]" />
                Random Pool
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-divider">
              <span className="text-default-500">Max Budget</span>
              <span className="font-medium">{maxBudget} {paymentToken.symbol}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-divider">
              <span className="text-default-500">Creator Stake (1%)</span>
              <span className="font-medium">{paymentToken.symbol === 'ETH' ? Number(formatEther(calculatedStake)).toFixed(6) : formatUnits(calculatedStake, paymentToken.decimals)} {paymentToken.symbol}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-divider">
              <span className="text-default-500">Deadline</span>
              <span className="font-medium">
                {days > 0 ? `${days}d ` : ''}{hours > 0 ? `${hours}h ` : ''}{parseInt(deadlineMinutes) % 60}m
              </span>
            </div>
            {serviceId && (
              <div className="flex justify-between py-2 border-b border-divider">
                <span className="text-default-500">Service ID</span>
                <span className="font-medium">{serviceId}</span>
              </div>
            )}
            {metadata && (
              <div className="py-2 border-b border-divider">
                <span className="text-default-500 block mb-1">Description</span>
                <p className="text-sm">{metadata.slice(0, 200)}{metadata.length > 200 ? '...' : ''}</p>
              </div>
            )}
            <div className="flex justify-between py-2">
              <span className="text-default-500">Evaluators in Pool</span>
              <span className="font-medium">{evaluatorPoolSize}</span>
            </div>
          </div>

          {writeError && (
            <div className="p-4 bg-danger/10 border border-danger/30 rounded-lg mb-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="size-4 text-danger" />
                <span className="text-sm font-medium text-danger">Transaction Failed</span>
              </div>
              <p className="text-sm text-danger/80 mt-1">
                {writeError.message || 'An error occurred'}
              </p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              isDisabled={isBusy}
              onPress={() => setShowConfirm(false)}
            >
              Back
            </Button>
            <Button
              className="bg-gradient-to-r from-[#009F4D] to-[#00c853] text-white"
              onPress={handleConfirm}
              isDisabled={isBusy}
            >
              {isPending || isConfirming || approvalPhase === 'creating' ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                confirmLabel
              )}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <NextLink href="/marketplace?tab=bidding" className="p-2 hover:bg-content2 rounded-lg transition-colors">
          <ArrowLeft className="size-5" />
        </NextLink>
        <div>
          <h1 className="text-2xl font-bold">Create Bidding Session</h1>
          <p className="text-default-500">Set up a new bidding session for your project</p>
        </div>
      </div>

      {/* Random Evaluator Info */}
      <Card className="border border-[#009F4D]/20 bg-[#009F4D]/5 p-4 mb-6">
        <div className="flex items-start gap-3">
          <Shield className="size-5 text-[#009F4D] mt-0.5" />
          <div>
            <p className="text-sm font-medium text-[#009F4D]">Random Evaluator Pool</p>
            <p className="text-xs text-default-500 mt-1">
              After bidding closes and a winner is selected, a random evaluator from the registered pool will be assigned to judge the work. This ensures unbiased evaluation.
            </p>
          </div>
        </div>
      </Card>

      {/* Form */}
      <Card className="border border-divider p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Payment Token */}
          <div>
            <label className="block text-sm font-medium mb-2">Payment Token</label>
            <div className="flex gap-2">
              {PAYMENT_TOKENS.map(token => (
                <button
                  key={token.symbol}
                  type="button"
                  onClick={() => setPaymentToken(token)}
                  className={`flex-1 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                    paymentToken.symbol === token.symbol
                      ? 'border-[#009F4D] bg-[#009F4D]/10 text-[#009F4D]'
                      : 'border-divider hover:border-[#009F4D]/30'
                  }`}
                >
                  {token.symbol}
                </button>
              ))}
            </div>
          </div>

          {/* Max Budget */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Maximum Budget ({paymentToken.symbol}) <span className="text-danger">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step={paymentToken.symbol === 'ETH' ? '0.001' : '1'}
                min={paymentToken.symbol === 'ETH' ? '0.005' : '1'}
                value={maxBudget}
                onChange={e => setMaxBudget(e.target.value)}
                placeholder="0.0"
                className={`w-full px-4 py-2 bg-content1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009F4D]/50 ${
                  errors.maxBudget ? 'border-danger' : 'border-divider'
                }`}
              />
            </div>
            {errors.maxBudget && <p className="text-danger text-sm mt-1">{errors.maxBudget}</p>}
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-default-400">
                {budgetUsd !== null ? `≈ $${budgetUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })} USD` : 'Enter amount to see USD equivalent'}
              </p>
              <p className="text-xs text-default-400 flex items-center gap-1">
                <Wallet className="size-3" />
                Balance: {tokenBalanceFormatted} {paymentToken.symbol}
              </p>
            </div>
          </div>

          {/* Stake Info */}
          <div className="p-4 bg-[#009F4D]/10 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-[#009F4D]">Creator Stake</span>
            </div>
            <p className="text-2xl font-bold">
              {maxBudget ? (paymentToken.symbol === 'ETH' ? Number(formatEther(calculatedStake)).toFixed(6) : formatUnits(calculatedStake, paymentToken.decimals)) : '0'} {paymentToken.symbol}
            </p>
            <p className="text-xs text-default-400 mt-1">
              1% of max budget, refunded after job creation
            </p>
            {maxBudget && !hasEnoughBalance && (
              <p className="text-danger text-sm mt-2">
                Insufficient {paymentToken.symbol} balance. You need at least{' '}
                {paymentToken.symbol === 'ETH'
                  ? `${Number(formatEther(calculatedStake + GAS_BUFFER_WEI)).toFixed(6)} ETH (stake + gas)`
                  : `${formatUnits(calculatedStake, paymentToken.decimals)} ${paymentToken.symbol}`
                }.
              </p>
            )}
          </div>

          {/* Deadline */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Deadline <span className="text-danger">*</span>
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {DEADLINE_PRESETS.map(preset => (
                <button
                  key={preset.minutes}
                  type="button"
                  onClick={() => setDeadlineMinutes(String(preset.minutes))}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                    deadlineMinutes === String(preset.minutes)
                      ? 'border-[#009F4D] bg-[#009F4D]/10 text-[#009F4D]'
                      : 'border-divider hover:border-[#009F4D]/30'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-default-400" />
              <input
                type="number"
                value={deadlineMinutes}
                onChange={e => setDeadlineMinutes(e.target.value)}
                placeholder="1440"
                min={MIN_DEADLINE_MINUTES}
                max={MAX_DEADLINE_MINUTES}
                className={`w-full pl-10 pr-4 py-2 bg-content1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009F4D]/50 ${
                  errors.deadline ? 'border-danger' : 'border-divider'
                }`}
              />
            </div>
            {errors.deadline && <p className="text-danger text-sm mt-1">{errors.deadline}</p>}
            <p className="text-xs text-default-400 mt-1">
              Minutes from now. Bidding closes at deadline, then 1-hour reveal window opens.
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
              Link to a marketplace service (optional)
            </p>
          </div>

          {/* Metadata (Optional) */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Description (optional)
            </label>
            <textarea
              value={metadata}
              onChange={e => setMetadata(e.target.value.slice(0, MAX_METADATA_LENGTH))}
              placeholder="Describe your project or requirements..."
              rows={4}
              className={`w-full px-4 py-2 bg-content1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009F4D]/50 resize-none ${
                errors.metadata ? 'border-danger' : 'border-divider'
              }`}
            />
            {errors.metadata && <p className="text-danger text-sm mt-1">{errors.metadata}</p>}
            <p className="text-xs text-default-400 mt-1">
              {metadata.length}/{MAX_METADATA_LENGTH} characters
            </p>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-between pt-4">
            <NextLink href="/marketplace?tab=bidding" className="text-default-500 hover:text-default-700">
              Cancel
            </NextLink>
            <button type="submit"
              disabled={
                !isConnected ||
                isBusy ||
                !maxBudget ||
                !deadlineMinutes ||
                !hasEnoughBalance
              }
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#009F4D] to-[#00c853] text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isBusy ? (
                <Loader2 className="size-5 animate-spin inline" />
              ) : isConfirmed ? (
                'Session Created!'
              ) : (
                'Review & Create'
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
          <li>Providers commit sealed bids with a 1% stake in the session token</li>
          <li>After the deadline, providers reveal their bids</li>
          <li>You accept the winning bid to create a funded job</li>
          <li>A random evaluator is assigned to judge the completed work</li>
        </ol>
      </Card>
    </div>
  );
}
