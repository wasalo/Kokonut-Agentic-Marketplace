export type ChannelType =
  | 'xmtp'
  | 'a2a'
  | 'mcp'
  | 'email'
  | 'webhook';

export type ChannelStatus = 'available' | 'unavailable';

export interface ChannelInfo {
  type: ChannelType;
  status: ChannelStatus;
  address?: string;
  verified: boolean;
  description?: string;
}

export interface AgentChannels {
  agentId: bigint;
  channels: {
    xmtp?: {
      inboxId: string;
      address: string;
      verified: boolean;
    };
    a2a?: {
      endpoint: string;
      verified: boolean;
    };
    mcp?: {
      serverUrl: string;
      verified: boolean;
    };
    email?: {
      address: string;
      verified: boolean;
    };
    webhook?: {
      url: string;
      events: string[];
      verified: boolean;
    };
  };
}

export const CHANNEL_BADGE_CONFIG: Record<
  ChannelType,
  { label: string; icon: string; color: string; bgColor: string }
> = {
  xmtp: {
    label: 'XMTP',
    icon: '💬',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
  a2a: {
    label: 'A2A',
    icon: '🤖',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  mcp: {
    label: 'MCP',
    icon: '🔧',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
  },
  email: {
    label: 'Email',
    icon: '📧',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
  },
  webhook: {
    label: 'Webhook',
    icon: '🔗',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
};

export function getChannelBadges(
  channels: AgentChannels['channels']
): { type: ChannelType; available: boolean; verified: boolean }[] {
  const badges: { type: ChannelType; available: boolean; verified: boolean }[] = [];

  if (channels.xmtp) {
    badges.push({
      type: 'xmtp',
      available: true,
      verified: channels.xmtp.verified,
    });
  }

  if (channels.a2a) {
    badges.push({
      type: 'a2a',
      available: true,
      verified: channels.a2a.verified,
    });
  }

  if (channels.mcp) {
    badges.push({
      type: 'mcp',
      available: true,
      verified: channels.mcp.verified,
    });
  }

  if (channels.email) {
    badges.push({
      type: 'email',
      available: true,
      verified: channels.email.verified,
    });
  }

  if (channels.webhook) {
    badges.push({
      type: 'webhook',
      available: true,
      verified: channels.webhook.verified,
    });
  }

  return badges;
}

export function canMessageAgent(channels: AgentChannels['channels']): boolean {
  return !!channels.xmtp;
}

export function canUseAgentTools(channels: AgentChannels['channels']): {
  a2a: boolean;
  mcp: boolean;
} {
  return {
    a2a: !!channels.a2a,
    mcp: !!channels.mcp,
  };
}

export function getPrimaryContactMethod(
  channels: AgentChannels['channels']
): ChannelType | null {
  if (channels.xmtp) return 'xmtp';
  if (channels.a2a) return 'a2a';
  if (channels.mcp) return 'mcp';
  if (channels.email) return 'email';
  if (channels.webhook) return 'webhook';
  return null;
}