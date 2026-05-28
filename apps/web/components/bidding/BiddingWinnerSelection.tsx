'use client';

import { Loader2 } from 'lucide-react';
import { formatEther } from 'viem';
import type { BidInfo } from '@/lib/hooks/useBiddingSystem';

interface BiddingWinnerSelectionProps {
  selectableBids: BidInfo[];
  selectedBid: BidInfo | undefined;
  isLoadingRevealedBids: boolean;
  isAcceptPending: boolean;
  isRejectPending: boolean;
  isCancelPending: boolean;
  onSelectBid: (bidId: bigint) => void;
  onAcceptBid: () => void;
  onRejectBid: () => void;
  onCancelSession: () => void;
}

export function BiddingWinnerSelection({
  selectableBids,
  selectedBid,
  isLoadingRevealedBids,
  isAcceptPending,
  isRejectPending,
  isCancelPending,
  onSelectBid,
  onAcceptBid,
  onRejectBid,
  onCancelSession,
}: BiddingWinnerSelectionProps) {
  return (
    <div className="space-y-4">
      <p className="text-default-500">The bidding is closed. Select a winner to proceed.</p>
      {isLoadingRevealedBids ? (
        <div className="flex items-center gap-2 text-default-500">
          <Loader2 className="size-4 animate-spin" />
          Loading revealed bids...
        </div>
      ) : selectableBids.length === 0 ? (
        <div className="p-4 rounded-lg border border-warning/30 bg-warning/10">
          <p className="text-sm text-warning-700 dark:text-warning-200">
            No revealed provider bids are available yet.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {selectableBids.map((bid: BidInfo) => {
            const isSelected = selectedBid?.bidId === bid.bidId;
            return (
              <button
                type="button"
                key={bid.bidId.toString()}
                onClick={() => onSelectBid(bid.bidId)}
                className={`w-full text-left p-4 rounded-lg border transition-colors ${
                  isSelected
                    ? 'border-[#009F4D] bg-[#009F4D]/5'
                    : 'border-divider hover:bg-content2'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <p className="font-medium">Bid #{bid.bidId.toString()}</p>
                    <p className="text-xs text-default-500 font-mono">{bid.bidder}</p>
                    {bid.message && (
                      <p className="text-sm text-default-500 mt-1">{bid.message}</p>
                    )}
                  </div>
                  <div className="md:text-right">
                    <p className="font-semibold text-[#009F4D]">
                      {Number(formatEther(bid.proposedAmount)).toFixed(4)} ETH
                    </p>
                    <p className="text-xs text-default-500">
                      Stake {Number(formatEther(bid.stake)).toFixed(4)} ETH
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
      <div className="flex flex-wrap gap-4">
        <button
          type="button"
          onClick={onAcceptBid}
          disabled={!selectedBid || selectedBid.accepted || isAcceptPending}
          className="px-6 py-2 bg-[#009F4D] text-white font-medium rounded-lg hover:bg-[#008F3D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isAcceptPending ? (
            <Loader2 className="size-4 animate-spin inline" />
          ) : selectedBid?.accepted ? (
            'Accepted'
          ) : (
            'Accept Winning Bid'
          )}
        </button>
        <button
          type="button"
          onClick={onRejectBid}
          disabled={!selectedBid || selectedBid.rejected || isRejectPending}
          className="px-6 py-2 bg-warning text-white font-medium rounded-lg hover:opacity-80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRejectPending ? (
            <Loader2 className="size-4 animate-spin inline" />
          ) : selectedBid?.rejected ? (
            'Rejected'
          ) : (
            'Reject Bid'
          )}
        </button>
        <button
          type="button"
          onClick={onCancelSession}
          disabled={isCancelPending}
          className="px-6 py-2 bg-danger text-white font-medium rounded-lg hover:opacity-80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCancelPending ? (
            <Loader2 className="size-4 animate-spin inline" />
          ) : (
            'Cancel Session'
          )}
        </button>
      </div>
    </div>
  );
}
