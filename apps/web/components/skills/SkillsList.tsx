'use client';

import { Card } from '@heroui/react';
import { CheckCircle2, XCircle, Code, Plus, Loader2 } from 'lucide-react';
import { SkillCard } from './SkillCard';
import { card, btn } from '@/lib/design-system';

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
  skillId: bigint;
}

interface SkillsListProps {
  skills: Skill[];
  isLoading: boolean;
  showForm: boolean;
  onAddSkill: () => void;
  onEdit: (skill: Skill) => void;
  onDeactivate: (skillId: bigint) => void;
}

export function SkillsList({
  skills,
  isLoading,
  showForm,
  onAddSkill,
  onEdit,
  onDeactivate,
}: SkillsListProps) {
  const activeSkills = skills.filter(s => s.isActive);
  const inactiveSkills = skills.filter(s => !s.isActive);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-success" />
      </div>
    );
  }

  return (
    <>
      {activeSkills.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <CheckCircle2 className="size-5 text-success" />
            Active Skills ({activeSkills.length})
          </h2>
          <div className="space-y-3">
            {activeSkills.map(skill => (
              <SkillCard
                key={skill.skillId.toString()}
                skill={skill}
                skillId={skill.skillId}
                onEdit={() => onEdit(skill)}
                onDeactivate={() => onDeactivate(skill.skillId)}
              />
            ))}
          </div>
        </div>
      )}

      {inactiveSkills.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-default-500">
            <XCircle className="size-5" />
            Inactive Skills ({inactiveSkills.length})
          </h2>
          <div className="space-y-3 opacity-60">
            {inactiveSkills.map(skill => (
              <SkillCard
                key={skill.skillId.toString()}
                skill={skill}
                skillId={skill.skillId}
                onEdit={() => {}}
                onDeactivate={() => {}}
              />
            ))}
          </div>
        </div>
      )}

      {!showForm && skills.length === 0 && (
        <Card className={card('padded', 'p-8 text-center')}>
          <Code className="size-12 text-default-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Skills Yet</h3>
          <p className="text-sm text-default-500 mb-6 max-w-md mx-auto">
            Register your first skill to let clients discover your capabilities and
            differentiate your services.
          </p>
          <button
            type="button"
            onClick={onAddSkill}
            className={btn('primary')}
          >
            <Plus className="size-4" />
            Register First Skill
          </button>
        </Card>
      )}
    </>
  );
}
