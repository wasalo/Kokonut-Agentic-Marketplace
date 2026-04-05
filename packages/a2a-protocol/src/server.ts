import { createAgentCard, validateAgentCard, type AgentCard, type Task } from './types.js';

export interface A2AServerConfig {
  agentId: string;
  name: string;
  description?: string;
  capabilities?: string[];
  skills?: string[];
  endpoint?: string;
  source?: string;
}

export interface A2AServer {
  getAgentCard(): AgentCard;
  handleMessage(message: unknown): Promise<unknown>;
}

export function createA2AServer(config: A2AServerConfig): A2AServer {
  const agentCard = createAgentCard({
    agentId: config.agentId,
    name: config.name,
    description: config.description,
    capabilities: config.capabilities,
    skills: config.skills,
    endpoint: config.endpoint,
    source: config.source || 'kokonut-a2a',
  });

  return {
    getAgentCard(): AgentCard {
      return agentCard;
    },

    async handleMessage(message: unknown): Promise<unknown> {
      if (!message || typeof message !== 'object') {
        return { error: 'Invalid message format' };
      }

      const msg = message as Record<string, unknown>;

      switch (msg.type) {
        case 'task-offer':
          return handleTaskOffer(msg);
        case 'task-accept':
          return handleTaskAccept(msg);
        case 'task-reject':
          return handleTaskReject(msg);
        case 'task-update':
          return handleTaskUpdate(msg);
        case 'task-result':
          return handleTaskResult(msg);
        default:
          return { error: `Unknown message type: ${msg.type}` };
      }
    },
  };
}

function handleTaskOffer(message: Record<string, unknown>): unknown {
  const payload = message.payload as Record<string, unknown> | undefined;
  if (!payload) {
    return { error: 'Missing payload in task-offer message' };
  }

  return {
    type: 'task-ack',
    payload: {
      taskId: payload.taskId,
      status: 'received',
      message: 'Task offer received',
    },
  };
}

function handleTaskAccept(message: Record<string, unknown>): unknown {
  const payload = message.payload as Record<string, unknown> | undefined;
  if (!payload) {
    return { error: 'Missing payload in task-accept message' };
  }

  return {
    type: 'task-ack',
    payload: {
      taskId: payload.taskId,
      status: 'accepted',
      message: 'Task acceptance received',
    },
  };
}

function handleTaskReject(message: Record<string, unknown>): unknown {
  const payload = message.payload as Record<string, unknown> | undefined;
  if (!payload) {
    return { error: 'Missing payload in task-reject message' };
  }

  return {
    type: 'task-ack',
    payload: {
      taskId: payload.taskId,
      status: 'rejected',
      message: 'Task rejection received',
    },
  };
}

function handleTaskUpdate(message: Record<string, unknown>): unknown {
  const payload = message.payload as Record<string, unknown> | undefined;
  if (!payload) {
    return { error: 'Missing payload in task-update message' };
  }

  return {
    type: 'task-ack',
    payload: {
      taskId: payload.taskId,
      status: 'updated',
      message: 'Task update received',
    },
  };
}

function handleTaskResult(message: Record<string, unknown>): unknown {
  const payload = message.payload as Record<string, unknown> | undefined;
  if (!payload) {
    return { error: 'Missing payload in task-result message' };
  }

  return {
    type: 'task-ack',
    payload: {
      taskId: payload.taskId,
      status: 'completed',
      message: 'Task result received',
    },
  };
}

export class A2AServerImpl implements A2AServer {
  private agentCard: AgentCard;

  constructor(config: A2AServerConfig) {
    this.agentCard = createAgentCard({
      agentId: config.agentId,
      name: config.name,
      description: config.description,
      capabilities: config.capabilities,
      skills: config.skills,
      endpoint: config.endpoint,
      source: config.source || 'kokonut-a2a',
    });
  }

  getAgentCard(): AgentCard {
    return this.agentCard;
  }

  async handleMessage(message: unknown): Promise<unknown> {
    return createA2AServer({} as A2AServerConfig).handleMessage(message);
  }
}
