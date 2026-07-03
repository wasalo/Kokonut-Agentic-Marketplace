import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const expectedToken = process.env.INTELLIGENCE_API_TOKEN;

  if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    if (!body.event || !body.data) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    console.log(`[Intelligence Sync] Event: ${body.event}`, JSON.stringify(body.data, null, 2));

    return NextResponse.json({ ok: true, received: body.event });
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
}
