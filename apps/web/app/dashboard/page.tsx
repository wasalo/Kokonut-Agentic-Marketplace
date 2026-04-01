'use client';

export const dynamic = 'force-dynamic';

import { useState, useMemo } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { Card, Chip } from '@heroui/react';
import {
  Wallet,
  Briefcase,
  ShoppingBag,
  Scale,
  Loader2,
  Plus,
  Activity,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';
import NextLink from 'next/link';
import { useKokonutAgentsByOwner } from '@/lib/hooks/useKokonutAgentsByOwner';
import { useActiveServiceCount, useProviderServices } from '@/lib/hooks/useServices';
import {
  useJobCount,
  useUserJobs,
  getJobStatusLabel,
  getJobStatusColor,
} from '@/lib/hooks/useJobs';
import { useProposalCount, useProposals } from '@/lib/hooks/useProposals';
import { useActivityFeed, ActivityType } from '@/lib/hooks/useActivityFeed';

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  isLoading?: boolean;
}

function StatCard({ label, value, icon: Icon, isLoading }: StatCardProps) {
  return (
    <div className="border border-divider rounded-lg p-4 bg-content">
      <div className="flex flex-row items-center justify-between pb-2">
        <span className="text-sm font-medium text-default-500">{label}</span>
        <Icon className="h-4 w-4 text-default-400" />
      </div>
      {isLoading ? (
        <div className="h-8 w-16 bg-content3 rounded animate-pulse" />
      ) : (
        <div className="text-2xl font-bold text-foreground">{value}</div>
      )}
    </div>
  );
}

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
  const { count } = useJobCount();
  const { jobs, isLoading, error, refetch } = useUserJobs(user, 'all');

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-6 w-6 animate-spin text-default-400" />
      </div>
    );
  }

  // Check empty first - valid state takes priority
  if (!jobs || jobs.length === 0) {
    return <p className="text-default-500 text-sm py-4">No jobs yet</p>;
  }

  // Only show error if we have an error AND no data (true error)
  if (error) {
    return (
      <div className="text-center py-4">
        <p className="text-danger text-sm">Error loading jobs</p>
      </div>
    );
  }

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
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
            <p className="text-xs text-default-500">
              {formatAddress(job.provider)} → {formatAddress(job.client)}
            </p>
          </div>
          <Chip size="sm" variant="soft" color="success">
            {getJobStatusLabel(job.status)}
          </Chip>
        </NextLink>
      ))}
    </div>
  );
}

function UserProposalsList({ user }: { user: `0x${string}` }) {
  const { count } = useProposalCount();
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
    return <p className="text-default-500 text-sm py-4">No proposals yet</p>;
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
          <Chip size="sm" variant="soft" color={proposal.status === 0 ? 'default' : 'success'}>
            {proposal.status === 0 ? 'Open' : 'Decided'}
          </Chip>
        </NextLink>
      ))}
    </div>
  );
}

function QuickStats({ user }: { user: `0x${string}` }) {
  const { agents: userAgentsList, isLoading: isAgentsLoading } = useKokonutAgentsByOwner(user);
  const { count: serviceCount } = useActiveServiceCount();
  const { count: jobCount } = useJobCount();
  const { count: proposalCount } = useProposalCount();

  const { services } = useProviderServices(user);
  const { jobs } = useUserJobs(user, 'all');
  const { proposals } = useProposals(0, 50);

  const userAgents = userAgentsList?.length || 0;

  const userServices = useMemo(() => {
    if (!services) return 0;
    return services.length;
  }, [services]);

  const activeJobs = useMemo(() => {
    if (!jobs) return 0;
    return jobs.filter(j => j.status <= 2).length;
  }, [jobs]);

  const userProposals = useMemo(() => {
    if (!proposals) return 0;
    return proposals.filter(p => p.proposer === user).length;
  }, [proposals, user]);

  const stats = [
    { label: 'Your Agents', value: userAgents.toString(), icon: Wallet, href: '/identity' },
    {
      label: 'Your Services',
      value: userServices.toString(),
      icon: ShoppingBag,
      href: `/marketplace?provider=${user}`,
    },
    {
      label: 'Active Jobs',
      value: activeJobs.toString(),
      icon: Briefcase,
      href: '/jobs?status=active',
    },
    { label: 'Proposals', value: userProposals.toString(), icon: Scale, href: '/review' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {stats.map(stat => (
        <NextLink key={stat.label} href={stat.href} className="block">
          <StatCard {...stat} isLoading={isAgentsLoading && stat.label === 'Your Agents'} />
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
      label: 'Submit Proposal',
      description: 'Create evaluation proposal',
      icon: Scale,
      href: '/review/create',
      color: '#009F4D',
    },
  ];

  return (
    <Card className="border border-divider mb-8">
      <div className="p-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

function PlatformActivityWidget() {
  const { activities, isLoading } = useActivityFeed('all', 5);

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
              const typeColors: Record<ActivityType, string> = {
                job: '#009F4D',
                service: '#FFCD00',
                proposal: '#009F4D',
                all: '#666',
              };

              return (
                <NextLink
                  key={activity.id}
                  href={
                    activity.type === 'job'
                      ? `/jobs/${activity.details.targetId}`
                      : activity.type === 'service'
                        ? `/marketplace/${activity.details.targetId}`
                        : `/review/${activity.details.targetId}`
                  }
                  className="flex items-center gap-3 p-3 border border-divider rounded-lg hover:bg-content2/50 transition-colors"
                >
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: typeColors[activity.type] }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{activity.action}</p>
                    <p className="text-xs text-default-500 truncate">
                      {activity.details.description}
                    </p>
                  </div>
                  {activity.details.amount && (
                    <span
                      className="text-xs font-medium flex-shrink-0"
                      style={{ color: typeColors[activity.type] }}
                    >
                      {activity.details.amount} {activity.details.currency}
                    </span>
                  )}
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

      <QuickActions />
      <QuickStats user={user} />
      <PlatformActivityWidget />
      <RecentActivity user={user} />
    </div>
  );
}
