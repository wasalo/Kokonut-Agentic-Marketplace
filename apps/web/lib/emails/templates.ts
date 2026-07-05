import { type EmailTemplateType } from './types';

export interface TemplateData {
  recipientName?: string;
  jobId?: string;
  jobTitle?: string;
  amount?: string;
  serviceName?: string;
  link?: string;
  stats?: {
    jobsCreated?: number;
    jobsCompleted?: number;
    earnings?: string;

  };
}

export function renderPaymentReceivedEmail(data: TemplateData): { subject: string; html: string } {
  return {
    subject: `💰 You received ${data.amount} USDC`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; padding: 40px 0;">
            <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #009F4D, #FFCD00); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center;">
              <span style="color: white; font-weight: bold; font-size: 24px;">KK</span>
            </div>
          </div>
          
          <h1 style="text-align: center; color: #009F4D; margin-bottom: 8px;">Payment Received!</h1>
          <p style="text-align: center; color: #666; margin-bottom: 32px;">
            ${data.recipientName ? `Hi ${data.recipientName},` : 'Hello,'}
          </p>
          
          <div style="background: #f8f9fa; border-radius: 12px; padding: 32px; text-align: center; margin-bottom: 32px;">
            <div style="font-size: 48px; margin-bottom: 8px;">💰</div>
            <div style="font-size: 36px; font-weight: bold; color: #009F4D;">${data.amount} USDC</div>
            <div style="color: #666; margin-top: 8px;">received for ${data.jobTitle || 'completed work'}</div>
          </div>
          
          ${
            data.jobId
              ? `
            <div style="text-align: center; margin-bottom: 32px;">
              <a href="${data.link || `https://kokonut.network/jobs/${data.jobId}`}" style="display: inline-block; background: #009F4D; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                View Job Details
              </a>
            </div>
          `
              : ''
          }
          
          <div style="border-top: 1px solid #eee; padding-top: 24px; text-align: center; color: #999; font-size: 12px;">
            <p>Kokonut Agent Economy</p>
            <p>This email was sent because you received a payment on Kokonut.</p>
            <p><a href="${data.link || 'https://kokonut.network/notifications'}" style="color: #009F4D;">Manage notification preferences</a></p>
          </div>
        </body>
      </html>
    `,
  };
}

export function renderWeeklyDigestEmail(data: TemplateData): { subject: string; html: string } {
  const { stats } = data;

  return {
    subject: '📊 Your Weekly Kokonut Digest',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; padding: 40px 0;">
            <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #009F4D, #FFCD00); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center;">
              <span style="color: white; font-weight: bold; font-size: 24px;">KK</span>
            </div>
          </div>
          
          <h1 style="text-align: center; color: #333; margin-bottom: 8px;">Your Weekly Digest</h1>
          <p style="text-align: center; color: #666; margin-bottom: 32px;">
            ${data.recipientName ? `Hi ${data.recipientName},` : 'Hello'} here's what happened this week on Kokonut.
          </p>
          
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 32px;">
            ${
              stats?.jobsCreated !== undefined
                ? `
              <div style="background: #f8f9fa; border-radius: 12px; padding: 24px; text-align: center;">
                <div style="font-size: 32px; margin-bottom: 8px;">📋</div>
                <div style="font-size: 28px; font-weight: bold; color: #333;">${stats.jobsCreated}</div>
                <div style="color: #666; font-size: 14px;">Jobs Created</div>
              </div>
            `
                : ''
            }
            ${
              stats?.jobsCompleted !== undefined
                ? `
              <div style="background: #f8f9fa; border-radius: 12px; padding: 24px; text-align: center;">
                <div style="font-size: 32px; margin-bottom: 8px;">✅</div>
                <div style="font-size: 28px; font-weight: bold; color: #009F4D;">${stats.jobsCompleted}</div>
                <div style="color: #666; font-size: 14px;">Jobs Completed</div>
              </div>
            `
                : ''
            }
            ${
              stats?.earnings
                ? `
              <div style="background: #f8f9fa; border-radius: 12px; padding: 24px; text-align: center;">
                <div style="font-size: 32px; margin-bottom: 8px;">💰</div>
                <div style="font-size: 28px; font-weight: bold; color: #009F4D;">${stats.earnings}</div>
                <div style="color: #666; font-size: 14px;">USDC Earned</div>
              </div>
            `
                : ''
            }
          </div>
          
          <div style="text-align: center; margin-bottom: 32px;">
            <a href="https://kokonut.network/dashboard" style="display: inline-block; background: #009F4D; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">
              View Dashboard
            </a>
          </div>
          
          <div style="border-top: 1px solid #eee; padding-top: 24px; text-align: center; color: #999; font-size: 12px;">
            <p>Kokonut Agent Economy</p>
            <p>You're receiving this because you opted in to weekly digests.</p>
            <p><a href="https://kokonut.network/notifications" style="color: #009F4D;">Manage notification preferences</a></p>
          </div>
        </body>
      </html>
    `,
  };
}

export function renderWelcomeEmail(data: TemplateData): { subject: string; html: string } {
  return {
    subject: 'Welcome to Kokonut Network 🚀',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; padding: 40px 0;">
            <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #009F4D, #FFCD00); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center;">
              <span style="color: white; font-weight: bold; font-size: 24px;">KK</span>
            </div>
          </div>
          
          <h1 style="text-align: center; color: #333; margin-bottom: 8px;">Welcome to Kokonut!</h1>
          <p style="text-align: center; color: #666; margin-bottom: 32px;">
            ${data.recipientName ? `Hi ${data.recipientName},` : 'Hello,'} you're now part of the agent economy.
          </p>
          
          <div style="background: #f8f9fa; border-radius: 12px; padding: 32px; margin-bottom: 32px;">
            <h2 style="color: #333; margin-top: 0;">Getting Started</h2>
            <ol style="color: #666;">
              <li style="margin-bottom: 12px;"><strong>Register your agent</strong> - Create your onchain identity</li>
              <li style="margin-bottom: 12px;"><strong>List your services</strong> - Offer your capabilities to clients</li>
              <li style="margin-bottom: 12px;"><strong>Find work</strong> - Browse jobs and submit proposals</li>
              <li style="margin-bottom: 0;"><strong>Earn reputation</strong> - Build trust and increase your value</li>
            </ol>
          </div>
          
          <div style="text-align: center; margin-bottom: 32px;">
            <a href="https://kokonut.network/identity/register" style="display: inline-block; background: #009F4D; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">
              Register Your Agent
            </a>
          </div>
          
          <div style="border-top: 1px solid #eee; padding-top: 24px; text-align: center; color: #999; font-size: 12px;">
            <p>Kokonut Agent Economy</p>
            <p>Questions? Reply to this email or visit our <a href="https://kokonut.network/about" style="color: #009F4D;">docs</a>.</p>
          </div>
        </body>
      </html>
    `,
  };
}

export function renderEmail(
  template: EmailTemplateType,
  data: TemplateData
): { subject: string; html: string } {
  switch (template) {
    case 'payment_received':
      return renderPaymentReceivedEmail(data);
    case 'weekly_digest':
      return renderWeeklyDigestEmail(data);
    case 'welcome':
      return renderWelcomeEmail(data);
    default:
      return {
        subject: 'Notification from Kokonut',
        html: `<p>You have a new notification on Kokonut.</p>`,
      };
  }
}
