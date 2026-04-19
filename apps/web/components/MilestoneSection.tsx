'use client';

import { useState } from 'react';
import { Card, Button, Chip, Input } from '@heroui/react';
import {
  ListChecks,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,
  Unlock,
  Gavel,
} from 'lucide-react';
import { formatUnits } from 'viem';
import {
  useJobMilestones,
  useJobMilestonesDetails,
  useDispute,
  useCompleteMilestone,
  useReleaseMilestone,
  useFlagDispute,
  ARBITER_FEE_ETH,
} from '@/lib/hooks/useMilestoneEscrow';
import { Address } from '@/components/Address';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { useAccount } from 'wagmi';

interface MilestoneSectionProps {
  jobId: bigint;
  provider: string;
  isClient: boolean;
  isProvider: boolean;
  onRefetch?: () => void;
}

export function MilestoneSection({
  jobId,
  provider,
  isClient,
  isProvider,
  onRefetch,
}: MilestoneSectionProps): JSX.Element {
  const { address } = useAccount();
  const [proofHash, setProofHash] = useState('');
  const [evidenceHash, setEvidenceHash] = useState('');

  const { milestones, isLoading: loadingMilestones, refetch: refetchMilestones } = useJobMilestones(jobId);
  const { details } = useJobMilestonesDetails(jobId);
  const { dispute } = useDispute(jobId);

  const {
    completeMilestone,
    isPending: isCompletePending,
    isSuccess: isCompleteSuccess,
    writeError: completeError,
  } = useCompleteMilestone();

  const {
    releaseMilestone,
    isPending: isReleasePending,
    isSuccess: isReleaseSuccess,
    writeError: releaseError,
  } = useReleaseMilestone();

  const {
    flagDispute,
    isPending: isFlagPending,
    isSuccess: isFlagSuccess,
    writeError: flagError,
  } = useFlagDispute();

  const hasMilestones = details?.usesMilestones && milestones && milestones.length > 0;

  if (!details?.usesMilestones) {
    return (
      <Card className="border border-divider p-6">
        <div className="flex items-center gap-3 mb-4">
          <ListChecks className="w-5 h-5 text-default-400" />
          <h2 className="text-base font-semibold">Milestones</h2>
        </div>
        <p className="text-sm text-default-500">
          This job uses standard single payment. Enable milestones to split payments into multiple phases.
        </p>
      </Card>
    );
  }

  const handleCompleteMilestone = async (index: number) => {
    if (!proofHash) return;
    await completeMilestone(jobId, BigInt(index), `0x${proofHash.replace('0x', '')}` as `0x${string}`);
  };

  const handleReleaseMilestone = async (index: number) => {
    await releaseMilestone(jobId, BigInt(index));
  };

  const handleFlagDispute = async () => {
    await flagDispute(jobId);
  };

  return (
    <Card className="border border-divider p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <ListChecks className="w-5 h-5 text-primary" />
          <h2 className="text-base font-semibold">Milestones</h2>
          <Chip size="sm" variant="soft" color="accent">
            {milestones?.length || 0} phase{milestones?.length !== 1 ? 's' : ''}
          </Chip>
        </div>
        {details && (
          <div className="text-sm text-default-500">
            Total: {formatUnits(details.totalBudget, 6)} USDC
          </div>
        )}
      </div>

      {loadingMilestones ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : milestones && milestones.length > 0 ? (
        <div className="space-y-3">
          {milestones.map((milestone, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border ${
                milestone.released
                  ? 'border-success/30 bg-success/5'
                  : milestone.completed
                  ? 'border-primary/30 bg-primary/5'
                  : 'border-divider'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Phase {index + 1}</span>
                    {milestone.completed && !milestone.released && (
                      <Chip size="sm" variant="soft" color="warning">
                        Awaiting Release
                      </Chip>
                    )}
                    {milestone.released && (
                      <Chip size="sm" variant="soft" color="success">
                        Released
                      </Chip>
                    )}
                    {!milestone.completed && !milestone.released && (
                      <Chip size="sm" variant="soft" color="default">
                        Pending
                      </Chip>
                    )}
                  </div>
                  <p className="text-sm text-default-600 mt-1">{milestone.description}</p>
                  <p className="text-lg font-semibold text-primary mt-2">
                    {formatUnits(milestone.amount, 6)} USDC
                  </p>
                  {milestone.dueDate > 0 && (
                    <div className="flex items-center gap-1 text-xs text-default-400 mt-2">
                      <Clock className="w-3 h-3" />
                      <span>Due: {new Date(Number(milestone.dueDate) * 1000).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Provider: Complete milestone */}
              {isProvider && !milestone.completed && (
                <div className="mt-4 pt-4 border-t border-divider">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Proof hash (IPFS or data URI)"
                      value={proofHash}
                      onChange={(e) => setProofHash(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      className="bg-[#009F4D] text-white disabled:opacity-50"
                      onPress={() => handleCompleteMilestone(index)}
                      isDisabled={!proofHash || isCompletePending}
                    >
                      {isCompletePending ? 'Submitting...' : 'Submit'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Client: Release milestone */}
              {isClient && milestone.completed && !milestone.released && (
                <div className="mt-4 pt-4 border-t border-divider">
                  <Button
                    size="sm"
                    className="bg-success text-white disabled:opacity-50"
                    onPress={() => handleReleaseMilestone(index)}
                    isDisabled={isReleasePending}
                  >
                    {isReleasePending ? 'Releasing...' : 'Release Payment'}
                  </Button>
                </div>
              )}
            </div>
          ))}

          {completeError && <ErrorDisplay error={completeError} />}
          {releaseError && <ErrorDisplay error={releaseError} />}
        </div>
      ) : (
        <p className="text-sm text-default-500">No milestones defined yet.</p>
      )}

      {/* Dispute Section */}
      {(isClient || isProvider) && !dispute?.resolved && (
        <div className="mt-6 pt-6 border-t border-divider">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-warning" />
            <h3 className="text-sm font-semibold">Dispute Resolution</h3>
          </div>

          {dispute?.flaggler ? (
            <div className="p-4 bg-warning/10 border border-warning/30 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-warning">Dispute Active</p>
                  <p className="text-xs text-default-500 mt-1">
                    Flagged by: <Address address={dispute.flaggler} truncate />
                  </p>
                  {dispute.arbiter && (
                    <p className="text-xs text-default-500 mt-1">
                      Arbiter: <Address address={dispute.arbiter} truncate />
                    </p>
                  )}
                </div>
                <Gavel className="w-6 h-6 text-warning" />
              </div>
            </div>
          ) : (
            <div className="p-4 bg-default-50 rounded-lg">
              <p className="text-xs text-default-500 mb-3">
                Having an issue? Flag a dispute to engage an arbiter (0.001 ETH fee).
              </p>
              <Button
                size="sm"
                className="border-warning text-warning"
                variant="outline"
                onPress={handleFlagDispute}
                isDisabled={isFlagPending}
              >
                {isFlagPending ? 'Flagging...' : 'Flag Dispute'}
              </Button>
              <p className="text-xs text-default-400 mt-2">
                Fee: {ARBITER_FEE_ETH} ETH
              </p>
              {flagError && <ErrorDisplay error={flagError} />}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}