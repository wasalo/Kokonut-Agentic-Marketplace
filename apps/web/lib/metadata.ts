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
    provider: 'self.xyz';
    verifiedAt: number;
    proof?: string;
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

export const VERIFICATION_LEVELS = {
  SELF_ATTEST: 'self-attest',
  ID_VERIFIED: 'id-verified',
} as const;

export const VERIFICATION_PROVIDERS = {
  SELF_XYZ: 'self.xyz',
} as const;

export interface MetadataEntry {
  metadataKey: string;
  metadataValue: `0x${string}`;
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

export function decodeAgentMetadata(uri: string): AgentMetadata8004 | null {
  try {
    if (uri.startsWith('data:')) {
      const parts = uri.split(',');
      if (parts.length === 2 && parts[0].includes('base64')) {
        const base64 = parts[1];
        const json = atob(base64);
        const decoded = JSON.parse(json) as AgentMetadata8004;
        if (decoded.verification && !decoded.verification.provider) {
          decoded.verification.provider = 'self.xyz';
        }
        if (!decoded.verification) decoded.verification = undefined;
        if (!decoded.portfolio) decoded.portfolio = undefined;
        if (!decoded.skills) decoded.skills = undefined;
        if (!decoded.marketplaceProfile) decoded.marketplaceProfile = undefined;
        return decoded;
      }
    }
    if (uri.startsWith('ipfs://')) return null;
    if (uri.startsWith('https://')) return null;
    return null;
  } catch {
    return null;
  }
}

export function createMetadataEntry(key: string, value: string): MetadataEntry {
  return {
    metadataKey: key,
    metadataValue: encodeValue(value),
  };
}

export function encodeValue(value: string): `0x${string}` {
  const encoded = new TextEncoder().encode(value);
  let hex = '0x';
  for (let i = 0; i < encoded.length; i++) {
    hex += encoded[i].toString(16).padStart(2, '0');
  }
  return hex as `0x${string}`;
}

export function decodeValue(hex: `0x${string}`): string {
  const bytes = new Uint8Array(
    hex
      .slice(2)
      .match(/.{2}/g)!
      .map(byte => parseInt(byte, 16))
  );
  return new TextDecoder().decode(bytes);
}

export const METADATA_KEYS = {
  NAME: 'name',
  DESCRIPTION: 'description',
  VERSION: 'version',
  CAPABILITIES: 'capabilities',
  ENDPOINTS: 'endpoints',
  PRICING: 'pricing',
  IMAGES: 'images',
  SOCIAL: 'social',
  VERIFICATION: 'verification',
  PORTFOLIO: 'portfolio',
  SKILLS: 'skills',
  MARKETPLACE_PROFILE: 'marketplaceProfile',
  CREATED_AT: 'createdAt',
  UPDATED_AT: 'updatedAt',
} as const;
