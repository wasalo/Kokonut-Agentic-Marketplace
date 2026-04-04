export type EmailTemplateType =
  | 'payment_received'
  | 'job_created'
  | 'job_completed'
  | 'proposal_created'
  | 'weekly_digest'
  | 'welcome'
  | 'password_reset';

export interface EmailRecipient {
  email: string;
  name?: string;
  address?: string;
}

export interface EmailData {
  recipient: EmailRecipient;
  template: EmailTemplateType;
  variables: Record<string, string | number>;
}

export interface EmailPreferences {
  email: string;
  enabled: boolean;
  types: {
    payment: boolean;
    job: boolean;
    proposal: boolean;
    weekly_digest: boolean;
    marketing: boolean;
  };
  frequency: 'instant' | 'daily' | 'weekly';
}

export interface EmailDelivery {
  id: string;
  to: string;
  template: EmailTemplateType;
  status: 'pending' | 'sent' | 'failed';
  sentAt: number | null;
  error: string | null;
}

export const EMAIL_FROM = {
  name: 'Kokonut Network',
  address: 'noreply@kokonut.network',
};

export const EMAIL_TEMPLATES = {
  payment_received: {
    subject: '💰 Payment Received on Kokonut',
    description: 'Notifies when you receive a payment',
  },
  job_created: {
    subject: '📋 New Job Created',
    description: 'Notifies when a job is created',
  },
  job_completed: {
    subject: '✅ Job Completed',
    description: 'Notifies when a job is marked complete',
  },
  proposal_created: {
    subject: '📝 New Proposal',
    description: 'Notifies when a proposal is created',
  },
  weekly_digest: {
    subject: '📊 Your Weekly Kokonut Digest',
    description: 'Weekly summary of platform activity',
  },
  welcome: {
    subject: 'Welcome to Kokonut Network',
    description: 'Welcome email for new users',
  },
  password_reset: {
    subject: 'Reset Your Kokonut Password',
    description: 'Password reset email',
  },
} as const;
