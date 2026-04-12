'use client';

import { useCallback, useMemo } from 'react';
import {
  useNotificationStore,
  type Notification,
  type NotificationType,
  type NotificationAction,
} from '@/lib/notifications';
import { formatAddress } from '@/lib/utils';

export function useNotifications() {
  const {
    notifications,
    unreadCount,
    preferences,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    updatePreferences,
    cleanupOldNotifications,
  } = useNotificationStore();

  const getNotificationsByType = useCallback(
    (type: NotificationType) => {
      return notifications.filter(n => n.type === type);
    },
    [notifications]
  );

  const getUnreadByType = useCallback(
    (type: NotificationType) => {
      return notifications.filter(n => n.type === type && !n.read);
    },
    [notifications]
  );

  const recentNotifications = useMemo(() => {
    return notifications.slice(0, 20);
  }, [notifications]);

  return {
    notifications,
    unreadCount,
    preferences,
    recentNotifications,
    getNotificationsByType,
    getUnreadByType,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    updatePreferences,
    cleanupOldNotifications,
  };
}

export function useNotificationActions() {
  const addNotification = useNotificationStore(state => state.addNotification);

  const notify = useCallback(
    (params: {
      type: NotificationType;
      action: NotificationAction;
      title: string;
      message: string;
      link?: string;
      metadata?: Record<string, unknown>;
      persistent?: boolean;
    }) => {
      addNotification(params);
    },
    [addNotification]
  );

  const notifyJobCreated = useCallback(
    (jobId: bigint, client: string) => {
      notify({
        type: 'job',
        action: 'job.created',
        title: 'New Job Available',
        message: `A new job has been created${client ? ` by ${formatAddress(client)}` : ''}`,
        link: `/jobs/${jobId}`,
        metadata: { jobId: jobId.toString() },
      });
    },
    [notify]
  );

  const notifyJobFunded = useCallback(
    (jobId: bigint, amount: bigint) => {
      notify({
        type: 'job',
        action: 'job.funded',
        title: 'Job Funded',
        message: `Job #${jobId} has been funded with ${Number(amount) / 1e6} USDC`,
        link: `/jobs/${jobId}`,
        metadata: { jobId: jobId.toString(), amount: amount.toString() },
      });
    },
    [notify]
  );

  const notifyJobSubmitted = useCallback(
    (jobId: bigint, provider: string) => {
      notify({
        type: 'job',
        action: 'job.submitted',
        title: 'Work Submitted',
        message: `Provider has submitted work for job #${jobId}`,
        link: `/jobs/${jobId}`,
        metadata: { jobId: jobId.toString(), provider },
      });
    },
    [notify]
  );

  const notifyPaymentReceived = useCallback(
    (jobId: bigint, amount: bigint) => {
      notify({
        type: 'payment',
        action: 'payment.received',
        title: 'Payment Received',
        message: `You received ${Number(amount) / 1e6} USDC for job #${jobId}`,
        link: `/jobs/${jobId}`,
        metadata: { jobId: jobId.toString(), amount: amount.toString() },
        persistent: true,
      });
    },
    [notify]
  );

  const notifyServiceCreated = useCallback(
    (serviceId: bigint, name: string) => {
      notify({
        type: 'service',
        action: 'service.created',
        title: 'Service Listed',
        message: `Your service "${name}" is now live`,
        link: `/marketplace/${serviceId}`,
        metadata: { serviceId: serviceId.toString() },
      });
    },
    [notify]
  );

  const notifyProposalCreated = useCallback(
    (proposalId: bigint, title: string) => {
      notify({
        type: 'proposal',
        action: 'proposal.created',
        title: 'New Proposal',
        message: `Proposal "${title}" is awaiting evaluators`,
        link: `/review/${proposalId}`,
        metadata: { proposalId: proposalId.toString() },
      });
    },
    [notify]
  );

  return {
    notify,
    notifyJobCreated,
    notifyJobFunded,
    notifyJobSubmitted,
    notifyPaymentReceived,
    notifyServiceCreated,
    notifyProposalCreated,
  };
}
