import type { LiveFeedMessage } from './types';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const LIVE_FEED_FILE = path.join(process.cwd(), 'data', 'live-feed.json');

let initialized = true;

export async function initXMTPClient(): Promise<boolean> {
  initialized = true;
  return true;
}

export function isInitialized(): boolean {
  return initialized;
}

async function ensureDataDir(): Promise<void> {
  const dir = path.dirname(LIVE_FEED_FILE);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

async function readLiveFeedData(): Promise<LiveFeedMessage[]> {
  try {
    await ensureDataDir();
    const data = await readFile(LIVE_FEED_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeLiveFeedData(messages: LiveFeedMessage[]): Promise<void> {
  await ensureDataDir();
  await writeFile(LIVE_FEED_FILE, JSON.stringify(messages, null, 2));
}

export async function getLiveFeedMessages(limit = 20): Promise<LiveFeedMessage[]> {
  const messages = await readLiveFeedData();
  return messages
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}

export async function postLiveFeedMessage(
  sender: LiveFeedMessage['sender'],
  content: string,
  pinned = false
): Promise<LiveFeedMessage | null> {
  try {
    const messages = await readLiveFeedData();
    
    const newMessage: LiveFeedMessage = {
      id: `lf_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      sender,
      content,
      timestamp: new Date(),
      pinned,
      replies: 0,
    };

    messages.unshift(newMessage);
    
    const maxMessages = 100;
    if (messages.length > maxMessages) {
      messages.length = maxMessages;
    }

    await writeLiveFeedData(messages);
    return newMessage;
  } catch (error) {
    console.error('Error posting live feed message:', error);
    return null;
  }
}

export async function isAdminAddress(address: string): Promise<boolean> {
  const adminAddresses = (process.env.XMTP_ADMIN_ADDRESSES || '').split(',').map(a => a.toLowerCase().trim()).filter(Boolean);
  return adminAddresses.includes(address.toLowerCase());
}

export function getBotAddress(): string | undefined {
  return undefined;
}

export async function closeXMTPClient(): Promise<void> {
  initialized = false;
}

// Stub exports for compatibility
export const getConversations = async () => [];
export const getOrCreateConversation = async (_peerAddress: string) => null;
export const sendMessage = async (_conversationId: string, _content: string) => null;
export const getMessages = async (_conversationId: string, _limit = 50) => [];
export const streamMessages = async (_conversationId: string, _callback: (message: any) => void) => () => {};