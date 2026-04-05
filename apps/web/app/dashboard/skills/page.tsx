'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  useAccount,
  useReadContract,
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi';
import { Card, Chip, Button } from '@heroui/react';
import {
  Code,
  Plus,
  Loader2,
  CheckCircle2,
  XCircle,
  Edit3,
  Trash2,
  Wallet,
  ArrowLeft,
  AlertCircle,
} from 'lucide-react';
import NextLink from 'next/link';
import { AGENT_SKILL_REGISTRY_ABI } from '@/lib/contracts/abis';
import { useWalletAgentsWithDetails } from '@/lib/hooks/useWalletAgentsWithDetails';
import { CONTRACT_ADDRESSES, getContractAddress } from '@/lib/contracts/config';
import { TransactionError } from '@/components/TransactionError';

const SKILL_REGISTRY_ADDRESS = getContractAddress(
  process.env.NEXT_PUBLIC_SKILL_REGISTRY_ADDRESS,
  CONTRACT_ADDRESSES.sepolia.skillRegistry
);

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

function WalletConnectPrompt() {
  return (
    <div className="container mx-auto px-4 py-16 text-center">
      <Wallet className="h-16 w-16 text-default-400 mx-auto mb-4" />
      <h1 className="text-2xl font-bold mb-2">Connect Your Wallet</h1>
      <p className="text-default-500">Connect your wallet to manage your agent skills</p>
    </div>
  );
}

function NoAgentsPrompt() {
  return (
    <Card className="border border-warning/30 p-8 text-center">
      <AlertCircle className="w-12 h-12 text-warning mx-auto mb-4" />
      <h3 className="text-lg font-semibold mb-2">No Agents Found</h3>
      <p className="text-sm text-default-500 mb-6">
        You need to register an agent identity before adding skills.
      </p>
      <NextLink
        href="/identity/register"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#009F4D] to-[#00c853] text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
      >
        <Plus className="w-4 h-4" />
        Register Agent
      </NextLink>
    </Card>
  );
}

function SkillForm({
  agentId,
  initialData,
  onSuccess,
  onCancel,
}: {
  agentId: bigint;
  initialData?: Skill & { skillId?: bigint };
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initialData?.name || '');
  const [version, setVersion] = useState(initialData?.version || '1.0.0');
  const [description, setDescription] = useState(initialData?.description || '');
  const [endpoint, setEndpoint] = useState(initialData?.endpoint || '');
  const [domains, setDomains] = useState(initialData?.domains?.join(', ') || '');
  const [_formError, setFormError] = useState<string | null>(null);

  const isEditing = !!initialData;

  const { writeContract, data: txHash, isPending, error } = useWriteContract();
  const { isSuccess, isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setFormError(null);

      // Validation
      if (!name.trim()) {
        setFormError('Skill name is required');
        return;
      }
      if (!version.trim()) {
        setFormError('Version is required');
        return;
      }

      const domainList = domains
        .split(',')
        .map(d => d.trim().toLowerCase())
        .filter(Boolean);

      if (isEditing && initialData?.skillId !== undefined) {
        // Update existing skill
        writeContract({
          address: SKILL_REGISTRY_ADDRESS,
          abi: AGENT_SKILL_REGISTRY_ABI,
          functionName: 'updateSkill',
          args: [initialData.skillId, name, version, description, endpoint, domainList],
        });
      } else {
        // Register new skill
        writeContract({
          address: SKILL_REGISTRY_ADDRESS,
          abi: AGENT_SKILL_REGISTRY_ABI,
          functionName: 'registerSkill',
          args: [agentId, name, version, description, endpoint, domainList],
        });
      }
    },
    [agentId, name, version, description, endpoint, domains, isEditing, initialData, writeContract]
  );

  // Handle success
  if (isSuccess) {
    onSuccess();
    return null;
  }

  const isSubmitting = isPending || isConfirming;

  return (
    <Card className="border border-divider p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          {isEditing ? (
            <Edit3 className="w-5 h-5 text-primary" />
          ) : (
            <Plus className="w-5 h-5 text-primary" />
          )}
          {isEditing ? 'Edit Skill' : 'Register New Skill'}
        </h2>
        <button
          onClick={onCancel}
          className="text-default-400 hover:text-foreground transition-colors"
        >
          <XCircle className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">
              Skill Name <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g., Web Development"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              disabled={isSubmitting}
              className="w-full px-3 py-2 bg-content2 border border-divider rounded-lg focus:outline-none focus:ring-2 focus:ring-success disabled:opacity-50"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">
              Version <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              placeholder="1.0.0"
              value={version}
              onChange={e => setVersion(e.target.value)}
              required
              pattern="^\d+\.\d+\.\d+$"
              title="Use semantic versioning (e.g., 1.0.0)"
              disabled={isSubmitting}
              className="w-full px-3 py-2 bg-content2 border border-divider rounded-lg focus:outline-none focus:ring-2 focus:ring-success disabled:opacity-50"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Description</label>
          <textarea
            placeholder="Describe what this skill does..."
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            disabled={isSubmitting}
            className="w-full px-3 py-2 bg-content2 border border-divider rounded-lg focus:outline-none focus:ring-2 focus:ring-success resize-none disabled:opacity-50"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Endpoint URL</label>
          <input
            type="url"
            placeholder="https://api.example.com/skill"
            value={endpoint}
            onChange={e => setEndpoint(e.target.value)}
            disabled={isSubmitting}
            className="w-full px-3 py-2 bg-content2 border border-divider rounded-lg focus:outline-none focus:ring-2 focus:ring-success disabled:opacity-50"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">
            Domains (comma-separated)
            <span className="text-xs text-default-400 ml-2">e.g., defi, nft, ai</span>
          </label>
          <input
            type="text"
            placeholder="defi, nft, governance, ai"
            value={domains}
            onChange={e => setDomains(e.target.value)}
            disabled={isSubmitting}
            className="w-full px-3 py-2 bg-content2 border border-divider rounded-lg focus:outline-none focus:ring-2 focus:ring-success disabled:opacity-50"
          />
        </div>

        <TransactionError error={error} />

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2.5 border border-divider rounded-lg font-medium hover:bg-content2 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !name.trim() || !version.trim()}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#009F4D] to-[#00c853] text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSubmitting
              ? isConfirming
                ? 'Confirming...'
                : 'Submitting...'
              : isEditing
                ? 'Update Skill'
                : 'Register Skill'}
          </button>
        </div>
      </form>
    </Card>
  );
}

