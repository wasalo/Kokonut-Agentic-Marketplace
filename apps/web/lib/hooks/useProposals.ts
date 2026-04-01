'use client';

import { useState, useEffect } from 'react';

export interface Proposal {
  id: bigint;
  title: string;
  description: string;
  proposer: string;
  optionA: string;
  optionB: string;
  reward: bigint;
  deadline: bigint;
  status: number;
  winningOption: number;
  totalStake: bigint;
}

export function useProposalCount() {
  const [count, setCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setCount(0);
    setIsLoading(false);
  }, []);

  return { count, isLoading };
}

export function useProposals(offset: number = 0, limit: number = 20) {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setProposals([]);
    setIsLoading(false);
  }, [offset, limit]);

  return { proposals, isLoading, error };
}

export function useProposal(id: bigint | undefined) {
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!id) {
      setIsLoading(false);
      return;
    }
    setProposal(null);
    setIsLoading(false);
  }, [id]);

  return { proposal, isLoading, error };
}
