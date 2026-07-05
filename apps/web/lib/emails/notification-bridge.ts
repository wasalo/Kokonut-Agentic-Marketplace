'use client';

import { useEmailStore } from '@/lib/emails/store';
import type { EmailTemplateType } from '@/lib/emails/types';

export interface NotificationEmailData {
  address: string;
  type: 'payment' | 'job' | 'service' | 'system';
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

const NOTIFICATION_TO_EMAIL_TEMPLATE: Record<string, EmailTemplateType> = {
  'payment.received': 'payment_received',
  'payment.sent': 'payment_received',
  'job.created': 'job_created',
  'job.funded': 'job_created',
  'job.submitted': 'job_created',
  'job.completed': 'job_completed',
  'job.rejected': 'job_created',
  'service.created': 'job_created',
  'service.updated': 'job_created',
  'service.deactivated': 'job_created',

};

export async function sendNotificationEmail(data: NotificationEmailData): Promise<boolean> {
  try {
    const emailStore = useEmailStore.getState();
    const prefs = emailStore.getPreferences(data.address);

    if (!prefs?.enabled || !prefs?.email) {
      return false;
    }

    const action = data.metadata?.action as string;
    const template = action ? NOTIFICATION_TO_EMAIL_TEMPLATE[action] : undefined;

    if (!template) {
      return false;
    }

    const typeKey = data.type as keyof typeof prefs.types;
    if (prefs.types[typeKey] === false) {
      return false;
    }

    if (prefs.frequency !== 'instant') {
      return false;
    }

    const response = await fetch('/api/emails/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: prefs.email,
        template,
        data: {
          title: data.title,
          message: data.message,
          link: data.link,
          metadata: data.metadata,
        },
      }),
    });

    if (!response.ok) {
      console.error('[Email] Failed to send notification email:', await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error('[Email] Error sending notification email:', error);
    return false;
  }
}
