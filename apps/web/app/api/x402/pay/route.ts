import { NextRequest, NextResponse } from 'next/server';

const CDP_API_KEY = process.env.CDP_API_KEY || '';

function getAllowedFacilitators(): string[] {
  return (process.env.X402_FACILITATOR_ALLOWLIST || process.env.X402_FACILITATOR_URL || '')
    .split(',')
    .map(url => url.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { payment_requirement, payer } = body;

    if (!payment_requirement || !payer) {
      return NextResponse.json(
        { error: 'Missing payment_requirement or payer' },
        { status: 400 }
      );
    }

    if (!CDP_API_KEY) {
      return NextResponse.json({ error: 'Payment facilitator API key not configured' }, { status: 503 });
    }

    const allowedFacilitators = getAllowedFacilitators();
    if (allowedFacilitators.length === 0) {
      return NextResponse.json({ error: 'Payment facilitator allowlist not configured' }, { status: 503 });
    }

    const requestedFacilitator = typeof payment_requirement.facilitator_url === 'string'
      ? payment_requirement.facilitator_url.trim().replace(/\/$/, '')
      : undefined;
    if (requestedFacilitator && !allowedFacilitators.includes(requestedFacilitator)) {
      return NextResponse.json({ error: 'Payment facilitator not allowed' }, { status: 400 });
    }

    const facilitator = requestedFacilitator || allowedFacilitators[0];

    const response = await fetch(`${facilitator}/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cdp-api-key': CDP_API_KEY,
      },
      body: JSON.stringify({
        payment_requirement,
        payer,
      }),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: 'Payment proxy failed' },
      { status: 502 }
    );
  }
}
