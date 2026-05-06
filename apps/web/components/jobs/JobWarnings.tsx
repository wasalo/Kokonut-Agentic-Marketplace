'use client';

import { Card } from '@heroui/react';
import { DollarSign, Link, AlertTriangle } from 'lucide-react';
import { Address } from '@/components/Address';
import { type Job } from '@/lib/hooks/useJobs';

interface JobWarningsProps {
  job: Job;
  isClient: boolean;
  isProvider: boolean;
  isEvaluatorFeeEnabled: boolean;
  address?: string;
}

export function JobWarnings({ job, isClient, isProvider, isEvaluatorFeeEnabled, address }: JobWarningsProps) {
  return (
    <>
      {isClient && isEvaluatorFeeEnabled && (
        <Card className="border border-success/20 bg-success/5 p-4">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-success" />
            <span className="text-sm text-success">
              Evaluator fee enabled (+1% of budget on completion)
            </span>
          </div>
        </Card>
      )}

      {job.hook && job.hook !== '0x0000000000000000000000000000000000000000' && (
        <Card className="border border-divider p-4">
          <div className="flex items-center gap-2">
            <Link className="w-4 h-4 text-default-400" />
            <span className="text-sm text-default-500">Hook:</span>
            <Address address={job.hook as `0x${string}`} className="text-sm" />
          </div>
        </Card>
      )}

      {isClient && job.evaluator.toLowerCase() !== job.client.toLowerCase() && job.evaluator.toLowerCase() === address?.toLowerCase() && (
        <Card className="border border-warning/20 bg-warning/5 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning" />
            <span className="text-sm text-warning">
              Warning: You are both the Client and the Evaluator for this job.
            </span>
          </div>
        </Card>
      )}

      {isProvider && job.evaluator.toLowerCase() === job.provider.toLowerCase() && (
        <Card className="border border-warning/20 bg-warning/5 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning" />
            <span className="text-sm text-warning">
              Warning: The Evaluator is the same as the Provider. This may be a conflict of interest.
            </span>
          </div>
        </Card>
      )}
    </>
  );
}
