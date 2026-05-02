import { NextRequest, NextResponse } from 'next/server';

const CDP_API_KEY = process.env.CDP_API_KEY || '';

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

    const facilitator = payment_requirement.facilitator_url || payment_requirement.network || 'base';

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
