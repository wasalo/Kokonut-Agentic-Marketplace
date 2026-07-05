'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Card } from '@heroui/react';
import { CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { useUserBid, useWithdrawStake, JobStatus, type Job } from '@/lib/hooks/useJobs';
import { ConfirmModal } from '@/components/ConfirmModal';

const CommitBidForm = dynamic(() => import('@/components/BiddingForms').then(m => m.CommitBidForm), {
  loading: () => <div className="animate-pulse h-32 bg-content2 rounded-lg" />,
});

const RevealBidForm = dynamic(() => import('@/components/BiddingForms').then(m => m.RevealBidForm), {
  loading: () => <div className="animate-pulse h-32 bg-content2 rounded-lg" />,
});

const BidStatusCard = dynamic(() => import('@/components/BiddingForms').then(m => m.BidStatusCard), {
  loading: () => <div className="animate-pulse h-24 bg-content2 rounded-lg" />,
});

interface BiddingSectionForProviderProps {
  job: Job;
  address: `0x${string}`;
  refetch: () => void;
}

export function BiddingSectionForProvider({ job, address, refetch }: BiddingSectionForProviderProps) {
  const { bid: userBid } = useUserBid(job.id, address);
  const { withdrawStake, isPending: isWithdrawPending } = useWithdrawStake();
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  const canWithdrawStake =
    userBid &&
    userBid.bidId > BigInt(0) &&
    userBid.revealed &&
    !userBid.accepted &&
    (job.status === JobStatus.Completed ||
      job.status === JobStatus.Rejected ||
      job.status === JobStatus.Expired);

  const handleWithdrawClick = () => {
    setShowWithdrawModal(true);
  };

  const handleWithdrawConfirm = () => {
    setShowWithdrawModal(false);
    withdrawStake(job.id);
  };

  return (
    <div className="space-y-4">
      {userBid && userBid.bidId > BigInt(0) && <BidStatusCard bid={userBid} />}

      {canWithdrawStake && (
        <>
          <button type="button"
            onClick={handleWithdrawClick}
            disabled={isWithdrawPending}
            className="w-full flex items-center gap-3 p-4 border border-warning/30 rounded-lg hover:bg-warning/5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className="size-5 text-warning" />
            <div className="text-left">
              <p className="font-medium">Withdraw Stake</p>
              <p className="text-xs text-default-500">
                Reclaim your staked funds (bid was not accepted)
              </p>
            </div>
            {isWithdrawPending && <Loader2 className="size-5 animate-spin text-warning ml-auto" />}
          </button>
          <ConfirmModal
            isOpen={showWithdrawModal}
            onConfirm={handleWithdrawConfirm}
            onCancel={() => setShowWithdrawModal(false)}
            title="Withdraw Stake"
            message="Withdraw your staked funds? This will forfeit your bid."
            confirmText="Withdraw"
            variant="warning"
            isPending={isWithdrawPending}
          />
        </>
      )}

      {!userBid?.revealed ? (
        <CommitBidForm job={job} onSuccess={refetch} />
      ) : !userBid?.accepted ? (
        <>
          <RevealBidForm job={job} onSuccess={refetch} />
          {!canWithdrawStake && (
            <p className="text-sm text-default-500 text-center">
              Waiting for client to accept a bid...
            </p>
          )}
        </>
      ) : (
        <Card className="border border-success/30 p-6">
          <div className="flex items-center gap-2 text-success">
            <CheckCircle2 className="size-5" />
            <p className="font-medium">Your bid was accepted!</p>
          </div>
          <p className="text-sm text-default-500 mt-2">
            The client has accepted your bid. Check the Actions section to submit your deliverable.
          </p>
        </Card>
      )}
    </div>
  );
}
