'use client';

import { useAllowance } from '@/lib/hooks/useAllowance';

interface AllowanceChipProps {
  token: `0x${string}`;
  spender: `0x${string}`;
  requiredAmount?: bigint;
  onApprove?: () => void;
}

export function AllowanceChip({ token, spender, requiredAmount, onApprove }: AllowanceChipProps) {
  const { allowance, isUnlimited, hasSufficient } = useAllowance(token, spender);

  if (isUnlimited) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded-full">
        <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
        Unlimited
      </span>
    );
  }

  if (!allowance || allowance === 0n) {
    return (
      <button
        onClick={onApprove}
        className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded-full hover:bg-red-500/30 transition-colors"
        title="Click to approve token spending"
      >
        <span className="w-1.5 h-1.5 bg-red-400 rounded-full" />
        Approve
      </button>
    );
  }

  const hasEnough = requiredAmount ? hasSufficient(requiredAmount) : true;

  if (!hasEnough) {
    return (
      <button
        onClick={onApprove}
        className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-amber-500/20 text-amber-400 rounded-full hover:bg-amber-500/30 transition-colors"
        title="Allowance insufficient for this transaction"
      >
        <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
        Increase
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded-full">
      <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
      Approved
    </span>
  );
}
