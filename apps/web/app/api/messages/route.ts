import { NextRequest, NextResponse } from 'next/server';
import {
  getConversations,
  getOrCreateConversation,
  getMessages,
  sendMessage,
  getUnreadCount,
} from '@/lib/db/messages';
import {
  validateMessageContent,
  validateAttachments,
  type ConversationScope,
} from '@/lib/types/chat';
import { rateLimit } from '@/lib/rate-limit';
import { requireAuthenticatedOwner } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuthenticatedOwner(request);
    if ('response' in auth) return auth.response;
    const owner = auth.owner;

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');
    const scope = searchParams.get('scope') as ConversationScope | null;
    const limit = Math.min(Number(searchParams.get('limit') || '50'), 100);

    if (conversationId) {
      const before = searchParams.get('before') ? Number(searchParams.get('before')) : undefined;
      const messages = await getMessages(conversationId, limit, before);
      return NextResponse.json({ messages });
    }

    const conversations = await getConversations(owner, scope || undefined, limit);
    const unread = await getUnreadCount(owner);
    return NextResponse.json({ conversations, unread });
  } catch (error) {
    console.error('Messages GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const rateLimitResult = rateLimit(request, {
      windowMs: 60 * 1000,
      maxRequests: 30,
      message: 'Too many messages. Please try again in a minute.',
    });

    if (!rateLimitResult) {
      return NextResponse.json(
        { error: 'Too many messages. Please try again in a minute.' },
        { status: 429 }
      );
    }

    const auth = await requireAuthenticatedOwner(request);
    if ('response' in auth) return auth.response;
    const owner = auth.owner;

    const body = await request.json();
    const {
      conversationId: existingConvId,
      scope,
      scopeId,
      recipientAddress,
      content,
      attachments = [],
    } = body;

    if (!content && (!attachments || attachments.length === 0)) {
      return NextResponse.json(
        { error: 'Message must have content or attachments' },
        { status: 400 }
      );
    }

    if (content) {
      const contentError = validateMessageContent(content);
      if (contentError) {
        return NextResponse.json({ error: contentError }, { status: 400 });
      }
    }

    if (attachments.length > 0) {
      const attachmentError = validateAttachments(attachments);
      if (attachmentError) {
        return NextResponse.json({ error: attachmentError }, { status: 400 });
      }
    }

    let conversationId = existingConvId;

    if (!conversationId) {
      if (!scope || !scopeId || !recipientAddress) {
        return NextResponse.json(
          { error: 'scope, scopeId, and recipientAddress are required for new conversations' },
          { status: 400 }
        );
      }

      const conv = await getOrCreateConversation({
        scope,
        scopeId,
        participants: [owner, recipientAddress],
        title: `${scope} ${scopeId}`,
      });
      conversationId = conv.id;
    }

    const message = await sendMessage({
      conversationId,
      senderAddress: owner,
      content: content || '',
      attachments,
    });

    return NextResponse.json({ success: true, message }, { status: 201 });
  } catch (error) {
    console.error('Messages POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
