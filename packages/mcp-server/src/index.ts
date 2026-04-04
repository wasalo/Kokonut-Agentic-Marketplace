import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ListPromptsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { jobsTools } from './tools/jobs.js';
import { servicesTools } from './tools/services.js';
import { agentsTools } from './tools/agents.js';
import { listResources } from './resources/index.js';
import { listPrompts } from './prompts/index.js';

const server = new Server(
  {
    name: 'kokonut-mcp-server',
    version: '0.1.0',
    description: 'MCP Server for Kokonut Agent Economy - Jobs, Services, and Agent Management',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
  }
);

const allTools = [...jobsTools, ...servicesTools, ...agentsTools];

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: allTools.map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    })),
  };
});

server.setRequestHandler(CallToolRequestSchema, async request => {
  const { name, arguments: args } = request.params;

  const tool = allTools.find(t => t.name === name);

  if (!tool) {
    return {
      content: [
        {
          type: 'text',
          text: `Tool "${name}" not found`,
        },
      ],
      isError: true,
    };
  }

  try {
    const result = await tool.handler(args);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: error instanceof Error ? error.message : 'Unknown error occurred',
        },
      ],
      isError: true,
    };
  }
});

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return listResources();
});

server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return listPrompts();
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Kokonut MCP Server started on stdio');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
