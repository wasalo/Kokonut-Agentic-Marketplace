import type { Job } from '@/lib/types/contracts';

export function isOpenJob(job: Job): boolean {
  return job.provider === '0x0000000000000000000000000000000000000000';
}
