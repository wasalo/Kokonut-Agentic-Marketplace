import { NextRequest, NextResponse } from 'next/server';
import { useWebhookStore, type WebhookUpdate } from '@/lib/webhooks';
import { z } from 'zod';

const updateSchema = z.object({
  url: z.string().url().max(500).optional(),
  events: z.array(z.string()).min(1).max(20).optional(),
  isActive: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
});

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

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const validation = updateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.errors },
        { status: 400 }
      );
    }

    const owner = request.headers.get('x-owner-address');
    if (!owner) {
      return NextResponse.json(
        { error: 'Owner address required in x-owner-address header' },
        { status: 401 }
      );
    }

    const { url, events, isActive, metadata } = validation.data;

    if (url && !url.startsWith('https://')) {
      return NextResponse.json({ error: 'Webhook URL must use HTTPS' }, { status: 400 });
    }

    if (events) {
      const invalidEvents = events.filter(e => !VALID_EVENTS.includes(e));
      if (invalidEvents.length > 0) {
        return NextResponse.json({ error: 'Invalid event types', invalidEvents }, { status: 400 });
      }
    }

    const update: WebhookUpdate = {};
    if (url !== undefined) update.url = url;
    if (events !== undefined) update.events = events as any;
    if (isActive !== undefined) update.isActive = isActive;
    if (metadata !== undefined) update.metadata = metadata;

    const success = useWebhookStore.getState().updateWebhook(id, owner, update);

    if (!success) {
      return NextResponse.json({ error: 'Webhook not found or not authorized' }, { status: 404 });
    }

    const webhook = useWebhookStore.getState().getWebhook(id);

    return NextResponse.json({
      success: true,
      webhook: {
        id: webhook!.id,
        url: webhook!.url,
        events: webhook!.events,
        isActive: webhook!.isActive,
        updatedAt: webhook!.updatedAt,
      },
    });
  } catch (error) {
    console.error('Webhook update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const owner = request.headers.get('x-owner-address');
    if (!owner) {
      return NextResponse.json(
        { error: 'Owner address required in x-owner-address header' },
        { status: 401 }
      );
    }

    const success = useWebhookStore.getState().deleteWebhook(id, owner);

    if (!success) {
      return NextResponse.json({ error: 'Webhook not found or not authorized' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook deletion error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
