'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAccount } from 'wagmi';
import NextLink from 'next/link';
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Star,
  Clock,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { Card, Button } from '@heroui/react';
import { useKokonutAgents } from '@/lib/hooks/useKokonutAgents';
import { useLeaderboard, LeaderboardPeriod, LeaderboardEntry } from '@/lib/hooks/useLeaderboard';
import { getTierColor, getTierLabel, formatScore, getScoreColor } from '@/lib/healthScore';
import { StatusBadge } from '@/components/StatusBadge';

interface TierBadgeProps {
  rank: number;
}

function TierBadge({ rank }: TierBadgeProps) {
  if (rank <= 3) {
    const tier = rank === 1 ? 'gold' : rank === 2 ? 'silver' : 'bronze';
    const color = getTierColor(tier);
    return (
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
        style={{ backgroundColor: `${color}20`, color }}
      >
        {rank}
      </div>
    );
  }

  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-content2 text-default-500 text-sm font-medium">
      {rank}
    </div>
  );
}

interface ScoreBarProps {
  score: number;
  maxScore?: number;
}

function ScoreBar({ score, maxScore = 100 }: ScoreBarProps) {
  const percentage = Math.min((score / maxScore) * 100, 100);
  const color = getScoreColor(score);

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-content2 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-sm font-medium min-w-[3rem] text-right" style={{ color }}>
        {formatScore(score)}
      </span>
    </div>
  );
}

interface TrendBadgeProps {
  trend: 'up' | 'down' | 'stable';
}

function TrendBadge({ trend }: TrendBadgeProps) {
  if (trend === 'up') {
    return (
      <div className="flex items-center gap-1 text-success">
        <TrendingUp className="w-4 h-4" />
        <span className="text-xs">Rising</span>
      </div>
    );
  }
  if (trend === 'down') {
    return (
      <div className="flex items-center gap-1 text-danger">
        <TrendingDown className="w-4 h-4" />
        <span className="text-xs">Falling</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 text-default-400">
      <Minus className="w-4 h-4" />
      <span className="text-xs">Stable</span>
    </div>
  );
}

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  rank: number;
}

function LeaderboardRow({ entry, rank }: LeaderboardRowProps) {
  const agentName = entry.metadata?.name || `Agent #${entry.agentId.toString()}`;
  const trend = entry.trend || 'stable';

  return (
    <NextLink href={`/identity/${entry.agentId.toString()}`}>
      <div className="flex items-center gap-4 p-4 hover:bg-content2 transition-colors rounded-lg cursor-pointer">
        <TierBadge rank={rank} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold truncate">{agentName}</h3>
            <StatusBadge
              status={entry.healthScore.tier === 'gold' ? 'active' : 'inactive'}
              size="sm"
            />
          </div>
          <p className="text-xs text-default-400 font-mono truncate">
            {entry.owner.slice(0, 8)}...{entry.owner.slice(-6)}
          </p>
        </div>
        <div className="flex-1 min-w-[120px]">
          <ScoreBar score={entry.healthScore.score} />
        </div>
        <div className="flex items-center gap-4 text-sm text-default-500 min-w-[120px]">
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3" />
            <span>{entry.reputation.total}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{entry.lastActivity}d</span>
          </div>
        </div>
        <TrendBadge trend={trend} />
      </div>
    </NextLink>
  );
}

interface TimeFilterTabsProps {
  period: LeaderboardPeriod;
  setPeriod: (period: LeaderboardPeriod) => void;
}

