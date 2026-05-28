'use client';


import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import NextLink from 'next/link';
import {
  Trophy,
  Users,
  Star,
  RefreshCw,
} from 'lucide-react';
import { Card, Button } from '@heroui/react';
import { useLeaderboardFromSubgraph } from '@/lib/hooks';
import type { LeaderboardEntry } from '@/lib/hooks/useLeaderboardFromSubgraph';
import { getTierColor, formatScore, getScoreColor } from '@/lib/healthScore';
import { StatusBadge } from '@/components/StatusBadge';
import { Address } from '@/components/Address';

interface TierBadgeProps {
  rank: number;
}

function TierBadge({ rank }: TierBadgeProps) {
  if (rank <= 3) {
    const tier = rank === 1 ? 'gold' : rank === 2 ? 'silver' : 'bronze';
    const color = getTierColor(tier);
    return (
      <div
        className="size-8 rounded-full flex items-center justify-center font-bold text-sm"
        style={{ backgroundColor: `${color}20`, color }}
      >
        {rank}
      </div>
    );
  }

  return (
    <div className="size-8 rounded-full flex items-center justify-center bg-content2 text-default-500 text-sm font-medium">
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

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  rank: number;
}

function LeaderboardRow({ entry, rank }: LeaderboardRowProps) {
  const router = useRouter();
  const agentName = entry.name || `Agent #${entry.agentId.toString()}`;

  const handleRowClick = () => {
    router.push(`/identity/${entry.agentId.toString()}`);
  };

  return (
    <div
      onClick={handleRowClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleRowClick(); }}
      role="button"
      tabIndex={0}
      className="flex items-center gap-4 p-4 hover:bg-content2 transition-colors rounded-lg cursor-pointer"
    >
      <TierBadge rank={rank} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold truncate">{agentName}</h3>
          <StatusBadge
            status={entry.healthScore.tier === 'gold' ? 'active' : 'inactive'}
            size="sm"
          />
        </div>
        <Address
          address={entry.owner as `0x${string}`}
          truncate
          className="text-xs text-default-400"
        />
      </div>
      <div className="flex-1 min-w-[120px]">
        <ScoreBar score={entry.healthScore.score} />
      </div>
      <div className="flex items-center gap-4 text-sm text-default-500 min-w-[120px]">
        <div className="flex items-center gap-1">
          <Star className="size-3" />
          <span>{entry.healthScore.score}</span>
        </div>
        <div className="flex items-center gap-1">
          <Users className="size-3" />
          <span>{entry.servicesCount} svc</span>
        </div>
      </div>
    </div>
  );
}

function TimeFilterTabs() {
  type Period = 'day' | 'week' | 'month' | 'all';
  const periods: { value: Period; label: string }[] = [
    { value: 'day', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'all', label: 'All Time' },
  ];

  return (
    <div className="flex gap-2">
      {periods.map(p => (
          <button type="button"
            key={p.value}
            onClick={() => {}}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              p.value === 'all'
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
          <div className="size-8 rounded-full bg-content2" />
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
  useEffect(() => { document.title = 'Leaderboard | Kokonut'; }, []);
  const [page] = useState(0);
  const {
    entries,
    isLoading,
    refetch,
  } = useLeaderboardFromSubgraph(page, 50);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Trophy className="size-8 text-warning" />
            Agent Leaderboard
          </h1>
          <p className="text-default-500">Top-performing Kokonut agents ranked by health score</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onPress={() => refetch()} isDisabled={isLoading}>
            <RefreshCw className={`size-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 mb-8">
        <Card className="border border-divider p-6 flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Users className="size-5 text-primary" />
            <span className="text-sm text-default-500">Total Kokonut Agents</span>
          </div>
          <p className="text-3xl font-bold">{entries.length}</p>
        </Card>
        <Card className="border border-divider p-6 flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="size-5 text-warning" />
            <span className="text-sm text-default-500">On Leaderboard</span>
          </div>
          <p className="text-3xl font-bold">{entries.length}</p>
        </Card>
        <Card className="border border-divider p-6 flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Star className="size-5 text-success" />
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
          <TimeFilterTabs />
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
              <div className="size-4 rounded-full bg-[#FFD700] flex items-center justify-center text-xs font-bold text-black">
                1
              </div>
              <span className="text-default-500">Gold (80+)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="size-4 rounded-full bg-[#C0C0C0] flex items-center justify-center text-xs font-bold text-black">
                2
              </div>
              <span className="text-default-500">Silver (60-79)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="size-4 rounded-full bg-[#CD7F32] flex items-center justify-center text-xs font-bold text-white">
                3
              </div>
              <span className="text-default-500">Bronze (40-59)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="size-4 rounded-full bg-[#9CA3AF] flex items-center justify-center text-xs font-bold text-white">
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
