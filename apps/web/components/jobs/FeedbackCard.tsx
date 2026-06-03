'use client';

import { useState, useCallback, useEffect } from 'react';
import { Card } from '@heroui/react';
import { CheckCircle2 } from 'lucide-react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { keccak256, toHex } from 'viem';
import { ERC8004_ABI } from '@/lib/8004contracts';
import { Textarea } from '@/components/ui/Input';

const ERC8004_REP = process.env.NEXT_PUBLIC_8004_REPUTATION_ADDRESS as `0x${string}`;
const SEPOLIA_CHAIN_ID = 11155111;

export function FeedbackCard({ agentId, jobId }: { agentId: bigint; jobId: bigint }) {
  const [rating, setRating] = useState('850');
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const { writeContract, data: txHash, isPending, error } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const handleSubmit = useCallback(() => {
    const salt = keccak256(toHex(`feedback-${jobId}-${Date.now()}`));
    writeContract({
      chainId: SEPOLIA_CHAIN_ID,
      address: ERC8004_REP,
      abi: ERC8004_ABI,
      functionName: 'giveFeedback',
      args: [
        agentId,
        BigInt(rating),
        2,
        comment || `Feedback for job #${jobId}`,
        '',
        '',
        '',
        salt,
      ],
    });
  }, [agentId, rating, comment, jobId, writeContract]);

  useEffect(() => {
    if (isSuccess && !submitted) {
      setSubmitted(true);
    }
  }, [isSuccess, submitted]);

  if (submitted) {
    return (
      <Card className="border border-success/30 p-6">
        <div className="flex items-center gap-2 text-success">
          <CheckCircle2 className="size-5" />
          <p className="font-medium">Feedback Submitted!</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="border border-divider p-6">
      <h2 className="text-base font-semibold mb-4">Leave Feedback</h2>
      <p className="text-sm text-default-500 mb-4">
        Rate the provider's work on this job. Your feedback is recorded onchain.
      </p>
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium">Rating (0-1000)</label>
          <input
            type="range"
            min="0"
            max="1000"
            value={rating}
            onChange={e => setRating(e.target.value)}
            className="w-full mt-1"
          />
          <div className="flex justify-between text-xs text-default-400">
            <span>0 (Poor)</span>
            <span className="font-medium text-default-700">{rating}</span>
            <span>1000 (Excellent)</span>
          </div>
        </div>
        <div>
          <Textarea
            label="Comment"
            placeholder="How was the work?"
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={2}
          />
        </div>
        {error && (
          <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg text-danger text-sm">
            {error.message}
          </div>
        )}
        <button type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className="w-full px-6 py-3 bg-gradient-to-r from-[#009F4D] to-[#00c853] text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? 'Submitting…' : 'Submit Feedback'}
        </button>
      </div>
    </Card>
  );
}
