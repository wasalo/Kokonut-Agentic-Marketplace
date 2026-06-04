'use client';

import type { ComponentType, ReactNode } from 'react';
import NextLink from 'next/link';
import { Briefcase, Code, Compass, Gavel, LayoutDashboard, Store } from 'lucide-react';
import { btn } from '@/lib/design-system';

export type MarketplaceHubTab = 'discover' | 'jobs' | 'bidding' | 'skills' | 'my-work' | 'studio';

export const MARKETPLACE_HUB_TABS: Array<{
  id: MarketplaceHubTab;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  color: string;
  bg: string;
}> = [
  {
    id: 'discover',
    label: 'Discover',
    description: 'Find services and providers',
    icon: Compass,
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
  {
    id: 'jobs',
    label: 'Jobs',
    description: 'Browse and post work',
    icon: Briefcase,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  {
    id: 'bidding',
    label: 'Bidding',
    description: 'Run competitive sessions',
    icon: Gavel,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
  },
  {
    id: 'skills',
    label: 'Skills',
    description: 'Explore capabilities',
    icon: Code,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
  },
  {
    id: 'my-work',
    label: 'My Work',
    description: 'Things needing attention',
    icon: LayoutDashboard,
    color: 'text-teal-500',
    bg: 'bg-teal-500/10',
  },
  {
    id: 'studio',
    label: 'Studio',
    description: 'Manage what you offer',
    icon: Store,
    color: 'text-pink-500',
    bg: 'bg-pink-500/10',
  },
];

interface MarketplaceHubShellProps {
  activeTab: MarketplaceHubTab;
  onTabChange: (tab: MarketplaceHubTab) => void;
  actions?: ReactNode;
  children: ReactNode;
}

export function MarketplaceHubShell({
  activeTab,
  onTabChange,
  actions,
  children,
}: MarketplaceHubShellProps) {
  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      <div className="mb-6 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#009F4D]/20 via-content1 to-[#FFCD00]/10 p-5 md:p-7">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-success/20 bg-success/10 px-3 py-1 text-xs font-medium text-success mb-4">
              Agent Economy Workspace
            </div>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight">Marketplace Hub</h1>
            <p className="text-default-500 mt-3 md:text-lg">
              Discover services, post work, bid, and manage your agent business without jumping across pages.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {actions ?? (
              <>
                <NextLink href="/marketplace/create" className={btn('primary')}>
                  List Service
                </NextLink>
                <NextLink href="/jobs/create" className={btn('secondary')}>
                  Post Job
                </NextLink>
                <NextLink href="/bidding/create" className={btn('secondary')}>
                  Create Bid Session
                </NextLink>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mb-6 overflow-x-auto rounded-2xl border border-divider bg-content1/60 p-1">
        <div className="grid min-w-[760px] grid-cols-6 gap-1 md:min-w-0">
          {MARKETPLACE_HUB_TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`rounded-xl px-3 py-3 text-left transition-all ${
                  isActive
                    ? `${tab.bg} border border-current/20 shadow-sm`
                    : 'text-default-500 hover:bg-content2 hover:text-foreground border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className={`size-4 ${isActive ? tab.color : ''}`} />
                  <span className={`text-sm font-semibold ${isActive ? tab.color : ''}`}>{tab.label}</span>
                </div>
                <p className={`mt-1 text-[11px] ${isActive ? tab.color + ' opacity-70' : 'text-default-400'}`}>
                  {tab.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {children}
    </div>
  );
}
