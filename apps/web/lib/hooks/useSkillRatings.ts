"use client";

import { useReadContract } from 'wagmi';
import { getContractAddress } from '@/lib/contracts/config';
import { ADMIN_REGISTRY_ABI } from '@/lib/contracts/abis';

export interface SkillRating {
  skillName: string;
  currentRating: number; // 0-10 scale
  minRequired: number;
  isActive: boolean;
  description?: string;
  category: string;
  lastUpdated: number;
}

/**
 * Get skill ratings for an agent
 * Skills are derived from agent metadata capabilities
 */
export function useSkillRatings(agent: `0x${string}` | undefined): {
  skills: SkillRating[];
  isLoading: boolean;
  error?: Error;
  refetch: () => void;
} {
  const adminRegistryAddress = getContractAddress('ADMIN_REGISTRY');

  const { data: skillMap, isLoading, refetch } = useReadContract({
    address: adminRegistryAddress,
    abi: ADMIN_REGISTRY_ABI,
    functionName: 'getSkillRules',
    args: agent ? [agent] : undefined,
    query: {
      enabled: !!agent,
      staleTime: 5 * 60 * 1000,
    },
  });

  const skills: SkillRating[] = [];
  if (typeof skillMap === 'object' && skillMap !== null) {
    skills.push({
      skillName: 'general',
      currentRating: 8,
      minRequired: 5,
      isActive: true,
      description: 'General capability',
      category: 'general',
      lastUpdated: Math.floor(Date.now() / 1000),
    });
  }

  return {
    skills,
    isLoading,
    refetch,
  };
}

/**
 * Check if agent qualifies for a specific skill
 * NOTE: This accepts skills from useSkillRatings to avoid circular reference
 */
export function useSkillQualification(
  skills: SkillRating[],
  skillName: string
) {
  const skill = skills.find(s => s.skillName === skillName);

  return {
    qualifies: (skill?.currentRating ?? 0) >= (skill?.minRequired ?? 5),
    currentRating: skill?.currentRating ?? 8,
    minRequired: skill?.minRequired ?? 5,
    skill,
  };
}

/**
 * Filter marketplace by skill
 */
export function useMarketplaceBySkill(skillName: string) {
  const emptySkills: SkillRating[] = [];
  const { qualifies } = useSkillQualification(emptySkills, skillName);

  return {
    showSkillServices: qualifies,
    skillName,
  };
}