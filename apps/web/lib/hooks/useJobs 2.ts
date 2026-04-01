'use client';

import { useState, useEffect } from 'react';

export interface Job {
  id: bigint;
  serviceId: bigint;
  client: string;
  provider: string;
  price: bigint;
  deadline: bigint;
  status: number;
  token: string;
  createdAt: bigint;
}

export const JOB_STATUS_LABELS = ['Pending', 'Active', 'Completed', 'Disputed', 'Cancelled'] as const;
export const JOB_STATUS_COLORS = ['warning', 'success', 'primary', 'danger', 'default'] as const;

export function getJobStatusLabel(status: number): string {
  return JOB_STATUS_LABELS[status] ?? 'Unknown';
}

export function getJobStatusColor(status: number): string {
  return JOB_STATUS_COLORS[status] ?? 'default';
}

export function useJobCount() {
  const [count, setCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Stub implementation
    setCount(0);
    setIsLoading(false);
  }, []);

  return { count, isLoading };
}

export function useUserJobs(user: string | undefined, statusFilter: string = 'all') {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    // Stub implementation
    setJobs([]);
    setIsLoading(false);
  }, [user, statusFilter]);

  return { jobs, isLoading, error, refetch: () => {} };
}

export function useJobs(offset: number = 0, limit: number = 20) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);

  useEffect(() => {
    // Stub implementation
    setJobs([]);
    setTotalCount(0);
    setIsLoading(false);
  }, [offset, limit]);

  return { jobs, isLoading, error, totalCount };
}
