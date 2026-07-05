'use client';

import { Check, Circle, AlertCircle } from 'lucide-react';
import { JobStatus, type JobStatusType } from '@/lib/types/contracts';

export type JobRole = 'client' | 'provider' | 'evaluator' | 'observer';

interface StepperNode {
  key: 'open' | 'funded' | 'submitted' | 'completed';
  label: string;
  status: JobStatusType;
  /** Roles for which this step is the actionable one. */
  actionFor: JobRole[];
  description: string;
}

const NODES: StepperNode[] = [
  {
    key: 'open',
    label: 'Open',
    status: JobStatus.Open,
    actionFor: ['client'],
    description: 'Awaiting escrow funding',
  },
  {
    key: 'funded',
    label: 'Funded',
    status: JobStatus.Funded,
    actionFor: ['provider'],
    description: 'Provider prepares deliverable',
  },
  {
    key: 'submitted',
    label: 'Submitted',
    status: JobStatus.Submitted,
    actionFor: ['evaluator'],
    description: 'Awaiting client review / evaluator finalization',
  },
  {
    key: 'completed',
    label: 'Completed',
    status: JobStatus.Completed,
    actionFor: [],
    description: 'Payment released',
  },
];

const BRANCHES: Record<number, { label: string; tone: 'warning' | 'danger' | 'info' }> = {
  [JobStatus.PendingClientApproval]: { label: 'Awaiting client approval', tone: 'info' },
  [JobStatus.Rejected]: { label: 'Rejected', tone: 'danger' },
  [JobStatus.Expired]: { label: 'Expired', tone: 'warning' },
};

interface JobLifecycleStepperProps {
  /** Accepts either a `JobStatusType` (numeric union) or a raw number from on-chain reads. */
  status: JobStatusType | number;
  role: JobRole;
  className?: string;
}

function getActiveNodeIndex(status: number): number {
  if (status === JobStatus.Open) return 0;
  if (status === JobStatus.Funded) return 1;
  if (status === JobStatus.Submitted || status === JobStatus.PendingClientApproval) return 2;
  if (status === JobStatus.Completed) return 3;
  return -1;
}

export function JobLifecycleStepper({
  status,
  role,
  className = '',
}: JobLifecycleStepperProps): JSX.Element {
  const activeIndex = getActiveNodeIndex(status);
  const branch = BRANCHES[status];

  return (
    <div className={`w-full ${className}`}>
      <ol
        role="list"
        aria-label="Job lifecycle"
        className="grid grid-cols-4 gap-2 sm:gap-3"
      >
        {NODES.map((node, index) => {
          const isPast = activeIndex > index;
          const isCurrent = activeIndex === index;
          const isActionable = isCurrent && node.actionFor.includes(role);
          const ringClass = isActionable
            ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
            : isCurrent
              ? 'border-primary bg-primary/5'
              : isPast
                ? 'border-success/40 bg-success/5'
                : 'border-divider bg-content2/60';
          const labelClass = isCurrent
            ? 'text-foreground font-semibold'
            : isPast
              ? 'text-default-600'
              : 'text-default-500';

          return (
            <li
              key={node.key}
              className={`relative rounded-lg border p-2 sm:p-3 transition-colors ${ringClass}`}
              aria-current={isCurrent ? 'step' : undefined}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`size-5 rounded-full flex items-center justify-center shrink-0 ${
                    isPast
                      ? 'bg-primary text-white'
                      : isCurrent
                        ? 'bg-primary/20 text-primary'
                        : 'bg-content3 text-default-400'
                  }`}
                  aria-hidden="true"
                >
                  {isPast ? (
                    <Check className="size-3" />
                  ) : isCurrent ? (
                    <Circle className="size-2.5 fill-current" />
                  ) : (
                    <span className="text-[10px] font-medium">{index + 1}</span>
                  )}
                </span>
                <p className={`text-xs sm:text-sm ${labelClass}`}>{node.label}</p>
              </div>
              <p className="text-[10px] sm:text-xs text-default-500 mt-1 hidden sm:block">
                {node.description}
              </p>
              {isActionable && (
                <p className="text-[10px] sm:text-xs text-primary font-medium mt-1">
                  Action: {node.actionFor.includes('client') ? 'Approve delivery' : node.actionFor.includes('provider') ? 'Submit deliverable' : 'Finalize evaluation'}
                </p>
              )}
            </li>
          );
        })}
      </ol>
      {branch && (
        <div
          role="status"
          className={`mt-3 flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${
            branch.tone === 'danger'
              ? 'border-danger/30 bg-danger/5 text-danger'
              : branch.tone === 'warning'
                ? 'border-warning/30 bg-warning/5 text-warning'
                : 'border-primary/30 bg-primary/5 text-primary'
          }`}
        >
          <AlertCircle className="size-3.5 shrink-0" />
          <span>{branch.label}</span>
        </div>
      )}
    </div>
  );
}
