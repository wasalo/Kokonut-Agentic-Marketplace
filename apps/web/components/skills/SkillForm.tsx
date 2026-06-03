'use client';

import { useState, useCallback } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Card } from '@heroui/react';
import { Plus, Loader2, XCircle, Edit3 } from 'lucide-react';
import { AGENT_SKILL_REGISTRY_ABI } from '@/lib/contracts/abis';
import { CONTRACT_ADDRESSES, getContractAddress } from '@/lib/contracts/config';
import { TransactionError } from '@/components/TransactionError';
import { Input, Textarea } from '@/components/ui/Input';
import { card, btn } from '@/lib/design-system';

const SKILL_REGISTRY_ADDRESS = getContractAddress(
  process.env.NEXT_PUBLIC_SKILL_REGISTRY_ADDRESS,
  CONTRACT_ADDRESSES.sepolia.skillRegistry
);
const SEPOLIA_CHAIN_ID = 11155111;

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

interface SkillFormProps {
  agentId: bigint;
  initialData?: Skill & { skillId?: bigint };
  onSuccess: () => void;
  onCancel: () => void;
}

export function SkillForm({ agentId, initialData, onSuccess, onCancel }: SkillFormProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [version, setVersion] = useState(initialData?.version || '1.0.0');
  const [description, setDescription] = useState(initialData?.description || '');
  const [endpoint, setEndpoint] = useState(initialData?.endpoint || '');
  const [domains, setDomains] = useState(initialData?.domains?.join(', ') || '');

  const isEditing = !!initialData;

  const { writeContract, data: txHash, isPending, error } = useWriteContract();
  const { isSuccess, isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (!name.trim()) return;
      if (!version.trim()) return;

      const domainList = domains
        .split(',')
        .map(d => d.trim().toLowerCase())
        .filter(Boolean);

      if (isEditing && initialData?.skillId !== undefined) {
        writeContract({
          chainId: SEPOLIA_CHAIN_ID,
          address: SKILL_REGISTRY_ADDRESS,
          abi: AGENT_SKILL_REGISTRY_ABI,
          functionName: 'updateSkill',
          args: [initialData.skillId, name, version, description, endpoint, domainList],
        });
      } else {
        writeContract({
          chainId: SEPOLIA_CHAIN_ID,
          address: SKILL_REGISTRY_ADDRESS,
          abi: AGENT_SKILL_REGISTRY_ABI,
          functionName: 'registerSkill',
          args: [agentId, name, version, description, endpoint, domainList],
        });
      }
    },
    [agentId, name, version, description, endpoint, domains, isEditing, initialData, writeContract]
  );

  if (isSuccess) {
    onSuccess();
    return null;
  }

  const isSubmitting = isPending || isConfirming;

  return (
    <Card className={card('padded', 'p-6')}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          {isEditing ? (
            <Edit3 className="size-5 text-primary" />
          ) : (
            <Plus className="size-5 text-primary" />
          )}
          {isEditing ? 'Edit Skill' : 'Register New Skill'}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className="text-default-400 hover:text-foreground transition-colors"
        >
          <XCircle className="size-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="skill-name" className="text-sm font-medium mb-1.5 block">
              Skill Name <span className="text-danger">*</span>
            </label>
            <Input
              id="skill-name"
              type="text"
              placeholder="e.g., Web Development"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>
          <div>
            <label htmlFor="skill-version" className="text-sm font-medium mb-1.5 block">
              Version <span className="text-danger">*</span>
            </label>
            <Input
              id="skill-version"
              type="text"
              placeholder="1.0.0"
              value={version}
              onChange={e => setVersion(e.target.value)}
              required
              pattern="^\d+\.\d+\.\d+$"
              title="Use semantic versioning (e.g., 1.0.0)"
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div>
          <label htmlFor="skill-description" className="text-sm font-medium mb-1.5 block">
            Description
          </label>
          <Textarea
            id="skill-description"
            placeholder="Describe what this skill does…"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label htmlFor="skill-endpoint" className="text-sm font-medium mb-1.5 block">
            Endpoint URL
          </label>
          <Input
            id="skill-endpoint"
            type="url"
            placeholder="https://api.example.com/skill"
            value={endpoint}
            onChange={e => setEndpoint(e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label htmlFor="skill-domains" className="text-sm font-medium mb-1.5 block">
            Domains (comma-separated)
            <span className="text-xs text-default-400 ml-2">e.g., defi, nft, ai</span>
          </label>
          <Input
            id="skill-domains"
            type="text"
            placeholder="defi, nft, governance, ai"
            value={domains}
            onChange={e => setDomains(e.target.value)}
            disabled={isSubmitting}
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
            className={btn('primary', 'flex-1 px-4 py-2.5 disabled:opacity-50')}
          >
            {isSubmitting && <Loader2 className="size-4 animate-spin" />}
            {isSubmitting
              ? isConfirming
                ? 'Confirming…'
                : 'Submitting…'
              : isEditing
                ? 'Update Skill'
                : 'Register Skill'}
          </button>
        </div>
      </form>
    </Card>
  );
}
