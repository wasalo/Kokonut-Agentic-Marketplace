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
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (typeof window === 'undefined' && process.env.CRON_SECRET) {
      headers.Authorization = `Bearer ${process.env.CRON_SECRET}`;
    }

    const response = await fetch('/api/webhooks/trigger', {
      method: 'POST',
      headers,
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
  'job.expired': 'job.expired',
  'job.status_changed': 'job.status_changed',
  'job.limit_exceeded': 'job.limit_exceeded',
  'service.created': 'service.created',
  'service.updated': 'service.updated',
  'service.deactivated': 'service.deactivated',
  'service.activated': 'service.activated',
  'evaluator.slashed': 'evaluator.slashed',
  'payment.received': 'payment.received',
  'payment.sent': 'payment.sent',
  'validation.requested': 'validation.requested',
  'validation.completed': 'validation.completed',
  'feedback.received': 'feedback.received',
  'feedback.revoked': 'feedback.revoked',
  'star.received': 'star.received',
  'star.removed': 'star.removed',
  'milestone.enabled': 'milestone.enabled',
  'milestone.added': 'milestone.added',
  'milestone.completed': 'milestone.completed',
  'milestone.released': 'milestone.released',
  'milestone.auto_released': 'milestone.auto_released',
  'arbiter.registered': 'arbiter.registered',
  'arbiter.unregistered': 'arbiter.unregistered',
  'dispute.flagged': 'dispute.flagged',
  'dispute.evidence_submitted': 'dispute.evidence_submitted',
  'dispute.resolved': 'dispute.resolved',
  'dispute.arbiter_slashed': 'dispute.arbiter_slashed',
};

export function getWebhookEventFromNotification(
  notificationAction: string
): WebhookEventType | null {
  return NOTIFICATION_TO_WEBHOOK_MAP[notificationAction] || null;
}
