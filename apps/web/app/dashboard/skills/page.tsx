'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useAccount, useReadContract, useReadContracts, useWriteContract } from 'wagmi';
import { Card } from '@heroui/react';
import { Plus, Loader2, Wallet, ArrowLeft, AlertCircle } from 'lucide-react';
import NextLink from 'next/link';
import { AGENT_SKILL_REGISTRY_ABI } from '@/lib/contracts/abis';
import { useWalletAgentsFromSubgraph } from '@/lib/hooks';
import { CONTRACT_ADDRESSES, getContractAddress } from '@/lib/contracts/config';
import { ConfirmModal } from '@/components/ConfirmModal';
import { SkillForm } from '@/components/skills/SkillForm';
import { SkillsList } from '@/components/skills/SkillsList';
import { SkillsSidebar } from '@/components/skills/SkillsSidebar';
import { Select } from '@/components/ui/Input';

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
      <AlertCircle className="size-12 text-warning mx-auto mb-4" />
      <h3 className="text-lg font-semibold mb-2">No Agents Found</h3>
      <p className="text-sm text-default-500 mb-6">
        You need to register an agent identity before adding skills.
      </p>
      <NextLink
        href="/identity/register"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#009F4D] to-[#00c853] text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
      >
        <Plus className="size-4" />
        Register Agent
      </NextLink>
    </Card>
  );
}

export default function DashboardSkillsPage() {
  useEffect(() => {
    document.title = 'Manage Skills | Kokonut Agent Economy';
  }, []);

  const { isConnected, address } = useAccount();
  const { agents, isLoading: isLoadingAgents } = useWalletAgentsFromSubgraph(address);
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingSkill, setEditingSkill] = useState<(Skill & { skillId: bigint }) | null>(null);
  const [deactivatingSkill, setDeactivatingSkill] = useState<bigint | null>(null);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);

  const activeAgent = useMemo(() => {
    if (selectedAgentId) {
      return agents.find(a => a.id === selectedAgentId);
    }
    return agents[0];
  }, [selectedAgentId, agents]);

  const { data: skillIds, refetch: refetchSkills } = useReadContract({
    address: SKILL_REGISTRY_ADDRESS,
    abi: AGENT_SKILL_REGISTRY_ABI,
    functionName: 'getAgentSkills',
    args: activeAgent ? [BigInt(activeAgent.id)] : undefined,
    query: { enabled: !!activeAgent },
  });

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
        return { ...data, skillId: skillIds[index] };
      })
      .filter((s): s is Skill & { skillId: bigint } => s !== null);
  }, [skillResults, skillIds]);

  const { writeContract: deactivateSkill } = useWriteContract();

  const handleDeactivateClick = useCallback((skillId: bigint) => {
    setDeactivatingSkill(skillId);
    setShowDeactivateModal(true);
  }, []);

  const handleDeactivateConfirm = useCallback(() => {
    if (deactivatingSkill) {
      deactivateSkill(
        {
          address: SKILL_REGISTRY_ADDRESS,
          abi: AGENT_SKILL_REGISTRY_ABI,
          functionName: 'deactivateSkill',
          args: [deactivatingSkill],
        },
        {
          onSuccess: () => {
            refetchSkills();
            setShowDeactivateModal(false);
            setDeactivatingSkill(null);
          },
        }
      );
    }
  }, [deactivatingSkill, deactivateSkill, refetchSkills]);

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

  const handleAddSkill = useCallback(() => {
    setShowForm(true);
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
            <ArrowLeft className="size-4" />
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
          <ArrowLeft className="size-4" />
          Back to Dashboard
        </NextLink>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Agent Skills</h1>
            <p className="text-default-500 mt-1">Manage your agent&apos;s capabilities onchain</p>
          </div>
          {!showForm && (
            <button
              type="button"
              onClick={handleAddSkill}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#009F4D] to-[#00c853] text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              <Plus className="size-4" />
              Add Skill
            </button>
          )}
        </div>
      </div>

      {agents.length > 1 && (
        <Card className="border border-divider p-4 mb-6">
          <label htmlFor="agent-selector" className="block text-sm font-medium mb-2">
            Select Agent
          </label>
          <Select
            id="agent-selector"
            value={selectedAgentId || activeAgent?.id || ''}
            onChange={e => {
              setSelectedAgentId(Number(e.target.value));
              setShowForm(false);
              setEditingSkill(null);
            }}
          >
            {agents.map(agent => (
              <option key={agent.id} value={agent.id}>
                Agent #{agent.id} {agent.metadata?.name ? `- ${agent.metadata.name}` : ''}
              </option>
            ))}
          </Select>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {showForm && activeAgent && (
            <SkillForm
              agentId={BigInt(activeAgent.id)}
              initialData={editingSkill || undefined}
              onSuccess={handleFormSuccess}
              onCancel={handleCancelForm}
            />
          )}

          <SkillsList
            skills={skills}
            isLoading={isLoadingSkills}
            showForm={showForm}
            onAddSkill={handleAddSkill}
            onEdit={handleEdit}
            onDeactivate={handleDeactivateClick}
          />
        </div>

        <SkillsSidebar
          activeAgent={activeAgent}
          totalSkills={skillIds?.length || 0}
          activeCount={activeSkills.length}
          inactiveCount={inactiveSkills.length}
        />
      </div>

      <ConfirmModal
        isOpen={showDeactivateModal}
        onConfirm={handleDeactivateConfirm}
        onCancel={() => {
          setShowDeactivateModal(false);
          setDeactivatingSkill(null);
        }}
        title="Deactivate Skill"
        message="Are you sure you want to deactivate this skill? This action cannot be undone."
        confirmText="Deactivate"
        variant="danger"
      />
    </div>
  );
}
