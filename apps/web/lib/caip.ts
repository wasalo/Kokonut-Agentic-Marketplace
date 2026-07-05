const CAIP_NAMESPACE = 'eip155';

export function chainIdToCAIP(chainId: number): string {
  return `${CAIP_NAMESPACE}:${chainId}`;
}

const EVM_CHAINS = {
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
