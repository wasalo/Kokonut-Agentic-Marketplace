import { NextRequest, NextResponse } from 'next/server';
import { deletePushSubscription } from '@/lib/db/push';
import { requireAuthenticatedOwner } from '@/lib/api-auth';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const rateLimitResult = rateLimit(request, {
      windowMs: 60 * 1000,
      maxRequests: 10,
      message: 'Too many unsubscribe requests. Please try again later.',
    });

    if (!rateLimitResult) {
      return NextResponse.json(
        { error: 'Too many unsubscribe requests. Please try again later.' },
        { status: 429 }
      );
    }

    const auth = await requireAuthenticatedOwner(request);
    if ('response' in auth) return auth.response;

    const body = await request.json();
    const { endpoint, address } = body;

    if (typeof endpoint !== 'string' || typeof address !== 'string') {
      return NextResponse.json({ error: 'Missing endpoint or address' }, { status: 400 });
    }

    if (address.toLowerCase() !== auth.owner.toLowerCase()) {
      return NextResponse.json({ error: 'Address does not match authenticated owner' }, { status: 403 });
    }

    await deletePushSubscription(endpoint, auth.owner);

    return NextResponse.json({ success: true, message: 'Unsubscribed from push notifications' });
  } catch (error) {
    console.error('Error unsubscribing from push:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
