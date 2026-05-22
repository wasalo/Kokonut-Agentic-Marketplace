import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { getAllActivePushSubscriptions } from '@/lib/db/push';

if (process.env.VAPID_PRIVATE_KEY && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL || 'admin@market.kokonut.network'}`,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export async function POST(request: NextRequest) {
  try {
    const owner = request.headers.get('x-owner-address');
    if (!owner) {
      return NextResponse.json({ error: 'Authentication required. Provide x-owner-address header.' }, { status: 401 });
    }

    const body = await request.json();
    const { title, message, link, data } = body;

    if (!title) {
      return NextResponse.json({ error: 'Missing title' }, { status: 400 });
    }

    if (!process.env.VAPID_PRIVATE_KEY || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: 'VAPID keys not configured',
        },
        { status: 500 }
      );
    }

    const subscriptions = await getAllActivePushSubscriptions();

    if (subscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active push subscriptions',
        sent: 0,
      });
    }

    const notificationPayload = JSON.stringify({
      title,
      body: message || 'New notification from Kokonut',
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      tag: 'kokonut-notification',
      data: {
        url: link || '/notifications',
        ...data,
      },
    });

    const results = await Promise.allSettled(
      subscriptions.map(async sub => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.keys.p256dh,
                auth: sub.keys.auth,
              },
            },
            notificationPayload
          );
          return { endpoint: sub.endpoint, status: 'success' };
        } catch (error: unknown) {
          const e = error as { statusCode?: number };
          if (e.statusCode === 404 || e.statusCode === 410) {
            return { endpoint: sub.endpoint, status: 'unsubscribed' };
          }
          return { endpoint: sub.endpoint, status: 'failed', error: String(error) };
        }
      })
    );

    const sent = results.filter(
      r => r.status === 'fulfilled' && (r.value as { status: string }).status === 'success'
    ).length;
    const unsubscribed = results.filter(
      r => r.status === 'fulfilled' && (r.value as { status: string }).status === 'unsubscribed'
    ).length;
    const failed = results.length - sent - unsubscribed;

    return NextResponse.json({
      success: true,
      total: subscriptions.length,
      sent,
      unsubscribed,
      failed,
    });
  } catch (error) {
    console.error('Error sending push:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
