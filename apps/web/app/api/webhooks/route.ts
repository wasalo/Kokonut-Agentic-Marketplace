import { NextRequest, NextResponse } from 'next/server';
import { createWebhook, getWebhooks, getDeliveries } from '@/lib/db/webhooks';
import { rateLimit, getClientIP } from '@/lib/rate-limit';

/**
 * @swagger
 * /api/webhooks:
 *   post:
 *     summary: Register a new webhook
 *     description: Register an HTTP endpoint to receive blockchain event notifications
 *     tags:
 *       - Webhooks
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - url
 *               - events
 *             properties:
 *               url:
 *                 type: string
 *                 format: uri
 *                 description: HTTPS URL to receive webhook notifications
 *               events:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum:
 *                     - job.created
 *                     - job.funded
 *                     - job.submitted
 *                     - job.completed
 *                     - job.rejected
 *                     - job.expired
 *                     - service.created
 *                     - service.updated
 *                     - service.deactivated
 *                     - proposal.created
 *                     - proposal.evaluation_submitted
 *                     - proposal.decided
 *                     - payment.received
 *                     - payment.sent
 *                 description: List of events to subscribe to
 *               metadata:
 *                 type: object
 *                 description: Optional metadata for the webhook
 *     responses:
 *       201:
 *         description: Webhook created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 webhook:
 *                   $ref: '#/components/schemas/Webhook'
 *       400:
 *         description: Invalid request body
 *       401:
 *         description: Missing owner address header
 *       429:
 *         description: Rate limit exceeded
 *   get:
 *     summary: List webhooks
 *     description: Get all webhooks registered by the authenticated owner
 *     tags:
 *       - Webhooks
 *     parameters:
 *       - in: header
 *         name: x-owner-address
 *         required: true
 *         schema:
 *           type: string
 *           format: ethereum-address
 *         description: The owner's Ethereum address
 *     responses:
 *       200:
 *         description: List of webhooks
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 webhooks:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/WebhookWithDeliveries'
 *       401:
 *         description: Missing owner address header
 */

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
    const clientIP = getClientIP(request);
    const rateLimitResult = rateLimit(request, {
      windowMs: 60 * 1000,
      maxRequests: 10,
      message: 'Too many webhook registrations. Please try again in a minute.',
    });

    if (!rateLimitResult) {
      return NextResponse.json(
        { error: 'Too many webhook registrations. Please try again in a minute.' },
        { status: 429 }
      );
    }

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
