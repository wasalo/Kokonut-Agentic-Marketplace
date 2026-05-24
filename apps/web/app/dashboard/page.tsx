'use client';

export const dynamic = 'force-dynamic';

import { useAccount, useChainId } from 'wagmi';
import {
  Wallet,
  ShoppingBag,
  Scale,
  Loader2,
  Plus,
  ArrowRight,
  Code,
  Activity,
} from 'lucide-react';
import NextLink from 'next/link';
import dynamicImport from 'next/dynamic';
import { useUserJobs } from '@/lib/hooks/useJobs';

import { useActivityFromSubgraph } from '@/lib/hooks';
import { JobStatus } from '@/lib/types/contracts';
import { DS } from '@/lib/design-system';
import { Address } from '@/components/Address';
import { StatusBadge, getJobStatusBadgeType } from '@/components/StatusBadge';
import { ActivityFeed } from '@/components/ActivityFeed';
import { EmptyStateJobs } from '@/components/ui/empty-state';
import { DashboardCard } from '@/components/ui/DashboardCard';

const ArbiterSection = dynamicImport(() => import('@/components/ArbiterSection').then(m => m.ArbiterSection), {
  loading: () => <div className="animate-pulse h-40 bg-content2 rounded-lg" />,
});
const EvaluatorSection = dynamicImport(() => import('@/components/EvaluatorSection').then(m => m.EvaluatorSection), {
  loading: () => <div className="animate-pulse h-32 bg-content2 rounded-lg" />,
});

function WalletConnectPrompt() {
  return (
    <div className={`${DS.spacing.page} text-center`}>
      <Wallet className="h-16 w-16 text-default-400 mx-auto mb-4" />
      <h1 className={DS.typography.pageTitle}>Connect Your Wallet</h1>
      <p className={DS.typography.pageSubtitle}>Connect your wallet to view your dashboard</p>
    </div>
  );
}

function UserJobsList({ user }: { user: `0x${string}` }) {
  const { jobs, isLoading, error } = useUserJobs(user, 'all');

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-6 w-6 animate-spin text-default-400" />
      </div>
    );
  }

  if (!jobs || jobs.length === 0) {
    return <EmptyStateJobs />;
  }

  if (error) {
    return (
      <div className="text-center py-4">
        <p className="text-danger text-sm">Error loading jobs</p>
      </div>
    );
  }

  const activeJobs = jobs.filter(j => j.status <= 2);

  if (activeJobs.length === 0) {
    return <p className="text-default-500 text-sm py-4">No active jobs</p>;
  }

  return (
    <div className="space-y-2">
      {activeJobs.slice(0, 5).map(job => (
        <NextLink
          key={job.id.toString()}
          href={`/jobs/${job.id.toString()}`}
          className="flex justify-between items-center p-3 bg-content2 rounded-lg hover:bg-content3 transition-colors cursor-pointer"
        >
          <div>
            <p className="text-sm font-medium">Job #{job.id.toString()}</p>
            <p className="text-xs text-default-500 flex items-center gap-1">
              <Address address={job.provider as `0x${string}`} truncate /> →{' '}
              <Address address={job.client as `0x${string}`} truncate />
            </p>
          </div>
          <StatusBadge status={getJobStatusBadgeType(job.status)} size="sm" />
        </NextLink>
      ))}
    </div>
  );
}

function RecentActivity({ user }: { user: `0x${string}` }) {
  return (
    <DashboardCard title="Recent Jobs" icon={<Activity />}>
      <UserJobsList user={user} />
    </DashboardCard>
  );
}

function QuickActions() {
  const actions = [
    {
      label: 'Create Job',
      description: 'Post a new job request',
      icon: Plus,
      href: '/jobs/create',
    },
    {
      label: 'List Service',
      description: 'Offer your services',
      icon: ShoppingBag,
      href: '/marketplace/create',
    },
    {
      label: 'Manage Services',
      description: 'View your service listings',
      icon: ShoppingBag,
      href: '/dashboard/services',
    },
    {
      label: 'Manage Agents',
      description: 'View your agent identities',
      icon: Wallet,
      href: '/dashboard/agents',
    },
    {
      label: 'Manage Skills',
      description: 'Add agent capabilities',
      icon: Code,
      href: '/dashboard/skills',
    },
    {
      label: 'Submit Proposal',
      description: 'Create evaluation proposal',
      icon: Scale,
      href: '/review/create',
    },
  ];

  return (
    <DashboardCard title="Quick Actions" icon={<ArrowRight />} className="mb-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {actions.map(action => {
          const Icon = action.icon;
          return (
            <NextLink
              key={action.label}
              href={action.href}
              className={DS.cards.clickable}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary/10">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <ArrowRight className="w-4 h-4 text-default-400 group-hover:text-primary transition-colors" />
              </div>
              <p className="font-medium text-foreground">{action.label}</p>
              <p className="text-xs text-default-500 mt-0.5">{action.description}</p>
            </NextLink>
          );
        })}
      </div>
    </DashboardCard>
  );
}

