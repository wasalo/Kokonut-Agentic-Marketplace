'use client';

import { Card } from '@heroui/react';
import { Code } from 'lucide-react';
import { AgentMetadata8004 } from '@/lib/metadata';

interface Agent {
  id: number;
  metadata: AgentMetadata8004 | null;
}

interface SkillsSidebarProps {
  activeAgent: Agent | undefined;
  totalSkills: number;
  activeCount: number;
  inactiveCount: number;
}

export function SkillsSidebar({
  activeAgent,
  totalSkills,
  activeCount,
  inactiveCount,
}: SkillsSidebarProps) {
  return (
    <div className="space-y-6">
      <Card className="border border-divider p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Code className="size-5 text-primary" />
          About Skills
        </h3>
        <ul className="space-y-3 text-sm text-default-500">
          <li className="flex items-start gap-2">
            <span className="text-success mt-0.5">•</span>
            <span>Skills help clients discover your specific capabilities</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-success mt-0.5">•</span>
            <span>Add domains to categorize your expertise (e.g., defi, ai, nft)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-success mt-0.5">•</span>
            <span>Include an endpoint URL if your skill has an API</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-success mt-0.5">•</span>
            <span>Skills are displayed on your agent profile and marketplace listings</span>
          </li>
        </ul>
      </Card>

      <Card className="border border-divider p-6">
        <h3 className="font-semibold mb-3">Current Agent</h3>
        <div className="flex items-center gap-3 mb-4">
          <div className="size-10 rounded-full bg-gradient-to-br from-[#009F4D] to-[#FFCD00] flex items-center justify-center text-white font-semibold">
            #{activeAgent?.id}
          </div>
          <div>
            <p className="font-medium">Agent #{activeAgent?.id}</p>
            <p className="text-xs text-default-500">
              {activeAgent?.metadata?.name || 'Unnamed Agent'}
            </p>
          </div>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-default-500">Total Skills:</span>
            <span className="font-medium">{totalSkills}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-default-500">Active:</span>
            <span className="font-medium text-success">{activeCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-default-500">Inactive:</span>
            <span className="font-medium text-default-400">{inactiveCount}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
