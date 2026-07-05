'use client';

import { useState, useEffect } from 'react';
import NextLink from 'next/link';
import { Card } from '@heroui/react';
import { Activity, Briefcase, ShoppingBag, ExternalLink, Filter, Users } from 'lucide-react';
import { useAccount } from 'wagmi';
import { useActivityFromSubgraph } from '@/lib/hooks';
import { StatusBadge } from '@/components/StatusBadge';
import { Address } from '@/components/Address';
import { card, btn, DS } from '@/lib/design-system';

const ACTIVITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  job: Briefcase,
  service: ShoppingBag,
  all: Activity,
};

const ACTIVITY_COLORS: Record<string, string> = {
  job: DS.colors.primary,
  service: DS.colors.chart[2],
  all: '#666',
};

interface ActivityItemData {
  id: string;
  type: string;
  action: string;
  actor: `0x${string}`;
  blockNumber: bigint;
  details: {
    title?: string;
    description?: string;
    amount?: string;
    currency?: string;
    targetId?: string;
  };
}

function ActivityItem({ activity }: { activity: ActivityItemData }) {
  const typeKey = activity.type.split('_')[0].toLowerCase() as keyof typeof ACTIVITY_ICONS;
  const Icon = ACTIVITY_ICONS[typeKey] ?? Activity;
  const color = ACTIVITY_COLORS[activity.type] ?? '#666';

  const getLink = () => {
    switch (activity.type) {
      case 'job':
        return `/jobs/${activity.details.targetId}`;
      case 'service':
        return `/marketplace/${activity.details.targetId}`;
      default:
        return '#';
    }
  };

  return (
    <div className="flex items-start gap-4 p-4 hover:bg-content2/50 transition-colors rounded-lg">
      <div
        className="size-10 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${color}20` }}
      >
        <span style={{ color }}>
          <Icon className="size-5" />
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-foreground">{activity.action}</span>
          <StatusBadge
            status={
              activity.type === 'job' ? 'active' : activity.type === 'service' ? 'success' : 'info'
            }
            size="sm"
          />
        </div>

        <p className="text-sm text-default-500 mb-1">{activity.details.description}</p>

        <div className="flex items-center gap-4 text-xs text-default-400">
          <Address address={activity.actor} truncate />
          <span>Block {activity.blockNumber.toString()}</span>
          {activity.details.amount && (
            <span className="font-medium" style={{ color }}>
              {activity.details.amount} {activity.details.currency}
            </span>
          )}
        </div>
      </div>

      <NextLink
        href={getLink()}
        className="flex-shrink-0 p-2 hover:bg-content2 rounded-lg transition-colors"
      >
        <ExternalLink className="size-4 text-default-400" />
      </NextLink>
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <div className="flex items-start gap-4 p-4 animate-pulse">
      <div className="size-10 rounded-full bg-content3 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-content3 rounded w-1/3" />
        <div className="h-3 bg-content3 rounded w-2/3" />
        <div className="h-3 bg-content3 rounded w-1/2" />
      </div>
    </div>
  );
}

const FILTERS: { type: string; label: string }[] = [
  { type: 'all', label: 'All Activity' },
  { type: 'job', label: 'Jobs' },
  { type: 'service', label: 'Services' },
];

const SUBGRAPH_TYPE_MAP: Record<string, string | undefined> = {
  all: undefined,
  job: 'JOB_CREATED',
  service: 'SERVICE_CREATED',
};

export default function ActivityPage(): JSX.Element {
  useEffect(() => { document.title = 'Activity | Kokonut'; }, []);
  const { address, isConnected } = useAccount();
  const [filter, setFilter] = useState<string>('all');
  const [followingOnly, setFollowingOnly] = useState(false);

  const subgraphType = SUBGRAPH_TYPE_MAP[filter];

  const {
    activities,
    isLoading,
    error,
    refetch,
  } = useActivityFromSubgraph(
    followingOnly ? undefined : subgraphType,
    followingOnly ? [address!] : undefined,
    0,
    50
  );

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Activity Feed</h1>
          <p className="text-default-500">
            Platform-wide activity from jobs and services
          </p>
        </div>
        <button type="button"
          onClick={() => {
            void refetch();
          }}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 border border-divider rounded-lg hover:bg-content2 transition-colors disabled:opacity-50"
        >
          <Activity className="size-4" />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <Card className={card('padded', 'p-2 mb-6')}>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="size-4 text-default-400 ml-2" />
          {FILTERS.map(f => (
            <button type="button"
              key={f.type}
              onClick={() => { setFilter(f.type); setFollowingOnly(false); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                !followingOnly && filter === f.type ? 'bg-success text-white' : 'hover:bg-content2 text-default-600'
              }`}
            >
              {f.label}
            </button>
          ))}
          {isConnected && (
            <button type="button"
              onClick={() => setFollowingOnly(!followingOnly)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                followingOnly ? 'bg-primary text-white' : 'hover:bg-content2 text-default-600'
              }`}
            >
              <Users className="size-4" />
              Following
            </button>
          )}
        </div>
      </Card>

      {/* Activity List */}
      <Card className={card('base')}>
        {isLoading ? (
          <div className="divide-y divide-divider">
            {Array.from({ length: 5 }, (_, i) => (
              <ActivitySkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <div className="h-16 w-16 rounded-full bg-danger-100 flex items-center justify-center mx-auto mb-4">
              <Activity className="h-8 w-8 text-danger" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Error Loading Activity</h3>
            <p className="text-default-500 max-w-md mx-auto mb-4">{error.message}</p>
            <button type="button"
              onClick={() => {
                void refetch();
              }}
              className={btn('primary', 'px-4 py-2')}
            >
              Try Again
            </button>
          </div>
        ) : activities.length === 0 ? (
          <div className="p-8 text-center">
            <div className="h-16 w-16 rounded-full bg-content2 flex items-center justify-center mx-auto mb-4">
              <Activity className="h-8 w-8 text-default-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Activity Yet</h3>
            <p className="text-default-500 max-w-md mx-auto">
              No {filter !== 'all' ? filter : ''} activity has been recorded on the platform yet.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-divider">
            {activities.map(activity => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}
          </div>
        )}
      </Card>

      {/* Info */}
      <p className="text-center text-xs text-default-400 mt-6">
        Activity is fetched from onchain events. Data reflects transactions on Sepolia testnet.
      </p>
    </div>
  );
}
