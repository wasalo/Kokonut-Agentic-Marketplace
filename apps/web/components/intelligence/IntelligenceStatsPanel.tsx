'use client';

import { useEffect, useState } from 'react';
import NextLink from 'next/link';
import { ArrowRight, BrainCircuit, FileCheck, Sprout, Users } from 'lucide-react';
import { useIntelligenceClient } from '@/lib/hooks/useIntelligenceClient';
import { card, btn } from '@/lib/design-system';

interface IntelligenceStats {
  farms: number;
  agents: number;
  attestations: number;
  aiSummaries: number;
}

function StatSkeleton() {
  return (
    <div className="h-24 animate-pulse rounded-2xl bg-content2" />
  );
}

export function IntelligenceStatsPanel() {
  const client = useIntelligenceClient();
  const [stats, setStats] = useState<IntelligenceStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const [farms, agents, attestations, aiSummaries] = await Promise.all([
          client.listFarms({ limit: 0, meta: 'total_count' }),
          client.listAgents({ limit: 0, meta: 'total_count' }),
          client.listAttestations({ limit: 0, meta: 'total_count' }),
          client.listAISummaries({ limit: 0, meta: 'total_count' }),
        ]);
        if (!cancelled) {
          setStats({
            farms: farms.length,
            agents: agents.length,
            attestations: attestations.length,
            aiSummaries: aiSummaries.length,
          });
        }
      } catch {
        if (!cancelled) setError('Unable to load intelligence data. The API may be unavailable.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [client]);

  const statCards = stats
    ? [
        { icon: Sprout, label: 'Farms', value: stats.farms },
        { icon: Users, label: 'Agents', value: stats.agents },
        { icon: FileCheck, label: 'Attestations', value: stats.attestations },
        { icon: BrainCircuit, label: 'AI Summaries', value: stats.aiSummaries },
      ]
    : [];

  return (
    <section>
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Kokonut Intelligence</h2>
          <p className="text-default-500">Cross-farm monitoring, verification, and AI analysis</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl border border-danger/20 bg-danger/5">
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <StatSkeleton />
          <StatSkeleton />
          <StatSkeleton />
          <StatSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 mb-6">
          {statCards.map(stat => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className={card('padded')}>
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="size-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-sm text-default-500">{stat.label}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <NextLink href="/intelligence" className={btn('primary')}>
        View All Farms
        <ArrowRight className="size-4" />
      </NextLink>
    </section>
  );
}
