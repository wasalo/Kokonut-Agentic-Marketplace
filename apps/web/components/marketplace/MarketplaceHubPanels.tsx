'use client';

import { useMemo, type ReactNode } from 'react';
import NextLink from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Briefcase, Code, Gavel, RefreshCw, Store } from 'lucide-react';
import { StatusBadge, getJobStatusBadgeType } from '@/components/StatusBadge';
import { JobStatus, type Job } from '@/lib/hooks/useJobs';
import { formatAmount, getTokenByAddress } from '@/lib/tokenUtils';
import { UnifiedWorkCard } from '@/components/marketplace/UnifiedWorkCard';
import type { Service } from '@/lib/hooks/useServices';
import { Pagination } from '@/components/ui/pagination';
import { BiddingCommandBar } from '@/components/bidding/BiddingCommandBar';
import { BiddingSessionCard } from '@/components/bidding/BiddingSessionCard';
import { BiddingStatsStrip } from '@/components/bidding/BiddingStatsStrip';
import { JobDirectoryCard } from '@/components/jobs/directory/JobDirectoryCard';
import { JobsCommandBar } from '@/components/jobs/directory/JobsCommandBar';
import { JobsStatsStrip } from '@/components/jobs/directory/JobsStatsStrip';
import { MarketplaceSkillCard } from '@/components/marketplace/MarketplaceSkillCard';
import { ProviderServiceCard } from '@/components/marketplace/ProviderServiceCard';
import { SkillDomainGrid } from '@/components/marketplace/SkillDomainGrid';
import { SkillsCommandBar } from '@/components/marketplace/SkillsCommandBar';
import { useBiddingDirectory } from '@/lib/hooks/useBiddingDirectory';
import { useMyBids } from '@/lib/hooks/useMyBids';
import { SessionStatus, getSessionStatusBadge, useBiddingSessions, type BiddingSession } from '@/lib/hooks/useBiddingSystem';
import { useJobsDirectory } from '@/lib/hooks/useJobsDirectory';
import { useMarketplaceSkillsDirectory } from '@/lib/hooks/useMarketplaceSkillsDirectory';
import { DS, btn, card } from '@/lib/design-system';

const HUB_PAGE_SIZE = 10;

export function getAttentionReason(job: Job, user: `0x${string}`): string | null {
  const lower = user.toLowerCase();
  const isClient = job.client.toLowerCase() === lower;
  const isProvider = job.provider.toLowerCase() === lower;
  const isEvaluator = job.evaluator.toLowerCase() === lower;
  const isParticipant = isClient || isProvider || isEvaluator;
  if (!isParticipant) return null;

  if (isClient && job.status === JobStatus.Open) return 'Fund escrow to start the job';
  if (isClient && job.status === JobStatus.Funded) return 'Awaiting provider deliverable';
  if (isClient && (job.status === JobStatus.Submitted || job.status === JobStatus.PendingClientApproval)) {
    return 'Review deliverable and release payment';
  }
  if (isClient && job.status === JobStatus.Rejected) return 'Job was rejected — open to inspect';
  if (isClient && job.status === JobStatus.Expired) return 'Job expired — claim refund if funded';

  if (isProvider && job.status === JobStatus.Funded) return 'Submit your deliverable';
  if (isProvider && job.status === JobStatus.Submitted) return 'Awaiting client / evaluator decision';
  if (isProvider && job.status === JobStatus.Rejected) return 'Deliverable rejected — review feedback';
  if (isProvider && job.status === JobStatus.Expired) return 'Job expired — job is no longer active';

  if (isEvaluator && job.status === JobStatus.Submitted) return 'Finalize evaluation';
  if (isEvaluator && job.status === JobStatus.Funded) return 'Stand by — provider is preparing work';
  if (isEvaluator && job.status === JobStatus.Rejected) return 'Job already rejected — no action';
  if (isEvaluator && job.status === JobStatus.Expired) return 'Job expired — no action';

  return null;
}

