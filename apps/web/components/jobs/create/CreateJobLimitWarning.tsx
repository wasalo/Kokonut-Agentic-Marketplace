'use client';

import { Card } from '@heroui/react';
import { AlertTriangle } from 'lucide-react';
import { MAX_JOBS_PER_CLIENT } from '@/lib/hooks/useClientJobCount';

interface CreateJobLimitWarningProps {
  jobCount: number;
  isAtLimit: boolean;
  isNearLimit: boolean;
  percentageUsed: number;
  remainingJobs: number;
}

export function CreateJobLimitWarning({
  jobCount,
  isAtLimit,
  isNearLimit,
  percentageUsed,
  remainingJobs,
}: CreateJobLimitWarningProps) {
  return (
    <Card
      className={`border mb-6 p-4 ${isAtLimit ? 'border-danger bg-danger-50' : isNearLimit ? 'border-warning bg-warning-50' : 'border-divider'}`}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle
          className={`size-5 flex-shrink-0 ${isAtLimit ? 'text-danger' : isNearLimit ? 'text-warning' : 'text-default-400'}`}
        />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <p
              className={`text-sm font-medium ${isAtLimit ? 'text-danger' : isNearLimit ? 'text-warning' : 'text-foreground'}`}
            >
              Job Limit: {jobCount} / {MAX_JOBS_PER_CLIENT}
            </p>
            <span className="text-xs text-default-500">{percentageUsed.toFixed(0)}% used</span>
          </div>
          <div className="w-full h-2 bg-content2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${isAtLimit ? 'bg-danger' : isNearLimit ? 'bg-warning' : 'bg-success'}`}
              style={{ width: `${Math.min(100, percentageUsed)}%` }}
            />
          </div>
          {isAtLimit && (
            <p className="text-xs text-danger mt-2">
              You have reached the maximum job limit. Complete or cancel existing jobs to create new
              ones.
            </p>
          )}
          {isNearLimit && !isAtLimit && (
            <p className="text-xs text-warning-600 mt-2">
              You are approaching the job limit. Only {remainingJobs} job
              {remainingJobs !== 1 ? 's' : ''} remaining.
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
