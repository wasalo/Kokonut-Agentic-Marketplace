'use client';

import { use, Suspense } from 'react';
import { useState } from 'react';
import Link from 'next/link';
import { Card, Badge, Skeleton } from '@heroui/react';
import { useUnifiedAgentProfile, useEfpStats } from '@/lib/hooks';
import { formatUsd } from '@/lib/tokenUtils';

import { useAccount } from 'wagmi';
import { Address } from '@/components/Address';
import { FollowButton, FollowersYouKnow, FollowersAndFollowing, FollowerTag } from 'ethereum-identity-kit';

import { 
  Wallet,
  Package,
  Briefcase,
  Star,
  Plug,
  ExternalLink,
  User,
  Code,
  Activity,
  MessageSquare,
  Webhook,
  Mail,
  Users,
} from 'lucide-react';

interface AgentDetailPageProps {
  params: Promise<{ id: string }>;
}

function AgentHeader({ 
  agentId, 
  owner, 
  metadata,
  connectedAddress,
  followersCount,
  followingCount,
}: { 
  agentId: bigint;
  owner: `0x${string}` | undefined;
  metadata: any;
  connectedAddress?: `0x${string}`;
  followersCount: number;
  followingCount: number;
}) {
  const agentName = metadata?.name || `Agent #${agentId}`;
  const agentDescription = metadata?.description || '';
  const capabilities = metadata?.capabilities || [];

  return (
    <div className="bg-gradient-to-br from-content2 to-content3 border border-divider rounded-xl md:rounded-2xl p-4 md:p-6 mb-4 md:mb-6">
      <div className="flex flex-col md:flex-row gap-3 md:gap-6">
        <div className="flex-shrink-0 self-center md:self-auto">
          <div className="w-16 h-16 md:w-24 md:h-24 rounded-xl md:rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white text-xl md:text-3xl font-bold">
            {metadata?.name ? metadata.name.charAt(0).toUpperCase() : `#${agentId}`}
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2 md:gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground mb-0.5">{agentName}</h1>
              <p className="text-default-500 text-xs md:text-sm mb-2 md:mb-3">Agent #{Number(agentId)}</p>
            </div>
            {metadata?.source === 'kokonut-marketplace' && (
              <Badge color="success" className="self-start text-xs">Kokonut Verified</Badge>
            )}
          </div>
          
          {agentDescription && (
            <p className="text-default-400 text-xs md:text-sm mb-3 md:mb-4 line-clamp-2">{agentDescription}</p>
          )}
          
          {capabilities.length > 0 && (
            <div className="flex flex-wrap gap-1.5 md:gap-2 mb-3 md:mb-4">
              {capabilities.slice(0, 4).map((cap: string, i: number) => (
                <Badge key={i} className="text-xs">{cap}</Badge>
              ))}
              {capabilities.length > 4 && (
                <Badge className="text-xs">+{capabilities.length - 4}</Badge>
              )}
            </div>
          )}
          
          {/* Communication Channels - Compact badges */}
          {(metadata?.endpoints?.mcp || metadata?.endpoints?.a2a || metadata?.channels?.email || metadata?.channels?.webhook) && (
            <div className="flex flex-wrap gap-1.5 md:gap-2 mb-3 md:mb-4">
              {metadata?.endpoints?.mcp && (
                <Badge className="text-xs flex items-center gap-1">
                  <Code className="w-3 h-3" /> MCP
                </Badge>
              )}
              {metadata?.endpoints?.a2a && (
                <Badge className="text-xs flex items-center gap-1">
                  <Plug className="w-3 h-3" /> A2A
                </Badge>
              )}
              {metadata?.channels?.email && (
                <Badge className="text-xs flex items-center gap-1">
                  <Mail className="w-3 h-3" /> Email
                </Badge>
              )}
              {metadata?.channels?.webhook && (
                <Badge className="text-xs flex items-center gap-1">
                  <Webhook className="w-3 h-3" /> Webhook
                </Badge>
              )}
            </div>
          )}

          {/* EFP Social - Follow Stats + Follow Button + Follower Tag */}
          <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-3 md:mb-4">
            <div className="flex items-center gap-3 text-xs md:text-sm text-default-500">
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                <strong className="text-foreground">{followersCount}</strong> followers
              </span>
              <span className="flex items-center gap-1">
                <strong className="text-foreground">{followingCount}</strong> following
              </span>
            </div>
            {connectedAddress && owner && connectedAddress.toLowerCase() !== owner.toLowerCase() && (
              <span className="flex items-center gap-2">
                <FollowerTag
                  lookupAddressOrName={owner}
                  connectedAddress={connectedAddress}
                  showLoading={false}
                />
                <FollowButton
                  lookupAddress={owner}
                  connectedAddress={connectedAddress}
                />
              </span>
            )}
          </div>
          
          {/* Address and actions - stack on mobile */}
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 text-xs md:text-sm">
            {owner && (
              <div className="flex items-center gap-1.5 md:gap-2">
                <Wallet className="w-3.5 md:w-4 text-default-400" />
                <Address address={owner as `0x${string}`} truncate />
              </div>
            )}
            <Link 
              href={`/marketplace?provider=${owner}`}
              className="text-primary hover:text-primary/80 flex items-center gap-1"
            >
              <Package className="w-3.5 md:w-4" />
              View Services
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatsGrid({ 
  score, 
  servicesCount, 
  providerJobsCount,
  skillsCount,
  followersCount,
  isLoading 
}: { 
  score: number;
  servicesCount: number;
  providerJobsCount: number;
  skillsCount: number;
  followersCount: number;
  isLoading: boolean;
}) {
  const stats = [
    { label: 'Reputation', value: score || 0, icon: Star },
    { label: 'Followers', value: followersCount, icon: Users },
    { label: 'Services', value: servicesCount, icon: Package },
    { label: 'Jobs Done', value: providerJobsCount, icon: Briefcase },
    { label: 'Skills', value: skillsCount, icon: Code },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-4 mb-4 md:mb-6">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 md:h-24 rounded-lg md:rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-4 mb-4 md:mb-6">
      {stats.map((stat, i) => (
        <Card key={i} className="bg-content2 border-divider">
          <div className="p-2 md:p-4">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-1.5 md:p-2 rounded-lg bg-content3">
                <stat.icon className="w-3.5 md:w-5 h-3.5 md:h-5" />
              </div>
              <div>
                <p className="text-[10px] md:text-xs text-default-500">{stat.label}</p>
                <p className="text-lg md:text-xl font-bold text-foreground">{stat.value}</p>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-1.5 md:py-2 border-b border-divider/50 last:border-0">
      <span className="text-default-500 text-xs md:text-sm">{label}</span>
      <span className="font-medium text-xs md:text-sm">{value}</span>
    </div>
  );
}

function OverviewTab({ 
  score,
  servicesCount,
  providerJobsCount,
  clientJobsCount,
  skillsCount,
  followersCount,
  reviewCount,
  averageRating,
}: { 
  score: number;
  servicesCount: number;
  providerJobsCount: number;
  clientJobsCount: number;
  skillsCount: number;
  followersCount: number;
  reviewCount: number;
  averageRating: number;
}) {
  return (
    <div className="space-y-4 md:space-y-6">
      <StatsGrid 
        score={score}
        servicesCount={servicesCount}
        providerJobsCount={providerJobsCount}
        skillsCount={skillsCount}
        followersCount={followersCount}
        isLoading={false}
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        <Card className="bg-content2 border-divider">
          <div className="p-3 md:p-5">
            <h3 className="font-semibold mb-3 md:mb-4 flex items-center gap-2 text-sm md:text-base">
              <Star className="w-4 h-4 text-yellow-500" />
              Reputation
            </h3>
            <div className="space-y-0">
              <StatRow label="Score" value={score} />
              <StatRow label="Reviews" value={reviewCount} />
              <StatRow label="Avg Rating" value={averageRating.toFixed(1)} />
            </div>
          </div>
        </Card>
        
        <Card className="bg-content2 border-divider">
          <div className="p-3 md:p-5">
            <h3 className="font-semibold mb-3 md:mb-4 flex items-center gap-2 text-sm md:text-base">
              <Activity className="w-4 h-4 text-blue-500" />
              Activity
            </h3>
            <div className="space-y-0">
              <StatRow label="Jobs as Provider" value={providerJobsCount} />
              <StatRow label="Jobs as Client" value={clientJobsCount} />
              <StatRow label="Services Listed" value={servicesCount} />
              <StatRow label="Skills Registered" value={skillsCount} />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function ServicesTab({ services, isLoading }: { services: any[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="grid gap-3 md:gap-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-20 md:h-24 rounded-lg md:rounded-xl" />
        ))}
      </div>
    );
  }
  
  if (!services || services.length === 0) {
    return (
      <Card className="bg-content2 border-divider">
        <div className="p-6 md:p-8 text-center">
          <Package className="w-10 h-10 md:w-12 md:h-12 text-default-400 mx-auto mb-3 md:mb-4" />
          <p className="text-default-500 text-sm md:text-base">No services listed yet</p>
        </div>
      </Card>
    );
  }
  
  return (
    <div className="grid gap-3 md:gap-4">
      {services.map((service) => (
        <Link key={service.id} href={`/marketplace/${service.id}`}>
          <Card className="bg-content2 border-divider hover:border-primary/50 transition-colors cursor-pointer">
            <div className="p-3 md:p-5">
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-foreground mb-1 text-sm md:text-base">{service.name}</h3>
                  <p className="text-xs md:text-sm text-default-500 line-clamp-2">{service.description}</p>
                </div>
                <Badge className="text-xs shrink-0">
                  {service.price ? formatUsd(BigInt(service.price), { decimals: 6 }) : 'Free'}
                </Badge>
              </div>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}

function JobsTab({ jobs, type }: { jobs: any[]; type: 'provider' | 'client' }) {
  const Icon = type === 'provider' ? Briefcase : User;
  const title = type === 'provider' ? 'Jobs as Provider' : 'Jobs as Client';
  
  if (jobs.length === 0) {
    return (
      <div>
        <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm md:text-base">
          <Icon className="w-4 h-4 text-blue-500" />
          {title} (0)
        </h3>
        <p className="text-default-500 text-xs md:text-sm">No jobs</p>
      </div>
    );
  }
  
  return (
    <div>
      <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm md:text-base">
        <Icon className="w-4 h-4 text-blue-500" />
        {title} ({jobs.length})
      </h3>
      <div className="grid gap-2 md:gap-3">
        {jobs.slice(0, 5).map((job) => (
          <Link key={job.id} href={`/jobs/${job.id}`}>
            <Card className="bg-content2 border-divider hover:border-primary/50 transition-colors cursor-pointer">
              <div className="p-3 md:p-4">
                <div className="flex justify-between items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm md:text-base">Job #{Number(job.id)}</p>
                    <p className="text-xs text-default-500 truncate">{String(job.description).slice(0, 50)}...</p>
                  </div>
                  <Badge className="text-xs shrink-0">{String(job.status) || 'Open'}</Badge>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

function AllJobsTab({ providerJobs, clientJobs }: { providerJobs: any[]; clientJobs: any[] }) {
  const hasJobs = providerJobs.length > 0 || clientJobs.length > 0;
  
  if (!hasJobs) {
    return (
      <Card className="bg-content2 border-divider">
        <div className="p-6 md:p-8 text-center">
          <Briefcase className="w-10 h-10 md:w-12 md:h-12 text-default-400 mx-auto mb-3 md:mb-4" />
          <p className="text-default-500 text-sm md:text-base">No jobs yet</p>
        </div>
      </Card>
    );
  }
  
  return (
    <div className="space-y-4 md:space-y-6">
      <JobsTab jobs={providerJobs} type="provider" />
      <JobsTab jobs={clientJobs} type="client" />
    </div>
  );
}

import { PortfolioGrid } from '@/components/PortfolioCard';

function PortfolioTab({ metadata }: { metadata: any }) {
  const portfolio = metadata?.portfolio || [];

  if (portfolio.length === 0) {
    return (
      <Card className="bg-content2 border-divider">
        <div className="p-6 md:p-8 text-center">
          <Package className="w-10 h-10 md:w-12 md:h-12 text-default-400 mx-auto mb-3 md:mb-4" />
          <p className="text-default-500 text-sm md:text-base">No portfolio items yet</p>
          <p className="text-default-400 text-xs md:text-sm mt-2">
            Add portfolio items in settings to showcase your work
          </p>
        </div>
      </Card>
    );
  }

  return <PortfolioGrid items={portfolio} />;
}

function NetworkTab({ owner }: { owner: `0x${string}` | undefined }) {
  if (!owner) {
    return (
      <Card className="bg-content2 border-divider">
        <div className="p-6 md:p-8 text-center">
          <Users className="w-10 h-10 md:w-12 md:h-12 text-default-400 mx-auto mb-3 md:mb-4" />
          <p className="text-default-500 text-sm md:text-base">Loading network data...</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <FollowersAndFollowing
        user={owner}
        defaultTab="followers"
        darkMode
        showRecommendations
        useVirtualList
      />
    </div>
  );
}

function ConnectionsTab({ metadata, owner, connectedAddress }: { metadata: any; owner?: `0x${string}`; connectedAddress?: `0x${string}` }) {
  const endpoints = metadata?.endpoints || {};
  const channels = metadata?.channels || {};
  
  const hasConnections = endpoints.https || endpoints.mcp || endpoints.a2a || channels.email || channels.webhook;
  
  if (!hasConnections) {
    return (
      <Card className="bg-content2 border-divider">
        <div className="p-6 md:p-8 text-center">
          <Plug className="w-10 h-10 md:w-12 md:h-12 text-default-400 mx-auto mb-3 md:mb-4" />
          <p className="text-default-500 text-sm md:text-base">No connections configured</p>
          <p className="text-default-400 text-xs md:text-sm mt-2">
            Add endpoints to your agent metadata to enable MCP, A2A, email, or webhooks
          </p>
        </div>
      </Card>
    );
  }
  
  return (
    <div className="grid gap-3 md:gap-4">
      {/* Followers You Know */}
      {connectedAddress && (
        <FollowersYouKnow
          lookupAddressOrName={owner!}
          connectedAddress={connectedAddress}
          showEmpty={false}
          hasModal
        />
      )}

      {/* Endpoints */}
      {(endpoints.https || endpoints.mcp || endpoints.a2a) && (
        <Card className="bg-content2 border-divider">
          <div className="p-3 md:p-5">
            <h3 className="font-semibold mb-3 md:mb-4 flex items-center gap-2 text-sm md:text-base">
              <Code className="w-4 h-4 text-blue-500" />
              API Endpoints
            </h3>
            <div className="space-y-2 md:space-y-3">
              {endpoints.https && (
                <div className="flex justify-between items-center gap-2">
                  <span className="text-default-500 text-xs md:text-sm">HTTPS</span>
                  <a 
                    href={endpoints.https}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary flex items-center gap-1 text-xs md:text-sm truncate max-w-[180px] md:max-w-none"
                  >
                    {endpoints.https.slice(0, 30)}... <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
              {endpoints.mcp && (
                <div className="flex justify-between items-center gap-2">
                  <span className="text-default-500 text-xs md:text-sm">MCP Server</span>
                  <a 
                    href={endpoints.mcp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary flex items-center gap-1 text-xs md:text-sm truncate max-w-[180px] md:max-w-none"
                  >
                    {endpoints.mcp.slice(0, 40)}... <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
              {endpoints.a2a && (
                <div className="flex justify-between items-center gap-2">
                  <span className="text-default-500 text-xs md:text-sm">A2A Protocol</span>
                  <a 
                    href={endpoints.a2a}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary flex items-center gap-1 text-xs md:text-sm truncate max-w-[180px] md:max-w-none"
                  >
                    {endpoints.a2a.slice(0, 30)}... <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}
      
      {/* Channels */}
      {(channels.email || channels.webhook) && (
        <Card className="bg-content2 border-divider">
          <div className="p-3 md:p-5">
            <h3 className="font-semibold mb-3 md:mb-4 flex items-center gap-2 text-sm md:text-base">
              <MessageSquare className="w-4 h-4 text-purple-500" />
              Communication Channels
            </h3>
            <div className="space-y-2 md:space-y-3">
              {channels.email && (
                <div className="flex justify-between items-center gap-2">
                  <span className="text-default-500 text-xs md:text-sm">Email</span>
                  <span className="text-xs md:text-sm text-foreground truncate max-w-[120px] md:max-w-none">{channels.email}</span>
                </div>
              )}
              {channels.webhook && (
                <div className="flex justify-between items-center gap-2">
                  <span className="text-default-500 text-xs md:text-sm">Webhook</span>
                  <a 
                    href={channels.webhook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary flex items-center gap-1 text-xs md:text-sm truncate max-w-[180px] md:max-w-none"
                  >
                    {channels.webhook.slice(0, 30)}... <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}
      
      {/* Protocols */}
      {metadata?.protocols && metadata.protocols.length > 0 && (
        <Card className="bg-content2 border-divider">
          <div className="p-3 md:p-5">
            <h3 className="font-semibold mb-3 md:mb-4 flex items-center gap-2 text-sm md:text-base">
              <Plug className="w-4 h-4 text-green-500" />
              Supported Protocols
            </h3>
            <div className="flex flex-wrap gap-1.5 md:gap-2">
              {metadata.protocols.map((proto: string, i: number) => (
                <Badge key={i} className="text-xs">{proto.toUpperCase()}</Badge>
              ))}
            </div>
</div>
      </Card>
    )}
    </div>
  );
}

function SkillsTab({ skillIds, isLoading }: { skillIds: bigint[] | undefined; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="grid gap-3 md:gap-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-20 md:h-24 rounded-lg md:rounded-xl" />
        ))}
      </div>
    );
  }
  
  if (!skillIds || skillIds.length === 0) {
    return (
      <Card className="bg-content2 border-divider">
        <div className="p-6 md:p-8 text-center">
          <Code className="w-10 h-10 md:w-12 md:h-12 text-default-400 mx-auto mb-3 md:mb-4" />
          <p className="text-default-500 text-sm md:text-base">No skills registered yet</p>
        </div>
      </Card>
    );
  }
  
  return (
    <div className="grid gap-3 md:gap-4">
      {skillIds.map((skillId, i) => (
        <Card key={i} className="bg-content2 border-divider">
          <div className="p-3 md:p-5">
            <div className="flex justify-between items-center gap-2">
              <div>
                <p className="font-medium text-sm md:text-base">Skill ID: #{Number(skillId)}</p>
                <p className="text-xs text-default-500">Registered on skill registry</p>
              </div>
              <Badge className="text-xs">Active</Badge>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

export default function AgentDetailPage({ params }: AgentDetailPageProps) {
  const { id } = use(params);
  const agentId = BigInt(id);
  const agentAddress = `0x${id}` as `0x${string}`;
  const { address: connectedAddress } = useAccount();
  
  const { profile, isLoading } = useUnifiedAgentProfile(agentId, agentAddress);
  const { owner, metadata, services, skillIds, providerJobs, clientJobs, reputationScore } = profile;
  const { followersCount, followingCount } = useEfpStats(owner);
  
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'services', label: `Services (${services?.length || 0})` },
    { id: 'jobs', label: `Jobs (${providerJobs.length + clientJobs.length})` },
    { id: 'skills', label: `Skills (${skillIds?.length || 0})` },
    { id: 'portfolio', label: `Portfolio (${metadata?.portfolio?.length || 0})` },
    { id: 'network', label: 'Network' },
    { id: 'connections', label: 'Connections' },
  ];
  
  return (
    <div className="container mx-auto px-3 md:px-4 py-4 md:py-8 max-w-5xl">
      <AgentHeader 
        agentId={agentId}
        owner={owner}
        metadata={metadata}
        connectedAddress={connectedAddress as `0x${string}` | undefined}
        followersCount={followersCount}
        followingCount={followingCount}
      />
      
      <div className="flex flex-col sm:flex-row items-center justify-center rounded-md bg-muted p-1 gap-1 mb-4 md:mb-6 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
              activeTab === tab.id
                ? 'bg-background text-foreground shadow'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      <div className="mt-2">
        {activeTab === 'overview' && (
          <Suspense fallback={<Skeleton className="h-64 rounded-xl" />}>
            <OverviewTab 
              score={reputationScore}
              servicesCount={services?.length || 0}
              providerJobsCount={providerJobs.length}
              clientJobsCount={clientJobs.length}
              skillsCount={skillIds?.length || 0}
              followersCount={followersCount}
              reviewCount={profile.reviewCount}
              averageRating={profile.averageRating}
            />
          </Suspense>
        )}
        
        {activeTab === 'services' && (
          <ServicesTab services={services || []} isLoading={isLoading} />
        )}
        
        {activeTab === 'jobs' && (
          <AllJobsTab providerJobs={providerJobs} clientJobs={clientJobs} />
        )}
        
        {activeTab === 'skills' && (
          <SkillsTab skillIds={skillIds} isLoading={isLoading} />
        )}
        
        {activeTab === 'portfolio' && (
          <PortfolioTab metadata={metadata} />
        )}
        
        {activeTab === 'network' && (
          <NetworkTab owner={owner} />
        )}
        
        {activeTab === 'connections' && (
          <ConnectionsTab metadata={metadata} owner={owner} connectedAddress={connectedAddress as `0x${string}` | undefined} />
        )}
      </div>
    </div>
  );
}