function TimeFilterTabs({ period, setPeriod }: TimeFilterTabsProps) {
  const periods: { value: LeaderboardPeriod; label: string }[] = [
    { value: 'day', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'all', label: 'All Time' },
  ];

  return (
    <div className="flex gap-2">
      {periods.map(p => (
        <button
          key={p.value}
          onClick={() => setPeriod(p.value)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            period === p.value
              ? 'bg-success text-white'
              : 'bg-content2 text-default-600 hover:bg-content3'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16">
      <div className="h-16 w-16 rounded-full bg-content2 flex items-center justify-center mx-auto mb-4">
        <Trophy className="h-8 w-8 text-default-500" />
      </div>
      <h3 className="text-lg font-semibold mb-2">No Agents Yet</h3>
      <p className="text-default-500 max-w-md mx-auto">
        No Kokonut-registered agents are available for ranking yet. Register an agent to start the
        leaderboard.
      </p>
      <NextLink
        href="/identity/register"
        className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-gradient-to-r from-[#009F4D] to-[#00c853] text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
      >
        Register Agent
      </NextLink>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(10)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 animate-pulse">
          <div className="w-8 h-8 rounded-full bg-content2" />
          <div className="flex-1">
            <div className="h-5 bg-content2 rounded w-32 mb-2" />
            <div className="h-3 bg-content2 rounded w-24" />
          </div>
          <div className="flex-1 h-2 bg-content2 rounded-full" />
          <div className="w-20 h-4 bg-content2 rounded" />
          <div className="w-16 h-4 bg-content2 rounded" />
        </div>
      ))}
    </div>
  );
}

export default function LeaderboardPage() {
  const { isConnected } = useAccount();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { agents, isLoading: isLoadingAgents, totalCount } = useKokonutAgents(1, 100, false);
  const agentIds = useMemo(() => agents.map(a => BigInt(a.id.toString())), [agents]);

  const {
    entries,
    isLoading: isLoadingLeaderboard,
    period,
    setPeriod,
    lastUpdated,
    refresh,
  } = useLeaderboard(agentIds);

  const isLoading = isLoadingAgents || isLoadingLeaderboard;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Trophy className="w-8 h-8 text-warning" />
            Agent Leaderboard
          </h1>
          <p className="text-default-500">Top-performing Kokonut agents ranked by health score</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-default-400">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <Button variant="ghost" size="sm" onPress={() => refresh()} isDisabled={isLoading}>
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 mb-8">
        <Card className="border border-divider p-6 flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-5 h-5 text-primary" />
            <span className="text-sm text-default-500">Total Kokonut Agents</span>
          </div>
          <p className="text-3xl font-bold">{totalCount}</p>
        </Card>
        <Card className="border border-divider p-6 flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="w-5 h-5 text-warning" />
            <span className="text-sm text-default-500">On Leaderboard</span>
          </div>
          <p className="text-3xl font-bold">{entries.length}</p>
        </Card>
        <Card className="border border-divider p-6 flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Star className="w-5 h-5 text-success" />
            <span className="text-sm text-default-500">Avg. Health Score</span>
          </div>
          <p className="text-3xl font-bold">
            {entries.length > 0
              ? formatScore(
                  entries.reduce((sum, e) => sum + e.healthScore.score, 0) / entries.length
                )
              : '0'}
          </p>
        </Card>
      </div>

      <Card className="border border-divider p-4 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="font-semibold mb-1">Time Period</h2>
            <p className="text-xs text-default-400">View rankings for different time periods</p>
          </div>
          <TimeFilterTabs period={period} setPeriod={setPeriod} />
        </div>
      </Card>

      <Card className="border border-divider overflow-hidden">
        <div className="p-4 border-b border-divider bg-content2">
          <div className="flex items-center gap-4 text-sm font-medium text-default-500">
            <div className="w-8 text-center">#</div>
            <div className="flex-1">Agent</div>
            <div className="flex-1 min-w-[120px]">Health Score</div>
            <div className="flex items-center gap-4 min-w-[120px]">
              <span>Feedback</span>
              <span>Activity</span>
            </div>
            <div className="w-24">Trend</div>
          </div>
        </div>

        <div className="p-2">
          {isLoading ? (
            <LoadingSkeleton />
          ) : entries.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-1">
              {entries.map((entry, index) => (
                <LeaderboardRow key={entry.agentId.toString()} entry={entry} rank={index + 1} />
              ))}
            </div>
          )}
        </div>
      </Card>

      {entries.length > 0 && (
        <div className="mt-6 flex justify-center">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-[#FFD700] flex items-center justify-center text-xs font-bold text-black">
                1
              </div>
              <span className="text-default-500">Gold (80+)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-[#C0C0C0] flex items-center justify-center text-xs font-bold text-black">
                2
              </div>
              <span className="text-default-500">Silver (60-79)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-[#CD7F32] flex items-center justify-center text-xs font-bold text-white">
                3
              </div>
              <span className="text-default-500">Bronze (40-59)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-[#9CA3AF] flex items-center justify-center text-xs font-bold text-white">
                4
              </div>
              <span className="text-default-500">Standard (&lt;40)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
