export type XMTPEnvironment = 'local' | 'dev' | 'production';

export interface XMTPConfig {
  env: XMTPEnvironment;
  dbPath?: string;
  dbEncryptionKey: string;
}

export interface XMTPMessage {
  id: string;
  senderAddress: string;
  content: string;
  contentType: string;
  timestamp: Date;
  conversationId: string;
}

export interface XMTPConversation {
  id: string;
  peerAddress: string;
  createdAt: Date;
  lastMessage?: XMTPMessage;
}

export interface LiveFeedMessage {
  id: string;
  sender: {
    address: string;
    name?: string;
    verified: boolean;
    role: 'admin' | 'verified-agent' | 'user';
  };
  content: string;
  timestamp: Date;
  pinned: boolean;
  replies: number;
}

export const XMTP_ENV = process.env.XMTP_ENV || 'dev';
export const XMTP_DB_ENCRYPTION_KEY =
  process.env.XMTP_DB_ENCRYPTION_KEY ||
  '0000000000000000000000000000000000000000000000000000000000000000';

export const SUPPORTED_CHAINS = [
  { id: 1, name: 'Ethereum', rpc: process.env.ETHEREUM_RPC },
  { id: 8453, name: 'Base', rpc: process.env.BASE_RPC },
  { id: 42161, name: 'Arbitrum', rpc: process.env.ARBITRUM_RPC },
  { id: 10, name: 'Optimism', rpc: process.env.OPTIMISM_RPC },
  { id: 137, name: 'Polygon', rpc: process.env.POLYGON_RPC },
] as const;

export const LIVE_FEED_GROUP_NAME = 'kokonut-live-feed';
export const LIVE_FEED_GROUP_DESCRIPTION =
  'Kokonut Agent Economy announcements and updates';