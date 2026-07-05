import { NextRequest, NextResponse } from 'next/server';

const API_BASE = 'https://8004scan.io/api/v1/public';
const API_KEY = process.env._8004_API_KEY || process.env.NEXT_PUBLIC_8004_API_KEY || '';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const chainId = searchParams.get('chainId') || '11155111';
  const page = searchParams.get('page') || '1';
  const limit = searchParams.get('limit') || '100';
  const ownerAddress = searchParams.get('ownerAddress') || '';

  let url = `${API_BASE}/agents?chainId=${chainId}&page=${page}&limit=${limit}`;
  if (ownerAddress) url += `&ownerAddress=${ownerAddress}`;

  try {
    const response = await fetch(url, {
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to proxy 8004scan request' },
      { status: 502 }
    );
  }
}
