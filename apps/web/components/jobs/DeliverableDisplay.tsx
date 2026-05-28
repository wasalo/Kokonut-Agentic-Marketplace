'use client';

import { Card } from '@heroui/react';
import { FileText } from 'lucide-react';
import { type Job } from '@/lib/hooks/useJobs';

interface DeliverableDisplayProps {
  job: Job;
}

export function DeliverableDisplay({ job }: DeliverableDisplayProps) {
  if (job.status < 2) return null;

  return (
    <Card className="border border-divider p-4">
      <div className="flex items-center gap-2">
        <FileText className="size-4 text-default-400" />
        <span className="text-sm text-default-500">Deliverable:</span>
        <code className="text-xs bg-content2 px-2 py-1 rounded font-mono truncate">
          {job.deliverable}
        </code>
      </div>
    </Card>
  );
}
