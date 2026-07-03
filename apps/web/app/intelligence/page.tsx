'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Loader2,
  AlertCircle,
  Sprout,
  MapPin,
  Activity,
  Bot,
  FileText,
  ClipboardList,
  Database,
  ExternalLink,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { card, btn } from '@/lib/design-system';
import { useIntelligenceClient } from '@/lib/hooks/useIntelligenceClient';
import { useIntelligenceFarms } from '@/lib/hooks/useIntelligenceFarms';
import { useIntelligenceAgents } from '@/lib/hooks/useIntelligenceAgents';
import { useIntelligenceMRVEvents } from '@/lib/hooks/useIntelligenceMRVEvents';
import type {
  IntelligenceAISummary,
  IntelligenceFarm,
  IntelligenceAgent,
  IntelligenceMRVEvent,
} from '@/lib/intelligence/client';

function SectionHeader({
  icon: Icon,
  title,
  count,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  count?: number;
}) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="size-5 text-primary" />
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      {count !== undefined && (
        <span className="text-sm text-default-500">({count})</span>
      )}
    </div>
  );
}

function LoadingBlock({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Loader2 className="size-8 text-primary animate-spin mb-3" />
      <p className="text-sm text-default-500">{label}</p>
    </div>
  );
}

function ErrorBlock({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <AlertCircle className="size-8 text-danger mb-3" />
      <p className="text-sm text-danger">{message}</p>
    </div>
  );
}

function EmptyBlock({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Database className="size-10 text-default-300 mb-3" />
      <p className="text-sm text-default-500">{message}</p>
    </div>
  );
}

