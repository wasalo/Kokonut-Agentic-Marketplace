export type NotificationType = 'job' | 'service' | 'proposal' | 'payment' | 'system';

export type NotificationAction =
  | 'job.created'
  | 'job.funded'
  | 'job.submitted'
  | 'job.completed'
  | 'job.rejected'
  | 'job.expired'
  | 'job.accepted_bid'
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
  | 'system.announcement'
  | 'bidding.session_created'
  | 'bidding.bid_committed'
  | 'bidding.bid_accepted'
  | 'bidding.bid_rejected'
  | 'bidding.stake_claimed'
  | 'bidding.stake_withdrawn'
  | 'bidding.job_created'
  | 'bidding.session_cancelled';

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
  'job.status_changed': 'Status Changed',
  'job.limit_exceeded': 'Limit Exceeded',
  'service.created': 'New Service',
  'service.updated': 'Service Updated',
  'service.deactivated': 'Service Deactivated',
  'service.activated': 'Service Activated',
  'proposal.created': 'New Proposal',
  'proposal.evaluation_submitted': 'Evaluation Submitted',
  'proposal.decided': 'Proposal Decided',
  'proposal.status_changed': 'Status Changed',
  'evaluator.slashed': 'Evaluator Slashed',
  'payment.received': 'Payment Received',
  'payment.sent': 'Payment Sent',
  'system.announcement': 'System Announcement',
  'bidding.session_created': 'Bidding Session Created',
  'bidding.bid_committed': 'Bid Committed',
  'bidding.bid_accepted': 'Bid Accepted',
  'bidding.bid_rejected': 'Bid Rejected',
  'bidding.stake_claimed': 'Stake Claimed',
  'bidding.stake_withdrawn': 'Stake Withdrawn',
  'bidding.job_created': 'Job Created from Bid',
  'bidding.session_cancelled': 'Session Cancelled',
};

export const NOTIFICATION_ICONS: Record<NotificationType, string> = {
  job: 'briefcase',
  service: 'service',
  proposal: 'document',
  payment: 'wallet',
  system: 'info',
};
