import { EventEmitter } from 'events';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';

export interface HttpSseTransportOptions {
  corsOrigin?: string;
  corsHeaders?: Record<string, string>;
}

export class HttpSseTransport extends EventEmitter implements Transport {
  private clients: Set<ReadableStreamDefaultController> = new Set();
  private requestIdCounter = 0;
  private pendingRequests: Map<
    string,
    {
      resolve: (result: unknown) => void;
      reject: (error: Error) => void;
      timeout: NodeJS.Timeout;
    }
  > = new Map();

  readonly corsOrigin: string;
  readonly corsHeaders: Record<string, string>;

  constructor(options: HttpSseTransportOptions = {}) {
    super();
    this.corsOrigin = options.corsOrigin || '*';
    this.corsHeaders = options.corsHeaders || {};
  }

  async start(): Promise<void> {
    console.error('HttpSseTransport started');
    this.emit('open');
  }

  async close(): Promise<void> {
    this.clients.forEach(controller => {
      try {
        controller.close();
      } catch {
        // Controller already closed
      }
    });
    this.clients.clear();

    this.pendingRequests.forEach(({ timeout }) => {
      clearTimeout(timeout);
    });
    this.pendingRequests.clear();

    this.emit('close');
  }

  async send(message: unknown): Promise<void> {
    const data = JSON.stringify(message);
    const sseMessage = `data: ${data}\n\n`;

    const enc = new TextEncoder();
    const encoded = enc.encode(sseMessage);

    const clientsToRemove: Set<ReadableStreamDefaultController> = new Set();

    for (const controller of this.clients) {
      try {
        controller.enqueue(encoded);
      } catch {
        clientsToRemove.add(controller);
      }
    }

    clientsToRemove.forEach(c => this.clients.delete(c));
  }

  addClient(controller: ReadableStreamDefaultController): void {
    this.clients.add(controller);

    controller.desiredSize;

    const initialMessage = {
      jsonrpc: '2.0',
      result: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
        serverInfo: {
          name: 'kokonut-mcp-server',
          version: '0.1.0',
        },
      },
      id: null,
    };

    const data = JSON.stringify(initialMessage);
    const enc = new TextEncoder();
    controller.enqueue(enc.encode(`data: ${data}\n\n`));
  }

  removeClient(controller: ReadableStreamDefaultController): void {
    this.clients.delete(controller);
  }

  async handleRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/sse') {
      return this.handleSSE();
    }

    if (url.pathname === '/mcp' && request.method === 'POST') {
      return this.handleMCP(request);
    }

    return new Response('Not Found', { status: 404 });
  }

  private handleSSE(): Response {
    const stream = new ReadableStream({
      start: controller => {
        this.addClient(controller);
      },
      cancel: () => {},
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': this.corsOrigin,
        'Access-Control-Allow-Headers': 'Content-Type',
        ...this.corsHeaders,
      },
    });
  }

  private async handleMCP(request: Request): Promise<Response> {
    try {
      const body = await request.json();

      if (body.method === 'notifications/initialized' || body.method === 'initialize') {
        return this.handleNotification(body);
      }

      const requestId = body.id?.toString() || `req_${++this.requestIdCounter}`;
      const method = body.method;
      const params = body.params || {};

      const timeout = setTimeout(() => {
        const pending = this.pendingRequests.get(requestId);
        if (pending) {
          pending.reject(new Error('Request timeout'));
          this.pendingRequests.delete(requestId);
        }
      }, 30000);

      this.pendingRequests.set(requestId, {
        resolve: () => {},
        reject: () => {},
        timeout,
      });

      const response = await this.processMethod(method, params, requestId);

      clearTimeout(timeout);
      this.pendingRequests.delete(requestId);

      return new Response(JSON.stringify(response), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': this.corsOrigin,
        },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          error: {
            code: -32600,
            message: error instanceof Error ? error.message : 'Invalid Request',
          },
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': this.corsOrigin,
          },
        }
      );
    }
  }

  private handleNotification(body: Record<string, unknown>): Response {
    return new Response(JSON.stringify({ jsonrpc: '2.0', id: body.id || null }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': this.corsOrigin,
      },
    });
  }

  private async processMethod(
    method: string,
    params: unknown,
    requestId: string
  ): Promise<Record<string, unknown>> {
    switch (method) {
      case 'tools/list':
        return {
          jsonrpc: '2.0',
          id: requestId,
          result: {
            tools: [
              { name: 'jobs_get', description: 'Get job details' },
              { name: 'jobs_list', description: 'List jobs' },
              { name: 'jobs_my', description: 'Get user jobs' },
              { name: 'services_get', description: 'Get service details' },
              { name: 'services_list', description: 'List services' },
              { name: 'services_by_provider', description: 'Get provider services' },
              { name: 'agents_get', description: 'Get agent details' },
              { name: 'agents_get_by_address', description: 'Get agent by address' },
              { name: 'agents_list', description: 'List agents' },
              { name: 'agents_reputation', description: 'Get agent reputation' },
            ],
          },
        };

      case 'tools/call':
        return {
          jsonrpc: '2.0',
          id: requestId,
          result: {
            content: [
              {
                type: 'text',
                text: 'Tool execution not available via HTTP+SSE. Use STDIO transport.',
              },
            ],
          },
        };

      case 'resources/list':
        return {
          jsonrpc: '2.0',
          id: requestId,
          result: {
            resources: [
              { uri: 'platform://stats', name: 'Platform Statistics' },
              { uri: 'platform://contracts', name: 'Contract Addresses' },
              { uri: 'platform://supported-chains', name: 'Supported Chains' },
            ],
          },
        };

      case 'prompts/list':
        return {
          jsonrpc: '2.0',
          id: requestId,
          result: {
            prompts: [
              { name: 'job_summary', description: 'Generate job summary' },
              { name: 'service_analysis', description: 'Analyze service' },
              { name: 'agent_report', description: 'Generate agent report' },
            ],
          },
        };

      default:
        return {
          jsonrpc: '2.0',
          id: requestId,
          error: {
            code: -32601,
            message: `Method not found: ${method}`,
          },
        };
    }
  }
}
