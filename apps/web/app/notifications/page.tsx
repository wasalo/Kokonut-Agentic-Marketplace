'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@heroui/react';
import {
  Bell,
  BellOff,
  Briefcase,
  Server,
  FileText,
  Wallet,
  Check,
  Trash2,
  Filter,
  CheckCheck,
} from 'lucide-react';
import { useNotifications } from '@/lib/hooks/useNotifications';
import { NOTIFICATION_TYPE_LABELS, type NotificationType } from '@/lib/notifications';

const TYPE_ICONS = {
  job: Briefcase,
  service: Server,
  proposal: FileText,
  payment: Wallet,
  system: Bell,
};

const FILTER_OPTIONS: { key: 'all' | NotificationType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'job', label: 'Jobs' },
  { key: 'service', label: 'Services' },
  { key: 'proposal', label: 'Proposals' },
  { key: 'payment', label: 'Payments' },
  { key: 'system', label: 'System' },
];

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } else if (diffDays === 1) {
    return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  }
}

function NotificationItem({
  notification,
  onMarkRead,
  onRemove,
}: {
  notification: ReturnType<typeof useNotifications>['notifications'][0];
  onMarkRead: () => void;
  onRemove: () => void;
}) {
  const router = useRouter();
  const Icon = TYPE_ICONS[notification.type];

  const handleClick = () => {
    onMarkRead();
    if (notification.link) {
      router.push(notification.link);
    }
  };

  return (
    <div
      className={`flex items-start gap-4 p-4 hover:bg-default-50 transition-colors cursor-pointer ${
        !notification.read ? 'bg-default-50/50' : ''
      }`}
      onClick={handleClick}
    >
      <div className="flex-shrink-0 mt-0.5">
        <div className="w-10 h-10 rounded-full bg-default-100 flex items-center justify-center">
          <Icon className="w-5 h-5 text-default-600" />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="text-sm font-medium">{notification.title}</h4>
            <p className="text-xs text-default-500 mt-0.5 line-clamp-2">{notification.message}</p>
          </div>
          {!notification.read && (
            <span className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
          )}
        </div>
        <p className="text-xs text-default-400 mt-2">{formatTimestamp(notification.timestamp)}</p>
      </div>

      <div className="flex-shrink-0 flex items-center gap-1">
        {!notification.read && (
          <button
            onClick={e => {
              e.stopPropagation();
              onMarkRead();
            }}
            className="p-2 text-default-400 hover:text-primary hover:bg-default-100 rounded-lg transition-colors"
            title="Mark as read"
          >
            <Check className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={e => {
            e.stopPropagation();
            onRemove();
          }}
          className="p-2 text-default-400 hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
          title="Remove"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function NotificationSkeleton() {
  return (
    <div className="flex items-start gap-4 p-4 animate-pulse">
      <div className="w-10 h-10 rounded-full bg-default-200" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-default-200 rounded w-3/4" />
        <div className="h-3 bg-default-200 rounded w-1/2" />
        <div className="h-3 bg-default-200 rounded w-1/4" />
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, removeNotification, clearAll } =
    useNotifications();

  const [activeFilter, setActiveFilter] = useState<'all' | NotificationType>('all');
  const [isClearing, setIsClearing] = useState(false);

  const filteredNotifications = useMemo(() => {
    if (activeFilter === 'all') return notifications;
    return notifications.filter(n => n.type === activeFilter);
  }, [notifications, activeFilter]);

  const handleClearAll = () => {
    if (
      window.confirm('Are you sure you want to clear all notifications? This cannot be undone.')
    ) {
      setIsClearing(true);
      setTimeout(() => {
        clearAll();
        setIsClearing(false);
      }, 300);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-sm text-default-500 mt-1">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
              : 'All caught up!'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-2 px-4 py-2 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={handleClearAll}
              disabled={isClearing}
              className="flex items-center gap-2 px-4 py-2 text-sm text-danger hover:bg-danger/10 rounded-lg transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              Clear all
            </button>
          )}
        </div>
      </div>

      <Card className="mb-6">
        <div className="flex items-center gap-2 p-2 border-b border-divider overflow-x-auto">
          <Filter className="w-4 h-4 text-default-400 ml-2 flex-shrink-0" />
          {FILTER_OPTIONS.map(option => (
            <button
              key={option.key}
              onClick={() => setActiveFilter(option.key)}
              className={`px-4 py-2 text-sm rounded-lg transition-colors whitespace-nowrap ${
                activeFilter === option.key
                  ? 'bg-primary text-white'
                  : 'text-default-600 hover:bg-default-100'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="divide-y divide-divider">
          {filteredNotifications.length === 0 ? (
            <div className="p-12 text-center">
              <BellOff className="w-12 h-12 text-default-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-default-600 mb-2">
                {activeFilter === 'all'
                  ? 'No notifications yet'
                  : `No ${NOTIFICATION_TYPE_LABELS[activeFilter].toLowerCase()} notifications`}
              </h3>
              <p className="text-sm text-default-400">
                {activeFilter === 'all'
                  ? "You'll see notifications here when there's activity on your jobs, services, and proposals."
                  : `Subscribe to ${NOTIFICATION_TYPE_LABELS[activeFilter].toLowerCase()} updates to see them here.`}
              </p>
            </div>
          ) : (
            filteredNotifications.map(notification => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkRead={() => markAsRead(notification.id)}
                onRemove={() => removeNotification(notification.id)}
              />
            ))
          )}
        </div>
      </Card>

      <div className="text-center text-sm text-default-400">
        <p>Notifications are stored locally and persist across sessions.</p>
      </div>
    </div>
  );
}
