export interface AgentResponse {
  token_id: string;
  owner_address: string;
  agent_uri: string;
  created_at: string;
}

export interface ApiResponse<T> {
  data: T;
  meta?: {
    pagination?: {
      page: number;
      limit: number;
      total: number;
      hasMore: boolean;
    };
  };
  error?: string;
}

export interface AgentListResponse {
  data: AgentResponse[];
  meta: {
    pagination: {
      page: number;
      limit: number;
      total: number;
      hasMore: boolean;
    };
  };
}

export interface ServiceResponse {
  id: bigint;
  provider: string;
  agentId: bigint;
  name: string;
  description: string;
  metadataURI: string;
  price: bigint;
  paymentToken: string;
  isActive: boolean;
  createdAt: number;
}

export interface JobResponse {
  id: bigint;
  client: string;
  provider: string;
  evaluator: string;
  serviceId: bigint;
  description: string;
  budget: bigint;
  paymentToken: string;
  expiredAt: bigint;
  status: number;
  hook: string;
  deliverable: string;
  evaluatorFee: boolean;
  maxBudget?: bigint;
}

export interface ProposalResponse {
  id: bigint;
  proposer: string;
  title: string;
  description: string;
  criteriaURI: string;
  reward: bigint;
  stake: bigint;
  decisionDeadline: bigint;
  status: number;
  winningEvaluator: string;
  createdAt: bigint;
}

export interface SkillResponse {
  id: bigint;
  agentId: bigint;
  name: string;
  version: string;
  description: string;
  endpoint: string;
  domains: string[];
  isActive: boolean;
  registeredBy: string;
  registeredAt: bigint;
}

export interface NotificationData {
  id: string;
  type: 'job' | 'service' | 'proposal' | 'payment' | 'system';
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: number;
  metadata?: Record<string, unknown>;
}

export interface NotificationPreferences {
  email: {
    enabled: boolean;
    address?: string;
  };
  push: {
    enabled: boolean;
  };
  types: {
    job: boolean;
    service: boolean;
    proposal: boolean;
    payment: boolean;
    system: boolean;
  };
}
