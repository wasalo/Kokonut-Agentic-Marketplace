'use client';

import { Loader2 } from 'lucide-react';
import { useFindSkillsByDomain } from '@/lib/hooks/useSkills';
import { DS } from '@/lib/design-system';

export const POPULAR_SKILL_DOMAINS = [
  { id: 'defi', label: 'DeFi', color: DS.colors.primary },
  { id: 'nft', label: 'NFT', color: DS.colors.secondary },
  { id: 'ai', label: 'AI / ML', color: DS.colors.primary },
  { id: 'governance', label: 'Governance', color: DS.colors.secondary },
  { id: 'web3', label: 'Web3', color: DS.colors.primary },
  { id: 'data', label: 'Data Analysis', color: DS.colors.secondary },
  { id: 'security', label: 'Security', color: DS.colors.primary },
  { id: 'infrastructure', label: 'Infrastructure', color: DS.colors.secondary },
];

interface SkillDomainGridProps {
  selectedDomain: string;
  onSelectDomain: (domain: string) => void;
}

export function SkillDomainGrid({ selectedDomain, onSelectDomain }: SkillDomainGridProps) {
  return (
    <div className="mb-8">
      <h2 className="text-sm font-medium text-default-500 mb-4">Filter by Domain</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {POPULAR_SKILL_DOMAINS.map(domain => (
          <DomainCard
            key={domain.id}
            domain={domain}
            isSelected={selectedDomain === domain.id}
            onClick={() => onSelectDomain(selectedDomain === domain.id ? '' : domain.id)}
          />
        ))}
      </div>
    </div>
  );
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
      type="button"
      onClick={onClick}
      className={`p-4 rounded-xl border text-left transition-all ${
        isSelected
          ? 'border-success bg-success/5'
          : 'border-divider hover:border-primary/30 hover:shadow-sm hover:bg-content2/50'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="size-3 rounded-full" style={{ backgroundColor: domain.color }} />
        {isLoading ? (
          <Loader2 className="size-4 animate-spin text-default-400" />
        ) : (
          <span className="text-sm font-medium text-default-500">{count} skills</span>
        )}
      </div>
      <h3 className="font-semibold text-foreground">{domain.label}</h3>
    </button>
  );
}
