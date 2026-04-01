'use client';

import { useState, useCallback } from 'react';
import {
  useAccount,
  useReadContract,
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi';
import { Card } from '@heroui/react';
import { Code, Plus, Loader2, CheckCircle2, XCircle, Search } from 'lucide-react';
import NextLink from 'next/link';
import { AGENT_SKILL_REGISTRY_ABI } from '@/lib/contracts/abis';
import { useWalletAgentsWithDetails } from '@/lib/hooks/useWalletAgentsWithDetails';
import { useFindSkillsByDomain } from '@/lib/hooks/useSkills';

const SKILL_REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_SKILL_REGISTRY_ADDRESS as `0x${string}`;

interface Skill {
  name: string;
  version: string;
  description: string;
  endpoint: string;
  domains: string[];
  isActive: boolean;
}

function DomainSearchSection() {
  const [domain, setDomain] = useState('');
  const { skillIds, isLoading } = useFindSkillsByDomain(domain);

  return (
    <Card className="border border-divider p-6 mb-6">
      <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
        <Search className="w-4 h-4 text-primary" />
        Search by Domain
      </h2>
      <div className="space-y-4">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="e.g., defi, ai, web3"
            value={domain}
            onChange={e => setDomain(e.target.value)}
            className="flex-1 px-3 py-2 bg-content2 border border-divider rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {isLoading && (
          <div className="flex items-center gap-2 text-default-500 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Searching...
          </div>
        )}

        {skillIds && skillIds.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">
              Found {skillIds.length} skill{skillIds.length !== 1 ? 's' : ''}
            </p>
            <div className="flex flex-wrap gap-2">
              {skillIds.map(id => (
                <NextLink
                  key={id.toString()}
                  href={`/marketplace?skillId=${id}`}
                  className="inline-flex items-center px-3 py-1 bg-primary/10 text-primary rounded-full text-sm hover:bg-primary/20"
                >
                  Skill #{id.toString()}
                </NextLink>
              ))}
            </div>
          </div>
        )}

        {skillIds && skillIds.length === 0 && domain && !isLoading && (
          <p className="text-sm text-default-500">
            No skills found for domain &quot;{domain}&quot;
          </p>
        )}
      </div>
    </Card>
  );
}

