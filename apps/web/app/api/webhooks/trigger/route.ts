import { NextRequest, NextResponse } from 'next/server';
import { getWebhookById, getWebhooksForEvent, recordDelivery } from '@/lib/db/webhooks';
import { signPayload } from '@/lib/webhooks/types';
import { requireAuthenticatedOwner } from '@/lib/api-auth';

const RETRY_DELAYS = [0, 60000, 300000, 1800000, 7200000];
const MAX_RETRY_ATTEMPTS = 5;

function generateId(): string {
  return `wh_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

async function deliverWebhook(
  url: string,
  secret: string,
  payload: Record<string, unknown>
): Promise<{ status: number; body: string }> {
  const body = JSON.stringify(payload);
  const signature = signPayload(body, secret);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Kokonut-Signature': signature,
      'X-Kokonut-Event': payload.event as string,
      'X-Kokonut-Delivery-Id': payload.id as string,
    },
    body,
  });

  const responseBody = await response.text();

  return {
    status: response.status,
    body: responseBody.substring(0, 1000),
  };
}

export async function POST(request: NextRequest) {
  try {
    const internalSecret = process.env.INTERNAL_API_SECRET || process.env.ADMIN_API_SECRET || process.env.CRON_SECRET;
    const isInternal = Boolean(internalSecret && request.headers.get('authorization') === `Bearer ${internalSecret}`);
    let owner: string | undefined;

    const body = await request.json();
    const { event, data, chainId = 11155111, webhookId } = body;

    if (!isInternal) {
      const auth = await requireAuthenticatedOwner(request);
      if ('response' in auth) return auth.response;
      owner = auth.owner.toLowerCase();
    }

    if (!event) {
      return NextResponse.json({ error: 'Event type required' }, { status: 400 });
    }

    const webhooks = webhookId
      ? await getTestWebhook(webhookId, event, chainId, owner)
      : isInternal
        ? await getWebhooksForEvent(event, chainId)
        : null;

    if (!webhooks) {
      return NextResponse.json({ error: 'webhookId required for user-triggered test events' }, { status: 400 });
    }

    if (webhooks.length === 0) {
      return NextResponse.json({ message: 'No webhooks registered for this event' });
    }

    const payload = {
      id: generateId(),
      event,
      timestamp: Date.now(),
      chainId,
      data: data || {},
    };

    const results = await Promise.allSettled(
      webhooks.map(async webhook => {
        let attempt = 0;
        let lastError: Error | null = null;

        while (attempt < MAX_RETRY_ATTEMPTS) {
          try {
            if (attempt > 0) {
              await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt]));
            }

            const result = await deliverWebhook(webhook.url, webhook.secret, payload);

            await recordDelivery({
              webhookId: webhook.id,
              event,
              payload: JSON.stringify(payload),
              status: result.status >= 200 && result.status < 300 ? 'success' : 'failed',
              statusCode: result.status,
              response: result.body,
              attempts: attempt + 1,
              lastAttempt: new Date().toISOString(),
            });

            if (result.status >= 200 && result.status < 300) {
              return { webhookId: webhook.id, status: 'success' };
            }

            lastError = new Error(`HTTP ${result.status}: ${result.body}`);
          } catch (error) {
            lastError = error as Error;
          }

          attempt++;
        }

        return { webhookId: webhook.id, status: 'failed', error: lastError?.message };
      })
    );

    const delivered = results.filter(
      r => r.status === 'fulfilled' && (r.value as { status: string }).status === 'success'
    ).length;
    const failed = results.length - delivered;

    return NextResponse.json({
      success: true,
      total: results.length,
      delivered,
      failed,
    });
  } catch (error) {
    console.error('Webhook trigger error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function getTestWebhook(
  webhookId: string,
  event: string,
  chainId: number,
  owner?: string
) {
  const webhook = await getWebhookById(webhookId);
  if (!webhook || !webhook.isActive) return [];
  if (owner && webhook.owner.toLowerCase() !== owner) return [];
  if (!webhook.events.includes(event)) return [];
  if (webhook.chains?.length && !webhook.chains.includes(chainId)) return [];
  return [webhook];
}