function SkillCard({
  skill,
  skillId,
  onEdit,
  onDeactivate,
}: {
  skill: Skill;
  skillId: bigint;
  onEdit: () => void;
  onDeactivate: () => void;
}) {
  return (
    <Card className="border border-divider p-4 hover:border-success/30 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-foreground">{skill.name}</h3>
            <Chip size="sm" variant="soft" className="text-xs">
              v{skill.version}
            </Chip>
            {skill.isActive ? (
              <Chip size="sm" color="success" variant="soft" className="text-xs">
                Active
              </Chip>
            ) : (
              <Chip size="sm" color="danger" variant="soft" className="text-xs">
                Inactive
              </Chip>
            )}
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
              onClick={onEdit}
              className="p-2 text-default-400 hover:text-primary hover:bg-content2 rounded-lg transition-colors"
              title="Edit skill"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={onDeactivate}
              className="p-2 text-default-400 hover:text-danger hover:bg-danger-50 rounded-lg transition-colors"
              title="Deactivate skill"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}

export default function DashboardSkillsPage() {
  const { isConnected, address } = useAccount();
  const { agents, isLoading: isLoadingAgents } = useWalletAgentsWithDetails(address);
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingSkill, setEditingSkill] = useState<(Skill & { skillId: bigint }) | null>(null);

  // Use first agent if no selection
  const activeAgent = useMemo(() => {
    if (selectedAgentId) {
      return agents.find(a => a.id === selectedAgentId);
    }
    return agents[0];
  }, [selectedAgentId, agents]);

  // Get skills for active agent
  const { data: skillIds, refetch: refetchSkills } = useReadContract({
    address: SKILL_REGISTRY_ADDRESS,
    abi: AGENT_SKILL_REGISTRY_ABI,
    functionName: 'getAgentSkills',
    args: activeAgent ? [BigInt(activeAgent.id)] : undefined,
    query: { enabled: !!activeAgent },
  });

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
      .filter((s): s is Skill & { skillId: bigint } => s !== null);
  }, [skillResults, skillIds]);

  // Deactivate skill
  const { writeContract: deactivateSkill } = useWriteContract();

  const handleDeactivate = useCallback(
    (skillId: bigint) => {
      if (confirm('Are you sure you want to deactivate this skill?')) {
        deactivateSkill(
          {
            address: SKILL_REGISTRY_ADDRESS,
            abi: AGENT_SKILL_REGISTRY_ABI,
            functionName: 'deactivateSkill',
            args: [skillId],
          },
          {
            onSuccess: () => {
              refetchSkills();
            },
          }
        );
      }
    },
    [deactivateSkill, refetchSkills]
  );

  const handleEdit = useCallback((skill: Skill & { skillId: bigint }) => {
    setEditingSkill(skill);
    setShowForm(true);
  }, []);

  const handleFormSuccess = useCallback(() => {
    setShowForm(false);
    setEditingSkill(null);
    refetchSkills();
  }, [refetchSkills]);

  const handleCancelForm = useCallback(() => {
    setShowForm(false);
    setEditingSkill(null);
  }, []);

  if (!isConnected) {
    return <WalletConnectPrompt />;
  }

  if (isLoadingAgents) {
    return (
      <div className="container mx-auto px-4 py-16 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-success" />
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <NextLink
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-default-500 hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </NextLink>
          <h1 className="text-3xl font-bold text-foreground">Agent Skills</h1>
          <p className="text-default-500 mt-1">Manage your agent&apos;s capabilities onchain</p>
        </div>
        <NoAgentsPrompt />
      </div>
    );
  }

  const activeSkills = skills.filter(s => s.isActive);
  const inactiveSkills = skills.filter(s => !s.isActive);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <NextLink
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-default-500 hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </NextLink>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Agent Skills</h1>
            <p className="text-default-500 mt-1">Manage your agent&apos;s capabilities onchain</p>
          </div>
          {!showForm && (
            <button
              onClick={() => {
                void setShowForm(true);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#009F4D] to-[#00c853] text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              Add Skill
            </button>
          )}
        </div>
      </div>

      {/* Agent Selector */}
      {agents.length > 1 && (
        <Card className="border border-divider p-4 mb-6">
          <label className="block text-sm font-medium mb-2">Select Agent</label>
          <select
            value={selectedAgentId || activeAgent?.id || ''}
            onChange={e => {
              setSelectedAgentId(Number(e.target.value));
              setShowForm(false);
              setEditingSkill(null);
            }}
            className="w-full px-3 py-2 bg-content2 border border-divider rounded-lg focus:outline-none focus:ring-2 focus:ring-success"
          >
            {agents.map(agent => (
              <option key={agent.id} value={agent.id}>
                Agent #{agent.id} {agent.metadata?.name ? `- ${agent.metadata.name}` : ''}
              </option>
            ))}
          </select>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Skills list */}
        <div className="lg:col-span-2 space-y-6">
          {showForm && activeAgent && (
            <SkillForm
              agentId={BigInt(activeAgent.id)}
              initialData={editingSkill || undefined}
              onSuccess={handleFormSuccess}
              onCancel={handleCancelForm}
            />
          )}

          {isLoadingSkills ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-success" />
            </div>
          ) : (
            <>
              {/* Active Skills */}
              {activeSkills.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-success" />
                    Active Skills ({activeSkills.length})
                  </h2>
                  <div className="space-y-3">
                    {activeSkills.map(skill => (
                      <SkillCard
                        key={skill.skillId.toString()}
                        skill={skill}
                        skillId={skill.skillId}
                        onEdit={() => handleEdit(skill)}
                        onDeactivate={() => handleDeactivate(skill.skillId)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Inactive Skills */}
              {inactiveSkills.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-default-500">
                    <XCircle className="w-5 h-5" />
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

              {/* Empty state */}
              {!showForm && skills.length === 0 && (
                <Card className="border border-divider p-8 text-center">
                  <Code className="w-12 h-12 text-default-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Skills Yet</h3>
                  <p className="text-sm text-default-500 mb-6 max-w-md mx-auto">
                    Register your first skill to let clients discover your capabilities and
                    differentiate your services.
                  </p>
                  <button
                    onClick={() => {
                      void setShowForm(true);
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#009F4D] to-[#00c853] text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
                  >
                    <Plus className="w-4 h-4" />
                    Register First Skill
                  </button>
                </Card>
              )}
            </>
          )}
        </div>

        {/* Right column - Info */}
        <div className="space-y-6">
          <Card className="border border-divider p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Code className="w-5 h-5 text-primary" />
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
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#009F4D] to-[#FFCD00] flex items-center justify-center text-white font-semibold">
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
                <span className="font-medium">{skills.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-default-500">Active:</span>
                <span className="font-medium text-success">{activeSkills.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-default-500">Inactive:</span>
                <span className="font-medium text-default-400">{inactiveSkills.length}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
