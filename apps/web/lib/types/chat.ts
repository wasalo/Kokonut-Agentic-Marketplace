export type ConversationScope = 'job' | 'bidding' | 'service';

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderAddress: string;
  content: string;
  attachments: Attachment[];
  timestamp: number;
  readBy: string[];
}

export interface Conversation {
  id: string;
  scope: ConversationScope;
  scopeId: string;
  participants: string[];
  title: string;
  lastMessage: string;
  lastMessageAt: number;
  unreadBy: Record<string, number>;
  createdAt: number;
}

export interface SendMessageParams {
  conversationId?: string;
  scope: ConversationScope;
  scopeId: string;
  senderAddress: string;
  recipientAddress: string;
  content: string;
  attachments?: Attachment[];
}

export interface MessageListParams {
  conversationId: string;
  limit?: number;
  before?: number;
}

export interface ConversationListParams {
  address: string;
  scope?: ConversationScope;
  limit?: number;
}

const MAX_MESSAGE_CONTENT_LENGTH = 5000;
const MAX_ATTACHMENTS = 5;
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;

export function validateMessageContent(content: string): string | null {
  if (!content.trim()) return 'Message content cannot be empty';
  if (content.length > MAX_MESSAGE_CONTENT_LENGTH) {
    return `Message content exceeds ${MAX_MESSAGE_CONTENT_LENGTH} characters`;
  }
  return null;
}

export function validateAttachments(attachments: Attachment[]): string | null {
  if (attachments.length > MAX_ATTACHMENTS) {
    return `Maximum ${MAX_ATTACHMENTS} attachments allowed`;
  }
  for (const att of attachments) {
    if (att.size > MAX_ATTACHMENT_SIZE) {
      return `Attachment "${att.name}" exceeds 10MB limit`;
    }
  }
  return null;
}

export function createConversationId(scope: ConversationScope, scopeId: string, participants: string[]): string {
  const sorted = [...participants].map(p => p.toLowerCase()).sort();
  return `${scope}:${scopeId}:${sorted.join(':')}`;
}
