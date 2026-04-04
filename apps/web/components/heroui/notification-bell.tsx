'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, BellOff, Briefcase, Server, FileText, Wallet, Check } from 'lucide-react';
import { useNotifications } from '@/lib/hooks/useNotifications';

export function NotificationBell() {
  const router = useRouter();
  const { unreadCount, markAllAsRead, notifications } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = (notification: (typeof notifications)[0]) => {
    if (notification.link) {
      router.push(notification.link);
      setIsOpen(false);
    }
  };

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

  const recentNotifications = notifications.slice(0, 5);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-default-600 hover:text-foreground hover:bg-content2 rounded-lg transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-danger text-white text-[10px] font-medium rounded-full flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-content1 border border-divider rounded-lg shadow-lg overflow-hidden z-50">
          <div className="p-3 border-b border-divider flex items-center justify-between">
            <h3 className="font-semibold text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
              >
                <Check className="w-3 h-3" />
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            {recentNotifications.length === 0 ? (
              <div className="p-6 text-center">
                <BellOff className="w-8 h-8 text-default-300 mx-auto mb-2" />
                <p className="text-sm text-default-500">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-divider">
                {recentNotifications.map(notification => {
                  const Icon = getTypeIcon(notification.type);
                  return (
                    <button
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`w-full p-3 text-left hover:bg-default-100 transition-colors ${
                        !notification.read ? 'bg-default-50' : ''
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          <div className="w-8 h-8 rounded-full bg-default-100 flex items-center justify-center">
                            <Icon className="w-4 h-4 text-default-600" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium truncate">{notification.title}</p>
                            {!notification.read && (
                              <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
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
          </div>
          {notifications.length > 5 && (
            <div className="p-3 border-t border-divider">
              <button
                onClick={() => {
                  setIsOpen(false);
                  router.push('/notifications');
                }}
                className="w-full py-2 text-sm text-primary hover:text-primary/80 transition-colors"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
