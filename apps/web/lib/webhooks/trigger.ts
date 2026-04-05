'use client';

import type { WebhookEventType } from '@/lib/webhooks';

export interface TriggerWebhookOptions {
  event: WebhookEventType;
  data?: Record<string, unknown>;
  chainId?: number;
}

export async function triggerWebhooks(options: TriggerWebhookOptions): Promise<{
  success: boolean;
  delivered?: number;
  failed?: number;
}> {
  try {
    const response = await fetch('/api/webhooks/trigger', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event: options.event,
        data: options.data || {},
        chainId: options.chainId || 11155111,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[Webhook] Trigger failed:', result.error);
      return { success: false };
    }

    return {
      success: true,
      delivered: result.delivered,
      failed: result.failed,
    };
  } catch (error) {
    console.error('[Webhook] Error triggering webhooks:', error);
    return { success: false };
  }
}

export const NOTIFICATION_TO_WEBHOOK_MAP: Record<string, WebhookEventType> = {
  'job.created': 'job.created',
  'job.funded': 'job.funded',
  'job.submitted': 'job.submitted',
  'job.completed': 'job.completed',
  'job.rejected': 'job.rejected',
  'service.created': 'service.created',
  'service.updated': 'service.updated',
  'service.deactivated': 'service.deactivated',
  'proposal.created': 'proposal.created',
  'proposal.evaluation_submitted': 'proposal.evaluation_submitted',
  'proposal.decided': 'proposal.decided',
  'payment.received': 'payment.received',
};

export function getWebhookEventFromNotification(
  notificationAction: string
): WebhookEventType | null {
  return NOTIFICATION_TO_WEBHOOK_MAP[notificationAction] || null;
}