function PriorityActions({ user }: { user: `0x${string}` }) {
  const { jobs, isLoading } = useUserJobs(user, 'all');
  const lower = user.toLowerCase();
  const needsFunding = jobs.filter(
    job => job.client?.toLowerCase() === lower && job.status === JobStatus.Open
  );
  const awaitingReview = jobs.filter(
    job =>
      job.client?.toLowerCase() === lower &&
      (job.status === JobStatus.Submitted || job.status === JobStatus.PendingClientApproval)
  );
  const readyToWork = jobs.filter(
    job => job.provider?.toLowerCase() === lower && job.status === JobStatus.Funded
  );

  const items = [
    ...needsFunding.slice(0, 2).map(job => ({
      title: `Job #${job.id.toString()} needs funding`,
      detail: 'Fund escrow to move the work forward',
      href: `/jobs/${job.id.toString()}`,
      tone: 'warning' as const,
    })),
    ...awaitingReview.slice(0, 2).map(job => ({
      title: `Job #${job.id.toString()} awaiting review`,
      detail: 'Approve the deliverable or request changes',
      href: `/jobs/${job.id.toString()}`,
      tone: 'success' as const,
    })),
    ...readyToWork.slice(0, 2).map(job => ({
      title: `Job #${job.id.toString()} is funded`,
      detail: 'Submit the deliverable when ready',
      href: `/jobs/${job.id.toString()}`,
      tone: 'primary' as const,
    })),
  ].slice(0, 4);

  if (isLoading || items.length === 0) return null;

  const toneBorder: Record<string, string> = {
    warning: 'hover:border-warning/50',
    success: 'hover:border-success/50',
    primary: 'hover:border-primary/50',
  };

  return (
    <DashboardCard title="Needs Attention" icon={<Activity />} className="mb-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map(item => (
          <NextLink
            key={`${item.title}-${item.href}`}
            href={item.href}
            className={`${DS.cards.interactive} ${toneBorder[item.tone] || ''}`}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-sm">{item.title}</p>
                <p className="text-xs text-default-500 mt-1">{item.detail}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-default-400" />
            </div>
          </NextLink>
        ))}
      </div>
    </DashboardCard>
  );
}

function PlatformActivityWidget() {
  const { activities, isLoading } = useActivityFromSubgraph(undefined, undefined, 0, 5);

  const typeBadge = (type: string) => {
    if (type.startsWith('JOB')) return { color: 'bg-primary', label: 'Job' };
    if (type.startsWith('SERVICE')) return { color: 'bg-warning', label: 'Service' };
    return { color: 'bg-primary', label: 'Review' };
  };

  return (
    <DashboardCard
      title="Platform Activity"
      icon={<Activity />}
      actions={
        <NextLink
          href="/activity"
          className="text-sm text-primary hover:underline flex items-center gap-1"
        >
          View All
          <ArrowRight className="w-3 h-3" />
        </NextLink>
      }
    >
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-content2 rounded animate-pulse" />
          ))}
        </div>
      ) : activities.length === 0 ? (
        <div className="text-center py-8 text-default-500">
          <Activity className="w-8 h-8 mx-auto mb-2 text-default-400" />
          <p className="text-sm">No recent activity</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.slice(0, 5).map(activity => {
            const badge = typeBadge(activity.type);
            const linkPath = activity.type.startsWith('JOB')
              ? `/jobs/${activity.details.targetId}`
              : activity.type.startsWith('SERVICE')
                ? `/marketplace/${activity.details.targetId}`
                : `/review/${activity.details.targetId}`;

            return (
              <NextLink
                key={activity.id}
                href={linkPath}
                className="flex items-center gap-3 p-3 border border-divider rounded-lg hover:bg-content2/50 transition-colors"
              >
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${badge.color}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{activity.action}</p>
                  <p className="text-xs text-default-500 truncate">
                    {activity.details.title || 'Activity'}
                  </p>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-content2 text-default-500">
                  {badge.label}
                </span>
              </NextLink>
            );
          })}
        </div>
      )}
    </DashboardCard>
  );
}

export default function DashboardPage(): JSX.Element {
  const { address: user, isConnected } = useAccount();
  const chainId = useChainId();

  if (!isConnected || !user) {
    return <WalletConnectPrompt />;
  }

  const isWrongNetwork = chainId !== 11155111;

  return (
    <div className={`${DS.spacing.page} pb-20 md:pb-0`}>
      <div className="mb-8">
        <h1 className={DS.typography.pageTitle}>Dashboard</h1>
        <p className={DS.typography.pageSubtitle}>Welcome back! Here&apos;s an overview of your activity.</p>
      </div>

      {isWrongNetwork && (
        <div className="mb-8 p-4 rounded-xl border border-warning bg-warning/10">
          <p className="text-warning text-sm">
            You&apos;re connected to the wrong network. Please switch to Sepolia testnet to see your
            data.
          </p>
        </div>
      )}

      <PriorityActions user={user} />
      <QuickActions />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <ArbiterSection />
        <EvaluatorSection />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <RecentActivity user={user} />
        <PlatformActivityWidget />
      </div>

      <div className="mb-4">
        <h2 className={DS.typography.sectionTitle}>On-Chain Activity</h2>
      </div>
      <ActivityFeed limit={10} showViewAll={false} />
    </div>
  );
}
