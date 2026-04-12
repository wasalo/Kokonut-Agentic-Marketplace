import { NextResponse } from 'next/server';
import { getApiDocs } from '@/lib/swagger';

export const dynamic = 'force-dynamic';

export async function GET() {
  const spec = await getApiDocs();

  return NextResponse.json(spec, {
    headers: {
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
