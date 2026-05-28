import { formatUnits, parseUnits } from 'viem';
import { getContractAddress, ZERO_ADDRESS } from '@/lib/contracts/config';

export type PaymentTokenSymbol = 'USDC' | 'ETH';

export interface Token {
  symbol: PaymentTokenSymbol;
  name: string;
  address: `0x${string}`;
  decimals: number;
}

const NATIVE_TOKEN_ADDRESS = ZERO_ADDRESS;

export const USDC_TOKEN: Token = {
  symbol: 'USDC',
  name: 'USD Coin',
  address: getContractAddress('USDC'),
  decimals: 6,
};

export const ETH_TOKEN: Token = {
  symbol: 'ETH',
  name: 'Ether',
  address: NATIVE_TOKEN_ADDRESS,
  decimals: 18,
};

export const SUPPORTED_PAYMENT_TOKENS: Token[] = [USDC_TOKEN, ETH_TOKEN];

// ServiceRegistryV2 rejects address(0), so service listings are ERC-20 only
// until native-token service pricing is supported on-chain.
export const SERVICE_LISTING_PAYMENT_TOKENS: Token[] = [USDC_TOKEN];

function isNativeToken(address: string | undefined | null): boolean {
  return !!address && address.toLowerCase() === NATIVE_TOKEN_ADDRESS.toLowerCase();
}

function normalizeTokenAddress(address: string | undefined | null): `0x${string}` {
  if (!address || address === '0x') return USDC_TOKEN.address;
  return address as `0x${string}`;
}

export function getTokenByAddress(address: string | undefined | null): Token {
  const normalized = normalizeTokenAddress(address).toLowerCase();
  return (
    SUPPORTED_PAYMENT_TOKENS.find(token => token.address.toLowerCase() === normalized) ??
    (isNativeToken(normalized) ? ETH_TOKEN : USDC_TOKEN)
  );
}

export function parseAmount(amount: string, tokenOrDecimals: Token | number): bigint {
  const decimals = typeof tokenOrDecimals === 'number'
    ? tokenOrDecimals
    : tokenOrDecimals.decimals;
  const sanitized = amount.trim().replace(/,/g, '');
  if (!sanitized) return 0n;
  return parseUnits(sanitized, decimals);
}

export function formatAmount(
  amount: bigint | number | string | undefined | null,
  tokenOrDecimals: Token | number,
  options: {
    includeSymbol?: boolean;
    minFractionDigits?: number;
    maxFractionDigits?: number;
    compact?: boolean;
  } = {}
): string {
  const token = typeof tokenOrDecimals === 'number' ? undefined : tokenOrDecimals;
  const decimals = typeof tokenOrDecimals === 'number' ? tokenOrDecimals : tokenOrDecimals.decimals;
  const value = typeof amount === 'bigint'
    ? amount
    : BigInt(amount === undefined || amount === null || amount === '' ? 0 : amount);
  const formatted = formatUnits(value, decimals);
  const numeric = Number(formatted);

  if (!Number.isFinite(numeric)) {
    return options.includeSymbol && token ? `0 ${token.symbol}` : '0';
  }

  const maximumFractionDigits = options.maxFractionDigits ?? (numeric < 1 && numeric > 0 ? 6 : 2);
  const minimumFractionDigits = options.minFractionDigits ?? 0;
  const body = options.compact
    ? numeric.toLocaleString('en-US', {
        notation: numeric >= 100000 ? 'compact' : 'standard',
        minimumFractionDigits,
        maximumFractionDigits,
      })
    : numeric.toLocaleString('en-US', {
        minimumFractionDigits,
        maximumFractionDigits,
      });

  return options.includeSymbol && token ? `${body} ${token.symbol}` : body;
}

export function formatInputAmount(
  amount: bigint | number | string | undefined | null,
  tokenOrDecimals: Token | number
): string {
  const decimals = typeof tokenOrDecimals === 'number' ? tokenOrDecimals : tokenOrDecimals.decimals;
  const value = typeof amount === 'bigint'
    ? amount
    : BigInt(amount === undefined || amount === null || amount === '' ? 0 : amount);
  return formatUnits(value, decimals);
}

export function amountToNumber(amount: bigint, tokenOrDecimals: Token | number): number {
  const decimals = typeof tokenOrDecimals === 'number'
    ? tokenOrDecimals
    : tokenOrDecimals.decimals;
  return Number(formatUnits(amount, decimals));
}

export function formatUsd(
  value: bigint | number | string | undefined | null,
  options: { decimals?: number; maxFractionDigits?: number } = {}
): string {
  const decimals = options.decimals ?? 6;
  const numeric = typeof value === 'bigint'
    ? amountToNumber(value, decimals)
    : Number(value ?? 0);

  return numeric.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: options.maxFractionDigits ?? 2,
  });
}

export function formatTokenUsdValue(
  amount: bigint,
  token: Token,
  ethPriceInUsd?: number | null
): string {
  if (token.symbol === 'USDC') {
    return formatUsd(amount, { decimals: token.decimals });
  }

  if (token.symbol === 'ETH' && ethPriceInUsd && ethPriceInUsd > 0) {
    return formatUsd(amountToNumber(amount, token) * ethPriceInUsd);
  }

  return formatUsd(0);
}

export function tokenAmountToUsd(
  amount: bigint,
  token: Token,
  ethPriceInUsd?: number | null
): number {
  if (token.symbol === 'USDC') return amountToNumber(amount, token);
  if (token.symbol === 'ETH' && ethPriceInUsd && ethPriceInUsd > 0) {
    return amountToNumber(amount, token) * ethPriceInUsd;
  }
  return 0;
}
