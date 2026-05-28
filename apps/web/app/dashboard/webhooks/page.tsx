'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Webhook, Plus, Trash2, RefreshCw, Check, X, AlertCircle } from 'lucide-react';
import { Card } from '@heroui/react';
import { useWebhooks } from '@/lib/hooks/useWebhooks';
import type {
  Webhook as WebhookType,
  WebhookEventType,
  WebhookRegistration,
} from '@/lib/webhooks/types';
import { WEBHOOK_EVENT_LABELS, MAX_WEBHOOKS_PER_AGENT } from '@/lib/webhooks/types';

const EVENT_OPTIONS: WebhookEventType[] = [
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
];

function Button({
  children,
  onClick,
  variant = 'default',
  size = 'md',
  disabled = false,
  loading = false,
  className = '',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'primary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}) {
  const baseClasses =
    'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const variantClasses = {
    default: 'bg-content2 hover:bg-content3 text-foreground border border-divider',
    primary: 'bg-primary text-white hover:opacity-90',
    ghost: 'bg-transparent hover:bg-content2 text-foreground',
    danger: 'bg-danger text-white hover:opacity-90',
  };

  return (
    <button type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
    >
      {loading && <RefreshCw className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

function Chip({
  children,
  color = 'default',
}: {
  children: React.ReactNode;
  color?: 'default' | 'success' | 'warning' | 'danger';
}) {
  const colorClasses = {
    default: 'bg-content2 text-foreground',
    success: 'bg-success/20 text-success',
    warning: 'bg-warning/20 text-warning',
    danger: 'bg-danger/20 text-danger',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorClasses[color]}`}
    >
      {children}
    </span>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  description,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  description?: string;
}) {
  return (
    <div className="space-y-1">
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-content2 border border-divider rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
      />
      {description && <p className="text-xs text-default-500">{description}</p>}
    </div>
  );
}

function WebhookCard({
  webhook,
  onDelete,
  onTest,
}: {
  webhook: WebhookType;
  onDelete: () => void;
  onTest: () => void;
}) {
  return (
    <Card className="border border-divider">
      <div className="p-4">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Webhook className="size-4 text-default-500 shrink-0" />
              <code className="text-sm truncate">{webhook.url}</code>
            </div>
            <div className="flex items-center gap-2">
              <Chip color={webhook.isActive ? 'success' : 'default'}>
                {webhook.isActive ? 'Active' : 'Inactive'}
              </Chip>
              <Chip>
                {webhook.events.length} event{webhook.events.length !== 1 ? 's' : ''}
              </Chip>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={onTest}>
              <RefreshCw className="size-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={onDelete}>
              <Trash2 className="size-4 text-danger" />
            </Button>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-xs text-default-500 mb-2">Events:</p>
          <div className="flex flex-wrap gap-1">
            {webhook.events.map(event => (
              <Chip key={event}>{WEBHOOK_EVENT_LABELS[event]}</Chip>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs text-default-500 mb-1">Secret (for signature verification)</p>
          <code className="text-xs bg-content2 px-2 py-1 rounded block truncate">
            {webhook.secret.substring(0, 20)}...
          </code>
        </div>
      </div>
    </Card>
  );
}

function CreateWebhookForm({
  onSubmit,
  onCancel,
  maxReached,
}: {
  onSubmit: (webhook: WebhookRegistration) => Promise<void>;
  onCancel: () => void;
  maxReached: boolean;
}) {
  const [url, setUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<WebhookEventType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleEvent = (event: WebhookEventType) => {
    setSelectedEvents(prev =>
      prev.includes(event) ? prev.filter(e => e !== event) : [...prev, event]
    );
  };

  const handleSubmit = async () => {
    if (!url) {
      setError('URL is required');
      return;
    }
    if (!url.startsWith('https://')) {
      setError('URL must use HTTPS');
      return;
    }
    if (selectedEvents.length === 0) {
      setError('Select at least one event');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await onSubmit({ url, events: selectedEvents });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create webhook');
      setIsLoading(false);
    }
  };

  if (maxReached) {
    return (
      <Card className="border border-divider p-6 text-center">
        <AlertCircle className="size-8 text-warning mx-auto mb-3" />
        <p className="text-default-600">
          Maximum webhooks reached ({MAX_WEBHOOKS_PER_AGENT}). Delete one to create more.
        </p>
        <Button variant="ghost" onClick={onCancel} className="mt-4">
          Close
        </Button>
      </Card>
    );
  }

  return (
    <Card className="border border-divider">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Create Webhook</h2>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Webhook URL</label>
            <Input
              placeholder="https://your-server.com/webhook"
              value={url}
              onChange={setUrl}
              description="Must be HTTPS for security"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Events to receive</label>
            <div className="flex flex-wrap gap-2">
              {EVENT_OPTIONS.map(event => (
                <button type="button"
                  key={event}
                  onClick={() => toggleEvent(event)}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                    selectedEvents.includes(event)
                      ? 'bg-primary text-white border-primary'
                      : 'bg-content2 border-divider hover:bg-content3'
                  }`}
                >
                  {WEBHOOK_EVENT_LABELS[event]}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-danger text-sm bg-danger/10 p-3 rounded-lg">
              <AlertCircle className="size-4 shrink-0" />
              {error}
            </div>
          )}

          <Button
            variant="primary"
            className="w-full border-2 border-[#009F4D] text-[#009F4D] hover:bg-[#009F4D]/5 font-semibold"
            onClick={() => {
              void handleSubmit();
            }}
            loading={isLoading}
          >
            Create Webhook
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default function WebhooksPage() {
  useEffect(() => {
    document.title = 'Webhooks | Kokonut Agent Economy';
  }, []);

  const { address, isConnected } = useAccount();
  const { createWebhook, removeWebhook, triggerTestEvent, listWebhooks } = useWebhooks();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [serverWebhooks, setServerWebhooks] = useState<WebhookType[]>([]);
  const [testResults, setTestResults] = useState<Record<string, 'testing' | 'success' | 'error'>>(
    {}
  );

  useEffect(() => {
    const fetchWebhooks = async () => {
      if (!address) {
        setServerWebhooks([]);
        setIsLoading(false);
        return;
      }

      try {
        const webhooks = await listWebhooks();
        setServerWebhooks(webhooks);
      } catch (error) {
        console.error('Failed to fetch webhooks:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWebhooks();
  }, [address, listWebhooks]);

  const handleCreate = async (registration: WebhookRegistration) => {
    await createWebhook(registration);
    const webhooks = await listWebhooks();
    setServerWebhooks(webhooks);
    setShowCreateForm(false);
  };

  const handleDelete = async (id: string) => {
    await removeWebhook(id);
    setServerWebhooks(prev => prev.filter(w => w.id !== id));
  };

  const handleTest = async (id: string) => {
    setTestResults(prev => ({ ...prev, [id]: 'testing' }));
    try {
      await triggerTestEvent(id);
      setTestResults(prev => ({ ...prev, [id]: 'success' }));
    } catch {
      setTestResults(prev => ({ ...prev, [id]: 'error' }));
    }
    setTimeout(() => {
      setTestResults(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }, 3000);
  };

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <Card className="border border-divider p-12 text-center">
          <Webhook className="size-122 text-default-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Connect Your Wallet</h2>
          <p className="text-default-500">Connect your wallet to manage your webhooks.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-1">Webhooks</h1>
          <p className="text-default-500">Receive HTTP callbacks when platform events occur</p>
        </div>
        <div className="flex items-center gap-4">
          <Chip>
            {serverWebhooks.length} / {MAX_WEBHOOKS_PER_AGENT} webhooks
          </Chip>
          <Button
            variant="primary"
            onClick={() => setShowCreateForm(true)}
            disabled={serverWebhooks.length >= MAX_WEBHOOKS_PER_AGENT}
            className="bg-gradient-to-r from-[#009F4D] to-[#00c853] text-white font-semibold"
          >
            <Plus className="size-4" />
            Create Webhook
          </Button>
        </div>
      </div>

      <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 mb-8">
        <div className="flex items-start gap-3">
          <AlertCircle className="size-5 text-warning mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-medium mb-1">Webhook Delivery</p>
            <p className="text-default-600">
              Webhooks are delivered with 5 retries and exponential backoff. Your endpoint must
              return a 2xx status code within 10 seconds.
            </p>
          </div>
        </div>
      </div>

      {showCreateForm && (
        <div className="mb-8">
          <CreateWebhookForm
            onSubmit={handleCreate}
            onCancel={() => setShowCreateForm(false)}
            maxReached={serverWebhooks.length >= MAX_WEBHOOKS_PER_AGENT}
          />
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="h-40 bg-content2 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : serverWebhooks.length === 0 && !showCreateForm ? (
        <Card className="border border-divider p-12 text-center">
          <Webhook className="size-122 text-default-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Webhooks Yet</h2>
          <p className="text-default-500 mb-6">
            Create your first webhook to receive notifications about platform events.
          </p>
          <Button 
            variant="primary" 
            onClick={() => setShowCreateForm(true)}
            className="bg-gradient-to-r from-[#009F4D] to-[#00c853] text-white font-semibold"
          >
            <Plus className="size-4" />
            Create Webhook
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {serverWebhooks.map(webhook => (
            <div key={webhook.id} className="relative">
              <WebhookCard
                webhook={webhook}
                onDelete={() => handleDelete(webhook.id)}
                onTest={() => handleTest(webhook.id)}
              />
              {testResults[webhook.id] && (
                <div className="absolute inset-0 bg-background/90 backdrop-blur-sm rounded-lg flex items-center justify-center">
                  {testResults[webhook.id] === 'testing' && (
                    <div className="flex items-center gap-2 text-default-500">
                      <RefreshCw className="size-5 animate-spin" />
                      Testing webhook...
                    </div>
                  )}
                  {testResults[webhook.id] === 'success' && (
                    <div className="flex items-center gap-2 text-success font-medium">
                      <Check className="size-5" />
                      Test event sent!
                    </div>
                  )}
                  {testResults[webhook.id] === 'error' && (
                    <div className="flex items-center gap-2 text-danger font-medium">
                      <X className="size-5" />
                      Test failed
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
