import { useReadContract, useWriteContract } from 'wagmi';
import { AGENT_SKILL_REGISTRY_ABI } from '@/lib/contracts/abis';
import { getContractAddress, SEPOLIA_CHAIN_ID } from '@/lib/contracts/config';

const SKILL_REGISTRY_ADDRESS = getContractAddress('SKILL_REGISTRY');

export interface Skill {
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

export function useAgentSkills(agentId: bigint | undefined) {
  const {
    data: skillIds,
    isLoading,
    error,
    refetch,
  } = useReadContract({
    address: SKILL_REGISTRY_ADDRESS,
    abi: AGENT_SKILL_REGISTRY_ABI,
    functionName: 'getAgentSkills',
    args: agentId ? [agentId] : undefined,
    query: {
      enabled: !!agentId,
      retry: 2,
      staleTime: 30 * 1000,
    },
  });

  return { skillIds: skillIds as bigint[] | undefined, isLoading, error, refetch };
}

export function useSkill(skillId: bigint | undefined) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: SKILL_REGISTRY_ADDRESS,
    abi: AGENT_SKILL_REGISTRY_ABI,
    functionName: 'getSkill',
    args: skillId ? [skillId] : undefined,
    query: {
      enabled: !!skillId,
      retry: 2,
      staleTime: 30 * 1000,
    },
  });

  if (!data) {
    return { skill: undefined, isLoading, error, refetch };
  }

  // V2 Contract returns: [agentId, name, version, description, endpoint, domains, isActive, registeredBy, registeredAt]
  const skillData = data as unknown as {
    agentId: bigint;
    name: string;
    version: string;
    description: string;
    endpoint: string;
    domains: string[];
    isActive: boolean;
    registeredBy: `0x${string}`;
    registeredAt: bigint;
  };

  const skill: Skill = {
    agentId: skillData.agentId,
    name: skillData.name,
    version: skillData.version,
    description: skillData.description,
    endpoint: skillData.endpoint,
    domains: skillData.domains,
    isActive: skillData.isActive,
    registeredBy: skillData.registeredBy,
    registeredAt: skillData.registeredAt,
  };

  return { skill, isLoading, error, refetch };
}

export function useRegisterSkill() {
  const { writeContract, data, isPending, error, reset } = useWriteContract();
  return {
    registerSkill: (
      agentId: bigint,
      name: string,
      version: string,
      description: string,
      endpoint: string,
      domains: string[]
    ) =>
      writeContract({
        chainId: SEPOLIA_CHAIN_ID,
        address: SKILL_REGISTRY_ADDRESS,
        abi: AGENT_SKILL_REGISTRY_ABI,
        functionName: 'registerSkill',
        args: [agentId, name, version, description, endpoint, domains],
      }),
    hash: data,
    isPending,
    error,
    reset,
  };
}

export function useFindSkillsByDomain(domain: string | undefined) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: SKILL_REGISTRY_ADDRESS,
    abi: AGENT_SKILL_REGISTRY_ABI,
    functionName: 'findSkillsByDomain',
    args: domain ? [domain] : undefined,
    query: {
      enabled: !!domain,
      retry: 2,
      staleTime: 30 * 1000,
    },
  });

  return { skillIds: data as bigint[] | undefined, isLoading, error, refetch };
}
