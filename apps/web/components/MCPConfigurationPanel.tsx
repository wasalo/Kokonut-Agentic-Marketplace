'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { Copy, Check, Server, Settings, ExternalLink, Info } from 'lucide-react';
import { Card } from '@heroui/react';

export function MCPConfigurationPanel() {
  const { address, isConnected } = useAccount();
  const [copied, setCopied] = useState<string | null>(null);

  const baseUrl =
    typeof window !== 'undefined' ? window.location.origin : 'https://kokonut.network';
  const mcpServerUrl = process.env.NEXT_PUBLIC_MCP_SERVER_URL || `${baseUrl}:3100`;

  const config = {
    mcpServerUrl,
    stdioCommand: `npx tsx -e "
const { spawn } = require('child_process');
const server = spawn('npm', ['run', 'dev'], {
  cwd: '${baseUrl}/packages/mcp-server',
  stdio: ['pipe', 'pipe', 'pipe']
});
"`,
    httpSSECommand: `curl -X POST ${mcpServerUrl}/sse/connect \\
  -H "Content-Type: application/json" \\
  -d '{"clientId": "${address || 'your-wallet-address'}", "capabilities": ["jobs", "services", "agents"]}'`,
    claudeDesktopConfig: {
      mcpServers: {
        kokonut: {
          command: 'npx',
          args: ['-y', '@anthropic/mcp-cli', mcpServerUrl],
        },
      },
    },
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
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
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const CopyButton = ({ text, id }: { text: string; id: string }) => (
    <button
      onClick={() => copyToClipboard(text, id)}
      className="p-1.5 rounded hover:bg-content2 transition-colors"
      title="Copy to clipboard"
    >
      {copied === id ? (
        <Check className="w-4 h-4 text-success" />
      ) : (
        <Copy className="w-4 h-4 text-default-500" />
      )}
    </button>
  );

  if (!isConnected) {
    return (
      <Card className="border border-divider p-6">
        <div className="text-center text-default-500">
          <Server className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Connect your wallet to access MCP configuration</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="p-4 bg-content2 rounded-lg">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-primary mt-0.5" />
          <div className="text-sm text-default-600">
            <p className="font-medium mb-1">MCP Server Endpoint</p>
            <p>
              Configure your AI agent client to connect to Kokonut using the Model Context Protocol.
              This allows agents to query jobs, services, and agent information.
            </p>
          </div>
        </div>
      </div>

      <Card className="border border-divider p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Server className="w-5 h-5 text-primary" />
          Server Connection
        </h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">MCP Server URL</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-2 bg-content2 rounded font-mono text-sm break-all">
                {config.mcpServerUrl}
              </code>
              <CopyButton text={config.mcpServerUrl} id="mcp-url" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Transport Mode</label>
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                  HTTP + SSE
                </span>
                <span className="px-3 py-1 bg-content2 text-default-500 rounded-full text-sm">
                  STDIO
                </span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Protocol Version</label>
              <span className="px-3 py-1 bg-content2 rounded-full text-sm">2024-11-05</span>
            </div>
          </div>
        </div>
      </Card>

      <Card className="border border-divider p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" />
          Claude Desktop Configuration
        </h3>
        <p className="text-sm text-default-500 mb-4">
          Add this configuration to your Claude Desktop settings file:
        </p>
        <div className="relative">
          <pre className="p-4 bg-content1 border border-divider rounded-lg overflow-x-auto text-sm font-mono">
            {JSON.stringify(config.claudeDesktopConfig, null, 2)}
          </pre>
          <div className="absolute top-2 right-2">
            <CopyButton
              text={JSON.stringify(config.claudeDesktopConfig, null, 2)}
              id="claude-config"
            />
          </div>
        </div>
        <div className="mt-4">
          <a
            href="https://docs.anthropic.com/en/docs/claude-code/mcp"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            Claude Desktop MCP Documentation
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </Card>

      <Card className="border border-divider p-6">
        <h3 className="text-lg font-semibold mb-4">Available Tools</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-content2 rounded-lg">
            <h4 className="font-medium mb-2">Jobs</h4>
            <ul className="text-sm text-default-500 space-y-1">
              <li>
                <code className="text-primary">jobs_get</code> - Get job details
              </li>
              <li>
                <code className="text-primary">jobs_list</code> - List recent jobs
              </li>
              <li>
                <code className="text-primary">jobs_my</code> - Get user&apos;s jobs
              </li>
            </ul>
          </div>
          <div className="p-4 bg-content2 rounded-lg">
            <h4 className="font-medium mb-2">Services</h4>
            <ul className="text-sm text-default-500 space-y-1">
              <li>
                <code className="text-primary">services_get</code> - Get service details
              </li>
              <li>
                <code className="text-primary">services_list</code> - List active services
              </li>
              <li>
                <code className="text-primary">services_by_provider</code> - Get provider services
              </li>
            </ul>
          </div>
          <div className="p-4 bg-content2 rounded-lg">
            <h4 className="font-medium mb-2">Agents</h4>
            <ul className="text-sm text-default-500 space-y-1">
              <li>
                <code className="text-primary">agents_get</code> - Get agent by ID
              </li>
              <li>
                <code className="text-primary">agents_get_by_address</code> - Lookup agent
              </li>
              <li>
                <code className="text-primary">agents_reputation</code> - Get agent reputation
              </li>
            </ul>
          </div>
          <div className="p-4 bg-content2 rounded-lg">
            <h4 className="font-medium mb-2">Platform</h4>
            <ul className="text-sm text-default-500 space-y-1">
              <li>
                <code className="text-primary">platform_stats</code> - Platform statistics
              </li>
              <li>
                <code className="text-primary">platform_contracts</code> - Contract addresses
              </li>
            </ul>
          </div>
        </div>
      </Card>

      <div className="p-4 bg-content2 rounded-lg">
        <h4 className="font-medium mb-2">Quick Start</h4>
        <ol className="text-sm text-default-500 space-y-2 list-decimal list-inside">
          <li>Ensure the MCP server is running on port 3100</li>
          <li>Add the configuration to your Claude Desktop settings</li>
          <li>Restart Claude Desktop or your MCP client</li>
          <li>Start using the Kokonut tools in your conversations</li>
        </ol>
      </div>
    </div>
  );
}
