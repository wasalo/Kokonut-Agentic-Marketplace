'use client';

import { useState } from 'react';
import {
  Bell,
  CheckCircle,
  Clock,
  XCircle,
  ExternalLink,
  Activity,
  ArrowRight,
  Briefcase,
  Server,
  FileText,
  Wallet,
  BellOff,
  Check,
  X,
} from 'lucide-react';
import { useTransactionRegistry, type TransactionRecord } from '@/lib/stores/transactionRegistry';
import { useConfirmationWatcher } from '@/lib/hooks/useConfirmationWatcher';
import { useNotifications } from '@/lib/hooks/useNotifications';
import { useRouter } from 'next/navigation';

export function UnifiedDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'activity' | 'notifications'>('activity');
  const registry = useTransactionRegistry();
  const { unreadCount, markAllAsRead, notifications } = useNotifications();

  const pendingCount = registry.getPending().length;
  const totalBadge = pendingCount + unreadCount;

  return (
    <>
      <button type="button"
        onClick={() => setIsOpen(true)}
        className="relative p-2 text-default-600 hover:text-foreground hover:bg-content2 rounded-lg transition-colors"
        aria-label={`Activity ${totalBadge > 0 ? `(${totalBadge})` : ''}`}
      >
        <Bell className="size-5" />
        {totalBadge > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-danger text-white text-[10px] font-medium rounded-full flex items-center justify-center">
            {totalBadge > 99 ? '99+' : totalBadge}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-background/60 backdrop-blur-sm z-50"
            onClick={() => setIsOpen(false)}
          />
          {/* Drawer */}
          <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-background border-l border-divider shadow-2xl z-50 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-divider">
              <div className="flex gap-4">
                <button type="button"
                  onClick={() => setActiveTab('activity')}
                  className={`flex items-center gap-2 text-sm font-medium pb-2 border-b-2 transition-colors ${
                    activeTab === 'activity'
                      ? 'border-primary text-foreground'
                      : 'border-transparent text-default-500 hover:text-foreground'
                  }`}
                >
                  <Activity className="size-4" />
                  Activity
                  {pendingCount > 0 && (
                    <span className="bg-warning text-white text-[10px] px-1.5 py-0.5 rounded-full">
                      {pendingCount}
                    </span>
                  )}
                </button>
                <button type="button"
                  onClick={() => setActiveTab('notifications')}
                  className={`flex items-center gap-2 text-sm font-medium pb-2 border-b-2 transition-colors ${
                    activeTab === 'notifications'
                      ? 'border-primary text-foreground'
                      : 'border-transparent text-default-500 hover:text-foreground'
                  }`}
                >
                  <Bell className="size-4" />
                  Notifications
                  {unreadCount > 0 && (
                    <span className="bg-danger text-white text-[10px] px-1.5 py-0.5 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </button>
              </div>
              <button type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 text-default-400 hover:text-foreground transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4">
              {activeTab === 'activity' && <ActivityTab />}
              {activeTab === 'notifications' && (
                <NotificationsTab
                  notifications={notifications}
                  unreadCount={unreadCount}
                  markAllAsRead={markAllAsRead}
                  onClose={() => setIsOpen(false)}
                />
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

function ActivityTab() {
  const registry = useTransactionRegistry();
  const pending = registry.getPending();
  const recent = registry.getRecent(20);

  return (
    <div className="space-y-4">
      {/* Pending Section */}
      {pending.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-amber-400 flex items-center gap-2">
            <Clock className="size-4" />
            Pending
          </h3>
          {pending.map((tx) => (
            <TransactionItem key={tx.id} tx={tx} />
          ))}
        </div>
      )}

      {/* Recent Section */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-default-400">Recent</h3>
        {recent
          .filter((tx) => !pending.find((p) => p.id === tx.id))
          .map((tx) => (
            <TransactionItem key={tx.id} tx={tx} />
          ))}
      </div>

      {recent.length === 0 && (
        <div className="text-center py-8">
          <Activity className="size-8 text-default-300 mx-auto mb-2" />
          <p className="text-sm text-default-500">No activity yet</p>
        </div>
      )}
    </div>
  );
}

function TransactionItem({ tx }: { tx: TransactionRecord }) {
  const { confirmations } = useConfirmationWatcher(
    tx.txHash,
    tx.id
  );

  return (
    <div className="p-3 bg-content2 rounded-lg space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TransactionStatusIcon status={tx.status} />
          <span className="text-sm font-medium">{tx.description}</span>
        </div>
        {tx.etherscanUrl && (
          <a
            href={tx.etherscanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-default-400 hover:text-primary transition-colors"
          >
            <ExternalLink className="size-3" />
          </a>
        )}
      </div>

      {tx.status === 'confirming' && (
        <div className="flex items-center gap-2 text-xs text-default-500">
          <div className="size-24 bg-default-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-400 transition-all"
              style={{ width: `${Math.min((confirmations / 3) * 100, 100)}%` }}
            />
          </div>
          <span>{confirmations}/3 blocks</span>
        </div>
      )}

      {tx.status === 'confirmed' && (
        <div className="flex items-center gap-2 text-xs text-green-400">
          <CheckCircle className="size-3" />
          <span>
            {confirmations >= 6
              ? 'Deep finality (6+ blocks)'
              : `Confirmed (${confirmations} blocks)`}
          </span>
        </div>
      )}

      {tx.error && <p className="text-xs text-red-400">{tx.error}</p>}
    </div>
  );
}

function TransactionStatusIcon({ status }: { status: TransactionRecord['status'] }) {
  switch (status) {
    case 'confirmed':
      return <CheckCircle className="size-4 text-green-400" />;
    case 'failed':
      return <XCircle className="size-4 text-red-400" />;
    case 'pending':
    case 'confirming':
      return <Clock className="size-4 text-amber-400 animate-pulse" />;
    default:
      return <Clock className="size-4 text-default-400" />;
  }
}

interface NotificationsTabProps {
  notifications: Array<{
    id: string;
    title: string;
    message: string;
    type: string;
    read: boolean;
    link?: string;
    timestamp: number;
  }>;
  unreadCount: number;
  markAllAsRead: () => void;
  onClose: () => void;
}

function NotificationsTab({
  notifications,
  unreadCount,
  markAllAsRead,
  onClose,
}: NotificationsTabProps) {
  const router = useRouter();
  const recentNotifications = notifications.slice(0, 10);

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'job':
        return Briefcase;
      case 'service':
        return Server;
      case 'proposal':
        return FileText;
      case 'payment':
        return Wallet;
      default:
        return Bell;
    }
  };

  return (
    <div className="space-y-4">
      {unreadCount > 0 && (
        <div className="flex justify-end">
          <button type="button"
            onClick={markAllAsRead}
            className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
          >
            <Check className="size-3" />
            Mark all read
          </button>
        </div>
      )}

      {recentNotifications.length === 0 ? (
        <div className="text-center py-8">
          <BellOff className="size-8 text-default-300 mx-auto mb-2" />
          <p className="text-sm text-default-500">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {recentNotifications.map((notification) => {
            const Icon = getTypeIcon(notification.type);
            return (
              <button type="button"
                key={notification.id}
                onClick={() => {
                  if (notification.link) {
                    router.push(notification.link);
                    onClose();
                  }
                }}
                className={`w-full p-3 text-left rounded-lg hover:bg-content2 transition-colors ${
                  !notification.read ? 'bg-content2/50 border-l-2 border-primary' : ''
                }`}
              >
                <div className="flex gap-3">
                  <div className="flex-shrink-0">
                    <div className="size-8 rounded-full bg-content2 flex items-center justify-center">
                      <Icon className="size-4 text-default-600" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium truncate">{notification.title}</p>
                      {!notification.read && (
                        <span className="size-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                      )}
                    </div>
                    <p className="text-xs text-default-500 line-clamp-2 mt-0.5">
                      {notification.message}
                    </p>
                    <p className="text-xs text-default-400 mt-1">
                      {formatTime(notification.timestamp)}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {notifications.length > 10 && (
        <button type="button"
          onClick={() => {
            onClose();
            router.push('/notifications');
          }}
          className="w-full py-2 text-sm text-primary hover:text-primary/80 transition-colors flex items-center justify-center gap-1"
        >
          View all notifications
          <ArrowRight className="size-4" />
        </button>
      )}
    </div>
  );
}
