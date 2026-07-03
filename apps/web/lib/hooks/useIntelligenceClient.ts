'use client';

import { useMemo } from 'react';
import { IntelligenceModule } from '@/lib/intelligence/client';

let _client: IntelligenceModule | null = null;

export function getIntelligenceClient(): IntelligenceModule {
  if (!_client) {
    // Use Next.js rewrite proxy to avoid CORS issues with Directus.
    // Browser → /api/intelligence-proxy/* → Next.js server → http://localhost:8055/*
    const rawUrl = process.env.NEXT_PUBLIC_INTELLIGENCE_API_URL ?? 'http://localhost:8055';
    const isBrowser = typeof window !== 'undefined';
    const baseUrl = isBrowser ? '/api/intelligence-proxy' : rawUrl;
    _client = new IntelligenceModule({
      baseUrl,
      token: process.env.NEXT_PUBLIC_INTELLIGENCE_API_TOKEN ?? undefined,
    });
  }
  return _client;
}

export function useIntelligenceClient(): IntelligenceModule {
  return useMemo(() => getIntelligenceClient(), []);
}
