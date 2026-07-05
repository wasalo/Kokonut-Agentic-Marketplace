'use client';

import { useState, useCallback } from 'react';
import { Card } from '@heroui/react';
import { ChevronDown, ChevronRight, Copy, Check, Play, Loader2 } from 'lucide-react';
import { card, input } from '@/lib/design-system';
import {
  MCP_TOOLS,
  MOCK_JOBS,
  MOCK_SERVICES,
  MOCK_AGENTS,
  MOCK_PLATFORM_STATS,
} from '@/lib/mcp/mock-data';

interface ToolParameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

interface MCPTool {
  name: string;
  description: string;
  category: string;
  parameters: ToolParameter[];
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    try {
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [text]);

  return (
    <button type="button"
      onClick={handleCopy}
      className="p-1 hover:bg-content2 rounded transition-colors"
      title="Copy to clipboard"
    >
      {copied ? (
        <Check className="size-4 text-success" />
      ) : (
        <Copy className="size-4 text-default-400" />
      )}
    </button>
  );
}

function ToolSelector({
  tools,
  selectedTool,
  onSelectTool,
}: {
  tools: MCPTool[];
  selectedTool: MCPTool | null;
  onSelectTool: (tool: MCPTool) => void;
}) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>('Jobs');

  const categories = [...new Set(tools.map(t => t.category))];

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-default-500">Available Tools</h4>
      {categories.map(category => (
        <div key={category} className="border border-divider rounded-lg overflow-hidden">
          <button type="button"
            onClick={() => setExpandedCategory(expandedCategory === category ? null : category)}
            className="w-full px-3 py-2 bg-content2 flex items-center justify-between text-sm font-medium hover:bg-content3 transition-colors"
          >
            {category}
            {expandedCategory === category ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            )}
          </button>
          {expandedCategory === category && (
            <div className="divide-y divide-divider">
              {tools
                .filter(t => t.category === category)
                .map(tool => (
                  <button type="button"
                    key={tool.name}
                    onClick={() => onSelectTool(tool)}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-content2 transition-colors ${
                      selectedTool?.name === tool.name ? 'bg-primary/10 text-primary' : ''
                    }`}
                  >
                    <div className="font-mono text-xs">{tool.name}</div>
                    <div className="text-default-500 text-xs mt-0.5">{tool.description}</div>
                  </button>
                ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ParameterInput({
  parameter,
  value,
  onChange,
}: {
  parameter: ToolParameter;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">
        {parameter.name}
        {parameter.required && <span className="text-danger ml-0.5">*</span>}
      </label>
      <input
        type={parameter.type === 'number' ? 'number' : 'text'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={parameter.description}
        className={input()}
      />
    </div>
  );
}

function RequestBuilder({
  tool,
  parameters,
  onParameterChange,
}: {
  tool: MCPTool;
  parameters: Record<string, string>;
  onParameterChange: (name: string, value: string) => void;
}) {
  const requestJson = {
    jsonrpc: '2.0',
    id: `demo-${Date.now()}`,
    method: `tools/${tool.name}`,
    params: {
      ...Object.fromEntries(Object.entries(parameters).filter(([, v]) => v !== '')),
    },
  };

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-default-500">Parameters</h4>
      {tool.parameters.map(param => (
        <ParameterInput
          key={param.name}
          parameter={param}
          value={parameters[param.name] || ''}
          onChange={value => onParameterChange(param.name, value)}
        />
      ))}

      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-default-500">Request JSON</h4>
          <CopyButton text={JSON.stringify(requestJson, null, 2)} />
        </div>
        <pre className="p-3 bg-content2 border border-divider rounded-lg text-xs font-mono overflow-x-auto">
          {JSON.stringify(requestJson, null, 2)}
        </pre>
      </div>
    </div>
  );
}

function ResponseViewer({ response, isLoading }: { response: string | null; isLoading: boolean }) {
  return (
    <div>
      <h4 className="text-sm font-medium text-default-500 mb-2">Response</h4>
      <div className="relative">
        <pre className="p-3 bg-content2 border border-divider rounded-lg text-xs font-mono overflow-x-auto min-h-[200px] max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center gap-2 text-default-500">
              <Loader2 className="size-4 animate-spin" />
              Simulating MCP call...
            </div>
          ) : response ? (
            response
          ) : (
            <span className="text-default-400">Click "Run Demo" to see a simulated response</span>
          )}
        </pre>
        {response && !isLoading && (
          <div className="absolute top-2 right-2">
            <CopyButton text={response} />
          </div>
        )}
      </div>
    </div>
  );
}

function handleMockCall(toolName: string, params: Record<string, string>): string {
  switch (toolName) {
    case 'jobs_get':
      const job = MOCK_JOBS.find(j => j.id === params.jobId);
      return JSON.stringify(job || { error: 'Job not found' }, null, 2);

    case 'jobs_list':
      const count = parseInt(params.count) || 5;
      return JSON.stringify(
        {
          jobs: MOCK_JOBS.slice(0, count),
          total: MOCK_JOBS.length,
        },
        null,
        2
      );

    case 'services_get':
      const service = MOCK_SERVICES.find(s => s.id === params.serviceId);
      return JSON.stringify(service || { error: 'Service not found' }, null, 2);

    case 'services_list':
      const svcCount = parseInt(params.count) || 5;
      return JSON.stringify(
        {
          services: MOCK_SERVICES.slice(0, svcCount),
          total: MOCK_SERVICES.length,
        },
        null,
        2
      );

    case 'agents_get':
      const agent = MOCK_AGENTS.find(a => a.id === params.agentId);
      return JSON.stringify(agent || { error: 'Agent not found' }, null, 2);

    case 'agents_reputation':
      const repAgent = MOCK_AGENTS.find(
        a => a.owner.toLowerCase() === params.address.toLowerCase()
      );
      return JSON.stringify(repAgent?.reputation || { error: 'Reputation not found' }, null, 2);

    default:
      return JSON.stringify({ error: 'Unknown tool' }, null, 2);
  }
}

export function MCPDemoPanel() {
  const [selectedTool, setSelectedTool] = useState<MCPTool | null>(null);
  const [parameters, setParameters] = useState<Record<string, string>>({});
  const [response, setResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSelectTool = useCallback((tool: MCPTool) => {
    setSelectedTool(tool);
    setParameters({});
    setResponse(null);
  }, []);

  const handleParameterChange = useCallback((name: string, value: string) => {
    setParameters(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleRunDemo = useCallback(() => {
    if (!selectedTool) return;

    setIsLoading(true);
    setResponse(null);

    setTimeout(() => {
      const result = handleMockCall(selectedTool.name, parameters);
      setResponse(result);
      setIsLoading(false);
    }, 1000);
  }, [selectedTool, parameters]);

  return (
    <Card className={card('padded', 'p-6')}>
      <h3 className="text-lg font-semibold mb-6">MCP Interactive Demo</h3>
      <p className="text-sm text-default-500 mb-6">
        Try out MCP tools without connecting your wallet. This demo uses mock data to simulate how
        the MCP server would respond to tool calls.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <ToolSelector
            tools={MCP_TOOLS as MCPTool[]}
            selectedTool={selectedTool}
            onSelectTool={handleSelectTool}
          />

          {selectedTool && (
            <RequestBuilder
              tool={selectedTool}
              parameters={parameters}
              onParameterChange={handleParameterChange}
            />
          )}

          {selectedTool && (
            <button type="button"
              onClick={handleRunDemo}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {isLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Play className="size-4" />
              )}
              Run Demo
            </button>
          )}
        </div>

        <div>
          <ResponseViewer response={response} isLoading={isLoading} />

          <div className="mt-6 p-4 bg-content2 rounded-lg">
            <h4 className="text-sm font-medium mb-2">Platform Stats (Mock)</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-default-500">Total Jobs:</span>{' '}
                <span className="font-medium">
                  {MOCK_PLATFORM_STATS.totalJobs.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-default-500">Total Services:</span>{' '}
                <span className="font-medium">{MOCK_PLATFORM_STATS.totalServices}</span>
              </div>
              <div>
                <span className="text-default-500">Total Agents:</span>{' '}
                <span className="font-medium">{MOCK_PLATFORM_STATS.totalAgents}</span>
              </div>
              <div>
                <span className="text-default-500">Active Jobs:</span>{' '}
                <span className="font-medium">{MOCK_PLATFORM_STATS.activeJobs}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
