'use client';

import type { ReactNode } from 'react';
import NextLink from 'next/link';
import { ArrowRight, Briefcase, Code, Gavel, Plus, Store } from 'lucide-react';
import { formatEther } from 'viem';
import { StatusBadge, getJobStatusBadgeType } from '@/components/StatusBadge';
import { JobStatus, type Job } from '@/lib/hooks/useJobs';
import { SessionStatus, type BiddingSession, type SessionStatusType } from '@/lib/hooks/useBiddingSystem';
import { formatAmount, getTokenByAddress } from '@/lib/tokenUtils';
import { UnifiedWorkCard } from '@/components/marketplace/UnifiedWorkCard';
import type { Service } from '@/lib/hooks/useServices';

const SESSION_STATUS_BADGE: Record<SessionStatusType, string> = {
  [SessionStatus.Active]: 'active',
  [SessionStatus.BiddingClosed]: 'pending',
  [SessionStatus.WinnerSelected]: 'under-review',
  [SessionStatus.JobCreated]: 'under-review',
  [SessionStatus.Completed]: 'completed',
  [SessionStatus.Cancelled]: 'cancelled',
};

export function getAttentionReason(job: Job, user: `0x${string}`): string | null {
  const lower = user.toLowerCase();
  if (job.client.toLowerCase() === lower && job.status === JobStatus.Open) {
    return 'Fund escrow to start the job';
  }
  if (
    job.client.toLowerCase() === lower &&
    (job.status === JobStatus.Submitted || job.status === JobStatus.PendingClientApproval)
  ) {
    return 'Review deliverable and release payment';
  }
  if (job.provider.toLowerCase() === lower && job.status === JobStatus.Funded) {
    return 'Submit your deliverable';
  }
  if (job.evaluator.toLowerCase() === lower && job.status === JobStatus.Submitted) {
    return 'Finalize evaluation';
  }
  return null;
}

export function JobsHubPanel({ jobs, isLoading }: { jobs: Job[]; isLoading: boolean }) {
  const openJobs = jobs.filter(job => job.status === JobStatus.Open).slice(0, 9);

  return (
    <section>
      <PanelHeader
        title="Work Marketplace"
        description="Browse open requests and jump directly into the job workspace."
        action={
          <NextLink href="/jobs/create" className="inline-flex items-center gap-2 rounded-xl bg-success px-4 py-2 text-sm font-medium text-white hover:opacity-90">
            <Plus className="size-4" />
            Post Job
          </NextLink>
        }
      />
      {isLoading ? (
        <PanelSkeleton />
      ) : openJobs.length === 0 ? (
        <EmptyHubState title="No open jobs right now" description="Create a job request or check back when clients post new work." href="/jobs/create" action="Post a job" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {openJobs.map(job => (
            <UnifiedWorkCard
              key={job.id.toString()}
              title={`Job #${job.id.toString()}`}
              description={job.description}
              href={`/jobs/${job.id.toString()}`}
              eyebrow="Open Request"
              status={<StatusBadge status={getJobStatusBadgeType(job.status)} size="sm" />}
              meta={[
                { label: 'Budget', value: formatJobBudget(job) },
                { label: 'Deadline', value: new Date(Number(job.expiredAt) * 1000).toLocaleDateString() },
              ]}
              actionLabel="View job"
            />
          ))}
        </div>
      )}
      <FullDirectoryLink href="/jobs" label="Open full jobs directory" />
    </section>
  );
}

