'use client';

import { useState, useMemo } from 'react';
import { useReadContract, useReadContracts } from 'wagmi';
import { Card } from '@heroui/react';
import { Search, Code, ArrowLeft, Tag, Loader2 } from 'lucide-react';
import NextLink from 'next/link';
import { AGENT_SKILL_REGISTRY_ABI } from '@/lib/contracts/abis';
import { CONTRACT_ADDRESSES, getContractAddress } from '@/lib/contracts/config';
import { useFindSkillsByDomain } from '@/lib/hooks/useSkills';

const SKILL_REGISTRY_ADDRESS = getContractAddress(
  process.env.NEXT_PUBLIC_SKILL_REGISTRY_ADDRESS,
  CONTRACT_ADDRESSES.sepolia.skillRegistry
);

// Popular skill domains
const POPULAR_DOMAINS = [
  { id: 'defi', label: 'DeFi', color: '#009F4D', count: 0 },
  { id: 'nft', label: 'NFT', color: '#FFCD00', count: 0 },
  { id: 'ai', label: 'AI / ML', color: '#009F4D', count: 0 },
  { id: 'governance', label: 'Governance', color: '#FFCD00', count: 0 },
  { id: 'web3', label: 'Web3', color: '#009F4D', count: 0 },
  { id: 'data', label: 'Data Analysis', color: '#FFCD00', count: 0 },
  { id: 'security', label: 'Security', color: '#009F4D', count: 0 },
  { id: 'infrastructure', label: 'Infrastructure', color: '#FFCD00', count: 0 },
];

interface Skill {
  agentId: bigint;
  name: string;
  version: string;
  description: string;
  endpoint: string;
  domains: string[];
  isActive: boolean;
  registeredBy: `0x${string}`;
  registeredAt: bigint;
}

function DomainCard({
  domain,
  isSelected,
  onClick,
}: {
  domain: { id: string; label: string; color: string };
  isSelected: boolean;
  onClick: () => void;
}) {
  const { skillIds, isLoading } = useFindSkillsByDomain(domain.id);
  const count = skillIds?.length || 0;

  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-xl border text-left transition-all ${
        isSelected
          ? 'border-success bg-success/5'
          : 'border-divider hover:border-success/30 hover:bg-content2/50'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: domain.color }} />
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-default-400" />
        ) : (
          <span className="text-sm font-medium text-default-500">{count} skills</span>
        )}
      </div>
      <h3 className="font-semibold text-foreground">{domain.label}</h3>
    </button>
  );
}

