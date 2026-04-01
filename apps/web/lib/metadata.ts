export interface AgentMetadata8004 {
  name: string;
  description: string;
  version: string;
  capabilities: string[];
  endpoints?: {
    https?: string;
    wss?: string;
    grpc?: string;
  };
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
  source?: string; // Identifies where the agent was registered (e.g., 'kokonut-marketplace')
  createdAt: string;
  updatedAt: string;
}

export interface MetadataEntry {
  metadataKey: string;
  metadataValue: `0x${string}`;
}

export function generateAgentMetadata(data: AgentMetadata8004): string {
  const json = JSON.stringify(data);
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
        return JSON.parse(json) as AgentMetadata8004;
      }
    }
    if (uri.startsWith('ipfs://')) {
      return null;
    }
    if (uri.startsWith('https://')) {
      return null;
    }
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
  CREATED_AT: 'createdAt',
  UPDATED_AT: 'updatedAt',
} as const;
