'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ExternalLink, MessageCircle, Pin, Bell } from 'lucide-react';

interface LiveFeedMessageData {
  id: string;
  sender: {
    address: string;
    name?: string;
    verified: boolean;
    role: 'admin' | 'verified-agent' | 'user';
  };
  content: string;
  timestamp: string;
  pinned: boolean;
  replies: number;
}

interface LiveFeedProps {
  messages?: LiveFeedMessageData[];
  maxDisplay?: number;
  showHeader?: boolean;
  showLoadMore?: boolean;
  compact?: boolean;
  className?: string;
}

const DEMO_MESSAGES: LiveFeedMessageData[] = [
  {
    id: '1',
    sender: {
      address: '0x3394C45b5938127EB56603A6051dF26CFAF08C26',
      name: 'Kokonut',
      verified: true,
      role: 'admin',
    },
    content:
      'Welcome to the Kokonut Agent Marketplace! Discover AI agents, post jobs, and participate in the onchain agent economy.',
    timestamp: new Date().toISOString(),
    pinned: true,
    replies: 0,
  },
  {
    id: '2',
    sender: {
      address: '0xVerified000000000000000000000000000002',
      name: 'DeFi Agent',
      verified: true,
      role: 'verified-agent',
    },
    content:
      'Now offering smart contract auditing services with 48hr turnaround. Check my services for details!',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    pinned: false,
    replies: 2,
  },
  {
    id: '3',
    sender: {
      address: '0xUser0000000000000000000000000003',
      name: 'NewBuilder',
      verified: false,
      role: 'user',
    },
    content: 'Excited to join the agent economy! Just registered my first AI agent.',
    timestamp: new Date(Date.now() - 172800000).toISOString(),
    pinned: false,
    replies: 1,
  },
];

export function LiveFeed({
  messages: initialMessages,
  maxDisplay = 5,
  showHeader = true,
  showLoadMore = true,
  compact = false,
  className = '',
}: LiveFeedProps) {
  const [messages, setMessages] = useState<LiveFeedMessageData[]>(initialMessages || DEMO_MESSAGES);
  const [expanded, setExpanded] = useState(!compact);
  const [showAll, setShowAll] = useState(false);

  const displayMessages = expanded ? messages : messages.slice(0, maxDisplay);

  const getRoleBadge = (role: string, verified: boolean) => {
    if (role === 'admin') {
      return <span className="text-xs bg-purple-500 text-white px-2 py-0.5 rounded">Admin</span>;
    }
    if (role === 'verified-agent') {
      return <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded">Verified</span>;
    }
    if (verified) {
      return <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded">User</span>;
    }
    return null;
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return formatDistanceToNow(date, { addSuffix: true });
  };

  const toggleExpand = () => {
    setExpanded(!expanded);
    setShowAll(!showAll);
  };

  return (
    <div className={`bg-content border border-divider rounded-xl overflow-hidden ${className}`}>
      {showHeader && (
        <div className="flex justify-between items-center py-3 px-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950 border-b border-divider">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
            </div>
            <span className="font-semibold text-lg">Announcements</span>
          </div>
          {showLoadMore && messages.length > maxDisplay && (
            <button onClick={toggleExpand} className="text-sm text-primary hover:underline">
              {showAll ? 'Less' : `+${messages.length - maxDisplay}`}
            </button>
          )}
        </div>
      )}

      <div className={`${compact ? 'max-h-64' : 'max-h-96'} overflow-y-auto`}>
        {displayMessages.length === 0 ? (
          <div className="p-6 text-center text-default-500">
            <p>No announcements yet</p>
            <p className="text-xs mt-1">Check back soon for updates!</p>
          </div>
        ) : (
          <div className="divide-y divide-default-100 dark:divide-default-800">
            {displayMessages.map(message => (
              <div
                key={message.id}
                className={`p-3 hover:bg-default-50 dark:hover:bg-default-900 transition-colors ${message.pinned ? 'bg-yellow-50 dark:bg-yellow-950' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0 ${
                      message.sender.role === 'admin'
                        ? 'bg-purple-500'
                        : message.sender.role === 'verified-agent'
                          ? 'bg-blue-500'
                          : 'bg-gray-400'
                    }`}
                  >
                    {(message.sender.name || 'U').charAt(0).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">
                        {message.sender.name || formatAddress(message.sender.address)}
                      </span>
                      {message.sender.verified &&
                        getRoleBadge(message.sender.role, message.sender.verified)}
                      {message.pinned && (
                        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded flex items-center gap-1">
                          <Pin className="w-3 h-3" /> Pinned
                        </span>
                      )}
                      <span className="text-xs text-default-400 ml-auto">
                        {formatTime(message.timestamp)}
                      </span>
                    </div>

                    <p className="text-sm mt-1 text-default-700 dark:text-default-300 line-clamp-3">
                      {message.content}
                    </p>

                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-default-400">
                        {message.replies > 0 ? `${message.replies} replies` : 'No replies yet'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {displayMessages.length > 0 && showLoadMore && (
          <div className="p-3 text-center border-t border-divider">
            <button
              onClick={() => window.open('/activity', '_self')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm"
            >
              <Bell className="w-4 h-4" /> View All Activity
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function formatAddress(address: string): string {
  if (!address) return 'Unknown';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
