/**
 * API Key Management for Rate Limiting Tiers
 *
 * Key format: kokonut_live_xxxxx (production) or kokonut_test_xxxxx (test)
 *
 * x402 Payment Pricing (USDC, 6 decimals):
 * - anonymous/free: Free tier - paid via x402
 * - basic: $0.005 USDC cap (exact: $0.001)
 * - pro: $0.05 USDC cap (exact: $0.01)
 * - enterprise: Free via contract (no x402)
 */

export type ApiKeyTier = 'free' | 'basic' | 'pro' | 'enterprise' | 'anonymous';

export interface ApiKeyConfig {
  tier: ApiKeyTier;
  maxRequests: number;
  windowMs: number;
  unlimited?: boolean;
  x402Pricing?: {
    exact: string;
    upto: string;
    max?: string;
  };
  x402Chain?: string;
}

const API_KEY_TIERS: Record<ApiKeyTier, ApiKeyConfig> = {
  anonymous: {
    tier: 'anonymous',
    maxRequests: 30,
    windowMs: 60000,
    x402Pricing: { exact: '1000', upto: '10000', max: '100000' },
    x402Chain: 'eip155:84532',
  },
  free: {
    tier: 'free',
    maxRequests: 30,
    windowMs: 60000,
    x402Pricing: { exact: '1000', upto: '10000', max: '100000' },
    x402Chain: 'eip155:84532',
  },
  basic: {
    tier: 'basic',
    maxRequests: 100,
    windowMs: 60000,
    x402Pricing: { exact: '5000', upto: '50000', max: '500000' },
    x402Chain: 'eip155:84532',
  },
  pro: {
    tier: 'pro',
    maxRequests: 500,
    windowMs: 60000,
    x402Pricing: { exact: '10000', upto: '100000', max: '1000000' },
    x402Chain: 'eip155:8453',
  },
  enterprise: {
    tier: 'enterprise',
    maxRequests: 0,
    windowMs: 0,
    unlimited: true,
    x402Pricing: { exact: '0', upto: '0', max: '0' },
    x402Chain: 'eip155:8453',
  },
};

const API_KEY_PREFIXES = {
  live: 'kokonut_live_',
  test: 'kokonut_test_',
};

const VALID_API_KEYS = new Map<string, ApiKeyTier>();

const keyUsageStore = new Map<string, { count: number; resetTime: number }>();

export function getTierFromApiKey(key: string | undefined): ApiKeyTier {
  if (!key) return 'anonymous';
  
  if (key.startsWith(API_KEY_PREFIXES.test)) return 'free';
  if (key.startsWith(API_KEY_PREFIXES.live)) {
    const storedTier = VALID_API_KEYS.get(key);
    if (storedTier) return storedTier;
    return 'anonymous';
  }
  
  return 'anonymous';
}

function getTierConfig(tier: ApiKeyTier): ApiKeyConfig {
  return API_KEY_TIERS[tier] ?? API_KEY_TIERS.anonymous;
}

export function checkApiKeyRateLimit(key: string): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  tier: ApiKeyTier;
} {
  const tier = getTierFromApiKey(key);
  const config = getTierConfig(tier);
  
  if (config.unlimited) {
    return { allowed: true, remaining: -1, resetTime: 0, tier };
  }
  
  const now = Date.now();
  const usage = keyUsageStore.get(key) ?? { count: 0, resetTime: now + config.windowMs };
  
  if (now > usage.resetTime) {
    const newUsage = { count: 0, resetTime: now + config.windowMs };
    keyUsageStore.set(key, newUsage);
    return { 
      allowed: true, 
      remaining: config.maxRequests - 1, 
      resetTime: newUsage.resetTime,
      tier 
    };
  }
  
  if (usage.count >= config.maxRequests) {
    return { 
      allowed: false, 
      remaining: 0, 
      resetTime: usage.resetTime,
      tier 
    };
  }
  
  usage.count++;
  keyUsageStore.set(key, usage);
  
  return {
    allowed: true,
    remaining: config.maxRequests - usage.count,
    resetTime: usage.resetTime,
    tier,
  };
}

export function incrementApiKeyUsage(key: string): void {
  const tier = getTierFromApiKey(key);
  const config = getTierConfig(tier);
  
  if (config.unlimited) return;
  
  const now = Date.now();
  const usage = keyUsageStore.get(key) ?? { count: 0, resetTime: now + config.windowMs };
  
  if (now > usage.resetTime) {
    keyUsageStore.set(key, { count: 1, resetTime: now + config.windowMs });
  } else {
    usage.count++;
    keyUsageStore.set(key, usage);
  }
}

function cleanupExpiredUsage(): void {
  const now = Date.now();
  for (const [key, usage] of keyUsageStore.entries()) {
    if (now > usage.resetTime) {
      keyUsageStore.delete(key);
    }
  }
}

setInterval(cleanupExpiredUsage, 60000);