export function BiddingHubPanel({ sessions, isLoading }: { sessions: BiddingSession[]; isLoading: boolean }) {
  const visibleSessions = sessions.slice(0, 9);

  return (
    <section>
      <PanelHeader
        title="Bidding Desk"
        description="Create competitive sessions or participate in active bidding rounds."
        action={
          <NextLink href="/bidding/create" className="inline-flex items-center gap-2 rounded-xl bg-success px-4 py-2 text-sm font-medium text-white hover:opacity-90">
            <Plus className="size-4" />
            Create Session
          </NextLink>
        }
      />
      {isLoading ? (
        <PanelSkeleton />
      ) : visibleSessions.length === 0 ? (
        <EmptyHubState title="No bidding sessions yet" description="Start a session when you want providers to compete for a project." href="/bidding/create" action="Create session" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleSessions.map(session => (
            <UnifiedWorkCard
              key={session.id.toString()}
              title={`Session #${session.id.toString()}`}
              description={`Evaluator: ${session.evaluator}`}
              href={`/bidding/${session.id.toString()}`}
              eyebrow="Bidding Session"
              status={<StatusBadge status={SESSION_STATUS_BADGE[session.status] as any} size="sm" />}
              meta={[
                { label: 'Max Budget', value: `${Number(formatEther(session.maxBudget)).toFixed(4)} ETH` },
                { label: 'Deadline', value: new Date(Number(session.deadline) * 1000).toLocaleDateString() },
              ]}
              actionLabel="Open session"
            />
          ))}
        </div>
      )}
      <FullDirectoryLink href="/bidding" label="Open full bidding directory" />
    </section>
  );
}

export function SkillsHubPanel({ skillDomains }: { skillDomains: Array<{ value: string; label: string }> }) {
  return (
    <section>
      <PanelHeader
        title="Skill Explorer"
        description="Filter discovery by agent capability, or open the dedicated skills browser for deeper search."
        action={<FullDirectoryLink href="/marketplace/skills" label="Browse all skills" compact />}
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {skillDomains.slice(1).map(domain => (
          <NextLink
            key={domain.value}
            href={`/marketplace?tab=discover&skill=${encodeURIComponent(domain.value)}`}
            className="rounded-2xl border border-divider bg-content1 p-4 transition hover:border-success/40 hover:bg-content2/60"
          >
            <Code className="mb-3 size-5 text-success" />
            <p className="font-semibold">{domain.label}</p>
            <p className="mt-1 text-xs text-default-500">Find matching services</p>
          </NextLink>
        ))}
      </div>
    </section>
  );
}

export function MyWorkHubPanel({ jobs, user, isLoading }: { jobs: Job[]; user?: `0x${string}`; isLoading: boolean }) {
  if (!user) {
    return <EmptyHubState title="Connect to see your work" description="Your active jobs and required actions will appear here." />;
  }

  const myJobs = jobs.filter(job => {
    const lower = user.toLowerCase();
    return job.client.toLowerCase() === lower || job.provider.toLowerCase() === lower || job.evaluator.toLowerCase() === lower;
  });
  const attentionJobs = myJobs
    .map(job => ({ job, reason: getAttentionReason(job, user) }))
    .filter((item): item is { job: Job; reason: string } => item.reason !== null)
    .slice(0, 8);

  return (
    <section>
      <PanelHeader title="My Work" description="A focused queue of things you can act on now." action={<FullDirectoryLink href="/dashboard" label="Open dashboard" compact />} />
      {isLoading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-content2" />
      ) : attentionJobs.length === 0 ? (
        <EmptyHubState title="Nothing needs attention" description="You are clear. New funding, review, delivery, and evaluation actions will appear here." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {attentionJobs.map(({ job, reason }) => (
            <UnifiedWorkCard
              key={job.id.toString()}
              title={`Job #${job.id.toString()}`}
              description={reason}
              href={`/jobs/${job.id.toString()}`}
              eyebrow="Needs Attention"
              status={<StatusBadge status={getJobStatusBadgeType(job.status)} size="sm" />}
              meta={[
                { label: 'Budget', value: formatJobBudget(job) },
                { label: 'Role', value: getUserRole(job, user) },
              ]}
              actionLabel="Resolve"
            />
          ))}
        </div>
      )}
    </section>
  );
}

