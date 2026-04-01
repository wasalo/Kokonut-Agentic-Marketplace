'use client';

import { useState, useEffect } from 'react';

export interface Service {
  id: bigint;
  skillId: bigint;
  name: string;
  description: string;
  price: bigint;
  provider: string;
  active: boolean;
  metadataURI: string;
}

export function useActiveServiceCount() {
  const [count, setCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Stub implementation
    setCount(0);
    setIsLoading(false);
  }, []);

  return { count, isLoading };
}

export function useProviderServices(provider: string | undefined) {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!provider) {
      setIsLoading(false);
      return;
    }
    // Stub implementation
    setServices([]);
    setIsLoading(false);
  }, [provider]);

  return { services, isLoading, error, refetch: () => {} };
}

export function useServices(offset: number = 0, limit: number = 20) {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);

  useEffect(() => {
    // Stub implementation
    setServices([]);
    setTotalCount(0);
    setIsLoading(false);
  }, [offset, limit]);

  return { services, isLoading, error, totalCount };
}
