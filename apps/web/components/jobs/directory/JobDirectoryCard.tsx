'use client';

import { memo } from 'react';
import type { MouseEvent } from 'react';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '@heroui/react';
import { Bookmark, Clock, DollarSign } from 'lucide-react';
import { StatusBadge, getJobStatusBadgeType } from '@/components/StatusBadge';
import { useJobBookmarks, useBookmarkCounts } from '@/lib/hooks/useBookmarks';
import { useService } from '@/lib/hooks/useServices';
import type { Job } from '@/lib/hooks/useJobs';
import { formatAmount, getTokenByAddress } from '@/lib/tokenUtils';
import { card } from '@/lib/design-system';

export const JobDirectoryCard = memo(function JobDirectoryCard({ job }: { job: Job }) {
  const router = useRouter();
  const { service } = useService(job.serviceId ?? 0n);
  const { isBookmarked, toggleBookmark } = useJobBookmarks();
  const { getJobCount } = useBookmarkCounts();
  const token = getTokenByAddress(job.paymentToken);
  const formattedBudget = formatAmount(job.budget, token, {
    includeSymbol: true,
    minFractionDigits: token.symbol === 'USDC' ? 2 : 0,
    maxFractionDigits: token.symbol === 'USDC' ? 2 : 6,
  });
  const jobIdStr = job.id.toString();
  const bookmarked = isBookmarked(jobIdStr);
  const bookmarkCount = getJobCount(jobIdStr);

  const handleBookmark = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    toggleBookmark(jobIdStr);
  };

  const prefetchJob = () => {
    router.prefetch(`/jobs/${jobIdStr}`);
  };

  return (
    <Card className={card('interactive')}>
      <div className="flex items-start justify-between gap-4">
        <NextLink
          href={`/jobs/${jobIdStr}`}
          className="flex-1 min-w-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
          onMouseEnter={prefetchJob}
        >
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">Job #{jobIdStr}</h3>
            <StatusBadge status={getJobStatusBadgeType(job.status)} size="sm" />
          </div>
          <p className="text-sm text-default-500 mt-0.5 truncate">{job.description}</p>
          {service && Number(service.id) > 0 && (
            <p className="text-xs text-default-400 mt-0.5">Service: {service.name}</p>
          )}
          <div className="flex items-center gap-4 mt-2 text-xs text-default-400">
            <span className="flex items-center gap-1">
              <DollarSign className="size-3" />
              {formattedBudget}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="size-3" />
              {new Date(Number(job.expiredAt) * 1000).toLocaleDateString()}
            </span>
          </div>
        </NextLink>

        <div className="flex flex-col items-end gap-2">
          <button
            type="button"
            onClick={handleBookmark}
            className={`p-2 rounded-lg transition-colors ${
              bookmarked
                ? 'text-primary hover:bg-primary/10'
                : 'text-default-400 hover:text-default-600 hover:bg-default-100'
            }`}
            title={bookmarked ? 'Remove bookmark' : 'Bookmark this job'}
          >
            <Bookmark className={`size-5 ${bookmarked ? 'fill-current' : ''}`} />
          </button>
          {bookmarkCount > 0 && <span className="text-xs text-default-400">{bookmarkCount}</span>}
        </div>
      </div>
    </Card>
  );
});
