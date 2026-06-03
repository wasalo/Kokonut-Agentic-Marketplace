'use client';

import dynamic from 'next/dynamic';
import { Card } from '@heroui/react';
import { Loader2 } from 'lucide-react';
import { Address } from '@/components/Address';
import { StatusBadge } from '@/components/StatusBadge';
import { type Bid, type Job } from '@/lib/hooks/useJobs';
import { card } from '@/lib/design-system';

const AcceptBidForm = dynamic(() => import('@/components/BiddingForms').then(m => m.AcceptBidForm), {
  loading: () => <div className="animate-pulse h-32 bg-content2 rounded-lg" />,
});

interface JobBidListCardProps {
  job: Job;
  bidCount: number;
  bids: Bid[];
  isLoadingBids: boolean;
  onAccepted: () => void;
}

export function JobBidListCard({ job, bidCount, bids, isLoadingBids, onAccepted }: JobBidListCardProps) {
  return (
    <>
      <Card className={card('padded', 'p-6')}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">Bids Received</h2>
          <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
            {bidCount} bid{bidCount !== 1 ? 's' : ''}
          </span>
        </div>

        {isLoadingBids ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : bids.length === 0 ? (
          <p className="text-sm text-default-500 text-center py-4">
            No bids yet. Providers will commit their bids before the deadline.
          </p>
        ) : (
          <div className="space-y-3">
            {bids.map((bid, idx) => (
              <div key={bid.bidId.toString()} className="p-3 bg-content2 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-default-500">Bidder {idx + 1}</p>
                    <Address address={bid.bidder} className="text-sm" />
                  </div>
                  <div className="text-right">
                    <StatusBadge
                      status={bid.accepted ? 'success' : bid.revealed ? 'info' : 'pending'}
                      size="sm"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <AcceptBidForm job={job} bids={bids} onSuccess={onAccepted} />
    </>
  );
}
