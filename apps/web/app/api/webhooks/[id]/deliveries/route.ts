import { NextRequest, NextResponse } from 'next/server';
import { useWebhookStore } from '@/lib/webhooks';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const owner = request.headers.get('x-owner-address');
    if (!owner) {
      return NextResponse.json(
        { error: 'Owner address required in x-owner-address header' },
        { status: 401 }
      );
    }

    const webhook = useWebhookStore.getState().getWebhook(id);

    if (!webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    if (webhook.owner.toLowerCase() !== owner.toLowerCase()) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const deliveries = useWebhookStore.getState().getDeliveriesForWebhook(id);

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
        responseStatus: d.responseStatus,
        createdAt: d.createdAt,
        lastAttempt: d.lastAttempt,
      })),
    });
  } catch (error) {
    console.error('Webhook details error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
