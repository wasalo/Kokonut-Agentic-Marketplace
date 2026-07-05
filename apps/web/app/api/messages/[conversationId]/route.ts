import { NextRequest, NextResponse } from 'next/server';
import {
  getConversationById,
  getMessages,
  markAsRead,
  deleteConversation,
} from '@/lib/db/messages';
import { requireAuthenticatedOwner } from '@/lib/api-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const auth = await requireAuthenticatedOwner(request);
    if ('response' in auth) return auth.response;
    const owner = auth.owner;

    const { conversationId } = await params;
    const conv = await getConversationById(conversationId);

    if (!conv) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    if (!conv.participants.includes(owner.toLowerCase())) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get('limit') || '50'), 100);
    const before = searchParams.get('before') ? Number(searchParams.get('before')) : undefined;

    const messages = await getMessages(conversationId, limit, before);
    await markAsRead(conversationId, owner);

    return NextResponse.json({ conversation: conv, messages });
  } catch (error) {
    console.error('Conversation GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const auth = await requireAuthenticatedOwner(request);
    if ('response' in auth) return auth.response;
    const owner = auth.owner;

    const { conversationId } = await params;
    const conv = await getConversationById(conversationId);

    if (!conv) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    if (!conv.participants.includes(owner.toLowerCase())) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    await deleteConversation(conversationId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Conversation DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
