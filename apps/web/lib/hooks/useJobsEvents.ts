/**
 * Legacy adapter — useJobsEvents has been replaced by subgraph-based hooks.
 * Re-exports from useJobs for backward compatibility.
 */
import { useJobs, getJobStatusLabel, type Job } from './useJobs';

export const useJobsFromEvents = useJobs;
export const JobStatus = { Open: 0, Funded: 1, Submitted: 2, Completed: 3, Rejected: 4, Expired: 5 } as const;
export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];
export type { Job };
export { getJobStatusLabel };
