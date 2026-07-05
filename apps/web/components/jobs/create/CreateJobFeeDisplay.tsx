'use client';

import { Coins, ShieldCheck } from 'lucide-react';

interface CreateJobFeeDisplayProps {
  platformFeePercent: number;
  showEvaluatorFee: boolean;
}

export function CreateJobFeeDisplay({
  platformFeePercent,
  showEvaluatorFee,
}: CreateJobFeeDisplayProps) {
  return (
    <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
      <div className="flex items-center gap-2">
        <Coins className="size-5 text-primary" />
        <span className="font-medium">Fees</span>
      </div>
      <div className="mt-2 space-y-1">
        {showEvaluatorFee && (
          <p className="text-sm text-default-500">
            <ShieldCheck className="size-4 inline mr-1" />
            Evaluator fee: 1% (included automatically)
          </p>
        )}
        {platformFeePercent > 0 && (
          <p className="text-sm text-default-500">
            <Coins className="size-4 inline mr-1" />
            Platform fee: {platformFeePercent}%
          </p>
        )}
      </div>
    </div>
  );
}
