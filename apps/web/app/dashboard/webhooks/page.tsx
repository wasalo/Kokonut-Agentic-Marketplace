'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Webhook, Plus, Trash2, RefreshCw, Check, X, AlertCircle } from 'lucide-react';
import { Card } from '@heroui/react';
import { useWebhooks } from '@/lib/hooks/useWebhooks';
import { btn, card } from '@/lib/design-system';
import { Input } from '@/components/ui/Input';
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
  'payment.received',
  'payment.sent',
];

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
    <Card className={card('base')}>
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
            <button type="button" onClick={onTest} className={btn('ghost', 'px-2 py-1 text-xs')}>
              <RefreshCw className="size-4" />
            </button>
            <button type="button" onClick={onDelete} className={btn('ghost', 'px-2 py-1 text-xs')}>
              <Trash2 className="size-4 text-danger" />
            </button>
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
      <Card className={card('padded', 'p-6 text-center')}>
        <AlertCircle className="size-8 text-warning mx-auto mb-3" />
        <p className="text-default-600">
          Maximum webhooks reached ({MAX_WEBHOOKS_PER_AGENT}). Delete one to create more.
        </p>
        <button type="button" onClick={onCancel} className={btn('ghost', 'mt-4')}>
          Close
        </button>
      </Card>
    );
  }

  return (
    <Card className={card('base')}>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Create Webhook</h2>
          <button type="button" onClick={onCancel} className={btn('ghost', 'px-3 py-1.5 text-xs')}>
            Cancel
          </button>
        </div>

        <div className="space-y-4">
          <Input
            label="Webhook URL"
            placeholder="https://your-server.com/webhook"
            value={url}
            onChange={e => setUrl(e.target.value)}
            helperText="Must be HTTPS for security"
          />

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

          <button
            type="button"
            onClick={() => {
              void handleSubmit();
            }}
            disabled={isLoading}
            className={btn('secondary', 'w-full')}
          >
            {isLoading && <RefreshCw className="size-4 animate-spin" />}
            Create Webhook
          </button>
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
        <Card className={card('padded', 'p-12 text-center')}>
          <Webhook className="size-12 text-default-400 mx-auto mb-4" />
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
          <button
            type="button"
            onClick={() => setShowCreateForm(true)}
            disabled={serverWebhooks.length >= MAX_WEBHOOKS_PER_AGENT}
            className={btn('primary')}
          >
            <Plus className="size-4" />
            Create Webhook
          </button>
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
        <Card className={card('padded', 'p-12 text-center')}>
          <Webhook className="size-12 text-default-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Webhooks Yet</h2>
          <p className="text-default-500 mb-6">
            Create your first webhook to receive notifications about platform events.
          </p>
          <button
            type="button"
            onClick={() => setShowCreateForm(true)}
            className={btn('primary')}
          >
            <Plus className="size-4" />
            Create Webhook
          </button>
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
