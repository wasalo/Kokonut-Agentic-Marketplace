import { NextRequest, NextResponse } from 'next/server';
import { checkApiKeyRateLimit, incrementApiKeyUsage, type ApiKeyTier } from './api-keys';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

const DEFAULT_WINDOW_MS = 60 * 1000; // 1 minute
const DEFAULT_MAX_REQUESTS = 30; // 30 requests per minute

export interface RateLimitConfig {
  windowMs?: number;
  maxRequests?: number;
  message?: string;
}

function cleanExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

setInterval(cleanExpiredEntries, 60 * 1000);

export function rateLimit(
  request: NextRequest,
  config: RateLimitConfig = {}
): { success: boolean; remaining: number; resetTime: number; tier?: ApiKeyTier } | null {
  const apiKey = request.headers.get('x-api-key');
  
  if (apiKey) {
    const result = checkApiKeyRateLimit(apiKey);
    
    if (!result.allowed) {
      return { success: false, remaining: 0, resetTime: result.resetTime, tier: result.tier };
    }
    
    incrementApiKeyUsage(apiKey);
    return { 
      success: true, 
      remaining: result.remaining,
      resetTime: result.resetTime,
      tier: result.tier,
    };
  }
  
  const windowMs = config.windowMs ?? DEFAULT_WINDOW_MS;
  const maxRequests = config.maxRequests ?? DEFAULT_MAX_REQUESTS;

  const ip = (request as any).ip
    ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? request.headers.get('x-real-ip')
    ?? 'unknown';
  
  const key = `rate-limit:${ip}`;
  const now = Date.now();

  let entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    entry = {
      count: 0,
      resetTime: now + windowMs,
    };
    rateLimitStore.set(key, entry);
  }

  entry.count++;

  const remaining = Math.max(0, maxRequests - entry.count);

  if (entry.count > maxRequests) {
    return null;
  }

  return {
    success: true,
    remaining,
    resetTime: entry.resetTime,
  };
}

export function withRateLimit(
  config: RateLimitConfig = {}
) {
  return function (handler: (request: NextRequest) => Promise<NextResponse>) {
    return async function (request: NextRequest): Promise<NextResponse> {
      const result = rateLimit(request, config);
      
      if (!result) {
        return NextResponse.json(
          { error: config.message ?? 'Too many requests. Please try again later.' },
          { 
            status: 429,
            headers: {
              'Retry-After': '60',
            }
          }
        );
      }

      const response = await handler(request);
      
      response.headers.set('X-RateLimit-Limit', String(config.maxRequests ?? DEFAULT_MAX_REQUESTS));
      response.headers.set('X-RateLimit-Remaining', String(result.remaining));
      response.headers.set('X-RateLimit-Reset', String(Math.ceil(result.resetTime / 1000)));

      return response;
    };
  };
}

export function getClientIP(request: NextRequest): string {
  return (request as any).ip
    ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? request.headers.get('x-real-ip')
    ?? 'unknown';
}