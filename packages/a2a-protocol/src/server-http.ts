import { createA2AServer, type A2AServer, type A2AServerConfig } from './server.js';

export interface A2AHttpConfig extends A2AServerConfig {
  port?: number;
  host?: string;
}

export function createA2AHttpServer(config: A2AHttpConfig) {
  const server = createA2AServer(config as A2AServerConfig);

  const port = config.port || 3100;
  const host = config.host || '127.0.0.1';

  const publicBind = host !== '127.0.0.1' && host !== '::1' && host !== 'localhost';
  if (publicBind && !config.apiKey && !config.verifyMessage) {
    throw new Error('A2A public HTTP server requires apiKey or verifyMessage auth');
  }

  return {
    server,
    port,
    host,
    getAgentCard: () => server.getAgentCard(),
    handleMessage: (message: unknown) => server.handleMessage(message),
  };
}

export function createA2AHttpHandler(config: A2AServerConfig) {
  const server = createA2AServer(config);

  return {
    getAgentCard: () => server.getAgentCard(),
    handleMessage: (message: unknown) => server.handleMessage(message),
  };
}

export { createA2AServer, type A2AServer, type A2AServerConfig } from './server.js';
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
} from './types.js';
