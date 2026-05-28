'use client';

import { Card, Chip } from '@heroui/react';
import { Edit3, Trash2 } from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';

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

interface SkillCardProps {
  skill: Skill;
  skillId: bigint;
  onEdit: () => void;
  onDeactivate: () => void;
}

export function SkillCard({ skill, onEdit, onDeactivate }: SkillCardProps) {
  return (
    <Card className="border border-divider p-4 hover:border-[#009F4D]/30 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-foreground">{skill.name}</h3>
            <Chip size="sm" variant="soft" className="text-xs">
              v{skill.version}
            </Chip>
            <StatusBadge status={skill.isActive ? 'active' : 'inactive'} size="sm" />
          </div>

          {skill.description && (
            <p className="text-sm text-default-500 mt-1.5 line-clamp-2">{skill.description}</p>
          )}

          {skill.endpoint && (
            <a
              href={skill.endpoint}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline mt-1.5 inline-block truncate max-w-full"
            >
              {skill.endpoint}
            </a>
          )}

          {skill.domains.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {skill.domains.map(domain => (
                <span
                  key={domain}
                  className="text-xs px-2 py-0.5 rounded-full bg-content2 text-default-600 border border-divider"
                >
                  {domain}
                </span>
              ))}
            </div>
          )}
        </div>

        {skill.isActive && (
          <div className="flex gap-1 ml-3">
            <button
              type="button"
              onClick={onEdit}
              className="p-2 text-default-400 hover:text-primary hover:bg-content2 rounded-lg transition-colors"
              title="Edit skill"
            >
              <Edit3 className="size-4" />
            </button>
            <button
              type="button"
              onClick={onDeactivate}
              className="p-2 text-default-400 hover:text-danger hover:bg-danger-50 rounded-lg transition-colors"
              title="Deactivate skill"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}
