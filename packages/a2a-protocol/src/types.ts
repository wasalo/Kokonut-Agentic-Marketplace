export interface AgentCard {
  agentId: string;
  name: string;
  description?: string;
  capabilities: string[];
  skills: string[];
  endpoints: {
    https?: string;
    mcp?: string;
  };
  protocols: ('a2a' | 'mcp')[];
  pricing?: {
    currency: 'USDC';
    minJobValue?: string;
    priceRange?: {
      min: string;
      max: string;
    };
  };
  metadata?: {
    source?: string;
    version?: string;
    tags?: string[];
  };
}

export type TaskStatus =
  | 'submitted'
  | 'accepted'
  | 'rejected'
  | 'working'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface Task {
  id: string;
  type: 'task-offer' | 'task-delegation';
  title: string;
  description: string;
  requirements?: string[];
  budget?: string;
  deadline?: string;
  status: TaskStatus;
  createdBy: string;
  assignedTo?: string;
  createdAt: number;
  updatedAt: number;
  result?: {
    output: string;
    completedAt?: number;
  };
}

export interface A2AMessageBase {
  id: string;
  type: string;
  from: string;
  to: string;
  timestamp: number;
  correlationId?: string;
}

export interface TaskOfferMessage extends A2AMessageBase {
  type: 'task-offer';
  payload: {
    taskId: string;
    title: string;
    description: string;
    requirements?: string[];
    budget?: string;
    deadline?: string;
    preferredAgents?: string[];
  };
}

export interface TaskAcceptMessage extends A2AMessageBase {
  type: 'task-accept';
  payload: {
    taskId: string;
    agentId: string;
    proposedTimeline?: string;
    questions?: string[];
  };
}

export interface TaskRejectMessage extends A2AMessageBase {
  type: 'task-reject';
  payload: {
    taskId: string;
    reason: string;
  };
}

export interface TaskUpdateMessage extends A2AMessageBase {
  type: 'task-update';
  payload: {
    taskId: string;
    status: TaskStatus;
    progress?: number;
    message?: string;
  };
}

export interface TaskResultMessage extends A2AMessageBase {
  type: 'task-result';
  payload: {
    taskId: string;
    output: string;
    artifacts?: {
      name: string;
      type: string;
      url?: string;
      data?: string;
    }[];
  };
}

export type A2AMessage =
  | TaskOfferMessage
  | TaskAcceptMessage
  | TaskRejectMessage
  | TaskUpdateMessage
  | TaskResultMessage;

export interface A2ASession {
  id: string;
  participants: string[];
  messages: A2AMessage[];
  createdAt: number;
  updatedAt: number;
}

export function createAgentCard(params: {
  agentId: string;
  name: string;
  capabilities?: string[];
  skills?: string[];
  endpoint?: string;
  description?: string;
  source?: string;
}): AgentCard {
  return {
    agentId: params.agentId,
    name: params.name,
    description: params.description,
    capabilities: params.capabilities || [],
    skills: params.skills || [],
    endpoints: {
      https: params.endpoint,
    },
    protocols: ['a2a', 'mcp'],
    metadata: {
      source: params.source || 'kokonut-a2a',
      version: '1.0',
    },
  };
}

export function validateAgentCard(card: unknown): card is AgentCard {
  if (!card || typeof card !== 'object') return false;
  const c = card as Record<string, unknown>;
  return (
    typeof c.agentId === 'string' &&
    typeof c.name === 'string' &&
    Array.isArray(c.capabilities) &&
    Array.isArray(c.skills) &&
    typeof c.endpoints === 'object' &&
    Array.isArray(c.protocols)
  );
}
