import { NextRequest, NextResponse } from 'next/server';
import { getAddress, isAddress, verifyMessage } from 'viem';
import { buildKokonutAuthMessage, KOKONUT_AUTH_WINDOW_MS } from './auth-message';

type OwnerAuthResult =
  | { owner: `0x${string}` }
  | { response: NextResponse };

function unauthorized(message = 'Unauthorized') {
  return NextResponse.json({ error: message }, { status: 401 });
}

export async function requireAuthenticatedOwner(request: NextRequest): Promise<OwnerAuthResult> {
  const ownerHeader = request.headers.get('x-owner-address');
  const timestamp = request.headers.get('x-kokonut-auth-timestamp');
  const signature = request.headers.get('x-kokonut-auth-signature');

  if (!ownerHeader || !isAddress(ownerHeader)) {
    return { response: unauthorized('Valid owner address required') };
  }

  if (!timestamp || !signature) {
    return { response: unauthorized('Signed owner authentication required') };
  }

  const timestampMs = Number(timestamp);
  if (!Number.isSafeInteger(timestampMs)) {
    return { response: unauthorized('Invalid auth timestamp') };
  }

  if (Math.abs(Date.now() - timestampMs) > KOKONUT_AUTH_WINDOW_MS) {
    return { response: unauthorized('Expired owner authentication') };
  }

  const owner = getAddress(ownerHeader);
  const message = buildKokonutAuthMessage(owner, timestamp);
  let isValid = false;
  try {
    isValid = await verifyMessage({
      address: owner,
      message,
      signature: signature as `0x${string}`,
    });
  } catch {
    isValid = false;
  }

  if (!isValid) {
    return { response: unauthorized('Invalid owner signature') };
  }

  return { owner };
}

export function requireCronBearer(request: NextRequest): NextResponse | null {
  return requireBearerSecret(request, process.env.CRON_SECRET, 'CRON_SECRET');
}

export function requireInternalBearer(request: NextRequest): NextResponse | null {
  const secret = process.env.INTERNAL_API_SECRET || process.env.ADMIN_API_SECRET || process.env.CRON_SECRET;
  return requireBearerSecret(request, secret, 'INTERNAL_API_SECRET or ADMIN_API_SECRET');
}

function requireBearerSecret(
  request: NextRequest,
  secret: string | undefined,
  secretName: string
): NextResponse | null {
  if (!secret) {
    return NextResponse.json({ error: `${secretName} is not configured` }, { status: 503 });
  }

  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return unauthorized();
  }

  return null;
}
