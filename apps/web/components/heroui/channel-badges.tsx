'use client';

import { type AgentChannels, CHANNEL_BADGE_CONFIG, type ChannelType } from '@/lib/channels/types';

interface ChannelBadgesProps {
  channels: AgentChannels['channels'];
  maxDisplay?: number;
  showLabels?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function ChannelBadges({
  channels,
  maxDisplay = 4,
  showLabels = true,
}: ChannelBadgesProps) {
  const activeChannels = Object.entries(channels).filter(([, value]) =>
    value ? Object.keys(value).length > 0 : false
  );

  if (activeChannels.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {activeChannels.slice(0, maxDisplay).map(([type]) => {
        const config = CHANNEL_BADGE_CONFIG[type as ChannelType];
        const channelData = channels[type as keyof typeof channels];

        if (!channelData) return null;

        const isVerified = (channelData as { verified?: boolean }).verified;

        return (
          <span
            key={type}
            className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded ${
              isVerified
                ? 'bg-purple-100 text-purple-700 border border-purple-300'
                : 'bg-default-100 text-default-600 border border-default-200'
            }`}
          >
            {config.icon} {showLabels && config.label}
          </span>
        );
      })}
      {activeChannels.length > maxDisplay && (
        <span className="inline-flex items-center text-xs px-2 py-0.5 rounded bg-default-200 text-default-600">
          +{activeChannels.length - maxDisplay}
        </span>
      )}
    </div>
  );
}

interface SingleChannelBadgeProps {
  type: ChannelType;
  verified?: boolean;
  available?: boolean;
  size?: 'sm' | 'md' | 'lg';
  clickable?: boolean;
  onClick?: () => void;
}

export function SingleChannelBadge({
  type,
  verified = false,
  available = true,
  clickable = false,
  onClick,
}: SingleChannelBadgeProps) {
  const config = CHANNEL_BADGE_CONFIG[type];

  if (!available) return null;

  const badge = (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded ${
        verified ? 'bg-purple-100 text-purple-700' : 'bg-default-100 text-default-600'
      }`}
    >
      {config.icon} {config.label}
    </span>
  );

  if (clickable && onClick) {
    return (
      <button type="button" onClick={onClick} className="hover:scale-105 transition-transform">
        {badge}
      </button>
    );
  }

  return badge;
}

interface ContactableBadgeProps {
  channels: AgentChannels['channels'];
  onToolsClick?: () => void;
}

export function ContactableBadge({
  channels,
  onToolsClick,
}: ContactableBadgeProps) {
  const hasTools = !!channels.a2a || !!channels.mcp;

  if (!hasTools) return null;

  return (
    <div className="flex gap-2">
      {hasTools && (
        <button
          type="button"
          onClick={onToolsClick}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors text-sm font-medium"
        >
          <span>🔧</span>
          <span>Use Tools</span>
        </button>
      )}
    </div>
  );
}
