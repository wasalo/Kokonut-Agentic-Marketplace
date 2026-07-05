'use client';

import { useQuery } from '@tanstack/react-query';
import NextLink from 'next/link';
import { ArrowRight, BrainCircuit, FileCheck, Loader2, Sprout, Users } from 'lucide-react';
import { useIntelligenceClient } from '@/lib/hooks/useIntelligenceClient';
import { card, btn } from '@/lib/design-system';
import type {
  IntelligenceAgent,
  IntelligenceAttestation,
  IntelligenceAISummary,
  IntelligenceFarm,
} from '@/lib/intelligence/client';

const STALE_TIME = 5 * 60 * 1000;

function StatSkeleton() {
  return <div className="h-24 animate-pulse rounded-2xl bg-content2" />;
}

function StatCard({
  icon: Icon,
  label,
  color,
  data,
  isLoading,
}: {
  icon: typeof Sprout;
  label: string;
  color: string;
  data: unknown[] | undefined;
  isLoading: boolean;
}) {
  if (isLoading) return <StatSkeleton />;
  return (
    <div className={card('padded')}>
      <div className="flex items-center gap-3">
        <div className={`size-10 rounded-lg ${color} flex items-center justify-center shrink-0`}>
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{data?.length ?? 0}</p>
          <p className="text-sm text-default-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

export function IntelligenceStatsPanel() {
  const client = useIntelligenceClient();

  const farms = useQuery<IntelligenceFarm[]>({
    queryKey: ['intelligence-farms'],
    queryFn: () => client.listFarms({ limit: 100 }),
    staleTime: STALE_TIME,
    retry: 2,
  });

  const agents = useQuery<IntelligenceAgent[]>({
    queryKey: ['intelligence-agents'],
    queryFn: () => client.listAgents({ limit: 100 }),
    staleTime: STALE_TIME,
    retry: 2,
  });

  const attestations = useQuery<IntelligenceAttestation[]>({
    queryKey: ['intelligence-attestations'],
    queryFn: () => client.listAttestations({ limit: 100 }),
    staleTime: STALE_TIME,
    retry: 2,
  });

  const aiSummaries = useQuery<IntelligenceAISummary[]>({
    queryKey: ['intelligence-ai-summaries'],
    queryFn: () => client.listAISummaries({ limit: 100 }),
    staleTime: STALE_TIME,
    retry: 2,
  });

  const anyLoading = farms.isLoading || agents.isLoading || attestations.isLoading || aiSummaries.isLoading;
  const anyError = farms.error || agents.error || attestations.error || aiSummaries.error;

  return (
    <section>
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Kokonut Intelligence</h2>
          <p className="text-default-500">Cross-farm monitoring, verification, and AI analysis</p>
        </div>
        {anyLoading && (
          <div className="flex items-center gap-2 text-sm text-default-500">
            <Loader2 className="size-4 animate-spin" />
            Loading…
          </div>
        )}
      </div>

      {anyError && !anyLoading && (
        <div className="mb-6 p-4 rounded-xl border border-danger/20 bg-danger/5">
          <p className="text-sm text-danger">
            Unable to load intelligence data. The API may be unavailable.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatCard
          icon={Sprout}
          label="Farms"
          color="bg-primary/10 text-primary"
          data={farms.data}
          isLoading={farms.isLoading}
        />
        <StatCard
          icon={Users}
          label="Agents"
          color="bg-blue-500/10 text-blue-500"
          data={agents.data}
          isLoading={agents.isLoading}
        />
        <StatCard
          icon={FileCheck}
          label="Attestations"
          color="bg-amber-500/10 text-amber-500"
          data={attestations.data}
          isLoading={attestations.isLoading}
        />
        <StatCard
          icon={BrainCircuit}
          label="AI Summaries"
          color="bg-purple-500/10 text-purple-500"
          data={aiSummaries.data}
          isLoading={aiSummaries.isLoading}
        />
      </div>

      <NextLink
        href="/intelligence"
        className={`${btn('primary')} inline-flex items-center gap-2`}
      >
        View All Farms
        <ArrowRight className="size-4" />
      </NextLink>
    </section>
  );
}
