import { NextRequest, NextResponse } from 'next/server';

const subscriptions = new Map<string, unknown>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { endpoint, address } = body;

    if (!endpoint || !address) {
      return NextResponse.json({ error: 'Missing endpoint or address' }, { status: 400 });
    }

    const key = `${address}:${endpoint}`;
    subscriptions.delete(key);

    return NextResponse.json({ success: true, message: 'Unsubscribed from push notifications' });
  } catch (error) {
    console.error('Error unsubscribing from push:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
