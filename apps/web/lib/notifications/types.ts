export type NotificationType = 'job' | 'service' | 'proposal' | 'payment' | 'system';

export type NotificationAction =
  | 'job.created'
  | 'job.funded'
  | 'job.submitted'
  | 'job.completed'
  | 'job.rejected'
  | 'job.expired'
  | 'job.accepted_bid'
  | 'service.created'
  | 'service.updated'
  | 'service.deactivated'
  | 'proposal.created'
  | 'proposal.evaluation_submitted'
  | 'proposal.decided'
  | 'payment.received'
  | 'payment.sent'
  | 'system.announcement';

export interface Notification {
  id: string;
  type: NotificationType;
  action: NotificationAction;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  link?: string;
  metadata?: Record<string, unknown>;
  persistent?: boolean;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  inApp: boolean;
  types: {
    job: boolean;
    service: boolean;
    proposal: boolean;
    payment: boolean;
    system: boolean;
  };
}

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  job: 'Jobs',
  service: 'Services',
  proposal: 'Proposals',
  payment: 'Payments',
  system: 'System',
};

export const NOTIFICATION_ACTION_LABELS: Record<NotificationAction, string> = {
  'job.created': 'New Job Created',
  'job.funded': 'Job Funded',
  'job.submitted': 'Work Submitted',
  'job.completed': 'Job Completed',
  'job.rejected': 'Job Rejected',
  'job.expired': 'Job Expired',
  'job.accepted_bid': 'Bid Accepted',
  'service.created': 'New Service',
  'service.updated': 'Service Updated',
  'service.deactivated': 'Service Deactivated',
  'proposal.created': 'New Proposal',
  'proposal.evaluation_submitted': 'Evaluation Submitted',
  'proposal.decided': 'Proposal Decided',
  'payment.received': 'Payment Received',
  'payment.sent': 'Payment Sent',
  'system.announcement': 'System Announcement',
};

export const NOTIFICATION_ICONS: Record<NotificationType, string> = {
  job: 'briefcase',
  service: 'service',
  proposal: 'document',
  payment: 'wallet',
  system: 'info',
};
