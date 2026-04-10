import { NextRequest, NextResponse } from 'next/server';
import { createPushSubscription } from '@/lib/db/push';
import { rateLimit, getClientIP } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const rateLimitResult = rateLimit(request, {
      windowMs: 60 * 1000,
      maxRequests: 5,
      message: 'Too many subscription requests. Please try again later.',
    });

    if (!rateLimitResult) {
      return NextResponse.json(
        { error: 'Too many subscription requests. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { subscription, address } = body;

    if (!subscription || !address) {
      return NextResponse.json({ error: 'Missing subscription or address' }, { status: 400 });
    }

    const userAgent = request.headers.get('user-agent') || undefined;

    const created = await createPushSubscription({
      userAddress: address,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys?.p256dh || '',
      auth: subscription.keys?.auth || '',
      userAgent,
    });

    return NextResponse.json({
      success: true,
      message: 'Subscribed to push notifications',
      subscription: created,
    });
  } catch (error) {
    console.error('Error subscribing to push:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
