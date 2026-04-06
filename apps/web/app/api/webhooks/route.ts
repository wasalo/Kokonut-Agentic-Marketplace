import { NextRequest, NextResponse } from 'next/server';
import { createWebhook, getWebhooks, getDeliveries } from '@/lib/db/webhooks';

const VALID_EVENTS = [
  'job.created',
  'job.funded',
  'job.submitted',
  'job.completed',
  'job.rejected',
  'job.expired',
  'service.created',
  'service.updated',
  'service.deactivated',
  'proposal.created',
  'proposal.evaluation_submitted',
  'proposal.decided',
  'payment.received',
  'payment.sent',
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, events, metadata } = body;

    if (!url || !url.startsWith('https://')) {
      return NextResponse.json({ error: 'Webhook URL must use HTTPS' }, { status: 400 });
    }

    if (!events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ error: 'At least one event is required' }, { status: 400 });
    }

    const invalidEvents = events.filter((e: string) => !VALID_EVENTS.includes(e));
    if (invalidEvents.length > 0) {
      return NextResponse.json({ error: 'Invalid event types', invalidEvents }, { status: 400 });
    }

    const owner = request.headers.get('x-owner-address');
    if (!owner) {
      return NextResponse.json(
        { error: 'Owner address required in x-owner-address header' },
        { status: 401 }
      );
    }

    const webhook = await createWebhook({
      owner,
      url,
      events,
      metadata: metadata ? JSON.stringify(metadata) : undefined,
    });

    return NextResponse.json({
      success: true,
      webhook: {
        id: webhook.id,
        url: webhook.url,
        events: webhook.events,
        secret: webhook.secret,
        isActive: webhook.isActive,
        createdAt: webhook.createdAt,
      },
    });
  } catch (error) {
    console.error('Webhook registration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const owner = request.headers.get('x-owner-address');
    if (!owner) {
      return NextResponse.json(
        { error: 'Owner address required in x-owner-address header' },
        { status: 401 }
      );
    }

    const webhooks = await getWebhooks(owner);

    const webhooksWithDeliveries = await Promise.all(
      webhooks.map(async w => {
        const deliveries = await getDeliveries(w.id, 5);
        return {
          id: w.id,
          url: w.url,
          events: w.events,
          isActive: w.isActive,
          createdAt: w.createdAt,
          updatedAt: w.updatedAt,
          recentDeliveries: deliveries,
        };
      })
    );

    return NextResponse.json({ webhooks: webhooksWithDeliveries });
  } catch (error) {
    console.error('Webhook listing error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
