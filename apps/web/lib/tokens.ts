import type { Address } from 'viem';
import { getContractAddress, ZERO_ADDRESS } from '@/lib/contracts/config';

export type TokenSymbol = 'USDC' | 'ETH';

export interface TokenMeta {
  symbol: TokenSymbol;
  name: string;
  address: Address;
  decimals: number;
  /** Brand color used for token chip backgrounds. */
  brandColor?: string;
  /** Whether the token is the chain's native asset. */
  isNative?: boolean;
}

export const USDC_TOKEN: TokenMeta = {
  symbol: 'USDC',
  name: 'USD Coin',
  address: getContractAddress('USDC'),
  decimals: 6,
  brandColor: '#2775CA',
  isNative: false,
};

export const ETH_TOKEN: TokenMeta = {
  symbol: 'ETH',
  name: 'Ether',
  address: ZERO_ADDRESS,
  decimals: 18,
  brandColor: '#627EEA',
  isNative: true,
};

/** Default fallback colors and native flag. */
export const DEFAULT_BRAND_COLOR = '#009F4D';
export const DEFAULT_NATIVE_FLAG = false;

export const ALL_TOKENS: Record<TokenSymbol, TokenMeta> = {
  USDC: USDC_TOKEN,
  ETH: ETH_TOKEN,
};

export const SERVICE_LISTING_TOKENS: TokenMeta[] = [USDC_TOKEN, ETH_TOKEN];

export const JOB_FUNDING_TOKENS: TokenMeta[] = [USDC_TOKEN, ETH_TOKEN];

export const BIDDING_TOKENS: TokenMeta[] = [USDC_TOKEN, ETH_TOKEN];

export function getTokenMeta(symbol: TokenSymbol | string | undefined | null): TokenMeta {
  if (!symbol) return USDC_TOKEN;
  if (symbol === 'USDC') return USDC_TOKEN;
  if (symbol === 'ETH') return ETH_TOKEN;
  return USDC_TOKEN;
}

export function getTokenMetaByAddress(address: string | undefined | null): TokenMeta {
  if (!address) return USDC_TOKEN;
  if (address.toLowerCase() === ETH_TOKEN.address.toLowerCase()) return ETH_TOKEN;
  if (address.toLowerCase() === USDC_TOKEN.address.toLowerCase()) return USDC_TOKEN;
  return USDC_TOKEN;
}
