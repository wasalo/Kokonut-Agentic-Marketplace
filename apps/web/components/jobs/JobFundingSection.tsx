'use client';

import { Card } from '@heroui/react';
import { CircleDot, DollarSign, Loader2 } from 'lucide-react';
import { formatUnits } from 'viem';
import { ETH_TOKEN, type Token } from '@/lib/hooks/useTokenConversion';
import { JobStatus, type Job } from '@/lib/hooks/useJobs';
import { amountToNumber } from '@/lib/tokenUtils';
import { card } from '@/lib/design-system';

interface JobFundingSectionProps {
  job: Job;
  isClient: boolean;
  selectedPaymentToken: Token;
  usdcBalance?: string | number;
  usdcBalanceLoading: boolean;
  ethBalance?: { value: bigint; decimals: number } | null;
  ethBalanceLoading: boolean;
  needsApproval: boolean;
  isUSDC: boolean;
  hasAllowance: boolean;
  formattedBudget: string;
  txStep: string | null;
  isApprovePending: boolean;
  isFundPending: boolean;
  isFundETHPending: boolean;
  isApprovingAndFunding: boolean;
  isPaymentTokenPending: boolean;
  isPriceLoading: boolean;
  formatUsdValue: (amount: bigint, token: Token) => string;
  onFund: () => void;
}

export function JobFundingSection({
  job,
  isClient,
  selectedPaymentToken,
  usdcBalance,
  usdcBalanceLoading,
  ethBalance,
  ethBalanceLoading,
  needsApproval,
  isUSDC,
  hasAllowance,
  formattedBudget,
  txStep,
  isApprovePending,
  isFundPending,
  isFundETHPending,
  isApprovingAndFunding,
  isPaymentTokenPending,
  isPriceLoading,
  formatUsdValue,
  onFund,
}: JobFundingSectionProps) {
  if (!isClient || job.status !== JobStatus.Open) return null;

  return (
    <>
      <Card className={card('padded', 'p-6')}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-default-600">
                Your {selectedPaymentToken.symbol} Balance
              </p>
              {selectedPaymentToken.symbol === 'ETH' && <CircleDot className="size-4 text-default-400" />}
              {selectedPaymentToken.symbol === 'USDC' && <DollarSign className="size-4 text-default-400" />}
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
          {selectedPaymentToken.symbol === 'USDC' &&
            usdcBalance &&
            Number(usdcBalance) < amountToNumber(job.budget, selectedPaymentToken) && (
              <div className="px-4 py-2 bg-danger/10 text-danger rounded-lg text-sm">
                Insufficient balance
              </div>
            )}
          {selectedPaymentToken.symbol === 'ETH' && ethBalance && ethBalance.value < job.budget && (
            <div className="px-4 py-2 bg-danger/10 text-danger rounded-lg text-sm">
              Insufficient balance
            </div>
          )}
        </div>
      </Card>

      <Card className={card('padded', 'p-6')}>
        <h2 className="text-xl font-bold mb-5">Funding</h2>
        {needsApproval && isUSDC && (
          <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg text-sm text-warning mb-3">
            USDC approval required before funding
          </div>
        )}
        <button
          type="button"
          onClick={onFund}
          disabled={!!txStep || isApprovePending || isFundPending || isFundETHPending || isApprovingAndFunding || isPaymentTokenPending}
          className="w-full flex items-center gap-3 p-4 border border-success/30 rounded-lg hover:bg-success/5 transition-colors disabled:opacity-50"
        >
          {!isUSDC ? <CircleDot className="size-5 text-success" /> : <DollarSign className="size-5 text-success" />}
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
              {isUSDC ? `$${formattedBudget} USDC` : `${formatUnits(job.budget, 18)} ETH`} into escrow
              {!isUSDC && !isPriceLoading && (
                <span className="ml-1">({formatUsdValue(job.budget, ETH_TOKEN)} USD)</span>
              )}
            </p>
          </div>
          {(isApprovingAndFunding || isFundPending) && (
            <Loader2 className="size-5 animate-spin text-success ml-auto" />
          )}
        </button>
      </Card>
    </>
  );
}
