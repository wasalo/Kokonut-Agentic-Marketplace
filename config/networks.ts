import manifest from './address-manifest.json';

/**
 * Shared network configuration generated from config/address-manifest.json.
 * Keep contract addresses in the manifest, then run pnpm run generate:addresses.
 */
export const NETWORKS = manifest.networks;

export type NetworkConfig = (typeof NETWORKS)[keyof typeof NETWORKS];
export type ContractAddresses = NetworkConfig['contracts'];
export type NetworkName = keyof typeof NETWORKS;

export function getNetwork(name: NetworkName): NetworkConfig {
  return NETWORKS[name];
}

export function getContracts(name: NetworkName): ContractAddresses {
  return NETWORKS[name].contracts;
}

export function getRpcUrl(name: NetworkName): string {
  return NETWORKS[name].rpcUrl;
}

export const DEFAULT_NETWORK: NetworkName = manifest.defaultNetwork as NetworkName;
