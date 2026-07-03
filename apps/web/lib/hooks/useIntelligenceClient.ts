'use client';

import { useMemo } from 'react';
import { IntelligenceModule } from '@/lib/intelligence/client';

let _client: IntelligenceModule | null = null;

export function getIntelligenceClient(): IntelligenceModule {
  if (!_client) {
    _client = new IntelligenceModule({
      baseUrl: process.env.NEXT_PUBLIC_INTELLIGENCE_API_URL ?? 'http://localhost:8055',
      token: process.env.NEXT_PUBLIC_INTELLIGENCE_API_TOKEN ?? undefined,
    });
  }
  return _client;
}

export function useIntelligenceClient(): IntelligenceModule {
  return useMemo(() => getIntelligenceClient(), []);
}
