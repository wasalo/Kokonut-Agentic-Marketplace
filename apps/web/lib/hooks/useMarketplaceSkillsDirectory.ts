'use client';

import { useMemo, useState } from 'react';
import { useReadContracts } from 'wagmi';
import { AGENT_SKILL_REGISTRY_ABI } from '@/lib/contracts/abis';
import { CONTRACT_ADDRESSES, getContractAddress } from '@/lib/contracts/config';
import { useFindSkillsByDomain, type Skill } from '@/lib/hooks/useSkills';

const SKILL_REGISTRY_ADDRESS = getContractAddress(
  process.env.NEXT_PUBLIC_SKILL_REGISTRY_ADDRESS,
  CONTRACT_ADDRESSES.sepolia.skillRegistry
);

export type MarketplaceSkill = Skill & { skillId: bigint };

export function useMarketplaceSkillsDirectory() {
  const [selectedDomain, setSelectedDomain] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  const { skillIds, isLoading: isLoadingSkillIds } = useFindSkillsByDomain(
    selectedDomain || undefined
  );

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

  const skills: MarketplaceSkill[] = useMemo(() => {
    if (!skillResults || !skillIds) return [];
    const normalizedSearch = searchQuery.toLowerCase();

    return skillResults
      .map((result, index) => {
        if (result.status !== 'success' || !result.result) return null;
        const data = result.result as unknown as Skill;
        return {
          ...data,
          skillId: skillIds[index],
        };
      })
      .filter((skill): skill is MarketplaceSkill => skill !== null && skill.isActive)
      .filter(skill =>
        normalizedSearch
          ? skill.name.toLowerCase().includes(normalizedSearch) ||
            skill.description.toLowerCase().includes(normalizedSearch)
          : true
      );
  }, [skillResults, skillIds, searchQuery]);

  return {
    selectedDomain,
    setSelectedDomain,
    searchQuery,
    setSearchQuery,
    skills,
    isLoading: isLoadingSkills || isLoadingSkillIds,
    isLoadingSkillIds,
    isLoadingSkills,
  };
}
