'use client';

import { useQueries } from '@tanstack/react-query';
import { graphqlQuery } from '@/lib/graphql/client';
import { GET_AGENT_PROFILE, GET_AGENT_REVIEWS, GET_AGENT_JOBS } from '@/lib/graphql/queries/profile';
import { decodeAgentMetadata, type AgentMetadata8004 } from '@/lib/metadata';

const STALE_TIME = 2 * 60 * 1000;
const GC_TIME = 10 * 60 * 1000;

interface SubgraphAgent {
  id: string;
  agentId: string;
  owner: string;
  name: string | null;
  description: string | null;
  capabilities: string[] | null;
  source: string | null;
  metadataURI: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  blacklisted: boolean | null;
  featured: boolean | null;
  services: {
    id: string;
    serviceId: string;
    name: string;
    description: string | null;
    price: string;
    isActive: boolean;
  }[];
  skills: {
    id: string;
    skillId: string;
    name: string | null;
    isActive: boolean;
    createdAt: string;
  }[];
}

interface SubgraphReview {
  id: string;
  reviewer: string;
  rating: number;
  feedbackId: string;
  timestamp: string;
}

interface SubgraphJob {
  id: string;
  jobId: string;
  status: number;
  budget: string;
  createdAt: string;
  fundedAt: string | null;
  completedAt: string | null;
}

interface AgentProfileResponse {
  agent: SubgraphAgent | null;
}

interface ReviewsResponse {
  reviews: SubgraphReview[];
}

interface JobsResponse {
  providerJobs: SubgraphJob[];
  clientJobs: SubgraphJob[];
}

export interface UnifiedAgentProfile {
  agentId: bigint;
  owner: `0x${string}` | undefined;
  metadata: AgentMetadata8004 | null;
  name: string;
  description: string;
  capabilities: string[];
  isActive: boolean;
  services: SubgraphAgent['services'];
  skillIds: bigint[];
  skills: SubgraphAgent['skills'];
  reviews: SubgraphReview[];
  providerJobs: SubgraphJob[];
  clientJobs: SubgraphJob[];
  jobCount: number;
  reputationScore: number;
  reviewCount: number;
  averageRating: number;
}

export function useUnifiedAgentProfile(agentId: bigint, agentAddress: `0x${string}`) {
  const agentIdStr = agentId.toString();

  const results = useQueries({
    queries: [
      {
        queryKey: ['subgraph-agent-profile', agentIdStr],
        queryFn: () => graphqlQuery<AgentProfileResponse>(GET_AGENT_PROFILE, { id: agentIdStr }),
        staleTime: STALE_TIME,
        gcTime: GC_TIME,
        enabled: !!agentId,
      },
      {
        queryKey: ['subgraph-agent-reviews', agentAddress],
        queryFn: () => graphqlQuery<ReviewsResponse>(GET_AGENT_REVIEWS, {
          agent: agentAddress.toLowerCase(),
          first: 50,
        }),
        staleTime: STALE_TIME,
        gcTime: GC_TIME,
        enabled: !!agentAddress,
      },
      {
        queryKey: ['subgraph-agent-jobs', agentAddress],
        queryFn: () => graphqlQuery<JobsResponse>(GET_AGENT_JOBS, {
          address: agentAddress.toLowerCase(),
          first: 100,
        }),
        staleTime: STALE_TIME,
        gcTime: GC_TIME,
        enabled: !!agentAddress,
      },
    ],
  });

  const agentData = results[0].data?.agent;
  const reviews = results[1].data?.reviews || [];
  const jobsData = results[2].data;
  const providerJobs = jobsData?.providerJobs || [];
  const clientJobs = jobsData?.clientJobs || [];

  const isLoading = results.some(r => r.isLoading);
  const error = results.find(r => r.error)?.error as Error | null;

  const metadata = agentData?.metadataURI ? decodeAgentMetadata(agentData.metadataURI) : null;
  const name = agentData?.name || metadata?.name || `Agent #${agentIdStr}`;
  const description = agentData?.description || metadata?.description || '';
  const capabilities = agentData?.capabilities || metadata?.capabilities || [];
  const skillIds = (agentData?.skills || []).map(s => BigInt(s.skillId));

  const reviewCount = reviews.length;
  const averageRating = reviewCount > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
    : 0;

  const reputationScore = Math.round(averageRating / 10);

  const profile: UnifiedAgentProfile = {
    agentId,
    owner: agentData?.owner as `0x${string}` | undefined,
    metadata,
    name,
    description,
    capabilities,
    isActive: agentData?.isActive ?? true,
    services: agentData?.services || [],
    skillIds,
    skills: agentData?.skills || [],
    reviews,
    providerJobs,
    clientJobs,
    jobCount: providerJobs.length + clientJobs.length,
    reputationScore,
    reviewCount,
    averageRating,
  };

  return {
    profile,
    isLoading,
    error,
    refetch: () => results.forEach(r => r.refetch()),
  };
}
