'use client';

import { useMemo } from 'react';
import { useActivityFromSubgraph } from './useActivityFromSubgraph';
import { useEfpFollowing } from './useEfpFollowing';

interface UseEfpActivityFeedReturn {
  activities: any[];
  groupedActivities: Record<string, any[]>;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  isFollowFiltered: boolean;
}

export function useEfpActivityFeed(
  address: string | undefined,
  followingOnly = false
): UseEfpActivityFeedReturn {
  const { following, isLoading: isFollowingLoading } = useEfpFollowing(address, {
    limit: 100,
    offset: 0,
  });

  const followingAddresses = useMemo(
    () => new Set(following.map(f => f.address.toLowerCase())),
    [following]
  );

  const actors = followingOnly && followingAddresses.size > 0
    ? Array.from(followingAddresses)
    : undefined;

  const {
    activities,
    isLoading: isActivityLoading,
    error,
    refetch,
  } = useActivityFromSubgraph(undefined, actors, 0, 50);

  const filteredActivities = useMemo(() => {
    if (!followingOnly || followingAddresses.size === 0) return activities;
    return activities.filter(a =>
      a.actor && followingAddresses.has(a.actor.toLowerCase())
    );
  }, [activities, followingOnly, followingAddresses]);

  return {
    activities: filteredActivities,
    groupedActivities: {},
    isLoading: isActivityLoading || isFollowingLoading,
    error,
    refetch,
    isFollowFiltered: followingOnly,
  };
}
