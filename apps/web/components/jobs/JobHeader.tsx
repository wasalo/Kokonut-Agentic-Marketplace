'use client';

import { Card } from '@heroui/react';
import NextLink from 'next/link';
import { Clock, Link } from 'lucide-react';
import { formatUnits } from 'viem';
import { StatusBadge, getJobStatusBadgeType } from '@/components/StatusBadge';
import { Address } from '@/components/Address';
import { PaymentTokenBadge, SUPPORTED_TOKENS } from '@/components/PaymentTokenSelector';
import { useTokenPriceConversion, ETH_TOKEN, USDC_TOKEN } from '@/lib/hooks/useTokenConversion';
import { useEvaluatorFeeEnabled } from '@/lib/hooks/useJobs';
import { JobLifecycleStepper, type JobRole } from '@/components/jobs/JobLifecycleStepper';
import type { Job } from '@/lib/types/contracts';

interface Service {
  id: bigint;
  name: string;
}

interface JobHeaderProps {
  job: Job;
  service?: Service | null;
  isClient: boolean;
  isProvider: boolean;
  isEvaluator: boolean;
}

export function JobHeader({ job, service, isClient, isProvider, isEvaluator }: JobHeaderProps) {
  const role: JobRole = isClient ? 'client' : isProvider ? 'provider' : isEvaluator ? 'evaluator' : 'observer';
  const isUSDC = job.paymentToken && job.paymentToken.toLowerCase() !== '0x0000000000000000000000000000000000000000'
    ? (SUPPORTED_TOKENS.find(t => t.address.toLowerCase() === job.paymentToken.toLowerCase())?.symbol === 'USDC')
    : true;
  const budgetDecimals = isUSDC ? 6 : 18;
  const formattedBudget = formatUnits(job.budget, budgetDecimals);
  const token = isUSDC ? USDC_TOKEN : ETH_TOKEN;
  const { formatUsdValue, isLoading: isPriceLoading } = useTokenPriceConversion();
  const usdValue = formatUsdValue(job.budget, token);
  const deadlineDate = new Date(Number(job.expiredAt) * 1000);
  const isExpired = Date.now() / 1000 > Number(job.expiredAt);
  const { isEvaluatorFeeEnabled } = useEvaluatorFeeEnabled(job?.id);

  return (
    <Card className="border border-divider p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold">Job #{job.id.toString()}</h1>
          <p className="text-sm text-default-500 mt-1">{job.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button"
            onClick={() => {
              if (navigator.clipboard?.writeText) {
                navigator.clipboard.writeText(window.location.href);
              } else {
                const input = document.createElement('input');
                input.value = window.location.href;
                document.body.appendChild(input);
                input.select();
                document.execCommand('copy');
                document.body.removeChild(input);
              }
            }}
            className="p-2 text-default-400 hover:text-foreground transition-colors rounded-lg hover:bg-content2"
            title="Copy job link"
          >
            <Link className="size-4" />
          </button>
          <StatusBadge status={getJobStatusBadgeType(job.status)} size="md" />
        </div>
      </div>

      <div className="mb-4">
        <JobLifecycleStepper status={job.status} role={role} />
      </div>

      {service && Number(service.id) > 0 && (
        <NextLink
          href={`/marketplace/${service.id}`}
          className="text-sm text-primary hover:underline"
        >
          Service: {service.name}
        </NextLink>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mt-4 pt-4 border-t border-divider">
        <div>
          <p className="text-xs text-default-400 uppercase tracking-wide">Budget</p>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-lg font-semibold text-success">
              {isUSDC ? `$${formattedBudget}` : `${formattedBudget} ETH`}
              {!isUSDC && !isPriceLoading && usdValue !== '$0.00' && (
                <span className="text-sm text-default-400 ml-2">({usdValue} USD)</span>
              )}
            </p>
            {job.paymentToken && job.paymentToken !== '0x0000000000000000000000000000000000000000' && (
              <PaymentTokenBadge
                token={
                  SUPPORTED_TOKENS.find(t => t.address.toLowerCase() === job.paymentToken.toLowerCase())
                  || SUPPORTED_TOKENS[0]
                }
              />
            )}
          </div>
        </div>
        <div>
          <p className="text-xs text-default-400 uppercase tracking-wide">Deadline</p>
          <p className="text-sm flex items-center gap-1">
            <Clock className="size-3" />
            {deadlineDate.toLocaleDateString()} {deadlineDate.toLocaleTimeString()}
          </p>
          {isExpired && <p className="text-xs text-danger mt-0.5">Expired</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mt-4 pt-4 border-t border-divider text-xs">
        <div>
          <p className="text-default-400 uppercase tracking-wide">Client</p>
          <Address address={job.client as `0x${string}`} truncate className="mt-0.5" />
          {isClient && <span className="text-primary">(You)</span>}
        </div>
        <div>
          <p className="text-default-400 uppercase tracking-wide">Provider</p>
          {job.provider === '0x0000000000000000000000000000000000000000' ? (
            <span className="text-default-500 mt-0.5">Open (Bidding)</span>
          ) : (
            <>
              <Address address={job.provider as `0x${string}`} truncate className="mt-0.5" />
              {isProvider && <span className="text-primary">(You)</span>}
            </>
          )}
        </div>
        <div>
          <p className="text-default-400 uppercase tracking-wide">Evaluator</p>
          {job.evaluator.toLowerCase() === job.client.toLowerCase() ? (
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm bg-primary/20 text-primary px-2 py-0.5 rounded">Randomly Assigned</span>
              {isEvaluatorFeeEnabled && (
                <span className="block text-xs text-success">+1% evaluator fee</span>
              )}
            </div>
          ) : (
            <>
              <Address address={job.evaluator as `0x${string}`} truncate className="mt-0.5" />
              {isEvaluator && <span className="text-primary">(You)</span>}
              {isEvaluatorFeeEnabled && (
                <span className="block text-xs text-success mt-1">+1% evaluator fee</span>
              )}
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
