export interface AgentMetadata8004 {
  name: string;
  description: string;
  version: string;
  capabilities: string[];
  endpoints?: {
    https?: string;
    wss?: string;
    grpc?: string;
    mcp?: string;
    a2a?: string;
  };
  channels?: {
    xmtp?: string;
    email?: string;
    webhook?: string;
  };
  protocols?: ('mcp' | 'a2a' | 'xmtp')[];
  pricing?: {
    currency: string;
    amount: string;
    interval?: string;
  };
  images?: {
    logo?: string;
    banner?: string;
  };
  social?: {
    twitter?: string;
    github?: string;
    telegram?: string;
    discord?: string;
  };
  source?: string;
  createdAt: string;
  updatedAt: string;
  verification?: {
    level: 'self-attest' | 'id-verified';
    provider: 'self.xyz' | 'eas.celo';
    verifiedAt: number;
    proof?: string;
    attestationUid?: string;
  };
  intelligence?: {
    agentType: string;
    farmId?: string;
    capabilityManifestCid?: string;
    reviewRequired?: boolean;
    directusId?: string;
  };
  portfolio?: {
    title: string;
    description: string;
    link?: string;
    image?: string;
  }[];
  skills?: {
    [key: string]: {
      rating: number;
      lastUpdated: number;
      category: string;
      description?: string;
    };
  };
  marketplaceProfile?: {
    rating: number;
    reviewCount: number;
    responseTime: string;
    completionRate: number;
    badges?: string[];
  };
}

export function generateAgentMetadata(data: AgentMetadata8004): string {
  const json = JSON.stringify({
    ...data,
    verification: data.verification || undefined,
    portfolio: data.portfolio || undefined,
    skills: data.skills || undefined,
    marketplaceProfile: data.marketplaceProfile || undefined,
  });
  const base64 = btoa(json);
  return `data:application/json;base64,${base64}`;
}

function normalizeDecodedMetadata(raw: any): AgentMetadata8004 {
  if (raw.verification && !raw.verification.provider) {
    raw.verification.provider = 'self.xyz';
  }
  if (raw.verification && !raw.verification.level) {
    raw.verification.level = 'self-attest';
  }
  return raw as AgentMetadata8004;
}

export function decodeAgentMetadata(dataUri: string): AgentMetadata8004 | null {
  try {
    if (!dataUri.startsWith('data:')) return null;
    const base64 = dataUri.split(',')[1];
    if (!base64) return null;
    const json = atob(base64);
    const parsed = JSON.parse(json);
    return normalizeDecodedMetadata(parsed);
  } catch {
    return null;
  }
}
