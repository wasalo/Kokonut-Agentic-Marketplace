import { NextRequest, NextResponse } from 'next/server';
import { createPushSubscription } from '@/lib/db/push';
import { rateLimit, getClientIP } from '@/lib/rate-limit';

/**
 * @swagger
 * /api/push/subscribe:
 *   post:
 *     summary: Subscribe to push notifications
 *     description: Subscribe a browser to receive push notifications
 *     tags:
 *       - Push Notifications
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               subscription:
 *                 type: object
 *                 properties:
 *                   endpoint:
 *                     type: string
 *                   keys:
 *                     type: object
 *                     properties:
 *                       p256dh:
 *                         type: string
 *                       auth:
 *                         type: string
 *               address:
 *                 type: string
 *                 description: User's Ethereum address
 *     responses:
 *       201:
 *         description: Subscription created
 *       400:
 *         description: Invalid subscription
 *       429:
 *         description: Rate limit exceeded
 */

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