export function StudioHubPanel({
  services,
  isConnected,
  isLoading,
}: {
  services: Service[];
  isConnected: boolean;
  isLoading: boolean;
}) {
  if (!isConnected) {
    return <EmptyHubState title="Connect to manage your studio" description="Your services, agents, and skills live here once connected." />;
  }

  const activeServices = services.filter(service => service.isActive);

  return (
    <section>
      <PanelHeader
        title="Provider Studio"
        description="Manage what you offer without leaving the marketplace workspace."
        action={
          <NextLink href="/marketplace/create" className="inline-flex items-center gap-2 rounded-xl bg-success px-4 py-2 text-sm font-medium text-white hover:opacity-90">
            <Plus className="size-4" />
            List Service
          </NextLink>
        }
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StudioShortcut href="/dashboard/services" icon={<Store className="size-5" />} title="Services" detail={`${services.length} total, ${activeServices.length} active`} />
        <StudioShortcut href="/dashboard/agents" icon={<Briefcase className="size-5" />} title="Agents" detail="Manage identities" />
        <StudioShortcut href="/dashboard/skills" icon={<Code className="size-5" />} title="Skills" detail="Add capabilities" />
      </div>
      {isLoading ? (
        <div className="h-32 animate-pulse rounded-2xl bg-content2" />
      ) : services.length === 0 ? (
        <EmptyHubState title="No services listed yet" description="Create your first listing to start receiving work." href="/marketplace/create" action="List service" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.slice(0, 6).map(service => {
            const token = getTokenByAddress(service.paymentToken);
            return (
              <UnifiedWorkCard
                key={service.id.toString()}
                title={service.name || `Service #${service.id.toString()}`}
                description={service.description}
                href={`/marketplace/${service.id.toString()}`}
                eyebrow="Your Service"
                status={<StatusBadge status={service.isActive ? 'active' : 'inactive'} size="sm" />}
                meta={[
                  { label: 'Price', value: formatAmount(service.price, token, { includeSymbol: true }) },
                  { label: 'Agent', value: `#${service.agentId.toString()}` },
                ]}
                actionLabel="Manage"
              />
            );
          })}
        </div>
      )}
    </section>
  );
}

function PanelHeader({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <h2 className="text-2xl font-bold">{title}</h2>
        <p className="text-default-500">{description}</p>
      </div>
      {action}
    </div>
  );
}

function StudioShortcut({ href, icon, title, detail }: { href: string; icon: ReactNode; title: string; detail: string }) {
  return (
    <NextLink href={href} className="rounded-2xl border border-divider bg-content1 p-4 transition hover:border-success/40 hover:bg-content2/60">
      <div className="mb-3 text-success">{icon}</div>
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm text-default-500">{detail}</p>
    </NextLink>
  );
}

function EmptyHubState({ title, description, href, action }: { title: string; description: string; href?: string; action?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-divider bg-content1/60 p-8 text-center">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm text-default-500">{description}</p>
      {href && action && (
        <NextLink href={href} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-success px-4 py-2 text-sm font-medium text-white hover:opacity-90">
          {action}
          <ArrowRight className="size-4" />
        </NextLink>
      )}
    </div>
  );
}

function FullDirectoryLink({ href, label, compact = false }: { href: string; label: string; compact?: boolean }) {
  return (
    <NextLink href={href} className={`${compact ? '' : 'mt-6 '}inline-flex items-center gap-1 text-sm font-medium text-success hover:underline`}>
      {label}
      <ArrowRight className="size-3" />
    </NextLink>
  );
}

function PanelSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(6)].map((_, index) => (
        <div key={index} className="h-40 animate-pulse rounded-2xl bg-content2" />
      ))}
    </div>
  );
}

function formatJobBudget(job: Job): string {
  const token = getTokenByAddress(job.paymentToken);
  return formatAmount(job.budget, token, {
    includeSymbol: true,
    minFractionDigits: token.symbol === 'USDC' ? 2 : 0,
    maxFractionDigits: token.symbol === 'USDC' ? 2 : 6,
  });
}

function getUserRole(job: Job, user: `0x${string}`): string {
  const lower = user.toLowerCase();
  if (job.client.toLowerCase() === lower) return 'Client';
  if (job.provider.toLowerCase() === lower) return 'Provider';
  if (job.evaluator.toLowerCase() === lower) return 'Evaluator';
  return 'Participant';
}
