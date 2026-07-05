import { NextRequest } from 'next/server';
import { getConversationById } from '@/lib/db/messages';
import { requireAuthenticatedOwner } from '@/lib/api-auth';
import { registerStreamClient, removeStreamClient } from '@/lib/sse-clients';

export async function GET(request: NextRequest) {
  const auth = await requireAuthenticatedOwner(request);
  if ('response' in auth) return auth.response;
  const owner = auth.owner;

  const { searchParams } = new URL(request.url);
  const conversationId = searchParams.get('conversationId');

  if (!conversationId) {
    return new Response('conversationId required', { status: 400 });
  }

  const conv = await getConversationById(conversationId);
  if (!conv || !conv.participants.includes(owner.toLowerCase())) {
    return new Response('Access denied', { status: 403 });
  }

  const stream = new ReadableStream({
    start(controller) {
      registerStreamClient(conversationId, controller);
      controller.enqueue(`data: ${JSON.stringify({ type: 'connected', conversationId })}\n\n`);
    },
    cancel() {
      removeStreamClient(conversationId);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
