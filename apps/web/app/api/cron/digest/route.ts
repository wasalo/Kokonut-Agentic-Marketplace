import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getUsersWithDigestEnabled } from '@/lib/db/email';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

// Initialise Resend lazily to avoid build-time errors when the API key is missing
const getResendClient = () => {
  const key = process.env.RESEND_KEY;
  return new Resend(key || 're_123456789'); // Placeholder for build-time safety
};

interface DigestStats {
  jobsCreated: number;
  servicesCreated: number;
  proposalsCreated: number;
  totalVolumeUSDC: number;
  activeAgents: number;
}

function readEventLogs() {
  const fs = require('fs');
  const eventsPath = path.join(DATA_DIR, 'events.json');
  if (!fs.existsSync(eventsPath)) return [];
  try {
    return JSON.parse(fs.readFileSync(eventsPath, 'utf-8'));
  } catch {
    return [];
  }
}

async function getWeeklyStats(): Promise<DigestStats> {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const oneWeekAgoStr = oneWeekAgo.toISOString();

  const events = readEventLogs();

  const jobsCount = events.filter(
    (e: { eventType: string; processedAt: string }) =>
      e.eventType === 'JobCreated' && e.processedAt >= oneWeekAgoStr
  ).length;

  const servicesCount = events.filter(
    (e: { eventType: string; processedAt: string }) =>
      e.eventType === 'ServiceCreated' && e.processedAt >= oneWeekAgoStr
  ).length;

  const proposalsCount = events.filter(
    (e: { eventType: string; processedAt: string }) =>
      e.eventType === 'ProposalCreated' && e.processedAt >= oneWeekAgoStr
  ).length;

  return {
    jobsCreated: jobsCount,
    servicesCreated: servicesCount,
    proposalsCreated: proposalsCount,
    totalVolumeUSDC: 0,
    activeAgents: 0,
  };
}

async function getSubscribers(): Promise<Array<{ email: string; userAddress: string }>> {
  const prefs = await getUsersWithDigestEnabled();
  return prefs.map(p => ({ email: p.email, userAddress: p.userAddress }));
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const stats = await getWeeklyStats();
    const subscribers = await getSubscribers();

    if (subscribers.length === 0) {
      return NextResponse.json({ message: 'No subscribers', sent: 0 });
    }

    const emailHtml = generateDigestEmail(stats);

    const resend = getResendClient();
    const sendPromises = subscribers.map(sub =>
      resend.emails
        .send({
          from: 'Kokonut <noreply@market.kokonut.network>',
          to: sub.email,
          subject: '📊 Your Weekly Kokonut Digest',
          html: emailHtml,
        })
        .catch((err: Error) => ({
          error: err.message || 'Failed to send',
          email: sub.email,
        }))
    );

    const results = await Promise.all(sendPromises);
    const successful = results.filter(r => 'id' in r).length;

    return NextResponse.json({
      success: true,
      stats,
      sent: successful,
      total: subscribers.length,
    });
  } catch (error) {
    console.error('Weekly digest error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function generateDigestEmail(stats: DigestStats): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Weekly Kokonut Digest</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0a; color: #e4e4e7; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #18181b; border-radius: 12px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 24px; }
    .header p { color: rgba(255,255,255,0.8); margin: 8px 0 0; }
    .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; padding: 24px; }
    .stat { background: #27272a; border-radius: 8px; padding: 16px; text-align: center; }
    .stat-value { font-size: 28px; font-weight: bold; color: #818cf8; }
    .stat-label { font-size: 12px; color: #a1a1aa; margin-top: 4px; }
    .cta { padding: 24px; text-align: center; }
    .cta a { display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; }
    .footer { padding: 24px; text-align: center; font-size: 12px; color: #71717a; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Weekly Kokonut Digest</h1>
      <p>Your platform activity summary</p>
    </div>
    
    <div class="stats">
      <div class="stat">
        <div class="stat-value">${stats.jobsCreated}</div>
        <div class="stat-label">Jobs Created</div>
      </div>
      <div class="stat">
        <div class="stat-value">${stats.servicesCreated}</div>
        <div class="stat-label">Services Listed</div>
      </div>
      <div class="stat">
        <div class="stat-value">${stats.proposalsCreated}</div>
        <div class="stat-label">Proposals</div>
      </div>
    </div>
    
    <div class="cta">
      <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://market.kokonut.network'}/analytics">View Full Analytics</a>
    </div>
    
    <div class="footer">
      <p>You're receiving this because you opted in to weekly digests.</p>
      <p><a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://market.kokonut.network'}/settings/notifications" style="color: #6366f1;">Manage preferences</a></p>
    </div>
  </div>
</body>
</html>
  `;
}
