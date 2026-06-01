'use client';

import NextLink from 'next/link';
import { Briefcase, ArrowRight } from 'lucide-react';
import { useJobs, isOpenJob, type Job } from '@/lib/hooks/useJobs';
import { getTokenByAddress, formatAmount } from '@/lib/tokenUtils';

interface ActiveJobsForServiceProps {
  serviceId: bigint;
}

export function ActiveJobsForService({ serviceId }: ActiveJobsForServiceProps): JSX.Element | null {
  const { jobs, isLoading } = useJobs(0, 100);

  const matching = jobs
    .filter((job: Job) => job.serviceId === serviceId && isOpenJob(job))
    .slice(0, 5);

  if (isLoading) return null;
  if (matching.length === 0) return null;

  return (
    <section>
      <header className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Briefcase className="size-4 text-success" />
          Active jobs using this service
        </h2>
        <NextLink
          href={`/marketplace?tab=jobs&serviceId=${serviceId.toString()}`}
          className="text-xs text-[#009F4D] hover:underline inline-flex items-center gap-1"
        >
          View all <ArrowRight className="size-3" />
        </NextLink>
      </header>
      <ul className="space-y-2">
        {matching.map(job => {
          const token = getTokenByAddress(job.paymentToken);
          return (
            <li key={job.id.toString()}>
              <NextLink
                href={`/jobs/${job.id.toString()}`}
                className="block p-3 border border-divider rounded-lg hover:border-primary/50 transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium truncate min-w-0">
                    Job #{job.id.toString()}
                  </span>
                  <span className="text-sm text-success whitespace-nowrap">
                    {formatAmount(job.budget, token, { includeSymbol: true, maxFractionDigits: 4 })}
                  </span>
                </div>
                <p className="text-xs text-default-500 mt-1 line-clamp-1">
                  {job.description || 'No description'}
                </p>
              </NextLink>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
