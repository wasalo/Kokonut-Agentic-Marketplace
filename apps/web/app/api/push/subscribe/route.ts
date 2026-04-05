import { NextRequest, NextResponse } from 'next/server';

const subscriptions = new Map<string, unknown>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subscription, address } = body;

    if (!subscription || !address) {
      return NextResponse.json({ error: 'Missing subscription or address' }, { status: 400 });
    }

    const key = `${address}:${subscription.endpoint}`;
    subscriptions.set(key, subscription);

    return NextResponse.json({ success: true, message: 'Subscribed to push notifications' });
  } catch (error) {
    console.error('Error subscribing to push:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
