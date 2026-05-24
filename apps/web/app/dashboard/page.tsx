'use client';

export const dynamic = 'force-dynamic';

import { useAccount, useChainId } from 'wagmi';
import { Card } from '@heroui/react';
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
import { useProposalCount, useProposals } from '@/lib/hooks/useProposals';
import { useActivityFromSubgraph } from '@/lib/hooks';
import { JobStatus } from '@/lib/types/contracts';
import { Address } from '@/components/Address';
import { StatusBadge, getJobStatusBadgeType, getProposalStatusBadgeType } from '@/components/StatusBadge';
import { ActivityFeed } from '@/components/ActivityFeed';
import { EmptyStateJobs, EmptyStateProposals } from '@/components/ui/empty-state';

const ArbiterSection = dynamicImport(() => import('@/components/ArbiterSection').then(m => m.ArbiterSection), {
  loading: () => <div className="animate-pulse h-40 bg-content2 rounded-lg" />,
});
const EvaluatorSection = dynamicImport(() => import('@/components/EvaluatorSection').then(m => m.EvaluatorSection), {
  loading: () => <div className="animate-pulse h-32 bg-content2 rounded-lg" />,
});

function WalletConnectPrompt() {
  return (
    <div className="container mx-auto px-4 py-16 text-center">
      <Wallet className="h-16 w-16 text-default-400 mx-auto mb-4" />
      <h1 className="text-2xl font-bold mb-2">Connect Your Wallet</h1>
      <p className="text-default-500">Connect your wallet to view your dashboard</p>
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

  // Check empty first - valid state takes priority
  if (!jobs || jobs.length === 0) {
    return <EmptyStateJobs />;
  }

  // Only show error if we have an error AND no data (true error)
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

function UserProposalsList({ user }: { user: `0x${string}` }) {
  useProposalCount();
  const { proposals, isLoading, error } = useProposals(0, 50);

  if (error) {
    return (
      <div className="text-center py-4">
        <p className="text-danger text-sm">Error loading proposals</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-6 w-6 animate-spin text-default-400" />
      </div>
    );
  }

  if (!proposals || proposals.length === 0) {
    return <EmptyStateProposals />;
  }

  const userProposals = proposals.filter(p => p.proposer === user);

  if (userProposals.length === 0) {
    return <p className="text-default-500 text-sm py-4">No proposals</p>;
  }

  return (
    <div className="space-y-2">
      {userProposals.slice(0, 5).map(proposal => (
        <NextLink
          key={proposal.id.toString()}
          href={`/review/${proposal.id.toString()}`}
          className="flex justify-between items-center p-3 bg-content2 rounded-lg hover:bg-content3 transition-colors cursor-pointer"
        >
          <div>
            <p className="text-sm font-medium">{proposal.title}</p>
            <p className="text-xs text-default-500">{proposal.description.slice(0, 40)}...</p>
          </div>
          <StatusBadge status={getProposalStatusBadgeType(proposal.status)} size="sm" />
        </NextLink>
      ))}
    </div>
  );
}

function RecentActivity({ user }: { user: `0x${string}` }) {
  return (
    <Card className="border border-divider">
      <div className="p-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">Recent Jobs</h2>
        <UserJobsList user={user} />
      </div>
      <div className="px-6 pb-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">Your Proposals</h2>
        <UserProposalsList user={user} />
      </div>
    </Card>
  );
}

function QuickActions() {
  const actions = [
    {
      label: 'Create Job',
      description: 'Post a new job request',
      icon: Plus,
      href: '/jobs/create',
      color: '#009F4D',
    },
    {
      label: 'List Service',
      description: 'Offer your services',
      icon: ShoppingBag,
      href: '/marketplace/create',
      color: '#FFCD00',
    },
    {
      label: 'Manage Services',
      description: 'View your service listings',
      icon: ShoppingBag,
      href: '/dashboard/services',
      color: '#009F4D',
    },
    {
      label: 'Manage Agents',
      description: 'View your agent identities',
      icon: Wallet,
      href: '/dashboard/agents',
      color: '#FFCD00',
    },
    {
      label: 'Manage Skills',
      description: 'Add agent capabilities',
      icon: Code,
      href: '/dashboard/skills',
      color: '#009F4D',
    },
    {
      label: 'Submit Proposal',
      description: 'Create evaluation proposal',
      icon: Scale,
      href: '/review/create',
      color: '#FFCD00',
    },
  ];

  return (
    <Card className="border border-divider mb-8">
      <div className="p-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {actions.map(action => {
            const Icon = action.icon;
            return (
              <NextLink
                key={action.label}
                href={action.href}
                className="group p-4 border border-divider rounded-lg hover:border-success/50 transition-all hover:bg-content2/50"
              >
                <div className="flex items-start justify-between mb-2">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${action.color}20` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: action.color }} />
                  </div>
                  <ArrowRight className="w-4 h-4 text-default-400 group-hover:text-success transition-colors" />
                </div>
                <p className="font-medium text-foreground">{action.label}</p>
                <p className="text-xs text-default-500 mt-0.5">{action.description}</p>
              </NextLink>
            );
          })}
        </div>
      </div>
    </Card>
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
      tone: 'warning',
    })),
    ...awaitingReview.slice(0, 2).map(job => ({
      title: `Job #${job.id.toString()} awaiting review`,
      detail: 'Approve the deliverable or request changes',
      href: `/jobs/${job.id.toString()}`,
      tone: 'success',
    })),
    ...readyToWork.slice(0, 2).map(job => ({
      title: `Job #${job.id.toString()} is funded`,
      detail: 'Submit the deliverable when ready',
      href: `/jobs/${job.id.toString()}`,
      tone: 'primary',
    })),
  ].slice(0, 4);

  if (isLoading || items.length === 0) return null;

  return (
    <Card className="border border-divider mb-8">
      <div className="p-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">Needs Attention</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map(item => (
            <NextLink
              key={`${item.title}-${item.href}`}
              href={item.href}
              className="p-4 rounded-lg border border-divider hover:border-success/50 hover:bg-content2 transition-colors"
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
      </div>
    </Card>
  );
}

function PlatformActivityWidget() {
  const { activities, isLoading } = useActivityFromSubgraph(undefined, undefined, 0, 5);

  return (
    <Card className="border border-divider mb-8">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground">Platform Activity</h2>
          <NextLink
            href="/activity"
            className="text-sm text-success hover:underline flex items-center gap-1"
          >
            View All
            <ArrowRight className="w-3 h-3" />
          </NextLink>
        </div>

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
              const typeColor = activity.type.startsWith('JOB') ? '#009F4D'
                : activity.type.startsWith('SERVICE') ? '#FFCD00'
                : '#009F4D';

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
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: typeColor }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{activity.action}</p>
                    <p className="text-xs text-default-500 truncate">
                      {activity.details.title || 'Activity'}
                    </p>
                  </div>
                </NextLink>
              );
            })}
          </div>
        )}
      </div>
    </Card>
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
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-default-500">Welcome back! Here&apos;s an overview of your activity.</p>
      </div>

      {isWrongNetwork && (
        <Card className="border border-warning mb-8 p-4 bg-warning-50">
          <p className="text-warning-700 text-sm">
            You&apos;re connected to the wrong network. Please switch to Sepolia testnet to see your
            data.
          </p>
        </Card>
      )}

      <PriorityActions user={user} />
      <QuickActions />
      <ArbiterSection />
      <EvaluatorSection />
      <PlatformActivityWidget />
      <RecentActivity user={user} />

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">On-Chain Activity</h2>
        <ActivityFeed limit={10} showViewAll={false} />
      </div>
    </div>
  );
}
