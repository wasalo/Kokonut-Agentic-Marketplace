'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePublicClient } from 'wagmi';
import { ERC8004_ABI } from '@/lib/8004contracts';
import { debugLog, debugError } from '@/lib/debug';
import { getContractAddress, CONTRACT_ADDRESSES } from '@/lib/contracts/config';
import { calculateHealthScore, HealthScore } from '@/lib/healthScore';
import { KokonutAgent } from './useKokonutAgents';

const LEADERBOARD_STORAGE_KEY = 'kokonut_leaderboard_snapshots';
const SNAPSHOT_RETENTION_DAYS = 30;

export interface LeaderboardEntry {
  agentId: bigint;
  owner: `0x${string}`;
  agentURI: string;
  metadata?: {
    name?: string;
    capabilities?: string[];
    source?: string;
  };
  healthScore: HealthScore;
  reputation: {
    average: number;
    total: number;
    providers: number;
  };
  completedJobs: number;
  activeServices: number;
  lastActivity: number;
  trend?: 'up' | 'down' | 'stable';
}

interface LeaderboardSnapshot {
  date: string;
  scores: Record<string, number>;
}

export type LeaderboardPeriod = 'day' | 'week' | 'month' | 'all';

export interface UseLeaderboardReturn {
  entries: LeaderboardEntry[];
  isLoading: boolean;
  error: Error | null;
  period: LeaderboardPeriod;
  setPeriod: (period: LeaderboardPeriod) => void;
  lastUpdated: Date | null;
  refresh: () => void;
}

function getStorageKey(chainId: number): string {
  return `${LEADERBOARD_STORAGE_KEY}_${chainId}`;
}

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

function loadSnapshots(chainId: number): LeaderboardSnapshot[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(getStorageKey(chainId));
    if (!data) return [];
    const parsed = JSON.parse(data) as LeaderboardSnapshot[];
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - SNAPSHOT_RETENTION_DAYS);
    const cutoff = cutoffDate.toISOString().split('T')[0];
    return parsed.filter(s => s.date >= cutoff);
  } catch {
    return [];
  }
}

function saveSnapshot(chainId: number, scores: Record<string, number>): void {
  if (typeof window === 'undefined') return;
  try {
    const snapshots = loadSnapshots(chainId);
    const today = getTodayDate();
    const existing = snapshots.findIndex(s => s.date === today);
    if (existing >= 0) {
      snapshots[existing] = { date: today, scores };
    } else {
      snapshots.push({ date: today, scores });
    }
    localStorage.setItem(getStorageKey(chainId), JSON.stringify(snapshots));
  } catch (e) {
    debugError('hooks', 'useLeaderboard: Failed to save snapshot', e);
  }
}

function getScoreFromSnapshot(
  snapshots: LeaderboardSnapshot[],
  agentKey: string,
  daysBack: number
): number | null {
  if (daysBack === 0) return null;
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() - daysBack);
  const target = targetDate.toISOString().split('T')[0];
  const snapshot = snapshots.find(s => s.date === target);
  return snapshot?.scores[agentKey] ?? null;
}

export function useLeaderboard(
  kokonutAgents: KokonutAgent[] = [],
  chainId: number = 11155111
): UseLeaderboardReturn {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [period, setPeriod] = useState<LeaderboardPeriod>('all');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const publicClient = usePublicClient();

  const REGISTRY_ADDRESS = getContractAddress(
    process.env.NEXT_PUBLIC_ERC8004_REGISTRY,
    CONTRACT_ADDRESSES.sepolia.erc8004Registry
  );

  const refresh = useCallback(async () => {
    if (kokonutAgents.length === 0) {
      setEntries([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      debugLog('hooks', `useLeaderboard: Building leaderboard from ${kokonutAgents.length} Kokonut agents`);

      const fetchedEntries: LeaderboardEntry[] = [];
      const scores: Record<string, number> = {};

      // Build entries directly from KokonutAgents (no contract calls needed)
      for (const agent of kokonutAgents) {
        const agentId = BigInt(agent.id);
        const uri = agent.agentURI || '';
        
        // Parse metadata from URI - use already-parsed metadata from useKokonutAgents
        const metadata = agent.metadata || {};
        const owner = agent.owner;

        // Generate mock health data (in production, fetch real reputation data)
        const mockReputation = {
          average: Math.random() * 40 + 60,
          total: Math.floor(Math.random() * 100),
          providers: Math.floor(Math.random() * 20),
        };
        const mockCompletedJobs = Math.floor(Math.random() * 50);
        const mockActiveServices = Math.floor(Math.random() * 5);
        const mockLastActivity = Math.floor(Math.random() * 30);

        const healthScore = calculateHealthScore({
          rating: mockReputation.average / 100,
          completionRate: mockCompletedJobs > 0 ? 0.85 : 0,
          activeServices: mockActiveServices,
          recentActivity: mockLastActivity,
        });

        const agentKey = agentId.toString();
        scores[agentKey] = healthScore.score;

        fetchedEntries.push({
          agentId,
          owner,
          agentURI: uri,
          metadata,
          healthScore,
          reputation: mockReputation,
          completedJobs: mockCompletedJobs,
          activeServices: mockActiveServices,
          lastActivity: mockLastActivity,
        });
        debugLog('hooks', `useLeaderboard: Added agent ${agentId} to leaderboard`);
      }

      const sorted = fetchedEntries.sort((a, b) => b.healthScore.score - a.healthScore.score);
      setEntries(sorted);
      setLastUpdated(new Date());

      saveSnapshot(chainId, scores);
      debugLog('hooks', `useLeaderboard: Processed ${sorted.length} Kokonut agents`);
    } catch (err) {
      debugError('hooks', 'useLeaderboard: Error', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch leaderboard'));
    } finally {
      setIsLoading(false);
    }
  }, [publicClient, kokonutAgents, chainId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const entriesWithTrend = useMemo(() => {
    const snapshots = loadSnapshots(chainId);
    return entries.map(entry => {
      const agentKey = entry.agentId.toString();
      let trend: 'up' | 'down' | 'stable' = 'stable';

      const daysBack = period === 'day' ? 1 : period === 'week' ? 7 : period === 'month' ? 30 : 0;
      const previousScore = getScoreFromSnapshot(snapshots, agentKey, daysBack);

      if (previousScore !== null && daysBack > 0) {
        const diff = entry.healthScore.score - previousScore;
        if (diff > 2) trend = 'up';
        else if (diff < -2) trend = 'down';
      }

      return { ...entry, trend };
    });
  }, [entries, period, chainId]);

  return {
    entries: entriesWithTrend,
    isLoading,
    error,
    period,
    setPeriod,
    lastUpdated,
    refresh,
  };
}

export function useAgentRank(
  agentId: bigint,
  entries: LeaderboardEntry[]
): { rank: number; total: number } | null {
  return useMemo(() => {
    if (!entries.length) return null;
    const index = entries.findIndex(e => e.agentId === agentId);
    return {
      rank: index + 1,
      total: entries.length,
    };
  }, [agentId, entries]);
}
