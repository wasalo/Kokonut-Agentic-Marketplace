'use client';

import { useState, useEffect } from 'react';

export type ActivityType = 'job' | 'service' | 'proposal' | 'all';

export interface Activity {
  id: string;
  type: ActivityType;
  action: string;
  details: {
    targetId: string;
    description: string;
    amount?: string;
    currency?: string;
  };
  timestamp: number;
}

export function useActivityFeed(type: ActivityType = 'all', limit: number = 10) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Stub implementation - activity feed would fetch from blockchain
    setActivities([]);
    setIsLoading(false);
  }, [type, limit]);

  return { activities, isLoading, error };
}
