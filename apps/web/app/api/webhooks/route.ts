import { NextRequest, NextResponse } from 'next/server';
import { useWebhookStore, type WebhookRegistration, type WebhookEventType } from '@/lib/webhooks';
import { z } from 'zod';

const registrationSchema = z.object({
  url: z.string().url().max(500),
  events: z.array(z.string()).min(1).max(20),
  metadata: z.record(z.unknown()).optional(),
});

const VALID_EVENTS: WebhookEventType[] = [
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

    const validation = registrationSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { url, events, metadata } = validation.data;

    const invalidEvents = events.filter(e => !VALID_EVENTS.includes(e as WebhookEventType));
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

    if (!url.startsWith('https://')) {
      return NextResponse.json({ error: 'Webhook URL must use HTTPS' }, { status: 400 });
    }

    const webhook = useWebhookStore.getState().registerWebhook(owner, {
      url,
      events: events as WebhookEventType[],
      metadata,
    });

    if (!webhook) {
      return NextResponse.json(
        { error: 'Maximum webhooks reached (10 per agent)' },
        { status: 429 }
      );
    }

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

    const webhooks = useWebhookStore.getState().getWebhooksByOwner(owner);

    return NextResponse.json({
      webhooks: webhooks.map(w => ({
        id: w.id,
        url: w.url,
        events: w.events,
        isActive: w.isActive,
        createdAt: w.createdAt,
        updatedAt: w.updatedAt,
        metadata: w.metadata,
      })),
    });
  } catch (error) {
    console.error('Webhook listing error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
