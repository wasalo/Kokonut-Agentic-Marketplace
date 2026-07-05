import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedOwner } from '@/lib/api-auth';
import { rateLimit } from '@/lib/rate-limit';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = [
  'image/png', 'image/jpeg', 'image/gif', 'image/webp',
  'application/pdf',
  'text/plain', 'text/markdown',
  'application/json',
  'application/zip',
];

export async function POST(request: NextRequest) {
  try {
    const rateLimitResult = rateLimit(request, {
      windowMs: 60 * 1000,
      maxRequests: 10,
      message: 'Too many uploads. Please try again in a minute.',
    });

    if (!rateLimitResult) {
      return NextResponse.json(
        { error: 'Too many uploads. Please try again in a minute.' },
        { status: 429 }
      );
    }

    const auth = await requireAuthenticatedOwner(request);
    if ('response' in auth) return auth.response;

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File exceeds 10MB limit' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: `File type ${file.type} not allowed` }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');
    const dataUrl = `data:${file.type};base64,${base64}`;

    return NextResponse.json({
      success: true,
      attachment: {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        name: file.name,
        type: file.type,
        size: file.size,
        url: dataUrl,
      },
    });
  } catch (error) {
    console.error('Attachment upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
