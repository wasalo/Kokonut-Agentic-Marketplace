import { NextRequest, NextResponse } from 'next/server';
import { getDeliveries, getWebhookById } from '@/lib/db/webhooks';
import { requireAuthenticatedOwner } from '@/lib/api-auth';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const auth = await requireAuthenticatedOwner(request);
    if ('response' in auth) return auth.response;

    const webhook = await getWebhookById(id);

    if (!webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    if (webhook.owner.toLowerCase() !== auth.owner.toLowerCase()) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const deliveries = await getDeliveries(id, 100);

    return NextResponse.json({
      webhook: {
        id: webhook.id,
        url: webhook.url,
        events: webhook.events,
        isActive: webhook.isActive,
        createdAt: webhook.createdAt,
        updatedAt: webhook.updatedAt,
        secret: webhook.secret,
      },
      deliveries: deliveries.slice(0, 100).map(d => ({
        id: d.id,
        status: d.status,
        attempts: d.attempts,
        responseStatus: d.statusCode,
        createdAt: d.createdAt,
        lastAttempt: d.lastAttempt,
      })),
    });
  } catch (error) {
    console.error('Webhook details error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
