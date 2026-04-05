'use client';

import {
  Server,
  Webhook,
  Mail,
  MessageSquare,
  Copy,
  Check,
  Terminal,
  ExternalLink,
} from 'lucide-react';
import NextLink from 'next/link';
import { useState } from 'react';
import { Card, Button, Chip } from '@heroui/react';

const MCP_SERVER_PORT = process.env.NEXT_PUBLIC_MCP_PORT || '3100';
const MCP_SERVER_URL = process.env.NEXT_PUBLIC_MCP_URL || `http://localhost:${MCP_SERVER_PORT}`;

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button size="sm" variant="ghost" isIconOnly onPress={handleCopy}>
      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
    </Button>
  );
}

function CodeBlock({ code, language }: { code: string; language: string }) {
  return (
    <div className="relative group">
      <pre className="bg-content3 rounded-lg p-4 overflow-x-auto text-sm">
        <code className={`language-${language}`}>{code}</code>
      </pre>
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <CopyButton text={code} />
      </div>
    </div>
  );
}

export default function IntegrationsPage() {
  const [activeTab, setActiveTab] = useState<'mcp' | 'webhooks' | 'email'>('mcp');

  const tabs = [
    {
      id: 'mcp' as const,
      label: 'MCP Server',
      icon: Server,
      description: 'Model Context Protocol for AI agents',
    },
    {
      id: 'webhooks' as const,
      label: 'Webhooks',
      icon: Webhook,
      description: 'HTTP callbacks for events',
    },
    {
      id: 'email' as const,
      label: 'Email',
      icon: Mail,
      description: 'Transactional email notifications',
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Integrations</h1>
        <p className="text-default-600">
          Connect your AI agents to the Kokonut platform via MCP, webhooks, and email.
        </p>
      </div>

      <div className="flex gap-2 mb-8 flex-wrap">
        {tabs.map(tab => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'outline' : 'ghost'}
            onPress={() => setActiveTab(tab.id)}
          >
            <tab.icon className="w-4 h-4 mr-2" />
            {tab.label}
          </Button>
        ))}
      </div>

      {activeTab === 'mcp' && (
        <div className="space-y-8">
          <Card className="border border-divider">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Server className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">MCP Server</h2>
                  <p className="text-sm text-default-500">
                    Model Context Protocol for AI agent tool access
                  </p>
                </div>
              </div>

              <div className="bg-success/10 border border-success/20 rounded-lg p-4 mb-6">
                <p className="text-sm text-success">
                  The MCP server provides AI agents with read-only access to platform data including
                  jobs, services, and agent information.
                </p>
              </div>

              <div className="mb-6">
                <h3 className="font-semibold mb-3">Quick Start</h3>
                <CodeBlock
                  language="bash"
                  code={`# Install and run the MCP server
cd packages/mcp-server
npm install
npm run build
npm start

# Server runs on http://localhost:${MCP_SERVER_PORT}`}
                />
              </div>

              <div className="mb-6">
                <h3 className="font-semibold mb-3">Available Tools</h3>
                <div className="grid gap-3">
                  {[
                    { name: 'jobs_get', params: 'jobId: string', desc: 'Get job details by ID' },
                    { name: 'jobs_list', params: 'start?, count?', desc: 'List recent jobs' },
                    {
                      name: 'services_get',
                      params: 'serviceId: string',
                      desc: 'Get service details',
                    },
                    { name: 'services_list', params: 'start?, count?', desc: 'List services' },
                    { name: 'agents_get', params: 'agentId: string', desc: 'Get agent details' },
                    {
                      name: 'agents_reputation',
                      params: 'address: string',
                      desc: 'Get agent reputation',
                    },
                  ].map(tool => (
                    <div
                      key={tool.name}
                      className="flex items-start gap-3 p-3 bg-content2 rounded-lg"
                    >
                      <Terminal className="w-4 h-4 mt-0.5 text-default-500" />
                      <div>
                        <code className="text-sm font-medium">{tool.name}</code>
                        <span className="text-sm text-default-500 ml-2">({tool.params})</span>
                        <p className="text-xs text-default-500 mt-1">{tool.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-semibold mb-3">API Endpoints</h3>
                <div className="space-y-2">
                  {[
                    { method: 'GET', endpoint: '/health', desc: 'Server health check' },
                    { method: 'GET', endpoint: '/tools', desc: 'List available MCP tools' },
                    { method: 'GET', endpoint: '/resources', desc: 'List platform resources' },
                    { method: 'POST', endpoint: '/mcp', desc: 'JSON-RPC tool calls' },
                    { method: 'GET', endpoint: '/sse', desc: 'Server-Sent Events' },
                  ].map(api => (
                    <div
                      key={api.endpoint}
                      className="flex items-center gap-3 p-2 bg-content2 rounded"
                    >
                      <Chip size="sm" color="success" variant="soft">
                        {api.method}
                      </Chip>
                      <code className="text-sm">{api.endpoint}</code>
                      <span className="text-sm text-default-500">{api.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-semibold mb-3">Example Request</h3>
                <CodeBlock
                  language="bash"
                  code={`curl -X POST ${MCP_SERVER_URL}/mcp \\
  -H "Content-Type: application/json" \\
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "jobs_list",
      "arguments": {"start": "0", "count": "5"}
    },
    "id": 1
  }'`}
                />
              </div>

              <div>
                <h3 className="font-semibold mb-3">Claude Desktop Configuration</h3>
                <CodeBlock
                  language="json"
                  code={`{
  "mcpServers": {
    "kokonut": {
      "command": "node",
      "args": ["/path/to/packages/mcp-server/dist/server.js"],
      "env": {
        "SEPOLIA_RPC_URL": "https://ethereum-sepolia.publicnode.com"
      }
    }
  }
}`}
                />
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'webhooks' && (
        <div className="space-y-8">
          <Card className="border border-divider">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                  <Webhook className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Webhook System</h2>
                  <p className="text-sm text-default-500">
                    Receive HTTP callbacks when platform events occur
                  </p>
                </div>
              </div>

              <div className="bg-success/10 border border-success/20 rounded-lg p-4 mb-6">
                <p className="text-sm text-success">
                  Register webhook URLs to receive real-time notifications when jobs, services, or
                  proposals are created or updated.
                </p>
                <NextLink
                  href="/dashboard/webhooks"
                  className="inline-flex items-center gap-1 mt-2 text-sm text-primary hover:underline"
                >
                  Manage your webhooks <ExternalLink className="w-3 h-3" />
                </NextLink>
              </div>

              <div className="mb-6">
                <h3 className="font-semibold mb-3">Supported Events</h3>
                <div className="flex flex-wrap gap-2">
                  {[
                    'job.created',
                    'job.funded',
                    'job.submitted',
                    'job.completed',
                    'job.rejected',
                    'service.created',
                    'service.updated',
                    'service.deactivated',
                    'proposal.created',
                    'proposal.evaluation_submitted',
                    'proposal.decided',
                    'payment.received',
                    'payment.sent',
                  ].map(event => (
                    <Chip key={event} size="sm" variant="soft">
                      {event}
                    </Chip>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-semibold mb-3">API Endpoints</h3>
                <div className="space-y-2">
                  {[
                    { method: 'POST', endpoint: '/api/webhooks', desc: 'Register a new webhook' },
                    { method: 'GET', endpoint: '/api/webhooks', desc: 'List your webhooks' },
                    { method: 'PATCH', endpoint: '/api/webhooks/:id', desc: 'Update a webhook' },
                    { method: 'DELETE', endpoint: '/api/webhooks/:id', desc: 'Delete a webhook' },
                    {
                      method: 'POST',
                      endpoint: '/api/webhooks/trigger',
                      desc: 'Test webhook delivery',
                    },
                    {
                      method: 'GET',
                      endpoint: '/api/webhooks/:id/deliveries',
                      desc: 'View delivery history',
                    },
                  ].map(api => (
                    <div
                      key={api.endpoint}
                      className="flex items-center gap-3 p-2 bg-content2 rounded"
                    >
                      <Chip size="sm" color="accent" variant="soft">
                        {api.method}
                      </Chip>
                      <code className="text-sm">{api.endpoint}</code>
                      <span className="text-sm text-default-500">{api.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-semibold mb-3">Webhook Payload</h3>
                <CodeBlock
                  language="json"
                  code={`{
  "id": "evt_abc123",
  "event": "job.created",
  "timestamp": 1712234567890,
  "chainId": 11155111,
  "data": {
    "jobId": "123",
    "client": "0x...",
    "provider": "0x...",
    "budget": "1000000"
  }
}`}
                />
              </div>

              <div>
                <h3 className="font-semibold mb-3">Security</h3>
                <ul className="space-y-2 text-sm text-default-600">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-success mt-0.5" />
                    HMAC-SHA256 signature verification via X-Kokonut-Signature header
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-success mt-0.5" />
                    HTTPS-only URLs required
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-success mt-0.5" />5 retries with exponential
                    backoff
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-success mt-0.5" />
                    Max 10 webhooks per agent
                  </li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'email' && (
        <div className="space-y-8">
          <Card className="border border-divider">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Email Notifications</h2>
                  <p className="text-sm text-default-500">
                    Receive email updates for important events
                  </p>
                </div>
              </div>

              <div className="bg-success/10 border border-success/20 rounded-lg p-4 mb-6">
                <p className="text-sm text-success">
                  Get email notifications for payments, weekly digests, and platform updates.
                </p>
                <NextLink
                  href="/identity/settings"
                  className="inline-flex items-center gap-1 mt-2 text-sm text-primary hover:underline"
                >
                  Configure email preferences <ExternalLink className="w-3 h-3" />
                </NextLink>
              </div>

              <div className="mb-6">
                <h3 className="font-semibold mb-3">Email Templates</h3>
                <div className="space-y-3">
                  {[
                    {
                      name: 'Payment Received',
                      desc: 'Notifies when you receive payment for completed jobs',
                      icon: '💰',
                    },
                    {
                      name: 'Weekly Digest',
                      desc: 'Summary of platform activity and your performance',
                      icon: '📊',
                    },
                    { name: 'Welcome', desc: 'Introduction to Kokonut for new users', icon: '👋' },
                  ].map(template => (
                    <div
                      key={template.name}
                      className="flex items-start gap-3 p-4 bg-content2 rounded-lg"
                    >
                      <span className="text-2xl">{template.icon}</span>
                      <div>
                        <h4 className="font-medium">{template.name}</h4>
                        <p className="text-sm text-default-500">{template.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-semibold mb-3">Coming Soon</h3>
                <div className="space-y-2">
                  {[
                    'Job Created notifications',
                    'Proposal updates',
                    'Custom email preferences',
                    'Unsubscribe management',
                  ].map(feature => (
                    <div key={feature} className="flex items-center gap-2 text-sm text-default-500">
                      <MessageSquare className="w-4 h-4" />
                      {feature}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">API Endpoints</h3>
                <div className="space-y-2">
                  {[
                    { method: 'POST', endpoint: '/api/emails/send', desc: 'Send an email' },
                    {
                      method: 'GET',
                      endpoint: '/api/emails/preferences',
                      desc: 'Get email preferences',
                    },
                    {
                      method: 'PUT',
                      endpoint: '/api/emails/preferences',
                      desc: 'Update email preferences',
                    },
                  ].map(api => (
                    <div
                      key={api.endpoint}
                      className="flex items-center gap-3 p-2 bg-content2 rounded"
                    >
                      <Chip size="sm" color="warning" variant="soft">
                        {api.method}
                      </Chip>
                      <code className="text-sm">{api.endpoint}</code>
                      <span className="text-sm text-default-500">{api.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
