'use client';

import { useEffect } from 'react';
export const dynamic = 'force-dynamic';

import { useAccount, useChainId } from 'wagmi';
import {
  Wallet,
  ShoppingBag,
  ArrowRight,
  Code,
  Gavel,
  ExternalLink,
} from 'lucide-react';
import NextLink from 'next/link';
import dynamicImport from 'next/dynamic';
import { useUserJobs } from '@/lib/hooks/useJobs';
import { JobStatus } from '@/lib/types/contracts';
import { DS } from '@/lib/design-system';
import { SEPOLIA_CHAIN_ID } from '@/lib/contracts/config';
import { ActivityFeed } from '@/components/ActivityFeed';
import { DashboardCard } from '@/components/ui/DashboardCard';
import { ErrorDisplay } from '@/components/ErrorDisplay';

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

function QuickActions() {
  const actions = [
    {
      label: 'Manage Services',
      description: 'View your service listings',
      icon: ShoppingBag,
      href: '/marketplace?tab=studio',
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
      label: 'Create Bid Session',
      description: 'Start competitive bidding',
      icon: Gavel,
      href: '/bidding/create',
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
                <div className="size-10 rounded-lg flex items-center justify-center bg-primary/10">
                  <Icon className="size-5 text-primary" />
                </div>
                <ArrowRight className="size-4 text-default-400 group-hover:text-primary transition-colors" />
              </div>
              <p className="font-medium text-foreground">{action.label}</p>
              <p className="text-xs text-default-500 mt-0.5">{action.description}</p>
            </NextLink>
          );
        })}
        <NextLink
          href="/marketplace"
          className={DS.cards.clickable}
        >
          <div className="flex items-start justify-between mb-2">
            <div className="size-10 rounded-lg flex items-center justify-center bg-gradient-to-br from-[#009F4D] to-[#00c853]">
              <ExternalLink className="size-5 text-white" />
            </div>
            <ArrowRight className="size-4 text-default-400 group-hover:text-primary transition-colors" />
          </div>
          <p className="font-medium text-foreground">Explore Marketplace</p>
          <p className="text-xs text-default-500 mt-0.5">Browse services, jobs, and bidding</p>
        </NextLink>
      </div>
    </DashboardCard>
  );
}

function PriorityActions({ user }: { user: `0x${string}` }) {
  const { jobs, isLoading, error } = useUserJobs(user, 'all');
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

  if (error && !isLoading) {
    return (
      <div className="mb-8">
        <ErrorDisplay error={error as Error} />
      </div>
    );
  }

  if (isLoading || items.length === 0) return null;

  const toneBorder: Record<string, string> = {
    warning: 'hover:border-warning/50',
    success: 'hover:border-success/50',
    primary: 'hover:border-primary/50',
  };

  return (
    <DashboardCard title="Needs Attention" icon={<ArrowRight />} className="mb-8">
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
              <ArrowRight className="size-4 text-default-400" />
            </div>
          </NextLink>
        ))}
      </div>
    </DashboardCard>
  );
}

export default function DashboardPage(): JSX.Element {
  useEffect(() => {
    document.title = 'Dashboard | Kokonut Agent Economy';
  }, []);

  const { address: user, isConnected } = useAccount();
  const chainId = useChainId();

  if (!isConnected || !user) {
    return <WalletConnectPrompt />;
  }

  const isWrongNetwork = chainId !== SEPOLIA_CHAIN_ID;

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

      <div className="mb-4">
        <h2 className={DS.typography.sectionTitle}>Your Transactions</h2>
      </div>
      <ActivityFeed limit={10} showViewAll={false} />
    </div>
  );
}