function RegisterSkillForm({ agentId, onSuccess }: { agentId: bigint; onSuccess: () => void }) {
  const [name, setName] = useState('');
  const [version, setVersion] = useState('1.0.0');
  const [description, setDescription] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [domains, setDomains] = useState('');

  const { writeContract, data: txHash, isPending, error } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const domainList = domains
        .split(',')
        .map(d => d.trim())
        .filter(Boolean);
      writeContract({
        address: SKILL_REGISTRY_ADDRESS,
        abi: AGENT_SKILL_REGISTRY_ABI,
        functionName: 'registerSkill',
        args: [agentId, name, version, description, endpoint, domainList],
      });
    },
    [agentId, name, version, description, endpoint, domains, writeContract]
  );

  if (isSuccess) {
    onSuccess();
  }

  return (
    <Card className="border border-divider p-6">
      <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
        <Plus className="w-4 h-4 text-primary" />
        Register New Skill
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Skill Name</label>
            <input
              type="text"
              placeholder="e.g., Web Development"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className="w-full mt-1 px-3 py-2 bg-content2 border border-divider rounded-lg focus:outline-none focus:ring-2 focus:ring-success"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Version</label>
            <input
              type="text"
              placeholder="1.0.0"
              value={version}
              onChange={e => setVersion(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-content2 border border-divider rounded-lg focus:outline-none focus:ring-2 focus:ring-success"
            />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium">Description</label>
          <textarea
            placeholder="What this skill does..."
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
            className="w-full mt-1 px-3 py-2 bg-content2 border border-divider rounded-lg focus:outline-none focus:ring-2 focus:ring-success resize-none"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Endpoint</label>
          <input
            type="text"
            placeholder="https://api.example.com"
            value={endpoint}
            onChange={e => setEndpoint(e.target.value)}
            className="w-full mt-1 px-3 py-2 bg-content2 border border-divider rounded-lg focus:outline-none focus:ring-2 focus:ring-success"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Domains (comma-separated)</label>
          <input
            type="text"
            placeholder="defi, nft, governance"
            value={domains}
            onChange={e => setDomains(e.target.value)}
            className="w-full mt-1 px-3 py-2 bg-content2 border border-divider rounded-lg focus:outline-none focus:ring-2 focus:ring-success"
          />
        </div>
        {error && (
          <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg text-danger text-sm">
            {error.message}
          </div>
        )}
        <button
          type="submit"
          disabled={isPending || !name}
          className="w-full px-6 py-3 bg-gradient-to-r from-[#009F4D] to-[#00c853] text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? 'Registering...' : 'Register Skill'}
        </button>
      </form>
    </Card>
  );
}

function SkillCard({ skill, index }: { skill: Skill; index: number }) {
  return (
    <Card className="border border-divider p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{skill.name}</h3>
            <span className="text-xs text-default-400">v{skill.version}</span>
            {skill.isActive ? (
              <span className="text-xs px-1.5 py-0.5 rounded bg-success/10 text-success">
                Active
              </span>
            ) : (
              <span className="text-xs px-1.5 py-0.5 rounded bg-danger/10 text-danger">
                Inactive
              </span>
            )}
          </div>
          <p className="text-sm text-default-500 mt-0.5">{skill.description}</p>
          {skill.endpoint && <p className="text-xs text-primary mt-1">{skill.endpoint}</p>}
          <div className="flex flex-wrap gap-1 mt-2">
            {skill.domains.map(d => (
              <span
                key={d}
                className="text-xs px-1.5 py-0.5 rounded-full bg-content2 text-default-600"
              >
                {d}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function SkillsPage() {
  const { isConnected, address } = useAccount();
  const { taggedAgents, agents, isLoading: isLoadingAgents } = useWalletAgentsWithDetails(address);
  const [showForm, setShowForm] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);

  // Use first tagged agent or first agent if no tagged agents
  const activeAgent = selectedAgentId
    ? taggedAgents.find(a => a.id === selectedAgentId) || agents.find(a => a.id === selectedAgentId)
    : taggedAgents[0] || agents[0];

  // Get agent's skill IDs
  const { data: skillIds } = useReadContract({
    address: SKILL_REGISTRY_ADDRESS,
    abi: AGENT_SKILL_REGISTRY_ABI,
    functionName: 'getAgentSkills',
    args: activeAgent ? [BigInt(activeAgent.id)] : undefined,
    query: { enabled: !!activeAgent },
  });

  // Get skill details
  const skillQueries = ((skillIds as bigint[]) ?? []).map(id => ({
    address: SKILL_REGISTRY_ADDRESS,
    abi: AGENT_SKILL_REGISTRY_ABI,
    functionName: 'getSkill' as const,
    args: [id] as const,
  }));

  const { data: skillResults, refetch } = useReadContracts({
    contracts: skillQueries,
    query: { enabled: skillQueries.length > 0 },
  });

  const skills: Skill[] = (skillResults ?? [])
    .filter(r => r.status === 'success')
    .map(r => r.result as unknown as Skill);

  const hasRegisteredAgent = agents.length > 0;
  const hasSkills = skills.length > 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Agent Skills</h1>
            <p className="text-default-500 mt-1">
              Register and manage your agent's capabilities onchain.
            </p>
          </div>
          {hasRegisteredAgent && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#009F4D] to-[#00c853] text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              {showForm ? 'Cancel' : 'Register Skill'}
            </button>
          )}
        </div>

        {!isConnected && (
          <Card className="border border-divider p-8 text-center">
            <p className="text-default-500">Connect your wallet to manage skills.</p>
          </Card>
        )}

        {/* Agent Selector */}
        {isConnected && hasRegisteredAgent && agents.length > 1 && (
          <Card className="border border-divider p-6 mb-6">
            <label className="block text-sm font-medium mb-2">Select Agent</label>
            <select
              value={selectedAgentId || activeAgent?.id || ''}
              onChange={e => setSelectedAgentId(Number(e.target.value))}
              className="w-full px-3 py-2 bg-content2 border border-divider rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {agents.map(a => (
                <option key={a.id} value={a.id}>
                  Agent #{a.id} {a.metadata?.name ? `- ${a.metadata.name}` : ''}
                </option>
              ))}
            </select>
            <p className="text-xs text-default-500 mt-1">Choose which agent to manage skills for</p>
          </Card>
        )}

        {isConnected && !hasRegisteredAgent && (
          <Card className="border border-warning/30 p-6">
            <h3 className="font-semibold mb-2">Agent Identity Required</h3>
            <p className="text-sm text-default-500 mb-4">
              You need to register an agent identity before adding skills.
            </p>
            <NextLink
              href="/identity/register"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#009F4D] to-[#00c853] text-white rounded-lg font-medium"
            >
              Register Agent
            </NextLink>
          </Card>
        )}

        {showForm && hasRegisteredAgent && activeAgent && (
          <div className="mb-6">
            <RegisterSkillForm
              agentId={BigInt(activeAgent.id)}
              onSuccess={() => {
                setShowForm(false);
                void refetch();
              }}
            />
          </div>
        )}

        {/* Domain Search */}
        <DomainSearchSection />

        {hasSkills && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Your Skills ({skills.length})</h2>
            {skills.map((skill, i) => (
              <SkillCard key={i} skill={skill} index={i} />
            ))}
          </div>
        )}

        {hasRegisteredAgent && !hasSkills && !showForm && (
          <Card className="border border-divider p-8 text-center">
            <Code className="w-12 h-12 text-default-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Skills Registered</h3>
            <p className="text-sm text-default-500 mb-4">
              Register your first skill to let clients discover your capabilities.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
