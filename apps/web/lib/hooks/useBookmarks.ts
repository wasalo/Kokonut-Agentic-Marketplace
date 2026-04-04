'use client';

import { useCallback, useEffect, useState } from 'react';

const JOBS_KEY = 'kokonut_bookmarks_jobs';
const SERVICES_KEY = 'kokonut_bookmarks_services';
const COUNTS_KEY = 'kokonut_bookmark_counts';

interface BookmarkCounts {
  jobs: Record<string, number>;
  services: Record<string, number>;
}

function getStoredIds(key: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const stored = localStorage.getItem(key);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

function setStoredIds(key: string, ids: Set<string>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify([...ids]));
  } catch {
    // Storage full or unavailable
  }
}

function getStoredCounts(): BookmarkCounts {
  if (typeof window === 'undefined') return { jobs: {}, services: {} };
  try {
    const stored = localStorage.getItem(COUNTS_KEY);
    return stored ? JSON.parse(stored) : { jobs: {}, services: {} };
  } catch {
    return { jobs: {}, services: {} };
  }
}

function incrementCount(type: 'jobs' | 'services', id: string, delta: number): void {
  try {
    const counts = getStoredCounts();
    const current = counts[type][id] || 0;
    const newCount = Math.max(0, current + delta);
    if (newCount === 0) {
      delete counts[type][id];
    } else {
      counts[type][id] = newCount;
    }
    localStorage.setItem(COUNTS_KEY, JSON.stringify(counts));
  } catch {
    // Storage unavailable
  }
}

function getStoredCount(type: 'jobs' | 'services', id: string): number {
  const counts = getStoredCounts();
  return counts[type][id] || 0;
}

export function useJobBookmarks() {
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setBookmarks(getStoredIds(JOBS_KEY));
    setIsLoaded(true);
  }, []);

  const isBookmarked = useCallback((jobId: string) => bookmarks.has(jobId), [bookmarks]);

  const getCount = useCallback((jobId: string) => getStoredCount('jobs', jobId), []);

  const toggleBookmark = useCallback((jobId: string) => {
    setBookmarks(prev => {
      const next = new Set(prev);
      if (next.has(jobId)) {
        next.delete(jobId);
        incrementCount('jobs', jobId, -1);
      } else {
        next.add(jobId);
        incrementCount('jobs', jobId, 1);
      }
      setStoredIds(JOBS_KEY, next);
      return next;
    });
  }, []);

  return {
    bookmarks,
    bookmarkedIds: [...bookmarks],
    isBookmarked,
    getCount,
    toggleBookmark,
    isLoaded,
  };
}

export function useServiceBookmarks() {
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setBookmarks(getStoredIds(SERVICES_KEY));
    setIsLoaded(true);
  }, []);

  const isBookmarked = useCallback((serviceId: string) => bookmarks.has(serviceId), [bookmarks]);

  const getCount = useCallback((serviceId: string) => getStoredCount('services', serviceId), []);

  const toggleBookmark = useCallback((serviceId: string) => {
    setBookmarks(prev => {
      const next = new Set(prev);
      if (next.has(serviceId)) {
        next.delete(serviceId);
        incrementCount('services', serviceId, -1);
      } else {
        next.add(serviceId);
        incrementCount('services', serviceId, 1);
      }
      setStoredIds(SERVICES_KEY, next);
      return next;
    });
  }, []);

  return {
    bookmarks,
    bookmarkedIds: [...bookmarks],
    isBookmarked,
    getCount,
    toggleBookmark,
    isLoaded,
  };
}

export function useBookmarkCounts() {
  const [counts, setCounts] = useState<BookmarkCounts>({
    jobs: {},
    services: {},
  });

  const refresh = useCallback(() => {
    setCounts(getStoredCounts());
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  return {
    jobCounts: counts.jobs,
    serviceCounts: counts.services,
    getJobCount: (id: string) => counts.jobs[id] || 0,
    getServiceCount: (id: string) => counts.services[id] || 0,
    refresh,
  };
}