export function JobsHubPanel() {
  const {
    isConnected,
    jobs,
    isLoading,
    stats,
    searchQuery,
    setSearchQuery,
    isSearching,
    statusFilter,
    setStatusFilter,
    roleFilter,
    setRoleFilter,
    minBudget,
    setMinBudget,
    maxBudget,
    setMaxBudget,
    showFilters,
    setShowFilters,
    sortBy,
    sortOrder,
    handleSortChange,
    sortedJobs,
    paginatedJobs,
    page,
    setPage,
    totalPages,
  } = useJobsDirectory({ routePath: '/marketplace', pageSize: HUB_PAGE_SIZE });

  return (
    <section>
      <PanelHeader
        title="Work Marketplace"
        description="Browse open requests and jump directly into the job workspace."
      />
      <JobsStatsStrip stats={stats} />
      <JobsCommandBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isSearching={isSearching}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(!showFilters)}
        isConnected={isConnected}
        roleFilter={roleFilter}
        onRoleFilterChange={setRoleFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        minBudget={minBudget}
        onMinBudgetChange={setMinBudget}
        maxBudget={maxBudget}
        onMaxBudgetChange={setMaxBudget}
      />
      <SortControl
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={handleSortChange}
        countLabel={`${sortedJobs.length} jobs`}
        options={[
          { value: 'newest-desc', label: 'Newest First' },
          { value: 'newest-asc', label: 'Oldest First' },
          { value: 'budget-asc', label: 'Budget: Low to High' },
          { value: 'budget-desc', label: 'Budget: High to Low' },
          { value: 'deadline-asc', label: 'Deadline: Soonest' },
          { value: 'deadline-desc', label: 'Deadline: Latest' },
        ]}
      />
      {isLoading ? (
        <PanelSkeleton />
      ) : sortedJobs.length === 0 ? (
        <EmptyHubState
          title="No jobs found"
          description={
            jobs.length === 0
              ? 'Create a job request or check back when clients post new work.'
              : 'Try adjusting your job filters.'
          }
          href={jobs.length === 0 ? '/jobs/create' : undefined}
          action={jobs.length === 0 ? 'Post a job' : undefined}
        />
      ) : (
        <>
          <div className="space-y-3">
            {paginatedJobs.map(job => (
              <JobDirectoryCard key={job.id.toString()} job={job} />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="mt-8">
              <Pagination
                currentPage={page}
                totalItems={sortedJobs.length}
                itemsPerPage={HUB_PAGE_SIZE}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}
    </section>
  );
}

export function BiddingHubPanel() {
  const {
    isConnected,
    totalCount,
    isLoading,
    sortBy,
    sortOrder,
    handleSortChange,
    page,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    showFilters,
    setShowFilters,
    filteredSessions,
    paginatedSessions,
    totalPages,
    activeCount,
    inProgressCount,
    handleNextPage,
    handlePrevPage,
  } = useBiddingDirectory({ routePath: '/marketplace', pageSize: HUB_PAGE_SIZE });

  return (
    <section>
      <PanelHeader
        title="Bidding Desk"
        description="Create competitive sessions or participate in active bidding rounds."
      />
      <BiddingStatsStrip
        totalCount={totalCount}
        activeCount={activeCount}
        inProgressCount={inProgressCount}
        isLoading={isLoading}
      />
      <BiddingCommandBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(!showFilters)}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={handleSortChange}
      />
      {isLoading ? (
        <PanelSkeleton />
      ) : filteredSessions.length === 0 ? (
        <EmptyHubState
          title="No bidding sessions found"
          description={
            searchQuery || statusFilter !== 'all'
              ? 'Try adjusting your bidding filters.'
              : 'Start a session when you want providers to compete for a project.'
          }
          href={!searchQuery && statusFilter === 'all' ? '/bidding/create' : undefined}
          action={!searchQuery && statusFilter === 'all' ? 'Create session' : undefined}
        />
      ) : (
        <>
          <div className="space-y-4">
            {paginatedSessions.map(session => (
              <BiddingSessionCard
                key={session.id.toString()}
                session={session}
                isConnected={isConnected}
              />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-8">
              <button
                type="button"
                disabled={page === 0}
                onClick={handlePrevPage}
                className="rounded-lg border border-divider px-4 py-2 text-sm transition-colors hover:bg-content2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-default-500">
                Page {page + 1} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page + 1 >= totalPages}
                onClick={handleNextPage}
                className="rounded-lg border border-divider px-4 py-2 text-sm transition-colors hover:bg-content2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

export function SkillsHubPanel() {
  const {
    selectedDomain,
    setSelectedDomain,
    searchQuery,
    setSearchQuery,
    skills,
    isLoading,
  } = useMarketplaceSkillsDirectory();

  return (
    <section>
      <PanelHeader
        title="Skill Explorer"
        description="Filter discovery by agent capability, inspect registered skills, and find matching services."
      />
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h3 className="text-lg font-semibold">
          {selectedDomain ? (
            <>
              Skills in <span className="text-success capitalize">{selectedDomain}</span>
            </>
          ) : (
            'Skill Directory'
          )}
        </h3>
        <SkillsCommandBar searchQuery={searchQuery} onSearchChange={setSearchQuery} />
      </div>
      <SkillDomainGrid selectedDomain={selectedDomain} onSelectDomain={setSelectedDomain} />
      {isLoading ? (
        <PanelSkeleton />
      ) : skills.length === 0 ? (
        <EmptyHubState
          title="No skills found"
          description={
            selectedDomain
              ? `No skills found in the "${selectedDomain}" domain. Try another domain.`
              : 'Select a domain to browse registered agent capabilities.'
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {skills.map(skill => (
            <MarketplaceSkillCard key={skill.skillId.toString()} skill={skill} />
          ))}
        </div>
      )}
    </section>
  );
}

export function MyWorkHubPanel({ jobs, user, isLoading }: { jobs: Job[]; user?: `0x${string}`; isLoading: boolean }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const subtab: 'jobs' | 'bids' = searchParams.get('subtab') === 'bids' ? 'bids' : 'jobs';

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

  const switchSubtab = (next: 'jobs' | 'bids') => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === 'jobs') params.delete('subtab');
    else params.set('subtab', next);
    const query = params.toString();
    router.replace(`/marketplace?tab=work${query ? `&${query}` : ''}`, { scroll: false });
  };

  return (
    <section>
      <PanelHeader
        title="My Work"
        description="A focused queue of things you can act on now."
        action={<FullDirectoryLink href="/dashboard" label="Open dashboard" compact />}
      />
      <div className="mb-5 inline-flex items-center gap-1 rounded-full bg-content2 p-1 text-sm">
        <button
          type="button"
          onClick={() => switchSubtab('jobs')}
          aria-pressed={subtab === 'jobs'}
          className={`px-4 py-1.5 rounded-full transition-colors ${
            subtab === 'jobs' ? 'bg-primary text-white' : 'text-default-500 hover:text-foreground'
          }`}
        >
          Jobs ({attentionJobs.length})
        </button>
        <button
          type="button"
          onClick={() => switchSubtab('bids')}
          aria-pressed={subtab === 'bids'}
          className={`px-4 py-1.5 rounded-full transition-colors ${
            subtab === 'bids' ? 'bg-primary text-white' : 'text-default-500 hover:text-foreground'
          }`}
        >
          My Bids
        </button>
      </div>

      {subtab === 'bids' ? (
        <MyBidsPanel user={user} />
      ) : isLoading ? (
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

export function MyBidsPanel({ user }: { user: `0x${string}` }) {
  const { entries, isLoading } = useMyBids(user);
  const { sessions } = useBiddingSessionsLite();
  const sessionMap = useMemo(() => new Map(sessions.map(s => [s.id.toString(), s])), [sessions]);

  const myBids = useMemo(() => {
    return entries
      .map(entry => {
        const session = sessionMap.get(entry.sessionId.toString());
        if (!session) return null;
        if (session.status === SessionStatus.Completed || session.status === SessionStatus.JobCreated) {
          return null;
        }
        return { session, bid: entry.bid };
      })
      .filter((item): item is { session: BiddingSession; bid: unknown } => item !== null);
  }, [entries, sessionMap]);

  return (
    <div className="space-y-3">
      {isLoading ? (
        <div className="h-32 animate-pulse rounded-2xl bg-content2" />
      ) : myBids.length === 0 ? (
        <EmptyHubState
          title="No active bids"
          description="You haven't committed any bids yet. Browse bidding sessions →"
          href="/marketplace?tab=bidding"
          action="Browse bidding sessions"
        />
      ) : (
        myBids.map(({ session }) => {
          const token = getTokenByAddress(session.paymentToken);
          return (
            <NextLink
              key={session.id.toString()}
              href={`/bidding/${session.id.toString()}`}
              className="block p-4 rounded-2xl border border-divider bg-content1/60 hover:border-primary/40 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">Session #{session.id.toString()}</p>
                  <p className="text-xs text-default-500 mt-0.5">
                    Max budget: {formatAmount(session.maxBudget, token, { includeSymbol: true })}
                  </p>
                </div>
                <StatusBadge status={getSessionStatusBadge(session.status).badge} size="sm" />
              </div>
            </NextLink>
          );
        })
      )}
    </div>
  );
}

function useBiddingSessionsLite() {
  return useBiddingSessions();
}

export function StudioHubPanel({
  services,
  jobs,
  sessions,
  user,
  isConnected,
  isLoading,
  isJobsLoading,
  isBiddingLoading,
  error,
  onRefetch,
  onRefreshAll,
}: {
  services: Service[];
  jobs: Job[];
  sessions: BiddingSession[];
  user?: `0x${string}`;
  isConnected: boolean;
  isLoading: boolean;
  isJobsLoading: boolean;
  isBiddingLoading: boolean;
  error?: Error | null;
  onRefetch: () => void;
  onRefreshAll: () => void;
}) {
  if (!isConnected || !user) {
    return <EmptyHubState title="Connect to manage your studio" description="Your services, agents, and skills live here once connected." />;
  }

  const lowerUser = user.toLowerCase();
  const activeServices = services.filter(service => service.isActive);
  const inactiveServices = services.filter(service => !service.isActive);
  const studioJobs = jobs.filter(job =>
    job.client.toLowerCase() === lowerUser ||
    job.provider.toLowerCase() === lowerUser ||
    job.evaluator.toLowerCase() === lowerUser
  );
  const studioSessions = sessions.filter(session =>
    session.creator.toLowerCase() === lowerUser ||
    session.winner.toLowerCase() === lowerUser
  );
  const attentionJobs = studioJobs.filter(job => getAttentionReason(job, user) !== null);
  const activeJobs = studioJobs.filter(job =>
    job.status !== JobStatus.Completed &&
    job.status !== JobStatus.Rejected &&
    job.status !== JobStatus.Expired
  );
  const completedJobs = studioJobs.filter(job => job.status === JobStatus.Completed);
  const createdSessions = studioSessions.filter(session => session.creator.toLowerCase() === lowerUser);
  const wonSessions = studioSessions.filter(session => session.winner.toLowerCase() === lowerUser);
  const activeSessions = studioSessions.filter(session => session.status === SessionStatus.Active);

  const isRefreshing = isLoading || isJobsLoading || isBiddingLoading;

  return (
    <section>
      <PanelHeader
        title="Provider Studio"
        description="Manage your services, jobs, bid sessions, agents, and capabilities from one workspace."
        action={
          <button
            type="button"
            onClick={onRefreshAll}
            disabled={isRefreshing}
            className={btn('ghost', 'rounded-xl bg-content2 text-sm font-medium')}
          >
            <RefreshCw className={`size-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        }
      />
      {error && (
        <div className="mb-6 p-4 rounded-xl border border-danger-200 bg-danger-50">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p className="text-danger font-medium text-sm">Error loading services</p>
              <p className="text-danger-600 text-xs mt-1">{error.message}</p>
            </div>
            <button
              type="button"
              onClick={onRefetch}
              className="text-xs text-danger hover:underline font-medium"
            >
              Retry
            </button>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StudioMetric
          icon={<Store className="size-5" />}
          label="Services"
          value={services.length.toString()}
          detail={`${activeServices.length} active · ${inactiveServices.length} inactive`}
        />
        <StudioMetric
          icon={<Briefcase className="size-5" />}
          label="Jobs"
          value={studioJobs.length.toString()}
          detail={`${attentionJobs.length} need attention · ${completedJobs.length} completed`}
          isLoading={isJobsLoading}
        />
        <StudioMetric
          icon={<Gavel className="size-5" />}
          label="Bid Sessions"
          value={studioSessions.length.toString()}
          detail={`${createdSessions.length} created · ${wonSessions.length} won`}
          isLoading={isBiddingLoading}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <StudioShortcut href="/dashboard/agents" icon={<Briefcase className="size-5" />} title="Agents" detail="Manage identities" />
        <StudioShortcut href="/dashboard/skills" icon={<Code className="size-5" />} title="Skills" detail="Add capabilities" />
      </div>

      <div className="space-y-6">
        <StudioSection
          title="Services"
          description="Listings you offer as a provider."
          action={<NextLink href="/marketplace/create" className={btn('primary', 'text-sm')}>List Service</NextLink>}
        >
          {isLoading ? (
            <div className="h-32 animate-pulse rounded-xl bg-content2" />
          ) : services.length === 0 ? (
            <CompactEmptyState
              title="No services listed yet"
              description="Create your first listing to start receiving work."
              href="/marketplace/create"
              action="List service"
            />
          ) : (
            <div className="space-y-5">
              {activeServices.length > 0 && (
                <ServiceGroup title={`Active (${activeServices.length})`}>
                  {activeServices.slice(0, 4).map(service => (
                    <ProviderServiceCard
                      key={service.id.toString()}
                      service={service}
                      onRefetch={onRefetch}
                    />
                  ))}
                </ServiceGroup>
              )}
              {inactiveServices.length > 0 && (
                <ServiceGroup title={`Inactive (${inactiveServices.length})`} muted>
                  {inactiveServices.slice(0, 4).map(service => (
                    <ProviderServiceCard
                      key={service.id.toString()}
                      service={service}
                      onRefetch={onRefetch}
                    />
                  ))}
                </ServiceGroup>
              )}
            </div>
          )}
        </StudioSection>

        <StudioSection
          title="Jobs"
          description="Jobs where your wallet is client, provider, or evaluator."
          action={<FullDirectoryLink href="/marketplace?tab=jobs" label="Open jobs tab" compact />}
        >
          {isJobsLoading ? (
            <div className="h-32 animate-pulse rounded-xl bg-content2" />
          ) : studioJobs.length === 0 ? (
            <CompactEmptyState
              title="No jobs yet"
              description="Post a job or win work through bidding to see it here."
              href="/jobs/create"
              action="Post job"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {studioJobs.slice(0, 6).map(job => (
                <UnifiedWorkCard
                  key={job.id.toString()}
                  title={`Job #${job.id.toString()}`}
                  description={getAttentionReason(job, user) ?? job.description}
                  href={`/jobs/${job.id.toString()}`}
                  eyebrow={getUserRole(job, user)}
                  status={<StatusBadge status={getJobStatusBadgeType(job.status)} size="sm" />}
                  meta={[
                    { label: 'Budget', value: formatJobBudget(job) },
                    { label: 'State', value: attentionJobs.includes(job) ? 'Needs attention' : activeJobs.includes(job) ? 'Active' : 'Complete' },
                  ]}
                  actionLabel="Open Job"
                />
              ))}
            </div>
          )}
        </StudioSection>

        <StudioSection
          title="Bid Sessions"
          description="Sessions you created or won. Participant history can be added later with per-session bid reads."
          action={<FullDirectoryLink href="/marketplace?tab=bidding" label="Open bidding tab" compact />}
        >
          {isBiddingLoading ? (
            <div className="h-32 animate-pulse rounded-xl bg-content2" />
          ) : studioSessions.length === 0 ? (
            <CompactEmptyState
              title="No studio bid sessions"
              description="Create a bidding session to source work competitively."
              href="/bidding/create"
              action="Create session"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {studioSessions.slice(0, 6).map(session => (
                <UnifiedWorkCard
                  key={session.id.toString()}
                  title={`Session #${session.id.toString()}`}
                  description={session.creator.toLowerCase() === lowerUser ? 'You created this bidding session.' : 'You won this bidding session.'}
                  href={`/bidding/${session.id.toString()}`}
                  eyebrow={session.creator.toLowerCase() === lowerUser ? 'Creator' : 'Winner'}
                  status={<StatusBadge status={getSessionStatusBadge(session.status).badge} size="sm" />}
                  meta={[
                    { label: 'Budget', value: formatSessionBudget(session) },
                    { label: 'State', value: activeSessions.includes(session) ? 'Active' : formatSessionDeadline(session) },
                  ]}
                  actionLabel="Open Session"
                />
              ))}
            </div>
          )}
        </StudioSection>
      </div>
    </section>
  );
}

function SortControl({
  sortBy,
  sortOrder,
  onSortChange,
  countLabel,
  options,
}: {
  sortBy: string;
  sortOrder: string;
  onSortChange: (sortBy: string, sortOrder: string) => void;
  countLabel: string;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <span className="text-sm text-default-500">Sort by:</span>
        <select
          value={`${sortBy}-${sortOrder}`}
          onChange={event => {
            const [newSortBy, newSortOrder] = event.target.value.split('-');
            onSortChange(newSortBy, newSortOrder);
          }}
          className="px-3 py-2 border border-divider rounded-lg bg-content2 focus:outline-none focus:ring-2 focus:ring-success text-sm"
        >
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <span className="text-sm text-default-500">{countLabel}</span>
    </div>
  );
}

function ServiceGroup({
  title,
  muted = false,
  children,
}: {
  title: string;
  muted?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <h3 className={`text-lg font-semibold mb-3 ${muted ? 'text-default-500' : ''}`}>{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function StudioSection({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={card('padded')}>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className={DS.typography.cardTitle}>{title}</h3>
          <p className="mt-1 text-sm text-default-500">{description}</p>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function StudioMetric({
  icon,
  label,
  value,
  detail,
  isLoading = false,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
  isLoading?: boolean;
}) {
  return (
    <div className={card('padded', 'flex items-start gap-3')}>
      <div className="rounded-xl bg-success/10 p-2 text-success">{icon}</div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-default-400">{label}</p>
        <p className="mt-1 text-2xl font-bold text-foreground">{isLoading ? '…' : value}</p>
        <p className="mt-1 text-xs text-default-500">{detail}</p>
      </div>
    </div>
  );
}

function CompactEmptyState({
  title,
  description,
  href,
  action,
}: {
  title: string;
  description: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-divider bg-content2/40 p-5 text-center">
      <h4 className={DS.emptyState.title}>{title}</h4>
      <p className="mx-auto mt-1 max-w-md text-sm text-default-500">{description}</p>
      {href && action && (
        <NextLink href={href} className={btn('ghost', 'mt-4 text-sm')}>
          {action}
          <ArrowRight className="size-3" />
        </NextLink>
      )}
    </div>
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
    <NextLink href={href} className={card('interactive')}>
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

function formatSessionBudget(session: BiddingSession): string {
  const token = getTokenByAddress(session.paymentToken);
  return formatAmount(session.maxBudget, token, {
    includeSymbol: true,
    minFractionDigits: token.symbol === 'USDC' ? 2 : 0,
    maxFractionDigits: token.symbol === 'USDC' ? 2 : 6,
  });
}

function formatSessionDeadline(session: BiddingSession): string {
  return new Date(Number(session.deadline) * 1000).toLocaleDateString();
}

function getUserRole(job: Job, user: `0x${string}`): string {
  const lower = user.toLowerCase();
  if (job.client.toLowerCase() === lower) return 'Client';
  if (job.provider.toLowerCase() === lower) return 'Provider';
  if (job.evaluator.toLowerCase() === lower) return 'Evaluator';
  return 'Participant';
}
