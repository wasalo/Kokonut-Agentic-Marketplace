'use client';

import { useState, useEffect } from 'react';

export interface Agent {
  id: string;
  name: string;
  endpoint: string;
  capabilities: string[];
  owner: string;
}

export function useKokonutAgentsByOwner(owner: string | undefined) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!owner) {
      setIsLoading(false);
      return;
    }
    // Stub implementation - would fetch from blockchain
    setAgents([]);
    setIsLoading(false);
  }, [owner]);

  return { agents, isLoading, error };
}
