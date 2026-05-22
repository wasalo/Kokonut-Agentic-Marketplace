import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { useEmailStore } from '@/lib/emails/store';
import { renderEmail, type TemplateData } from '@/lib/emails/templates';
import type { EmailTemplateType } from '@/lib/emails/types';

const RESEND_API_KEY = process.env.RESEND_KEY;

const sendEmailSchema = z.object({
  to: z.string().email(),
  template: z.enum([
    'payment_received',
    'job_created',
    'job_completed',
    'proposal_created',
    'weekly_digest',
    'welcome',
    'password_reset',
  ]),
  variables: z.record(z.union([z.string(), z.number()])).optional(),
});

async function sendViaResend(
  to: string,
  subject: string,
  html: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!RESEND_API_KEY) {
    console.error('Resend API key not configured');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Kokonut Network <noreply@market.kokonut.network>',
        to: [to],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || 'Failed to send email' };
    }

    const data = await response.json();
    return { success: true, id: data.id };
  } catch (error) {
    console.error('Resend API error:', error);
    return { success: false, error: 'Failed to connect to email service' };
  }
}

export async function POST(request: NextRequest) {
  try {
    const owner = request.headers.get('x-owner-address');
    if (!owner) {
      return NextResponse.json({ error: 'Authentication required. Provide x-owner-address header.' }, { status: 401 });
    }

    const body = await request.json();

    const validation = sendEmailSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { to, template, variables } = validation.data;

    const templateData: TemplateData = {};
    if (variables) {
      Object.entries(variables).forEach(([key, value]) => {
        (templateData as any)[key] = typeof value === 'number' ? value.toString() : value;
      });
    }

    const { subject, html } = renderEmail(template as EmailTemplateType, templateData);

    useEmailStore.getState().addDelivery({
      to,
      template: template as EmailTemplateType,
      status: 'pending',
      sentAt: null,
      error: null,
    });

    const result = await sendViaResend(to, subject, html);

    const deliveries = useEmailStore.getState().getDeliveries(owner);
    const delivery = deliveries[deliveries.length - 1];
    if (delivery) {
      useEmailStore.getState().updateDelivery(delivery.id, {
        status: result.success ? 'sent' : 'failed',
        sentAt: result.success ? Date.now() : null,
        error: result.error || null,
      });
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to send email' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      id: result.id,
      message: 'Email sent successfully',
    });
  } catch (error) {
    console.error('Email send error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
