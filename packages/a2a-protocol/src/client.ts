export type {
  AgentCard,
  Task,
  TaskStatus,
  A2AMessage,
  A2ASession,
  TaskOfferMessage,
  TaskAcceptMessage,
  TaskRejectMessage,
  TaskUpdateMessage,
  TaskResultMessage,
} from './types';

export { createAgentCard, validateAgentCard } from './types';

export interface A2AClientConfig {
  agentId: string;
  endpoint?: string;
  transport?: 'http' | 'websocket';
}

export interface SendMessageOptions {
  to: string;
  message: Omit<import('./types').A2AMessage, 'id' | 'from' | 'timestamp'>;
  correlationId?: string;
}

export interface A2AClient {
  getAgentCard(): Promise<import('./types').AgentCard>;
  sendMessage(options: SendMessageOptions): Promise<string>;
  getMessages(sessionId?: string): Promise<import('./types').A2AMessage[]>;
  subscribe(handler: (message: import('./types').A2AMessage) => void): () => void;
}

export class A2AClientImpl implements A2AClient {
  private agentId: string;
  private endpoint?: string;
  private handlers: Set<(message: import('./types').A2AMessage) => void> = new Set();

  constructor(config: A2AClientConfig) {
    this.agentId = config.agentId;
    this.endpoint = config.endpoint;
  }

  async getAgentCard(): Promise<import('./types').AgentCard> {
    if (!this.endpoint) {
      throw new Error('Endpoint not configured');
    }

    const response = await fetch(`${this.endpoint}/.well-known/agent.json`);
    if (!response.ok) {
      throw new Error('Failed to fetch agent card');
    }

    return response.json();
  }

  async sendMessage(options: SendMessageOptions): Promise<string> {
    if (!this.endpoint) {
      throw new Error('Endpoint not configured');
    }

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const message = {
      ...options.message,
      id: messageId,
      from: this.agentId,
      to: options.to,
      timestamp: Date.now(),
      correlationId: options.correlationId,
    } as import('./types').A2AMessage;

    const response = await fetch(`${this.endpoint}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    return messageId;
  }

  async getMessages(sessionId?: string): Promise<import('./types').A2AMessage[]> {
    if (!this.endpoint) {
      throw new Error('Endpoint not configured');
    }

    const url = sessionId
      ? `${this.endpoint}/messages?session=${sessionId}`
      : `${this.endpoint}/messages`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch messages');
    }

    const data = await response.json();
    return data.messages || [];
  }

  subscribe(handler: (message: import('./types').A2AMessage) => void): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  notifyHandlers(message: import('./types').A2AMessage): void {
    this.handlers.forEach(handler => {
      try {
        handler(message);
      } catch (error) {
        console.error('A2A message handler error:', error);
      }
    });
  }
}
