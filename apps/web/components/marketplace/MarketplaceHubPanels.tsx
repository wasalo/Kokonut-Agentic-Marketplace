'use client';

import type { ReactNode } from 'react';
import NextLink from 'next/link';
import { ArrowRight, Briefcase, Code, RefreshCw } from 'lucide-react';
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
import { useJobsDirectory } from '@/lib/hooks/useJobsDirectory';
import { useMarketplaceSkillsDirectory } from '@/lib/hooks/useMarketplaceSkillsDirectory';

const HUB_PAGE_SIZE = 10;

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
  error,
  onRefetch,
}: {
  services: Service[];
  isConnected: boolean;
  isLoading: boolean;
  error?: Error | null;
  onRefetch: () => void;
}) {
  if (!isConnected) {
    return <EmptyHubState title="Connect to manage your studio" description="Your services, agents, and skills live here once connected." />;
  }

  const activeServices = services.filter(service => service.isActive);
  const inactiveServices = services.filter(service => !service.isActive);

  return (
    <section>
      <PanelHeader
        title="Provider Studio"
        description="Manage what you offer without leaving the marketplace workspace."
        action={
          <button
            type="button"
            onClick={onRefetch}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-xl border border-divider bg-content2 px-3 py-2 text-sm font-medium hover:bg-content3 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`size-4 ${isLoading ? 'animate-spin' : ''}`} />
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <StudioShortcut href="/dashboard/agents" icon={<Briefcase className="size-5" />} title="Agents" detail="Manage identities" />
        <StudioShortcut href="/dashboard/skills" icon={<Code className="size-5" />} title="Skills" detail="Add capabilities" />
      </div>
      {isLoading ? (
        <div className="h-32 animate-pulse rounded-2xl bg-content2" />
      ) : services.length === 0 ? (
        <EmptyHubState title="No services listed yet" description="Create your first listing to start receiving work." href="/marketplace/create" action="List service" />
      ) : (
        <div className="space-y-6">
          {activeServices.length > 0 && (
            <ServiceGroup title={`Active Services (${activeServices.length})`}>
              {activeServices.map(service => (
                <ProviderServiceCard
                  key={service.id.toString()}
                  service={service}
                  onRefetch={onRefetch}
                />
              ))}
            </ServiceGroup>
          )}

          {inactiveServices.length > 0 && (
            <ServiceGroup title={`Inactive Services (${inactiveServices.length})`} muted>
              {inactiveServices.map(service => (
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