function formatTimestamp(ts: string | undefined): string {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

function FarmCard({ farm }: { farm: IntelligenceFarm }) {
  const landSize = farm.land_size_m2 ? Number(farm.land_size_m2).toLocaleString() : '—';
  return (
    <div className={card('padded', 'flex flex-col gap-3')}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-foreground truncate">
            {farm.registry_slug || farm.farm_id || 'Unnamed Farm'}
          </h3>
          {farm.project_summary && (
            <p className="text-sm text-default-500 line-clamp-2 mt-1">
              {farm.project_summary}
            </p>
          )}
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
          {farm.status || 'unknown'}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs text-default-500">
        <div className="flex items-center gap-1.5">
          <MapPin className="size-3.5" />
          <span>{farm.source_system || '—'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Sprout className="size-3.5" />
          <span>{landSize} m²</span>
        </div>
      </div>
      {farm.revenue_streams && farm.revenue_streams.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {farm.revenue_streams.slice(0, 3).map((stream, i) => (
            <span
              key={i}
              className="text-xs px-2 py-0.5 rounded bg-content2 text-default-600"
            >
              {stream}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function AgentCard({ agent }: { agent: IntelligenceAgent }) {
  return (
    <div className={card('padded', 'flex flex-col gap-3')}>
      <div className="flex items-start gap-3">
        <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Bot className="size-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-foreground truncate">
            {agent.agent_name || 'Unnamed Agent'}
          </h3>
          {agent.ens_subdomain && (
            <p className="text-xs text-default-500 truncate">{agent.ens_subdomain}</p>
          )}
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
          {agent.agent_state || 'unknown'}
        </span>
      </div>
      <div className="space-y-1.5 text-xs text-default-500">
        <div className="flex items-center justify-between gap-2">
          <span>Registry</span>
          <span className="text-foreground font-medium truncate">{agent.registry_chain || '—'}</span>
        </div>
        {agent.erc8004_agent_id && (
          <div className="flex items-center justify-between gap-2">
            <span>ERC-8004 ID</span>
            <span className="text-foreground font-medium truncate">{agent.erc8004_agent_id}</span>
          </div>
        )}
        {agent.base_rate_usdc && (
          <div className="flex items-center justify-between gap-2">
            <span>Base Rate</span>
            <span className="text-foreground font-medium">${agent.base_rate_usdc} USDC</span>
          </div>
        )}
      </div>
      {agent.capability_manifest_cid && (
        <div className="flex items-center gap-1.5 text-xs text-default-500 truncate">
          <FileText className="size-3.5 shrink-0" />
          <span className="truncate">{agent.capability_manifest_cid}</span>
        </div>
      )}
    </div>
  );
}

function MRVEventRow({ event }: { event: IntelligenceMRVEvent }) {
  return (
    <tr className="border-b border-divider last:border-0 hover:bg-content2/50 transition-colors">
      <td className="px-3 py-2.5 text-sm text-foreground">
        {event.measurement_type || '—'}
      </td>
      <td className="px-3 py-2.5 text-xs text-default-500 whitespace-nowrap">
        {formatTimestamp(event.event_timestamp)}
      </td>
      <td className="px-3 py-2.5 text-sm">
        {event.is_attested ? (
          <span className="inline-flex items-center gap-1 text-success">
            <CheckCircle2 className="size-3.5" />
            <span className="text-xs">Attested</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-warning">
            <Clock className="size-3.5" />
            <span className="text-xs">Pending</span>
          </span>
        )}
      </td>
      <td className="px-3 py-2.5">
        <span className="text-xs px-2 py-0.5 rounded-full bg-content2 text-default-600">
          {event.status || '—'}
        </span>
      </td>
      <td className="px-3 py-2.5 text-xs text-default-500 truncate max-w-[160px]">
        {event.attestation_uid || '—'}
      </td>
    </tr>
  );
}

function AISummaryItem({ summary }: { summary: IntelligenceAISummary }) {
  return (
    <div className={card('padded', 'flex flex-col gap-2')}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="size-4 text-primary shrink-0" />
          <span className="font-medium text-sm text-foreground truncate">
            {summary.summary_type || 'Summary'}
          </span>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full bg-content2 text-default-600 shrink-0">
          {summary.status || '—'}
        </span>
      </div>
      <div className="flex items-center gap-3 text-xs text-default-500">
        <span>{summary.subject_type || '—'}</span>
        <span>·</span>
        <span className="truncate">{summary.subject_id}</span>
      </div>
      {summary.content && (
        <p className="text-sm text-default-600 line-clamp-3 mt-1">{summary.content}</p>
      )}
      {summary.model_version && (
        <div className="flex items-center gap-1.5 text-xs text-default-400 mt-1">
          <Bot className="size-3" />
          <span>{summary.model_version}</span>
        </div>
      )}
    </div>
  );
}

export default function IntelligencePage() {
  useEffect(() => {
    document.title = 'Kokonut Intelligence | Kokonut Agent Economy';
  }, []);

  const client = useIntelligenceClient();
  const { farms, isLoading: farmsLoading, error: farmsError } = useIntelligenceFarms();
  const { agents, isLoading: agentsLoading, error: agentsError } = useIntelligenceAgents();
  const { events, isLoading: eventsLoading, error: eventsError } = useIntelligenceMRVEvents();

  const [selectedFarmId, setSelectedFarmId] = useState<string | undefined>(undefined);
  const { events: farmEvents, isLoading: farmEventsLoading } = useIntelligenceMRVEvents(
    selectedFarmId
  );

  const {
    data: summaries,
    isLoading: summariesLoading,
    error: summariesError,
  } = useQuery<IntelligenceAISummary[]>({
    queryKey: ['intelligence-ai-summaries'],
    queryFn: () => client.listAISummaries({ limit: 20 }),
    staleTime: 60 * 1000,
    retry: 2,
  });

  const displayedEvents = selectedFarmId ? farmEvents : events;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Breadcrumb
        items={[
          { label: 'Marketplace', href: '/marketplace' },
          { label: 'Intelligence' },
        ]}
        className="mb-6"
      />

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Sprout className="size-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Kokonut Intelligence</h1>
            <p className="text-default-500 mt-0.5">
              Cross-farm intelligence dashboard — MRV events, attested data, and AI agents.
            </p>
          </div>
        </div>
        <a
          href="https://kokonut.network/kokonut-intelligence"
          target="_blank"
          rel="noopener noreferrer"
          className={btn('link')}
        >
          Learn more about Kokonut Intelligence
          <ExternalLink className="size-3.5" />
        </a>
      </div>

      <section className="mb-10">
        <SectionHeader icon={Sprout} title="Farms" count={farms.length} />
        {farmsError ? (
          <div className={card('base')}>
            <ErrorBlock message={farmsError.message} />
          </div>
        ) : farmsLoading ? (
          <div className={card('base')}>
            <LoadingBlock label="Loading farms…" />
          </div>
        ) : farms.length === 0 ? (
          <div className={card('base')}>
            <EmptyBlock message="No farms registered yet." />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {farms.map(farm => (
              <button
                key={farm.id}
                type="button"
                onClick={() =>
                  setSelectedFarmId(prev =>
                    prev === farm.id ? undefined : farm.id
                  )
                }
                className={`text-left ${card(
                  'interactive',
                  selectedFarmId === farm.id ? 'border-primary ring-1 ring-primary/30' : ''
                )}`}
              >
                <FarmCard farm={farm} />
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="mb-10">
        <SectionHeader
          icon={Activity}
          title={selectedFarmId ? 'MRV Events (selected farm)' : 'MRV Events'}
          count={displayedEvents.length}
        />
        {(eventsError || (selectedFarmId && farmEventsLoading)) ? (
          <div className={card('base')}>
            {eventsError ? (
              <ErrorBlock message={eventsError.message} />
            ) : (
              <LoadingBlock label="Loading farm events…" />
            )}
          </div>
        ) : (selectedFarmId ? farmEventsLoading : eventsLoading) ? (
          <div className={card('base')}>
            <LoadingBlock label="Loading MRV events…" />
          </div>
        ) : displayedEvents.length === 0 ? (
          <div className={card('base')}>
            <EmptyBlock message="No MRV events recorded." />
          </div>
        ) : (
          <div className={card('base', 'overflow-x-auto')}>
            <table className="w-full">
              <thead>
                <tr className="border-b border-divider">
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-default-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-default-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-default-500 uppercase tracking-wider">
                    Attestation
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-default-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-default-500 uppercase tracking-wider">
                    UID
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayedEvents.map(event => (
                  <MRVEventRow key={event.id} event={event} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mb-10">
        <SectionHeader icon={Bot} title="Intelligence Agents" count={agents.length} />
        {agentsError ? (
          <div className={card('base')}>
            <ErrorBlock message={agentsError.message} />
          </div>
        ) : agentsLoading ? (
          <div className={card('base')}>
            <LoadingBlock label="Loading agents…" />
          </div>
        ) : agents.length === 0 ? (
          <div className={card('base')}>
            <EmptyBlock message="No intelligence agents registered." />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map(agent => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        )}
      </section>

      <section className="mb-10">
        <SectionHeader
          icon={ClipboardList}
          title="AI Summaries"
          count={summaries?.length ?? 0}
        />
        {summariesError ? (
          <div className={card('base')}>
            <ErrorBlock
              message={summariesError instanceof Error ? summariesError.message : 'Failed to load summaries'}
            />
          </div>
        ) : summariesLoading ? (
          <div className={card('base')}>
            <LoadingBlock label="Loading AI summaries…" />
          </div>
        ) : !summaries || summaries.length === 0 ? (
          <div className={card('base')}>
            <EmptyBlock message="No AI summaries available." />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {summaries.map(summary => (
              <AISummaryItem key={summary.id} summary={summary} />
            ))}
          </div>
        )}
      </section>

      <div className={card('padded', 'flex flex-col sm:flex-row items-center justify-between gap-4')}>
        <div className="flex items-center gap-2 text-sm text-default-500">
          <Database className="size-4" />
          <span>
            Data sourced from Kokonut Intelligence Directus API at{' '}
            <code className="text-foreground">
              {process.env.NEXT_PUBLIC_INTELLIGENCE_API_URL ?? 'http://localhost:8055'}
            </code>
          </span>
        </div>
        <Link href="https://kokonut.network/llms.txt" className={btn('secondary')}>
          View Docs Index
          <ExternalLink className="size-3.5" />
        </Link>
      </div>
    </div>
  );
}
