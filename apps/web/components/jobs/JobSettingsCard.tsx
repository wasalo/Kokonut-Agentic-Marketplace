'use client';

import { Card } from '@heroui/react';
import { Settings, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { type Job } from '@/lib/hooks/useJobs';

interface JobSettingsCardProps {
  job: Job;
  isClient: boolean;
  isUSDC: boolean;
  budgetDecimals: number;
  newBudget: string;
  setNewBudget: (v: string) => void;
  setBudget: (jobId: bigint, amount: bigint) => void;
  isBudgetPending: boolean;
  handleAction: (step: string, fn: () => void) => void;
}

export function JobSettingsCard({
  job,
  isClient,
  isUSDC,
  budgetDecimals,
  newBudget,
  setNewBudget,
  setBudget,
  isBudgetPending,
  handleAction,
}: JobSettingsCardProps) {
  if (job.status !== 0 || !isClient) return null;

  return (
    <Card className="border border-divider p-6">
      <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
        <Settings className="size-4" />
        Job Settings
      </h2>
      <div className="space-y-4">
        <div>
          <Input
            type="number"
            label={`Update Budget (${isUSDC ? 'USDC' : 'ETH'})`}
            step={isUSDC ? '0.01' : '0.0001'}
            placeholder="New budget amount"
            value={newBudget}
            onChange={e => setNewBudget(e.target.value)}
            className="flex-1 text-sm"
          />
          <div className="flex gap-2 mt-1">
            <button type="button"
              onClick={() =>
                handleAction('Updating budget', () =>
                  setBudget(job.id, BigInt(Math.floor(parseFloat(newBudget) * 10 ** budgetDecimals)))
                )
              }
              disabled={!newBudget || isBudgetPending}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {isBudgetPending ? <Loader2 className="size-4 animate-spin" /> : 'Update'}
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}
