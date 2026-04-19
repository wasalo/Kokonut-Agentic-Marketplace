export type WebhookEventType =
  | 'job.created'
  | 'job.funded'
  | 'job.submitted'
  | 'job.completed'
  | 'job.rejected'
  | 'job.expired'
  | 'job.status_changed'
  | 'job.limit_exceeded'
  | 'service.created'
  | 'service.updated'
  | 'service.deactivated'
  | 'service.activated'
  | 'proposal.created'
  | 'proposal.evaluation_submitted'
  | 'proposal.decided'
  | 'proposal.status_changed'
  | 'evaluator.slashed'
  | 'payment.received'
  | 'payment.sent'
  | 'validation.requested'
  | 'validation.completed'
  | 'feedback.received'
  | 'feedback.revoked'
  | 'star.received'
  | 'star.removed'
  | 'milestone.enabled'
  | 'milestone.added'
  | 'milestone.completed'
  | 'milestone.released'
  | 'milestone.auto_released'
  | 'arbiter.registered'
  | 'arbiter.unregistered'
  | 'dispute.flagged'
  | 'dispute.evidence_submitted'
  | 'dispute.resolved'
  | 'dispute.arbiter_slashed';

export interface WebhookPayload {
  id: string;
  event: WebhookEventType;
  timestamp: number;
  chainId: number;
  data: Record<string, unknown>;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  payload: WebhookPayload;
  attempts: number;
  lastAttempt: number | null;
  status: 'pending' | 'delivered' | 'failed';
  responseStatus: number | null;
  responseBody: string | null;
  createdAt: number;
}

export interface Webhook {
  id: string;
  owner: string;
  url: string;
  events: WebhookEventType[];
  chains?: number[];
  secret: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
  metadata?: Record<string, unknown>;
}

export interface WebhookRegistration {
  url: string;
  events: WebhookEventType[];
  chains?: number[];
  metadata?: Record<string, unknown>;
}

export interface WebhookUpdate {
  url?: string;
  events?: WebhookEventType[];
  chains?: number[];
  isActive?: boolean;
  metadata?: Record<string, unknown>;
}

export const WEBHOOK_EVENT_LABELS: Record<WebhookEventType, string> = {
  'job.created': 'Job Created',
  'job.funded': 'Job Funded',
  'job.submitted': 'Work Submitted',
  'job.completed': 'Job Completed',
  'job.rejected': 'Job Rejected',
  'job.expired': 'Job Expired',
  'job.status_changed': 'Job Status Changed',
  'job.limit_exceeded': 'Job Limit Exceeded',
  'service.created': 'Service Created',
  'service.updated': 'Service Updated',
  'service.deactivated': 'Service Deactivated',
  'service.activated': 'Service Activated',
  'proposal.created': 'Proposal Created',
  'proposal.evaluation_submitted': 'Evaluation Submitted',
  'proposal.decided': 'Proposal Decided',
  'proposal.status_changed': 'Proposal Status Changed',
  'evaluator.slashed': 'Evaluator Slashed',
  'payment.received': 'Payment Received',
  'payment.sent': 'Payment Sent',
  'validation.requested': 'Validation Requested',
  'validation.completed': 'Validation Completed',
  'feedback.received': 'Feedback Received',
  'feedback.revoked': 'Feedback Revoked',
  'star.received': 'Star Received',
  'star.removed': 'Star Removed',
  'milestone.enabled': 'Milestone Enabled',
  'milestone.added': 'Milestone Added',
  'milestone.completed': 'Milestone Completed',
  'milestone.released': 'Milestone Released',
  'milestone.auto_released': 'Milestone Auto-Released',
  'arbiter.registered': 'Arbiter Registered',
  'arbiter.unregistered': 'Arbiter Unregistered',
  'dispute.flagged': 'Dispute Flagged',
  'dispute.evidence_submitted': 'Dispute Evidence Submitted',
  'dispute.resolved': 'Dispute Resolved',
  'dispute.arbiter_slashed': 'Arbiter Slashed',
};

export const MAX_WEBHOOKS_PER_AGENT = 10;
export const MAX_RETRY_ATTEMPTS = 5;
export const RETRY_DELAYS = [0, 60000, 300000, 1800000, 7200000];

export function generateWebhookId(): string {
  return `wh_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

export function generateSecret(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export function signPayload(payload: string, secret: string): string {



  let hash = 0;
  const str = payload + secret;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}
