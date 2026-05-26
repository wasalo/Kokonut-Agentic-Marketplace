import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { useEmailStore } from '@/lib/emails/store';
import type { EmailPreferences } from '@/lib/emails/types';
import { requireAuthenticatedOwner } from '@/lib/api-auth';

const preferencesSchema = z.object({
  email: z.string().email(),
  enabled: z.boolean().optional(),
  types: z
    .object({
      payment: z.boolean().optional(),
      job: z.boolean().optional(),
      proposal: z.boolean().optional(),
      weekly_digest: z.boolean().optional(),
      marketing: z.boolean().optional(),
    })
    .optional(),
  frequency: z.enum(['instant', 'daily', 'weekly']).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuthenticatedOwner(request);
    if ('response' in auth) return auth.response;
    const owner = auth.owner;

    const preferences = useEmailStore.getState().getPreferences(owner);

    return NextResponse.json({
      preferences: preferences || {
        email: '',
        enabled: false,
        types: {
          payment: true,
          job: true,
          proposal: true,
          weekly_digest: true,
          marketing: false,
        },
        frequency: 'instant',
      },
    });
  } catch (error) {
    console.error('Get preferences error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    const validation = preferencesSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.errors },
        { status: 400 }
      );
    }

    const auth = await requireAuthenticatedOwner(request);
    if ('response' in auth) return auth.response;
    const owner = auth.owner;

    const updateData: Partial<EmailPreferences> = {
      email: validation.data.email,
      enabled: validation.data.enabled,
      frequency: validation.data.frequency,
    };

    if (validation.data.types) {
      updateData.types = {
        payment: validation.data.types.payment ?? true,
        job: validation.data.types.job ?? true,
        proposal: validation.data.types.proposal ?? true,
        weekly_digest: validation.data.types.weekly_digest ?? true,
        marketing: validation.data.types.marketing ?? false,
      };
    }

    useEmailStore.getState().setPreferences(owner, updateData);

    const preferences = useEmailStore.getState().getPreferences(owner);

    return NextResponse.json({
      success: true,
      preferences,
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAuthenticatedOwner(request);
    if ('response' in auth) return auth.response;
    const owner = auth.owner;

    useEmailStore.getState().setPreferences(owner, {
      enabled: false,
    });

    return NextResponse.json({
      success: true,
      message: 'Email notifications disabled',
    });
  } catch (error) {
    console.error('Delete preferences error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
