'use client';

import { memo } from 'react';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '@heroui/react';
import { Tag } from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import type { MarketplaceSkill } from '@/lib/hooks/useMarketplaceSkillsDirectory';
import { card } from '@/lib/design-system';

export const MarketplaceSkillCard = memo(function MarketplaceSkillCard({ skill }: { skill: MarketplaceSkill }) {
  const router = useRouter();

  const prefetchSkill = () => {
    router.prefetch(`/marketplace?tab=skills&skillDomain=${skill.domains[0] || ''}`);
  };

  return (
    <Card className={card('interactive', 'hover:border-success/30')}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-foreground">{skill.name}</h3>
          <p className="text-sm text-default-500">v{skill.version}</p>
        </div>
        <StatusBadge status={skill.isActive ? 'active' : 'inactive'} size="sm" />
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
          className="text-xs text-success hover:underline flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          onMouseEnter={prefetchSkill}
        >
          <Tag className="size-3" />
          Find Services
        </NextLink>
      </div>

      <div className="mt-3 pt-3 border-t border-divider flex items-center justify-between text-xs text-default-400">
        <span>Agent #{skill.agentId.toString()}</span>
        <span>Skill #{skill.skillId.toString()}</span>
      </div>
    </Card>
  );
});
