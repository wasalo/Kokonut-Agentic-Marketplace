import { NextRequest, NextResponse } from 'next/server';
import { markAsRead } from '@/lib/db/messages';
import { requireAuthenticatedOwner } from '@/lib/api-auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuthenticatedOwner(request);
    if ('response' in auth) return auth.response;
    const owner = auth.owner;

    const { id: conversationId } = await params;
    const updated = await markAsRead(conversationId, owner);

    return NextResponse.json({ success: true, updated });
  } catch (error) {
    console.error('Mark as read error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
