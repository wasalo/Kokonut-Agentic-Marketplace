'use client';

import { Card } from '@heroui/react';
import { CircleDot, DollarSign } from 'lucide-react';
import { formatUnits } from 'viem';
import { useBalance } from 'wagmi';
import { useUSDCBalance } from '@/lib/hooks/useUSDC';
import { type Job } from '@/lib/hooks/useJobs';

interface BalanceCardProps {
  job: Job;
  isClient: boolean;
  address?: `0x${string}`;
}

export function BalanceCard({ job, isClient, address }: BalanceCardProps) {
  const isUSDC = true;
  const { data: ethBalance, isLoading: ethBalanceLoading } = useBalance({ address });
  const { formattedBalance: usdcBalance, isLoading: usdcBalanceLoading } = useUSDCBalance(address);

  if (!isClient || job.status !== 0) return null;

  return (
    <Card className="border border-divider p-6">
      <h2 className="text-base font-semibold mb-4">Your Balance</h2>
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          {isUSDC ? (
            <DollarSign className="w-5 h-5 text-primary" />
          ) : (
            <CircleDot className="w-5 h-5 text-primary" />
          )}
        </div>
        <div>
          <p className="text-lg font-semibold">
            {usdcBalanceLoading || ethBalanceLoading
              ? '...'
              : isUSDC
                ? `${usdcBalance || '0.00'} USDC`
                : `${ethBalance ? formatUnits(ethBalance.value, ethBalance.decimals) : '0.00'} ETH`}
          </p>
          <p className="text-xs text-default-500">
            {isUSDC ? 'Your USDC balance' : 'Your ETH balance'}
          </p>
        </div>
        {isUSDC && Number(usdcBalance) < Number(formatUnits(job.budget, 6)) && (
          <span className="ml-auto px-2 py-1 bg-danger/10 text-danger text-xs rounded-full">
            Insufficient balance
          </span>
        )}
      </div>
    </Card>
  );
}
