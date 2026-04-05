import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subscription, title, message, link } = body;

    if (!subscription || !title) {
      return NextResponse.json({ error: 'Missing subscription or title' }, { status: 400 });
    }

    const payload = JSON.stringify({
      title,
      message: message || 'New notification from Kokonut',
      link: link || '/',
    });

    const pushSubscription = subscription as PushSubscriptionJSON & {
      keys?: { p256dh: string; auth: string };
    };

    return NextResponse.json({
      success: true,
      message: 'Push notification sent (mock mode - configure web-push for production)',
      payload,
    });
  } catch (error) {
    console.error('Error sending push:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
