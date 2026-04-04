import { NextRequest, NextResponse } from 'next/server';
import {
  useWebhookStore,
  generateWebhookId,
  type WebhookPayload,
  type WebhookEventType,
} from '@/lib/webhooks';

const RETRY_DELAYS = [0, 60000, 300000, 1800000, 7200000];
const MAX_RETRY_ATTEMPTS = 5;

async function deliverWebhook(
  webhookId: string,
  url: string,
  secret: string,
  payload: WebhookPayload
): Promise<{ status: number; body: string }> {
  const body = JSON.stringify(payload);

  const signature = await generateSignature(body, secret);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Kokonut-Signature': signature,
      'X-Kokonut-Event': payload.event,
      'X-Kokonut-Delivery-Id': payload.id,
    },
    body,
  });

  const responseBody = await response.text();

  return {
    status: response.status,
    body: responseBody.substring(0, 1000),
  };
}

async function generateSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const payloadData = encoder.encode(payload);

  const hashBuffer = await crypto.subtle.digest('SHA-256', payloadData);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  const combined = payload + hashHex;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }

  return Math.abs(hash).toString(16);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event, data, chainId = 11155111 } = body;

    if (!event) {
      return NextResponse.json({ error: 'Event type required' }, { status: 400 });
    }

    const webhooks = useWebhookStore
      .getState()
      .getActiveWebhooksForEvent(event as WebhookEventType);

    if (webhooks.length === 0) {
      return NextResponse.json({ message: 'No webhooks registered for this event' });
    }

    const payload: WebhookPayload = {
      id: generateWebhookId(),
      event: event as WebhookEventType,
      timestamp: Date.now(),
      chainId,
      data: data || {},
    };

    const results = await Promise.allSettled(
      webhooks.map(async webhook => {
        const deliveryId = generateWebhookId();

        useWebhookStore.getState().addDelivery(webhook.id, payload);

        let attempt = 0;
        let lastError: Error | null = null;

        while (attempt < MAX_RETRY_ATTEMPTS) {
          try {
            if (attempt > 0) {
              await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt]));
            }

            const result = await deliverWebhook(webhook.id, webhook.url, webhook.secret, payload);

            useWebhookStore.getState().updateDelivery(deliveryId, {
              attempts: attempt + 1,
              lastAttempt: Date.now(),
              status: result.status >= 200 && result.status < 300 ? 'delivered' : 'failed',
              responseStatus: result.status,
              responseBody: result.body,
            });

            if (result.status >= 200 && result.status < 300) {
              return { webhookId: webhook.id, status: 'delivered', deliveryId };
            }

            lastError = new Error(`HTTP ${result.status}: ${result.body}`);
          } catch (error) {
            lastError = error as Error;
          }

          attempt++;
        }

        useWebhookStore.getState().updateDelivery(deliveryId, {
          status: 'failed',
        });

        return { webhookId: webhook.id, status: 'failed', deliveryId, error: lastError?.message };
      })
    );

    const delivered = results.filter(
      r => r.status === 'fulfilled' && (r.value as any).status === 'delivered'
    ).length;
    const failed = results.length - delivered;

    return NextResponse.json({
      success: true,
      total: results.length,
      delivered,
      failed,
      results,
    });
  } catch (error) {
    console.error('Webhook trigger error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
