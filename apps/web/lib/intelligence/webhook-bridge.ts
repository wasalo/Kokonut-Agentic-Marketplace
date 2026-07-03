const INTELLIGENCE_URL = process.env.NEXT_PUBLIC_INTELLIGENCE_API_URL || 'http://localhost:8055';
const INTELLIGENCE_TOKEN = process.env.NEXT_PUBLIC_INTELLIGENCE_API_TOKEN;

export interface IntelligenceWebhookEvent {
  event: string;
  data: Record<string, unknown>;
  timestamp: string;
}

export async function sendToIntelligence(event: IntelligenceWebhookEvent): Promise<boolean> {
  if (!INTELLIGENCE_TOKEN) return false;

  try {
    const res = await fetch(`${INTELLIGENCE_URL}/webhooks/marketplace-bridge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${INTELLIGENCE_TOKEN}`,
      },
      body: JSON.stringify(event),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function buildMarketplaceEvent(type: string, data: Record<string, unknown>): IntelligenceWebhookEvent {
  return {
    event: `marketplace.${type}`,
    data: { ...data, source: 'kokonut-marketplace', timestamp: new Date().toISOString() },
    timestamp: new Date().toISOString(),
  };
}
