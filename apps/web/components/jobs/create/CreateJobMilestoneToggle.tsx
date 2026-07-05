'use client';

import { Coins } from 'lucide-react';

interface CreateJobMilestoneToggleProps {
  useMilestones: boolean;
  onToggle: (value: boolean) => void;
}

export function CreateJobMilestoneToggle({
  useMilestones,
  onToggle,
}: CreateJobMilestoneToggleProps) {
  return (
    <div className="flex items-start gap-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <Coins className="size-5 text-primary" />
          <span className="font-medium">Milestone-Based Payment</span>
        </div>
        <p className="text-sm text-default-500 mt-1">
          Release funds in phases. Client funds full budget upfront, you receive payments as each
          milestone is completed.
        </p>
      </div>
      <button
        type="button"
        onClick={() => onToggle(!useMilestones)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          useMilestones ? 'bg-primary' : 'bg-default-300'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${
            useMilestones ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}
