import type { Job } from '@/lib/types/contracts';
import { JobStatus, JobType } from '@/lib/types/contracts';

export function getJobStatusLabel(status: number): string {
  switch (status) {
    case JobStatus.Open:
      return 'Open';
    case JobStatus.Funded:
      return 'Funded';
    case JobStatus.Submitted:
      return 'Submitted';
    case JobStatus.Completed:
      return 'Completed';
    case JobStatus.Rejected:
      return 'Rejected';
    case JobStatus.Expired:
      return 'Expired';
    case JobStatus.PendingClientApproval:
      return 'Pending Approval';
    default:
      return 'Unknown';
  }
}

export function getJobStatusColor(
  status: number
): 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' {
  switch (status) {
    case JobStatus.Open:
      return 'default';
    case JobStatus.Funded:
      return 'primary';
    case JobStatus.Submitted:
      return 'warning';
    case JobStatus.Completed:
      return 'success';
    case JobStatus.Rejected:
      return 'danger';
    case JobStatus.Expired:
      return 'danger';
    case JobStatus.PendingClientApproval:
      return 'warning';
    default:
      return 'default';
  }
}

export function isOpenJob(job: Job): boolean {
  return job.provider === '0x0000000000000000000000000000000000000000';
}

export function getJobTypeLabel(jobType: number): string {
  return jobType === JobType.Open ? 'Open (Bidding)' : 'Direct';
}

export function formatStake(maxBudget: bigint): string {
  const stake = (maxBudget * BigInt(100)) / BigInt(10000);
  return formatAmount(stake, 6);
}

export function formatAmount(amount: bigint, decimals: number = 6): string {
  const divisor = BigInt(10 ** decimals);
  const wholePart = amount / divisor;
  const fractionalPart = amount % divisor;
  const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
  return `${wholePart}.${fractionalStr.slice(0, 2)}`;
}
