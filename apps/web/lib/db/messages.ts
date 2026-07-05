import crypto from 'crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';
import type {
  Message,
  Conversation,
  Attachment,
  ConversationScope,
} from '@/lib/types/chat';

const DATA_DIR = path.join(process.cwd(), 'data');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');
const CONVERSATIONS_FILE = path.join(DATA_DIR, 'conversations.json');

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readMessages(): Message[] {
  ensureDataDir();
  if (!existsSync(MESSAGES_FILE)) return [];
  try {
    return JSON.parse(readFileSync(MESSAGES_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function writeMessages(messages: Message[]): void {
  ensureDataDir();
  writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2));
}

function readConversations(): Conversation[] {
  ensureDataDir();
  if (!existsSync(CONVERSATIONS_FILE)) return [];
  try {
    return JSON.parse(readFileSync(CONVERSATIONS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function writeConversations(conversations: Conversation[]): void {
  ensureDataDir();
  writeFileSync(CONVERSATIONS_FILE, JSON.stringify(conversations, null, 2));
}

export function createConversationId(
  scope: ConversationScope,
  scopeId: string,
  participants: string[]
): string {
  const sorted = [...participants].map(p => p.toLowerCase()).sort();
  return `${scope}:${scopeId}:${sorted.join(':')}`;
}

export async function getOrCreateConversation(params: {
  scope: ConversationScope;
  scopeId: string;
  participants: string[];
  title: string;
}): Promise<Conversation> {
  const conversations = readConversations();
  const id = createConversationId(params.scope, params.scopeId, params.participants);
  const existing = conversations.find(c => c.id === id);

  if (existing) return existing;

  const conversation: Conversation = {
    id,
    scope: params.scope,
    scopeId: params.scopeId,
    participants: params.participants.map(p => p.toLowerCase()),
    title: params.title,
    lastMessage: '',
    lastMessageAt: Date.now(),
    unreadBy: Object.fromEntries(params.participants.map(p => [p.toLowerCase(), 0])),
    createdAt: Date.now(),
  };

  conversations.push(conversation);
  writeConversations(conversations);
  return conversation;
}

export async function getConversations(
  address: string,
  scope?: ConversationScope,
  limit = 50
): Promise<Conversation[]> {
  const conversations = readConversations();
  const addr = address.toLowerCase();
  let filtered = conversations.filter(c => c.participants.includes(addr));
  if (scope) filtered = filtered.filter(c => c.scope === scope);
  return filtered
    .sort((a, b) => b.lastMessageAt - a.lastMessageAt)
    .slice(0, limit);
}

export async function getConversationById(id: string): Promise<Conversation | null> {
  const conversations = readConversations();
  return conversations.find(c => c.id === id) || null;
}

export async function sendMessage(params: {
  conversationId: string;
  senderAddress: string;
  content: string;
  attachments?: Attachment[];
}): Promise<Message> {
  const messages = readMessages();
  const conversations = readConversations();
  const convIndex = conversations.findIndex(c => c.id === params.conversationId);

  if (convIndex === -1) throw new Error('Conversation not found');

  const message: Message = {
    id: crypto.randomBytes(16).toString('hex'),
    conversationId: params.conversationId,
    senderAddress: params.senderAddress.toLowerCase(),
    content: params.content,
    attachments: params.attachments || [],
    timestamp: Date.now(),
    readBy: [params.senderAddress.toLowerCase()],
  };

  messages.push(message);
  writeMessages(messages);

  const conv = conversations[convIndex];
  conv.lastMessage = params.content.slice(0, 200);
  conv.lastMessageAt = message.timestamp;
  for (const p of conv.participants) {
    if (p !== params.senderAddress.toLowerCase()) {
      conv.unreadBy[p] = (conv.unreadBy[p] || 0) + 1;
    }
  }
  writeConversations(conversations);

  return message;
}

export async function getMessages(
  conversationId: string,
  limit = 50,
  before?: number
): Promise<Message[]> {
  const messages = readMessages();
  let filtered = messages.filter(m => m.conversationId === conversationId);
  if (before) filtered = filtered.filter(m => m.timestamp < before);
  return filtered
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
}

export async function getMessageById(id: string): Promise<Message | null> {
  const messages = readMessages();
  return messages.find(m => m.id === id) || null;
}

export async function markAsRead(conversationId: string, address: string): Promise<number> {
  const messages = readMessages();
  const addr = address.toLowerCase();
  let updated = 0;

  for (const msg of messages) {
    if (msg.conversationId === conversationId && !msg.readBy.includes(addr)) {
      msg.readBy.push(addr);
      updated++;
    }
  }

  if (updated > 0) writeMessages(messages);

  const conversations = readConversations();
  const conv = conversations.find(c => c.id === conversationId);
  if (conv && conv.unreadBy[addr]) {
    conv.unreadBy[addr] = 0;
    writeConversations(conversations);
  }

  return updated;
}

export async function getUnreadCount(address: string): Promise<number> {
  const conversations = readConversations();
  const addr = address.toLowerCase();
  return conversations.reduce((sum, c) => sum + (c.unreadBy[addr] || 0), 0);
}

export async function getUnreadCountByScope(
  address: string,
  scope: ConversationScope
): Promise<number> {
  const conversations = readConversations();
  const addr = address.toLowerCase();
  return conversations
    .filter(c => c.scope === scope)
    .reduce((sum, c) => sum + (c.unreadBy[addr] || 0), 0);
}

export async function deleteConversation(id: string): Promise<boolean> {
  const conversations = readConversations();
  const index = conversations.findIndex(c => c.id === id);
  if (index === -1) return false;

  conversations.splice(index, 1);
  writeConversations(conversations);

  const messages = readMessages();
  const filtered = messages.filter(m => m.conversationId !== id);
  writeMessages(filtered);

  return true;
}
