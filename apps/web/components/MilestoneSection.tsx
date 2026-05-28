'use client';

import { useState, useEffect } from 'react';
import { Card, Button, Chip } from '@heroui/react';
import {
  ListChecks,
  Clock,
  Loader2,
  Plus,
} from 'lucide-react';
import { useTokenPriceConversion } from '@/lib/hooks/useTokenConversion';
import { formatAmount, getTokenByAddress, parseAmount } from '@/lib/tokenUtils';
import {
  useJobMilestones,
  useJobMilestonesDetails,
  useCompleteMilestone,
  useReleaseMilestone,
  useAddMilestone,
  useEnableMilestones,
} from '@/lib/hooks/useMilestoneEscrow';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { JobStatus } from '@/lib/hooks/useJobs';

interface MilestoneSectionProps {
  jobId: bigint;
  client: string;
  provider: string;
  paymentToken: string;
  budget: bigint;
  jobStatus?: number;
  isClient: boolean;
  isProvider: boolean;
  onRefetch?: () => void;
}

function isTerminalStatus(status?: number) {
  return status === JobStatus.Completed || status === JobStatus.Rejected || status === JobStatus.Expired;
}

export function MilestoneSection({
  jobId,
  client,
  provider,
  paymentToken,
  budget,
  jobStatus,
  isClient,
  isProvider,
  onRefetch,
}: MilestoneSectionProps): JSX.Element | null {
  const [proofHash, setProofHash] = useState('');
  
  // Add milestone form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDescription, setNewDescription] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [enableConfirmed, setEnableConfirmed] = useState(false);

  const { milestones, isLoading: loadingMilestones, error: milestonesError, refetch: refetchMilestones } = useJobMilestones(jobId);
  const { details, error: detailsError, refetch: refetchDetails } = useJobMilestonesDetails(jobId);

  const token = getTokenByAddress(paymentToken);
  const tokenSymbol = token.symbol;
  const tokenDecimals = token.decimals;
  const isTerminal = isTerminalStatus(jobStatus);
  const { formatUsdValue, isLoading: isPriceLoading } = useTokenPriceConversion();

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
    addMilestone,
    isPending: isAddMilestonePending,
    isSuccess: isAddMilestoneSuccess,
    writeError: addMilestoneError,
  } = useAddMilestone();



  const {
    enableMilestones,
    isPending: isEnablePending,
    isSuccess: isEnableSuccess,
    writeError: enableError,
  } = useEnableMilestones();

  // Auto-refresh milestone state when enable tx confirms
  useEffect(() => {
    if (isEnableSuccess) {
      setEnableConfirmed(true);
      refetchMilestones();
      refetchDetails();
      onRefetch?.();
    }
  }, [isEnableSuccess, refetchMilestones, refetchDetails, onRefetch]);

  // Auto-refresh after add milestone confirms
  useEffect(() => {
    if (isAddMilestoneSuccess) {
      refetchMilestones();
      refetchDetails();
      onRefetch?.();
    }
  }, [isAddMilestoneSuccess, refetchMilestones, refetchDetails, onRefetch]);

  // Auto-refresh after complete milestone confirms
  useEffect(() => {
    if (isCompleteSuccess) {
      refetchMilestones();
      onRefetch?.();
    }
  }, [isCompleteSuccess, refetchMilestones, onRefetch]);

  // Auto-refresh after release milestone confirms
  useEffect(() => {
    if (isReleaseSuccess) {
      refetchMilestones();
      refetchDetails();
      onRefetch?.();
    }
  }, [isReleaseSuccess, refetchMilestones, refetchDetails, onRefetch]);

  // Auto-open add form when milestones are enabled but none exist yet
  useEffect(() => {
    if (details?.usesMilestones && milestones && milestones.length === 0 && !loadingMilestones) {
      setShowAddForm(true);
    }
  }, [details?.usesMilestones, milestones, loadingMilestones]);

  if (!details?.usesMilestones && !enableConfirmed) {
    return (
      <Card className="border border-divider p-6">
        <div className="flex items-center gap-3 mb-4">
          <ListChecks className="size-4 text-default-400" />
          <h2 className="text-base font-semibold">Milestones</h2>
        </div>
        {isClient && !isTerminal ? (
          <div className="space-y-3">
            <p className="text-sm text-default-500">
              No milestones configured. Enable milestone-based payments to split this job into payable phases.
            </p>
            <button type="button"
              onClick={() => enableMilestones(jobId, client as `0x${string}`, provider as `0x${string}`, paymentToken as `0x${string}`, budget)}
              disabled={isEnablePending}
              className="px-4 py-2 bg-[#009F4D] text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 text-sm"
            >
              {isEnablePending ? 'Enabling…' : 'Enable Milestones'}
            </button>
            {enableError && <ErrorDisplay error={enableError} />}
          </div>
        ) : (
          <p className="text-sm text-default-500">
            {isTerminal ? 'Milestones cannot be enabled for jobs in terminal state.' : 'Milestones not enabled for this job.'}
          </p>
        )}
      </Card>
    );
  }

  const handleAddMilestone = async () => {
    if (!newDescription || !newAmount) {
      return;
    }
    try {
      const amountRaw = parseAmount(newAmount, token);
      const dueDate = newDueDate ? BigInt(Math.floor(new Date(newDueDate).getTime() / 1000)) : 0n;
      await addMilestone(jobId, amountRaw, newDescription, dueDate);
      setNewDescription('');
      setNewAmount('');
      setNewDueDate('');
      setShowAddForm(false);
    } catch (e) {
      console.error('[milestone] addMilestone failed:', e);
    }
  };

  const handleCompleteMilestone = async (index: number) => {
    if (!proofHash) return;
    try {
      await completeMilestone(jobId, BigInt(index), `0x${proofHash.replace('0x', '')}` as `0x${string}`);
    } catch (e) {
      console.error('[milestone] completeMilestone failed:', e);
    }
  };

  const handleReleaseMilestone = async (index: number) => {
    try {
      await releaseMilestone(jobId, BigInt(index));
    } catch (e) {
      console.error('[milestone] releaseMilestone failed:', e);
    }
  };

  return (
    <Card className="border border-divider p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <ListChecks className="size-5 text-primary" />
          <h2 className="text-base font-semibold">Milestones</h2>
          <Chip size="sm" variant="soft" color="accent">
            {milestones?.length || 0} phase{milestones?.length !== 1 ? 's' : ''}
          </Chip>
        </div>
        <div className="flex items-center gap-3">
          {details && details.totalBudget !== undefined && (
            <div className="text-sm text-default-500">
              Total: {formatAmount(details.totalBudget ?? 0n, token, {
                includeSymbol: true,
                minFractionDigits: token.symbol === 'USDC' ? 2 : 0,
                maxFractionDigits: token.symbol === 'USDC' ? 2 : 6,
              })}
              {tokenSymbol !== 'USDC' && !isPriceLoading && (
                <span className="text-xs text-default-400 ml-1">
                  ({formatUsdValue(details.totalBudget ?? 0n, token)} USD)
                </span>
              )}
            </div>
          )}
          {isClient && !showAddForm && !isTerminal && (
            <button type="button"
              onClick={() => setShowAddForm(true)}
              className="px-3 py-1.5 text-sm text-primary bg-primary/10 rounded-lg font-medium hover:bg-primary/20 flex items-center gap-1"
            >
              <Plus className="size-4" />
              Add
            </button>
          )}
        </div>
      </div>

      {/* Error display */}
      {(milestonesError || detailsError) && (
        <div className="mb-4">
          {milestonesError && <ErrorDisplay error={milestonesError} />}
          {detailsError && <ErrorDisplay error={detailsError} />}
        </div>
      )}

      {/* Terminal state warning */}
      {isTerminal && (
        <div className="mb-4 p-3 bg-default-50 border border-divider rounded-lg">
          <p className="text-xs text-default-500">
            This job has reached a terminal state. Milestone actions are disabled.
          </p>
        </div>
      )}

      {/* Add Milestone Form */}
      {showAddForm && !isTerminal && (
        <div className="mb-4 p-4 bg-content2 rounded-lg border border-divider">
          <h3 className="text-sm font-medium mb-3">Add New Milestone</h3>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Description (e.g., Phase 1 completion)"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              className="w-full px-3 py-2 bg-content2 border border-divider rounded-lg focus:outline-none focus:ring-2 focus:ring-success text-sm"
            />
            <div className="flex gap-2">
              <input
                type="number"
                step={tokenDecimals === 18 ? '0.0001' : '0.01'}
                placeholder={`Amount (${tokenSymbol})`}
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                className="flex-1 px-3 py-2 bg-content2 border border-divider rounded-lg focus:outline-none focus:ring-2 focus:ring-success text-sm"
              />
              <input
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                className="w-40 px-3 py-2 bg-content2 border border-divider rounded-lg focus:outline-none focus:ring-2 focus:ring-success text-sm"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setNewDescription('');
                  setNewAmount('');
                  setNewDueDate('');
                }}
                className="px-3 py-1.5 text-sm text-default-500 hover:text-default-700"
              >
                Cancel
              </button>
              <button type="button"
                onClick={handleAddMilestone}
                disabled={!newDescription || !newAmount || isAddMilestonePending}
                className="px-3 py-1.5 bg-[#009F4D] text-white text-sm rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
              >
                {isAddMilestonePending ? 'Adding…' : 'Add Milestone'}
              </button>
            </div>
            {addMilestoneError && <ErrorDisplay error={addMilestoneError} />}
          </div>
        </div>
      )}

      {loadingMilestones ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="size-6 animate-spin text-primary" />
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
                    {formatAmount(milestone.amount ?? 0n, token, {
                      includeSymbol: true,
                      minFractionDigits: token.symbol === 'USDC' ? 2 : 0,
                      maxFractionDigits: token.symbol === 'USDC' ? 2 : 6,
                    })}
                    {tokenSymbol !== 'USDC' && !isPriceLoading && (
                      <span className="text-xs text-default-400 ml-1">
                        ({formatUsdValue(milestone.amount ?? 0n, token)} USD)
                      </span>
                    )}
                  </p>
                  {milestone.dueDate > 0 && (
                    <div className="flex items-center gap-1 text-xs text-default-400 mt-2">
                      <Clock className="size-3" />
                      <span>Due: {new Date(Number(milestone.dueDate) * 1000).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Provider: Complete milestone */}
              {isProvider && !milestone.completed && !isTerminal && (
                <div className="mt-4 pt-4 border-t border-divider">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Proof hash (IPFS or data URI)"
                      value={proofHash}
                      onChange={(e) => setProofHash(e.target.value)}
                      className="flex-1 px-3 py-2 bg-content2 border border-divider rounded-lg focus:outline-none focus:ring-2 focus:ring-success text-sm"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-[#009F4D] text-[#009F4D]"
                      onPress={() => handleCompleteMilestone(index)}
                      isDisabled={!proofHash || isCompletePending || isTerminal}
                    >
                      {isCompletePending ? 'Submitting…' : 'Submit'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Client: Release milestone */}
              {isClient && milestone.completed && !milestone.released && !isTerminal && (
                <div className="mt-4 pt-4 border-t border-divider">
                  <button type="button"
                    onClick={() => handleReleaseMilestone(index)}
                    disabled={isReleasePending || isTerminal}
                    className="px-3 py-1.5 bg-success text-white text-sm rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
                  >
                    {isReleasePending ? 'Releasing…' : 'Release Payment'}
                  </button>
                </div>
              )}
            </div>
          ))}

          {completeError && <ErrorDisplay error={completeError} />}
          {releaseError && <ErrorDisplay error={releaseError} />}
        </div>
      ) : (
        <div className="text-center py-6">
          <p className="text-sm text-default-500 mb-3">No milestones defined yet.</p>
          {isClient && (
            <p className="text-xs text-default-400">
              Add milestones to split this job into payable phases. Each milestone releases payment upon completion.
            </p>
          )}
        </div>
      )}

    </Card>
  );
}