function SkillCard({ skill, skillId }: { skill: Skill; skillId: bigint }) {
  return (
    <Card className="border border-divider p-4 hover:border-success/30 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-foreground">{skill.name}</h3>
          <p className="text-sm text-default-500">v{skill.version}</p>
        </div>
        <span
          className={`text-xs px-2 py-1 rounded-full ${
            skill.isActive ? 'bg-success/10 text-success' : 'bg-default-100 text-default-500'
          }`}
        >
          {skill.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>

      {skill.description && (
        <p className="text-sm text-default-600 mb-3 line-clamp-2">{skill.description}</p>
      )}

      {skill.endpoint && (
        <a
          href={skill.endpoint}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary hover:underline mb-3 block truncate"
        >
          {skill.endpoint}
        </a>
      )}

      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-1">
          {skill.domains.slice(0, 3).map(domain => (
            <span
              key={domain}
              className="text-xs px-2 py-0.5 rounded-full bg-content2 text-default-600 border border-divider"
            >
              {domain}
            </span>
          ))}
          {skill.domains.length > 3 && (
            <span className="text-xs px-2 py-0.5 text-default-400">
              +{skill.domains.length - 3}
            </span>
          )}
        </div>

        <NextLink
          href={`/marketplace?skillDomain=${skill.domains[0] || ''}`}
          className="text-xs text-success hover:underline flex items-center gap-1"
        >
          <Tag className="w-3 h-3" />
          Find Services
        </NextLink>
      </div>

      <div className="mt-3 pt-3 border-t border-divider flex items-center justify-between text-xs text-default-400">
        <span>Agent #{skill.agentId.toString()}</span>
        <span>Skill #{skillId.toString()}</span>
      </div>
    </Card>
  );
}

export default function MarketplaceSkillsPage() {
  const [selectedDomain, setSelectedDomain] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  const { skillIds, isLoading: isLoadingSkillIds } = useFindSkillsByDomain(
    selectedDomain || undefined
  );

  // Fetch skill details
  const skillQueries = useMemo(() => {
    if (!skillIds || skillIds.length === 0) return [];
    return skillIds.map(id => ({
      address: SKILL_REGISTRY_ADDRESS,
      abi: AGENT_SKILL_REGISTRY_ABI,
      functionName: 'getSkill' as const,
      args: [id] as const,
    }));
  }, [skillIds]);

  const { data: skillResults, isLoading: isLoadingSkills } = useReadContracts({
    contracts: skillQueries,
    query: { enabled: skillQueries.length > 0 },
  });

  const skills: Array<Skill & { skillId: bigint }> = useMemo(() => {
    if (!skillResults || !skillIds) return [];
    return skillResults
      .map((result, index) => {
        if (result.status !== 'success' || !result.result) return null;
        const data = result.result as unknown as Skill;
        return {
          ...data,
          skillId: skillIds[index],
        };
      })
      .filter((s): s is Skill & { skillId: bigint } => s !== null && s.isActive)
      .filter(s =>
        searchQuery
          ? s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.description.toLowerCase().includes(searchQuery.toLowerCase())
          : true
      );
  }, [skillResults, skillIds, searchQuery]);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <NextLink
          href="/marketplace"
          className="inline-flex items-center gap-2 text-sm text-default-500 hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Marketplace
        </NextLink>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Code className="w-8 h-8 text-success" />
              Browse Skills
            </h1>
            <p className="text-default-500 mt-1">
              Discover agent capabilities and find services by skill domain
            </p>
          </div>

          {/* Search */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-default-400" />
            <input
              type="text"
              placeholder="Search skills..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-divider rounded-lg bg-content2 focus:outline-none focus:ring-2 focus:ring-success text-foreground"
            />
          </div>
        </div>
      </div>

      {/* Domain Filter */}
      <div className="mb-8">
        <h2 className="text-sm font-medium text-default-500 mb-4">Filter by Domain</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {POPULAR_DOMAINS.map(domain => (
            <DomainCard
              key={domain.id}
              domain={domain}
              isSelected={selectedDomain === domain.id}
              onClick={() => setSelectedDomain(selectedDomain === domain.id ? '' : domain.id)}
            />
          ))}
        </div>
      </div>

      {/* Results */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            {selectedDomain ? (
              <>
                Skills in <span className="text-success capitalize">{selectedDomain}</span>
              </>
            ) : (
              'All Skills'
            )}
          </h2>
          <span className="text-sm text-default-500">
            {isLoadingSkills || isLoadingSkillIds ? (
              <Loader2 className="w-4 h-4 animate-spin inline" />
            ) : (
              `${skills.length} skill${skills.length !== 1 ? 's' : ''} found`
            )}
          </span>
        </div>

        {isLoadingSkills || isLoadingSkillIds ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="border border-divider p-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-5 bg-content2 rounded w-2/3" />
                  <div className="h-4 bg-content2 rounded w-full" />
                  <div className="h-4 bg-content2 rounded w-1/2" />
                </div>
              </Card>
            ))}
          </div>
        ) : skills.length === 0 ? (
          <Card className="border border-divider p-12 text-center">
            <Code className="w-12 h-12 text-default-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Skills Found</h3>
            <p className="text-sm text-default-500 max-w-md mx-auto">
              {selectedDomain
                ? `No skills found in the "${selectedDomain}" domain. Try selecting a different domain.`
                : 'No skills have been registered yet. Skills help agents showcase their capabilities.'}
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {skills.map(skill => (
              <SkillCard key={skill.skillId.toString()} skill={skill} skillId={skill.skillId} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
