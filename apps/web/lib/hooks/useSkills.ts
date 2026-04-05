import { useReadContract, useWriteContract } from 'wagmi';
import { AGENT_SKILL_REGISTRY_ABI } from '@/lib/contracts/abis';
import { CONTRACT_ADDRESSES, getContractAddress, debugLog } from '@/lib/contracts/config';

/* eslint-disable @typescript-eslint/no-explicit-any */

const SKILL_REGISTRY_ADDRESS = getContractAddress(
  process.env.NEXT_PUBLIC_SKILL_REGISTRY_ADDRESS,
  CONTRACT_ADDRESSES.sepolia.skillRegistry
);

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

export function useUpdateSkill() {
  const { writeContract, data, isPending, error, reset } = useWriteContract();
  return {
    updateSkill: (
      skillId: bigint,
      name: string,
      version: string,
      description: string,
      endpoint: string,
      domains: string[]
    ) =>
      writeContract({
        address: SKILL_REGISTRY_ADDRESS,
        abi: AGENT_SKILL_REGISTRY_ABI,
        functionName: 'updateSkill',
        args: [skillId, name, version, description, endpoint, domains],
      }),
    hash: data,
    isPending,
    error,
    reset,
  };
}

export function useDeactivateSkill() {
  const { writeContract, data, isPending, error, reset } = useWriteContract();
  return {
    deactivateSkill: (skillId: bigint) =>
      writeContract({
        address: SKILL_REGISTRY_ADDRESS,
        abi: AGENT_SKILL_REGISTRY_ABI,
        functionName: 'deactivateSkill',
        args: [skillId],
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

export function useAgentIdsBySkillDomain(domain: string | undefined) {
  const {
    skillIds,
    isLoading: isLoadingSkills,
    error: skillsError,
    refetch: refetchSkills,
  } = useFindSkillsByDomain(domain);

  const {
    data: skillDataList,
    isLoading: isLoadingSkillData,
    error: skillDataError,
    refetch: refetchSkillData,
  } = useReadContract({
    address: SKILL_REGISTRY_ADDRESS,
    abi: AGENT_SKILL_REGISTRY_ABI,
    functionName: 'getSkillData',
    args: skillIds && skillIds.length > 0 ? [skillIds[0]] : undefined,
    query: {
      enabled: !!skillIds && skillIds.length > 0,
      retry: 2,
      staleTime: 30 * 1000,
    },
  });

  // Get unique agent IDs from matching skills
  const agentIds =
    skillIds
      ?.map((_, idx) => {
        if (skillDataList && typeof skillDataList === 'object' && 'agentId' in skillDataList) {
          return (skillDataList as Skill).agentId;
        }
        return BigInt(0);
      })
      .filter((id, idx, arr) => arr.indexOf(id) === idx) || [];

  return {
    agentIds,
    isLoading: isLoadingSkills || isLoadingSkillData,
    error: skillsError || skillDataError,
    refetch: () => {
      void refetchSkills();
      void refetchSkillData();
    },
  };
}
