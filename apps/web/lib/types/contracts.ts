// Centralized contract types for the Kokonut Agent Economy Stack
// This file contains all shared type definitions used across hooks

// ============================================================================
// SERVICE TYPES
// ============================================================================

export interface Service {
  id: bigint;
  provider: `0x${string}`;
  agentId: bigint;
  name: string;
  description: string;
  metadataURI: string;
  price: bigint;
  paymentToken: `0x${string}`;
  paymentAddress: `0x${string}`;
  isActive: boolean;
  createdAt: bigint;
}

// ============================================================================
// JOB TYPES
// ============================================================================

export const JobStatus = {
  Open: 0,
  Funded: 1,
  Submitted: 2,
  Completed: 3,
  Rejected: 4,
  Expired: 5,
  PendingClientApproval: 6, // V7: Client must approve before payment
} as const;

export type JobStatusType = (typeof JobStatus)[keyof typeof JobStatus];

export const JobType = {
  Direct: 0,
  Open: 1,
} as const;

export type JobTypeType = (typeof JobType)[keyof typeof JobType];

export interface Job {
  id: bigint;
  client: `0x${string}`;
  provider: `0x${string}`;
  evaluator: `0x${string}`;
  serviceId: bigint;
  paymentToken: `0x${string}`;
  description: string;
  budget: bigint;
  expiredAt: bigint;
  status: number;
  hook: `0x${string}`;
  deliverable: `0x${string}`;
}

export interface Bid {
  bidId: bigint;
  bidder: `0x${string}`;
  proposedAmount: bigint;
  stake: bigint;
  message: string;
  commitHash: `0x${string}`;
  revealed: boolean;
  accepted: boolean;
  rejected: boolean;
  stakeWithdrawn: boolean;
  timestamp: bigint;
}

// ============================================================================
// PROPOSAL TYPES
// ============================================================================

export const ProposalStatus = {
  Open: 0,
  UnderReview: 1,
  Decided: 2,
  Cancelled: 3,
} as const;

export type ProposalStatusType = (typeof ProposalStatus)[keyof typeof ProposalStatus];

export interface Proposal {
  id: bigint;
  proposer: `0x${string}`;
  title: string;
  description: string;
  criteriaURI: string;
  reward: bigint;
  decisionDeadline: bigint;
  status: number;
  createdAt: bigint;
}

export interface Evaluation {
  id: bigint;
  evaluator: `0x${string}`;
  confidenceScore: number;
  reasoningURI: string;
  stake: bigint;
  isWinner: boolean;
  claimed: boolean;
}

// ============================================================================
// AGENT TYPES
// ============================================================================

export interface Agent {
  id: bigint;
  owner: `0x${string}`;
  agentURI: string;
  metadata: AgentMetadata8004 | null;
  isActive: boolean;
  createdAt: bigint;
}

export interface AgentMetadata8004 {
  name: string;
  description: string;
  version: string;
  capabilities: string[];
  endpoints: {
    https?: string;
    mcp?: string;
  };
  pricing?: {
    currency: string;
    minJobValue?: string;
  };
  images?: {
    logo?: string;
    banner?: string;
  };
  social?: {
    twitter?: string;
    github?: string;
  };
  source?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ============================================================================
// SKILL TYPES
// ============================================================================

export interface Skill {
  id: bigint;
  agentId: bigint;
  domain: string;
  description: string;
  pricing: bigint;
  isActive: boolean;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface PaginationParams {
  start: number;
  count: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  hasMore: boolean;
}

// ============================================================================
// CONTRACT ADDRESSES (re-exported for convenience)
// ============================================================================

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;
export type ZeroAddress = typeof ZERO_ADDRESS;