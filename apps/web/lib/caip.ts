export const CAIP_NAMESPACE = 'eip155';

const CAIP_REGEX = /^eip155:[-_a-zA-Z0-9]{1,32}$/;

export function isValidCAIP(caip: string): boolean {
  return CAIP_REGEX.test(caip);
}

export function chainIdToCAIP(chainId: number): string {
  return `${CAIP_NAMESPACE}:${chainId}`;
}

export function caipToChainId(caip: string): number | null {
  if (!isValidCAIP(caip)) return null;
  const [, reference] = caip.split(':');
  const chainId = parseInt(reference, 10);
  return isNaN(chainId) ? null : chainId;
}

export function validateCAIP_chainId(caip: string): caip is string {
  return isValidCAIP(caip) && caip.startsWith(`${CAIP_NAMESPACE}:`);
}

export const EVM_CHAINS = {
  SEPOLIA: 11155111,
  ETHEREUM_MAINNET: 1,
  BASE: 8453,
  ARBITRUM_ONE: 42161,
  OPTIMISM: 10,
  CELO: 42220,
  POLYGON: 137,
  BNB_SMART_CHAIN: 56,
  SCROLL: 534352,
  LINEA: 59144,
  GNOSIS: 100,
  MONAD: 143,
  MEGAETH: 4326,
  ABSTRACT: 2741,
  GOAT: 2345,
  TAIKO: 167000,
  SONEIUM: 1868,
  X_LAYER: 196,
  MANTLE: 5000,
  SHAPE: 360,
  METIS: 1088,
  SKALE_BASE: 1187947933,
} as const;

export type EVMChainName = keyof typeof EVM_CHAINS;
export type EVMChainId = typeof EVM_CHAINS[EVMChainName];

export const CHAIN_ID_TO_CAIP: Record<number, string> = Object.fromEntries(
  Object.values(EVM_CHAINS).map(id => [id, chainIdToCAIP(id)])
) as Record<number, string>;

export const CAIP_TO_CHAIN_ID: Record<string, number> = Object.fromEntries(
  Object.values(EVM_CHAINS).map(id => [chainIdToCAIP(id), id])
) as Record<string, number>;

export { chainIdToCAIP as toCAIP, caipToChainId as fromCAIP };