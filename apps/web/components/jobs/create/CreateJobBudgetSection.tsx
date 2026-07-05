'use client';

import { AlertCircle } from 'lucide-react';
import { Token, formatAmount } from '@/lib/tokenUtils';

interface CreateJobBudgetSectionProps {
  budget: string;
  paymentToken: Token;
  minBudgetRaw: bigint | null | undefined;
  minBudgetInToken: number;
  isMinBudgetLoading: boolean;
  budgetError: string | null;
  useMilestones: boolean;
  fundJobNow: boolean;
  serviceId?: bigint;
  onBudgetChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFundJobNowChange: (checked: boolean) => void;
}

export function CreateJobBudgetSection({
  budget,
  paymentToken,
  minBudgetRaw,
  minBudgetInToken,
  isMinBudgetLoading,
  budgetError,
  useMilestones,
  fundJobNow,
  serviceId,
  onBudgetChange,
  onFundJobNowChange,
}: CreateJobBudgetSectionProps) {
  const renderBudgetWarning = () => {
    if (serviceId) return null;
    return minBudgetRaw && budget && parseFloat(budget || '0') > 0 && parseFloat(budget || '0') < minBudgetInToken ? (
      <p className="text-danger text-sm mt-2 flex items-center">
        <AlertCircle className="size-4 mr-1" />
        Minimum budget is {formatAmount(minBudgetRaw, paymentToken, { includeSymbol: true })}
      </p>
    ) : null;
  };

  return (
    <div>
      <label htmlFor="budget" className="block text-sm font-semibold mb-2">
        Budget ({paymentToken.symbol})
      </label>
      <div className="relative flex items-center">
        <span className="absolute left-4 text-default-400 font-medium">
          {paymentToken.symbol === 'USDC' ? '$' : 'Ξ'}
        </span>
        <input
          id="budget"
          type="number"
          step={paymentToken.symbol === 'ETH' ? '0.0001' : '0.01'}
          min={minBudgetRaw ? minBudgetInToken : undefined}
          value={budget}
          onChange={onBudgetChange}
          placeholder={
            minBudgetRaw
              ? `Min ${formatAmount(minBudgetRaw, paymentToken)}`
              : 'Loading minimum…'
          }
          className="w-full bg-content2 border border-divider rounded-xl py-3 pl-8 pr-4 text-default-900 focus:outline-none focus:ring-2 focus:ring-primary transition-all"
          required
        />
      </div>
      {renderBudgetWarning()}
      {budgetError && <p className="text-danger text-xs mt-1">{budgetError}</p>}
      <p className="text-default-400 text-xs mt-2">
        {isMinBudgetLoading
          ? 'Loading minimum budget from contract…'
          : 'Funds are held securely in a smart contract escrow.'}
      </p>
      {useMilestones && (
        <p className="text-xs text-primary bg-primary/10 p-2 rounded mt-2">
          💰 Funds will be held in escrow and released per milestone upon completion verification
        </p>
      )}
      {!serviceId && budget && parseFloat(budget || '0') > 0 && (
        <label className="flex items-center gap-3 p-3 border border-divider rounded-lg cursor-pointer hover:bg-content2/50 mt-4">
          <input
            type="checkbox"
            checked={fundJobNow}
            onChange={e => onFundJobNowChange(e.target.checked)}
            className="size-5 rounded border-default-300 text-success focus:ring-success"
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
  );
}
