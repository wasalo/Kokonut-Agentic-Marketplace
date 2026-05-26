import { NextRequest, NextResponse } from 'next/server';
import { deleteWebhook, getWebhookById, updateWebhook } from '@/lib/db/webhooks';
import { requireAuthenticatedOwner } from '@/lib/api-auth';
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

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await requireAuthenticatedOwner(request);
    if ('response' in auth) return auth.response;

    const webhook = await getWebhookById(id);

    if (!webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    if (auth.owner.toLowerCase() !== webhook.owner.toLowerCase()) {
      return NextResponse.json(
        { error: 'Webhook not found or not authorized' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: webhook.id,
      url: webhook.url,
      events: webhook.events,
      isActive: webhook.isActive,
      createdAt: webhook.createdAt,
      updatedAt: webhook.updatedAt,
    });
  } catch (error) {
    console.error('Webhook GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const auth = await requireAuthenticatedOwner(request);
    if ('response' in auth) return auth.response;

    const validation = updateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.errors },
        { status: 400 }
      );
    }

    const existing = await getWebhookById(id);
    if (!existing || existing.owner.toLowerCase() !== auth.owner.toLowerCase()) {
      return NextResponse.json({ error: 'Webhook not found or not authorized' }, { status: 404 });
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

    const update: Parameters<typeof updateWebhook>[1] = {};
    if (url !== undefined) update.url = url;
    if (events !== undefined) update.events = events;
    if (isActive !== undefined) update.isActive = isActive;
    if (metadata !== undefined) update.metadata = JSON.stringify(metadata);

    const webhook = await updateWebhook(id, update);

    if (!webhook) {
      return NextResponse.json({ error: 'Webhook not found or not authorized' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      webhook: {
        id: webhook.id,
        url: webhook.url,
        events: webhook.events,
        isActive: webhook.isActive,
        updatedAt: webhook.updatedAt,
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
    const auth = await requireAuthenticatedOwner(request);
    if ('response' in auth) return auth.response;

    const existing = await getWebhookById(id);
    if (!existing || existing.owner.toLowerCase() !== auth.owner.toLowerCase()) {
      return NextResponse.json({ error: 'Webhook not found or not authorized' }, { status: 404 });
    }

    const success = await deleteWebhook(id);

    if (!success) {
      return NextResponse.json({ error: 'Webhook not found or not authorized' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook deletion error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
